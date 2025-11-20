
import { useState, useEffect, useMemo } from 'react';
import { Session, Solve, Settings, StatConfig, StatType, Penalty, ComputedSolve, ScrambleType, InspectionDirection, TimePrecision, StartInputMethod, PBVisualType, AppTheme, Language, SolvePhase, ShortcutAction } from '../types';
import { generateTestSessions, generateId, calculateSolveStats, DNF_VALUE, generateScramble, getEffectiveSettings } from '../utils';

const DEFAULT_STATS_CONFIG: StatConfig[] = [
    { id: '1', type: StatType.SINGLE, size: 1 },
    { id: '2', type: StatType.MEAN, size: 3 },
    { id: '3', type: StatType.AVERAGE, size: 5 },
    { id: '4', type: StatType.AVERAGE, size: 12 },
    { id: '5', type: StatType.AVERAGE, size: 50 },
    { id: '6', type: StatType.AVERAGE, size: 100 },
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
    [ShortcutAction.MOVE_SELECTION_DOWN]: 'ArrowDown'
};

const DEFAULT_SETTINGS: Settings = {
    inspectionEnabled: true,
    inspectionDirection: InspectionDirection.DOWN,
    holdToStart: true,
    startInput: StartInputMethod.SPACE,
    restartDelayEnabled: false,
    restartDelayMs: 500,
    timePrecision: TimePrecision.MILLI,
    inspectionPrecision: TimePrecision.SECONDS,
    inspectionFlashes: { enabled8: false, enabled12: false, enabled15: false },
    hideWhileTiming: false,
    hideWhileTimingText: '',
    theme: AppTheme.ZINC,
    backgroundColor: '#18181b',
    textColor: '#e4e4e7',
    language: Language.EN,
    pbVisuals: PBVisualType.HIGHLIGHT,
    pbFireworks: true,
    paginationEnabled: false,
    pageSize: 100,
    timelistStats: DEFAULT_TIMELIST_CONFIG,
    shortcuts: DEFAULT_SHORTCUTS
};

