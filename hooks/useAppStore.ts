

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Session, Solve, Settings, StatConfig, StatType, Penalty, ComputedSolve, PuzzleType, InspectionDirection, InspectionVoice, TimePrecision, StartInputMethod, PBVisualType, AppTheme, Language, SolvePhase, ShortcutAction, AuthState, FullStateData, SolveMap, SyncAction, SyncActionType, SessionSettingsOverride, CustomScramblerConfig, Goal, GoalType } from '../types';
import { generateTestSessions, generateId, calculateSolveStats, DNF_VALUE, getEffectiveSettings, getSolveTime, recalculateSessionStats } from '../utils';
import { generateScramble, getScrambler } from '../utils/scramble';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/layouts';
import { api } from '../utils/api';

const DEFAULT_STATS_CONFIG: StatConfig[] = [
    { id: '1', type: StatType.SINGLE, size: 1 },
    { id: '2', type: StatType.MEAN, size: 3 },
    { id: '3', type: StatType.AVERAGE, size: 5 },
    { id: '4', type: StatType.AVERAGE, size: 12 },
    { id: '5', type: StatType.AVERAGE, size: 50 },
    { id: '6', type: StatType.AVERAGE, size: 100 },
    { id: '7', type: StatType.WEIGHTED_AVG, size: 1000 },
];

const DEFAULT_TIMELIST_CONFIG: StatConfig[] = [
    { id: 'ml0', type: StatType.SINGLE, size: 1 },
    { id: 'ml1', type: StatType.MEAN, size: 3 },
    { id: 'ml2', type: StatType.AVERAGE, size: 5 }
];

const DEFAULT_SHORTCUTS: Record<ShortcutAction, string | null> = {
    [ShortcutAction.NEXT_SCRAMBLE]: 'Digit2',
    [ShortcutAction.PREV_SCRAMBLE]: 'Shift+Digit2',
    [ShortcutAction.PENALTY_PLUS_TWO]: 'Digit3',
    [ShortcutAction.PENALTY_DNF]: 'Digit4',
    [ShortcutAction.DELETE_LAST]: 'Backspace',
    [ShortcutAction.SELECT_FIRST]: 'Digit7',
    [ShortcutAction.OPEN_DETAILS]: 'Ctrl+Digit2',
    [ShortcutAction.ESCAPE]: 'Escape',
    [ShortcutAction.MOVE_SELECTION_UP]: 'ArrowUp',
    [ShortcutAction.MOVE_SELECTION_DOWN]: 'ArrowDown',
    [ShortcutAction.EXTEND_SELECTION_UP]: 'Shift+ArrowUp',
    [ShortcutAction.EXTEND_SELECTION_DOWN]: 'Shift+ArrowDown',
    [ShortcutAction.OPEN_SESSION_MANAGER]: 'Digit8',
    [ShortcutAction.MANUAL_ENTRY]: 'Digit1',
    [ShortcutAction.PREV_PUZZLE]: 'ArrowLeft',
    [ShortcutAction.NEXT_PUZZLE]: 'ArrowRight',
    [ShortcutAction.OPEN_COMMAND_PALETTE]: 'Digit5'
};

const DEFAULT_SETTINGS: Settings = {
    inspectionEnabled: true,
    inspectionDirection: InspectionDirection.DOWN,
    inspectionVoice: InspectionVoice.NONE,
    autoPenalty: true,
    holdToStart: true,
    startInput: StartInputMethod.SPACE,
    restartDelayEnabled: false,
    restartDelayMs: 500,
    timePrecision: TimePrecision.MILLI,
    inspectionPrecision: TimePrecision.SECONDS,
    inspectionFlashes: { enabled8: false, enabled12: false, enabled15: false },
    useStackmat: false,
    hideWhileTiming: false,
    hideWhileTimingText: '',
    theme: AppTheme.ZINC,
    backgroundColor: '#18181b',
    textColor: '#e4e4e7',
    backgroundImage: '',
    backgroundImageOpacity: 20,
    language: Language.EN,
    pbVisuals: PBVisualType.HIGHLIGHT,
    pbFireworks: true,
    paginationEnabled: false,
    pageSize: 100,
    timelistStats: DEFAULT_TIMELIST_CONFIG,
    timeDistribution: { mode: 'ALL', size: 100 },
    solvesOverTime: {
        mode: 'SESSION',
        customDate: new Date().toISOString().split('T')[0],
        customCount: 100
    },
    goalsWidget: {
        showCompleted: true
    },
    shortcuts: DEFAULT_SHORTCUTS,
    layout: DEFAULT_LAYOUT_CONFIG,
    scrambleImage: {
        baseColor: 'black',
        faceColors: {
            U: '#FFFFFF', R: '#DC2626', F: '#16A34A', D: '#EAB308', L: '#EA580C', B: '#2563EB',
            face7: '#9CA3AF', face8: '#F472B6', face9: '#FEF3C7', face10: '#A7F3D0', face11: '#C084FC', face12: '#FCD34D'
        },
        clockColors: {
            clockFace: '#374151', clockBack: '#1F2937',
            pinUp: '#EAB308', pinDown: '#4B5563',
            wheelF: '#1F2937', wheelB: '#374151',
            marksF: '#FFFFFF', marksB: '#FFFFFF'
        }
    }
};

// Initialization Helper: Migrate old "embedded" sessions to "normalized"
const loadAndNormalizeData = (): { sessions: Session[], solves: SolveMap } => {
    const savedSessions = localStorage.getItem('cubetime_sessions');
    const savedSolves = localStorage.getItem('cubetime_solves');

    let finalSessions: Session[] = [];
    let finalSolves: SolveMap = {};

    if (savedSolves && savedSessions) {
        // Already normalized
        try {
            finalSessions = JSON.parse(savedSessions);
            finalSolves = JSON.parse(savedSolves);
        } catch(e) { console.error("Load Error", e); }
    } else if (savedSessions) {
        // Old format migration
        try {
            const oldSessions: any[] = JSON.parse(savedSessions);
            
            oldSessions.forEach(s => {
                // Map scrambler ID logic
                let scramblerId = s.scramblerId;
                if (!scramblerId) {
                    if (s.scrambleType === PuzzleType.TWO) scramblerId = '222';
                    else if (s.scrambleType === PuzzleType.FOUR) scramblerId = '444';
                    else if (s.scrambleType === PuzzleType.FIVE) scramblerId = '555';
                    else scramblerId = '333';
                }

                const solveIds: string[] = [];
                // Handle both legacy 'solves' array and potentially already migrated structures mixed in
                const list = Array.isArray(s.solves) ? s.solves : [];
                
                list.forEach((solve: any) => {
                    if (typeof solve === 'object') {
                        // Ensure ID
                        const sid = solve.id || generateId();
                        // Parse scramble if string
                        if (typeof solve.scramble === 'string') solve.scramble = [solve.scramble.split(' ')]; // Migrate to array of arrays
                        else if (Array.isArray(solve.scramble) && typeof solve.scramble[0] === 'string') solve.scramble = [solve.scramble];

                        const newSolve: Solve = { 
                            ...solve, 
                            id: sid,
                            scramblerId: Array.isArray(solve.scramblerId) ? solve.scramblerId : [solve.scramblerId || scramblerId]
                        };
                        finalSolves[sid] = newSolve;
                        solveIds.push(sid);
                    }
                });

                finalSessions.push({
                    id: s.id,
                    name: s.name,
                    tags: s.tags,
                    scramblerId: Array.isArray(scramblerId) ? scramblerId : [scramblerId],
                    customScramblerConfig: s.customScramblerConfig,
                    solveIds,
                    settingsOverride: s.settingsOverride
                });
            });

        } catch(e) { console.error("Migration Error", e); }
    } else {
        // Default / Test Data
        const test = generateTestSessions();
        test.forEach(s => {
            const solveIds = (s.solves || []).map((solve: Solve) => { 
                // Force structure
                solve.scramble = [solve.scramble as any];
                solve.scramblerId = [solve.scramblerId as any];
                finalSolves[solve.id] = solve;
                return solve.id;
            });
            const { solves, ...rest } = s;
            finalSessions.push({ ...rest, scramblerId: [rest.scramblerId], solveIds } as Session);
        });
    }

    // Late Migration: Ensure everything is arrays in loaded data
    finalSessions.forEach(s => {
        if (!Array.isArray(s.scramblerId)) s.scramblerId = [s.scramblerId];
    });
    Object.values(finalSolves).forEach(s => {
        if (!Array.isArray(s.scramble)) s.scramble = [s.scramble as any]; // Cast needed if bad data
        if (Array.isArray(s.scramble) && s.scramble.length > 0 && typeof s.scramble[0] === 'string') s.scramble = [s.scramble as any];
        if (!Array.isArray(s.scramblerId)) s.scramblerId = [s.scramblerId as any];
    });

    return { sessions: finalSessions, solves: finalSolves };
};