export const useAppStore = () => {
    // --- State ---
    const [sessions, setSessions] = useState<Session[]>(() => {
        const saved = localStorage.getItem('cubetime_sessions');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                const hasBig = parsed.find((s: Session) => s.id === 'benchmark');
                if (!hasBig) return generateTestSessions();
                return parsed;
            } catch (e) { console.error(e); }
        }
        return generateTestSessions();
    });
    
    const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
        return localStorage.getItem('cubetime_current_session') || 'default';
    });

    const [statsConfig, setStatsConfig] = useState<StatConfig[]>(() => {
        const saved = localStorage.getItem('cubetime_stats_config');
        if (saved) {
            try { return JSON.parse(saved); } catch(e) {}
        }
        return DEFAULT_STATS_CONFIG;
    });

    const [settings, setSettings] = useState<Settings>(() => {
        const saved = localStorage.getItem('cubetime_settings');
        if (saved) {
            try { return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }; } catch(e) {}
        }
        return DEFAULT_SETTINGS;
    });

    // Scramble Logic
    const [scrambleHistory, setScrambleHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // --- Persistence ---
    useEffect(() => {
        const handler = setTimeout(() => {
             try { localStorage.setItem('cubetime_sessions', JSON.stringify(sessions)); } catch (e) {}
        }, 1000);
        return () => clearTimeout(handler);
    }, [sessions]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_current_session', currentSessionId); } catch (e) {}
    }, [currentSessionId]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_stats_config', JSON.stringify(statsConfig)); } catch (e) {}
    }, [statsConfig]);

    useEffect(() => {
        try { localStorage.setItem('cubetime_settings', JSON.stringify(settings)); } catch (e) {}
    }, [settings]);

    // --- Derived ---
    const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
    const effectiveSettings = useMemo(() => getEffectiveSettings(settings, currentSession), [settings, currentSession]);
    
    // Initial Scramble
    useEffect(() => {
        if (scrambleHistory.length === 0) {
            const s = generateScramble(currentSession.scrambleType || ScrambleType.THREE);
            setScrambleHistory([s]);
            setHistoryIndex(0);
        }
    }, [currentSession.scrambleType]);

    const currentScramble = historyIndex >= 0 && historyIndex < scrambleHistory.length 
        ? scrambleHistory[historyIndex] 
        : '';

    const computedSolves = useMemo<ComputedSolve[]>(() => {
        const chronological = [...currentSession.solves].sort((a, b) => a.timestamp - b.timestamp);
        const bests = new Map<string, number>(); 
        
        if (effectiveSettings.prePBs) {
            Object.entries(effectiveSettings.prePBs).forEach(([key, val]) => bests.set(key, val));
        }

        const result = chronological.map(solve => {
            const computed: ComputedSolve = { 
                ...solve, 
                stats: solve.stats || { mean3: null, avg5: null, avg12: null } 
            };
            const isPBMap: Record<string, boolean> = {};

            settings.timelistStats.forEach(config => {
                let val: number | null = null;
                if (config.type === StatType.SINGLE) {
                     val = solve.penalty === Penalty.DNF ? DNF_VALUE : solve.time + (solve.penalty === Penalty.PLUS_TWO ? 2000 : 0);
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
                        isPBMap[config.id] = true;
                    }
                }
            });
            return { ...computed, historicalPBs: isPBMap };
        });
        return result.reverse();
    }, [currentSession.solves, settings.timelistStats, effectiveSettings.prePBs]);

    // --- Actions ---
    const addSolve = (time: number, phases?: SolvePhase[]) => {
        const newSolveRaw: Solve = {
            id: generateId(),
            timestamp: Date.now(),
            time,
            phases,
            scramble: currentScramble,
            penalty: Penalty.NONE
        };
        
        let isNewPB = false;

        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                const sortedHistory = [...s.solves].sort((a, b) => a.timestamp - b.timestamp);
                const stats = calculateSolveStats(newSolveRaw, sortedHistory);
                
                if (settings.pbFireworks) {
                    const isPB = sortedHistory.every(h => {
                        const t = h.penalty === Penalty.DNF ? Infinity : h.time + (h.penalty === Penalty.PLUS_TWO ? 2000 : 0);
                        return time < t;
                    });
                    if (isPB && sortedHistory.length > 0) isNewPB = true;
                }

                const newSolveWithStats: Solve = { ...newSolveRaw, stats };
                return { ...s, solves: [...s.solves, newSolveWithStats] };
            }
            return s;
        }));
        
        // Generate next scramble and add to history
        const next = generateScramble(currentSession.scrambleType || ScrambleType.THREE);
        setScrambleHistory(prev => {
            // Truncate future if we were in past
            const now = prev.slice(0, historyIndex + 1);
            return [...now, next];
        });
        setHistoryIndex(prev => prev + 1);

        return isNewPB;
    };

    const deleteSolves = (ids: string[]) => {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, solves: s.solves.filter(solve => !ids.includes(solve.id)) } : s));
    };

    const updatePenalty = (id: string, penalty: Penalty) => {
        setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, solves: s.solves.map(solve => solve.id === id ? { ...solve, penalty } : solve) } : s));
    };

    const createSession = (name: string, type: ScrambleType) => {
        const newSession: Session = { id: generateId(), name, scrambleType: type, solves: [] };
        setSessions(prev => [...prev, newSession]);
        setCurrentSessionId(newSession.id);
        // Reset Scramble
        const s = generateScramble(type);
        setScrambleHistory([s]);
        setHistoryIndex(0);
    };

    const updateSession = (id: string, updates: Partial<Session>) => {
        setSessions(prev => prev.map(s => {
            if (s.id === id) {
                const updated = { ...s, ...updates };
                // If scramble type changed, regenerate scramble history for this session interaction
                if (updates.scrambleType && updates.scrambleType !== s.scrambleType && id === currentSessionId) {
                    // We do this in the effect/render cycle via history reset usually, 
                    // but here we want to be explicit.
                    // However, state updates inside map are tricky.
                    // Easier to handle via effect monitoring currentSession.scrambleType
                }
                return updated;
            }
            return s;
        }));
    };

    const deleteSession = (id: string) => {
        if (sessions.length <= 1) return;
        const newSessions = sessions.filter(s => s.id !== id);
        setSessions(newSessions);
        if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);
    };

    const nextScramble = () => {
        const next = generateScramble(currentSession.scrambleType || ScrambleType.THREE);
        setScrambleHistory(prev => [...prev.slice(0, historyIndex + 1), next]);
        setHistoryIndex(prev => prev + 1);
    };

    const prevScramble = () => {
        if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
    };
    
    const importState = (jsonData: string) => {
        try {
            const data = JSON.parse(jsonData);
            if (data.sessions) setSessions(data.sessions);
            if (data.settings) setSettings(data.settings);
            if (data.statsConfig) setStatsConfig(data.statsConfig);
            if (data.currentSessionId) setCurrentSessionId(data.currentSessionId);
            alert("Data imported successfully!");
        } catch (e) {
            alert("Failed to import data: " + e);
        }
    };

    return {
        sessions,
        currentSession,
        currentSessionId,
        setCurrentSessionId,
        settings,
        setSettings,
        statsConfig,
        setStatsConfig,
        effectiveSettings,
        currentScramble,
        computedSolves,
        actions: {
            addSolve,
            deleteSolves,
            updatePenalty,
            createSession,
            updateSession,
            deleteSession,
            nextScramble,
            prevScramble,
            importState
        }
    };
};