export const useAppStore = () => {
    // --- State ---
    const [stateLoaded, setStateLoaded] = useState(false);
    const [solves, setSolves] = useState<SolveMap>({});
    const [sessions, setSessions] = useState<Session[]>([]);
    
    const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
        return localStorage.getItem('cubetime_current_session') || 'default';
    });

    const [goals, setGoals] = useState<Goal[]>(() => {
        try {
            const saved = localStorage.getItem('cubetime_goals');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [statsConfig, setStatsConfig] = useState<StatConfig[]>(() => {
        try { 
            const saved = localStorage.getItem('cubetime_stats_config');
            return saved ? JSON.parse(saved) : DEFAULT_STATS_CONFIG;
        } catch { return DEFAULT_STATS_CONFIG; }
    });

    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem('cubetime_settings');
            if (saved) {
                const parsed = JSON.parse(saved);
                const merged = { 
                    ...DEFAULT_SETTINGS, 
                    ...parsed, 
                    layout: parsed.layout || DEFAULT_LAYOUT_CONFIG,
                    timeDistribution: parsed.timeDistribution || DEFAULT_SETTINGS.timeDistribution,
                    solvesOverTime: parsed.solvesOverTime || DEFAULT_SETTINGS.solvesOverTime,
                    goalsWidget: parsed.goalsWidget || DEFAULT_SETTINGS.goalsWidget,
                    scrambleImage: { ...DEFAULT_SETTINGS.scrambleImage, ...(parsed.scrambleImage || {}) }
                };
                return merged;
            }
        } catch {}
        return DEFAULT_SETTINGS;
    });

    const [actionQueue, setActionQueue] = useState<SyncAction[]>(() => {
        try {
            const saved = localStorage.getItem('cubetime_sync_queue');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    const [auth, setAuth] = useState<AuthState>(() => {
        const token = localStorage.getItem('cubetime_token');
        const userStr = localStorage.getItem('cubetime_user');
        return {
            token,
            user: userStr ? JSON.parse(userStr) : null,
            isSynced: true,
            lastSyncTime: Date.now()
        };
    });

    // Scramble - Now Array of Array of Strings
    const [scrambleHistory, setScrambleHistory] = useState<string[][][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // --- Initialization ---
    useEffect(() => {
        if (!stateLoaded) {
            const { sessions: s, solves: slv } = loadAndNormalizeData();
            setSessions(s);
            setSolves(slv);
            setStateLoaded(true);
        }
    }, [stateLoaded]);

    // --- Persistence ---
    useEffect(() => {
        if (!stateLoaded) return;
        try { localStorage.setItem('cubetime_sessions', JSON.stringify(sessions)); } catch {}
        try { localStorage.setItem('cubetime_solves', JSON.stringify(solves)); } catch {}
    }, [sessions, solves, stateLoaded]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_current_session', currentSessionId); } catch {}
    }, [currentSessionId]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_stats_config', JSON.stringify(statsConfig)); } catch {}
    }, [statsConfig]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_settings', JSON.stringify(settings)); } catch {}
    }, [settings]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_goals', JSON.stringify(goals)); } catch {}
    }, [goals]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_sync_queue', JSON.stringify(actionQueue)); } catch {}
    }, [actionQueue]);

    // --- Sync Logic ---
    const queueAction = useCallback((action: Omit<SyncAction, 'timestamp'>) => {
        if (!auth.token) return;
        setAuth(prev => ({ ...prev, isSynced: false }));
        setActionQueue(prev => [...prev, { ...action, timestamp: Date.now() }]);
    }, [auth.token]);

    // Queue setting changes
    const prevSettingsRef = useRef(settings);
    useEffect(() => {
        if (!auth.token) return;
        if (JSON.stringify(prevSettingsRef.current) !== JSON.stringify(settings)) {
            queueAction({ type: SyncActionType.UPDATE_SETTINGS, payload: settings });
            prevSettingsRef.current = settings;
        }
    }, [settings, auth.token, queueAction]);
    
    const prevGoalsRef = useRef(goals);
    useEffect(() => {
        if (!auth.token) return;
        if (JSON.stringify(prevGoalsRef.current) !== JSON.stringify(goals)) {
             queueAction({ type: SyncActionType.UPDATE_GOALS, payload: goals });
             prevGoalsRef.current = goals;
        }
    }, [goals, auth.token, queueAction]);

    // Sync Loop
    useEffect(() => {
        if (!auth.token || actionQueue.length === 0) return;

        const timer = setTimeout(async () => {
            const batch = [...actionQueue];
            try {
                setAuth(prev => ({ ...prev, isSynced: false })); // Ensure syncing state
                await api.sync(auth.token!, batch, auth.lastSyncTime || 0);
                
                // On success, remove the items we sent
                setActionQueue(prev => prev.filter(x => !batch.includes(x)));
                setAuth(prev => ({ ...prev, isSynced: true, lastSyncTime: Date.now() }));
            } catch (e) {
                console.error("Sync failed, retrying later", e);
                // Keep in queue
            }
        }, 5000); // Sync 5s after last change/attempt

        return () => clearTimeout(timer);
    }, [actionQueue, auth.token, auth.lastSyncTime]);


    // --- Derived ---
    const currentSession = useMemo(() => {
        const s = sessions.find(s => s.id === currentSessionId) || sessions[0];
        // Hydrate helper for components that expect embedded solves (like SessionManager)
        
        if (!s) return { id: 'temp', name: 'Loading', solveIds: [], solves: [], scramblerId: ['333'] } as unknown as Session & { solves: Solve[] };

        const hydratedSolves = s.solveIds
            .map(id => solves[id])
            .filter(Boolean)
            .sort((a, b) => a.timestamp - b.timestamp);
            
        return { ...s, solves: hydratedSolves };
    }, [sessions, currentSessionId, solves]);

    const effectiveSettings = useMemo(() => getEffectiveSettings(settings, currentSession), [settings, currentSession]);

    // Reset scramble history when switching sessions to ensure fresh scrambles for the new type
    useEffect(() => {
        setScrambleHistory([]);
        setHistoryIndex(-1);
    }, [currentSessionId]);

    // Scramble Init / Regeneration
    useEffect(() => {
        if (scrambleHistory.length === 0 && currentSession.scramblerId && currentSession.scramblerId.length > 0) {
            const s = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
            setScrambleHistory([s]);
            setHistoryIndex(0);
        }
    }, [currentSession.scramblerId, currentSession.customScramblerConfig, scrambleHistory.length]);

    const currentScramble = historyIndex >= 0 && historyIndex < scrambleHistory.length ? scrambleHistory[historyIndex] : [];

    // Compute Stats
    const computedSolves = useMemo<ComputedSolve[]>(() => {
        const hydrated = currentSession.solves || [];
        // Recalculate stats - returns array in same order (Chronological) with stats populated
        const withStats = recalculateSessionStats(hydrated);

        // Map to ComputedSolve (add PB info) - Iterate Chronologically to determine historical PBs
        const bests = new Map<string, number>();
        if (effectiveSettings.prePBs) Object.entries(effectiveSettings.prePBs).forEach(([k, v]) => bests.set(k, v as number));

        const computedChronological = withStats.map(solve => {
             const computed: ComputedSolve = { ...solve, stats: solve.stats! };
             const isPBMap: Record<string, boolean> = {};

             settings.timelistStats.forEach(config => {
                let val: number | null = null;
                if (config.type === StatType.SINGLE) {
                     val = getSolveTime(solve) ?? (solve.penalty === Penalty.DNF ? DNF_VALUE : null);
                } else if (config.type === StatType.MEAN && config.size === 3) {
                     val = solve.stats?.mean3 ?? null;
                } else if (config.type === StatType.AVERAGE && config.size === 5) {
                     val = solve.stats?.avg5 ?? null;
                } else if (config.type === StatType.AVERAGE && config.size === 12) {
                     val = solve.stats?.avg12 ?? null;
                }

                if (val !== null && val !== DNF_VALUE) {
                    const currentBest = bests.get(config.id) ?? Infinity;
                    if (val < currentBest) {
                        bests.set(config.id, val);
                        isPBMap[config.id] = true;
                    } else if (val === currentBest) {
                        // Mark ties as PB consistent with typical timer behavior
                        isPBMap[config.id] = true;
                    }
                }
            });
            return { ...computed, historicalPBs: isPBMap };
        });

        return computedChronological.reverse(); // Return Newest First for UI
    }, [currentSession.solves, settings.timelistStats, effectiveSettings.prePBs]);

    // --- Actions ---

    const addSolve = (time: number, inspectionTime: number, phases?: SolvePhase[]) => {
        let penalty = Penalty.NONE;
        
        if (effectiveSettings.autoPenalty && inspectionTime !== -1) {
             if (inspectionTime >= 17000) penalty = Penalty.DNF;
             else if (inspectionTime >= 15000) penalty = Penalty.PLUS_TWO;
        }

        const newSolve: Solve = {
            id: generateId(),
            timestamp: Date.now(),
            time,
            inspectionTime,
            phases,
            scramble: currentScramble,
            scramblerId: currentSession.scramblerId,
            penalty,
            tags: [],
            stats: { mean3: null, avg5: null, avg12: null } // Placeholder
        };

        // Optimistic Update
        setSolves(prev => ({ ...prev, [newSolve.id]: newSolve }));
        
        let updatedSession: Session | null = null;
        
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                updatedSession = { ...s, solveIds: [...s.solveIds, newSolve.id] };
                return updatedSession;
            }
            return s;
        }));

        // Check for PB (Fireworks)
        const isNewPB = computedSolves.every(s => {
             const t = getSolveTime(s) ?? Infinity;
             return time < t;
        });

        // Queue
        queueAction({ type: SyncActionType.UPSERT_SOLVES, payload: [newSolve] });
        if (updatedSession) {
            queueAction({ type: SyncActionType.UPDATE_SESSION, payload: updatedSession });
        }

        const next = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
        setScrambleHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
        setHistoryIndex(prev => prev + 1);

        return isNewPB && settings.pbFireworks;
    };

    const deleteSolves = (ids: string[]) => {
        const idSet = new Set(ids);
        
        let updatedSession: Session | null = null;
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                updatedSession = { ...s, solveIds: s.solveIds.filter(id => !idSet.has(id)) };
                return updatedSession;
            }
            return s;
        }));
        
        setSolves(prev => {
            const next = { ...prev };
            ids.forEach(id => delete next[id]);
            return next;
        });

        queueAction({ type: SyncActionType.DELETE_SOLVES, payload: ids });
        if (updatedSession) {
            queueAction({ type: SyncActionType.UPDATE_SESSION, payload: updatedSession });
        }
    };

    const updatePenalty = (id: string, penalty: Penalty) => updateSolve(id, { penalty });

    const updateSolve = (id: string, updates: Partial<Solve>) => {
        const oldSolve = solves[id];
        if (!oldSolve) return;
        const newSolve = { ...oldSolve, ...updates };

        setSolves(prev => ({ ...prev, [id]: newSolve }));
        queueAction({ type: SyncActionType.UPSERT_SOLVES, payload: [newSolve] });
    };

    // Update to accept string[] for scramblerId
    const createSession = (name: string, scramblerId: string | string[], tags: string[] = []) => {
        const scramblerIdArray = Array.isArray(scramblerId) ? scramblerId : [scramblerId];
        
        const newSession: Session = { 
            id: generateId(), 
            name, 
            scramblerId: scramblerIdArray, 
            solveIds: [], 
            tags,
            customScramblerConfig: undefined 
        };
        
        setSessions(prev => [...prev, newSession]);
        setCurrentSessionId(newSession.id);
        
        queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newSession });

        const s = generateScramble(scramblerIdArray);
        setScrambleHistory([s]);
        setHistoryIndex(0);
    };

    const updateSession = (id: string, updates: Partial<Session>) => {
        let updatedSession: Session | null = null;
        setSessions(prev => prev.map(s => {
            if (s.id === id) {
                updatedSession = { ...s, ...updates };
                return updatedSession;
            }
            return s;
        }));

        if (updatedSession) {
            queueAction({ type: SyncActionType.UPDATE_SESSION, payload: updatedSession });
        }

        if (id === currentSessionId && (updates.scramblerId || updates.customScramblerConfig)) {
            const sid = updates.scramblerId || currentSession.scramblerId;
            const cfg = updates.customScramblerConfig !== undefined ? updates.customScramblerConfig : currentSession.customScramblerConfig;
            const s = generateScramble(sid, cfg);
            setScrambleHistory([s]);
            setHistoryIndex(0);
        }
    };

    const deleteSession = (id: string) => {
        if (sessions.length <= 1) return;
        const sessionToDelete = sessions.find(s => s.id === id);
        if (!sessionToDelete) return;

        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);

        queueAction({ type: SyncActionType.DELETE_SESSION, payload: id });
    };

    const moveSolves = (targetSessionId: string, solveIds: string[]) => {
        if (targetSessionId === currentSessionId) return;
        if (solveIds.length === 0) return;

        const source = sessions.find(s => s.id === currentSessionId);
        const target = sessions.find(s => s.id === targetSessionId);
        
        if (!source || !target) return;

        const idSet = new Set(solveIds);
        const newSourceIds = source.solveIds.filter(id => !idSet.has(id));
        const newTargetIds = [...target.solveIds, ...solveIds];

        const newSource = { ...source, solveIds: newSourceIds };
        const newTarget = { ...target, solveIds: newTargetIds };

        setSessions(prev => prev.map(s => {
            if (s.id === source.id) return newSource;
            if (s.id === target.id) return newTarget;
            return s;
        }));

        queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newSource });
        queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newTarget });
    };

    const nextScramble = () => {
        const next = generateScramble(currentSession.scramblerId, currentSession.customScramblerConfig);
        setScrambleHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
        setHistoryIndex(prev => prev + 1);
    };

    const prevScramble = () => {
        if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
    };

    // Goals Actions
    const addGoal = (goal: Goal) => {
        setGoals(prev => [...prev, goal]);
    };
    
    const updateGoal = (id: string, updates: Partial<Goal>) => {
        setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
    };
    
    const deleteGoal = (id: string) => {
        setGoals(prev => prev.filter(g => g.id !== id));
    };

    // --- Data Management & Auth ---
    
    const processImport = (data: { sessions: { session: Session, targetId: string | 'NEW' }[], settings?: Settings, statsConfig?: StatConfig[] }) => {
        if (data.settings) {
             setSettings(data.settings);
             queueAction({ type: SyncActionType.UPDATE_SETTINGS, payload: data.settings });
        }
        if (data.statsConfig) setStatsConfig(data.statsConfig);

        // To batch efficient map updates
        let newSolvesMap = { ...solves };
        let newSessionsList = [...sessions];

        data.sessions.forEach(item => {
            const { session: importedSession, targetId } = item;
            // importedSession is likely hydrated (has `solves` array) from the parsing logic.
            // We need to normalize it.
            const hydratedSolves = (importedSession as any).solves as Solve[] || [];

            // Calculate stats for imported solves
            const solvesWithStats = recalculateSessionStats(hydratedSolves);
            
            // Map to ensure scramblerId is present and normalized
            const sessionScramblerIds = Array.isArray(importedSession.scramblerId) ? importedSession.scramblerId : [importedSession.scramblerId || '333'];

            const finalSolves = solvesWithStats.map(s => {
                let finalScramble = s.scramble;
                if (!Array.isArray(finalScramble)) finalScramble = [finalScramble as any];
                // Double check first element is string[] not string
                if (finalScramble.length > 0 && typeof finalScramble[0] === 'string') finalScramble = [finalScramble as any];

                let finalScramblerId = s.scramblerId;
                if (!Array.isArray(finalScramblerId)) finalScramblerId = [finalScramblerId as any];

                return {
                    ...s,
                    scramble: finalScramble,
                    scramblerId: finalScramblerId || sessionScramblerIds
                };
            });
            
            const importedIds: string[] = [];

            finalSolves.forEach(s => {
                newSolvesMap[s.id] = s;
                importedIds.push(s.id);
            });

            // Queue solve upserts
            if (finalSolves.length > 0) {
                queueAction({ type: SyncActionType.UPSERT_SOLVES, payload: finalSolves });
            }

            if (targetId === 'NEW') {
                const newSess: Session = {
                    ...importedSession,
                    scramblerId: sessionScramblerIds,
                    solveIds: importedIds
                };
                // Remove `solves` prop if it exists from cast
                delete (newSess as any).solves; 
                newSessionsList.push(newSess);
                queueAction({ type: SyncActionType.UPDATE_SESSION, payload: newSess });
            } else {
                const idx = newSessionsList.findIndex(s => s.id === targetId);
                if (idx !== -1) {
                    const updatedSess = {
                        ...newSessionsList[idx],
                        solveIds: [...newSessionsList[idx].solveIds, ...importedIds]
                    };
                    newSessionsList[idx] = updatedSess;
                    queueAction({ type: SyncActionType.UPDATE_SESSION, payload: updatedSess });
                }
            }
        });

        setSolves(newSolvesMap);
        setSessions(newSessionsList);
    };

    const hasSignificantLocalData = () => Object.keys(solves).length > 0;

    const login = async (u: string, p: string) => {
        const res = await api.login({ username: u, password: p });
        localStorage.setItem('cubetime_token', res.token);
        localStorage.setItem('cubetime_user', JSON.stringify(res.user));
        
        if (res.data) {
            setSessions(res.data.sessions);
            setSolves(res.data.solves);
            setSettings(res.data.settings);
            setStatsConfig(res.data.statsConfig);
            if (res.data.goals) setGoals(res.data.goals);
            setCurrentSessionId(res.data.currentSessionId);
        }
        setAuth({ token: res.token, user: res.user, isSynced: true, lastSyncTime: Date.now() });
        setActionQueue([]);
    };

    const register = async (u: string, p: string, e: string) => {
        const initialData: FullStateData = {
            sessions,
            solves,
            settings,
            statsConfig,
            goals,
            currentSessionId,
            updatedAt: Date.now()
        };
        const res = await api.register({ username: u, password: p, email: e, initialData });
        localStorage.setItem('cubetime_token', res.token);
        localStorage.setItem('cubetime_user', JSON.stringify(res.user));
        setAuth({ token: res.token, user: res.user, isSynced: true, lastSyncTime: Date.now() });
    };

    const logout = () => {
        localStorage.removeItem('cubetime_token');
        localStorage.removeItem('cubetime_user');
        setAuth({ token: null, user: null, isSynced: false });
    };

    return {
        sessions,
        solves,
        currentSession, 
        currentSessionId,
        setCurrentSessionId,
        settings,
        setSettings,
        statsConfig,
        setStatsConfig,
        goals,
        effectiveSettings,
        currentScramble,
        computedSolves,
        auth,
        actions: {
            addSolve,
            deleteSolves,
            updatePenalty,
            updateSolve,
            createSession,
            updateSession,
            deleteSession,
            moveSolves,
            nextScramble,
            prevScramble,
            addGoal,
            updateGoal,
            deleteGoal,
            processImport,
            login,
            register,
            logout,
            hasSignificantLocalData
        }
    };
};
