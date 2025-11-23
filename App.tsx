

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppStoreProvider, useAppStore } from './hooks/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { WidgetId, TimerState, Penalty, ShortcutAction, Goal, AppTheme, FullStateData } from './types';
import { getPreset, WIDGET_DEFINITIONS } from './utils';
import Timer from './components/Timer';
import TimeList, { TimeListHandle } from './components/TimeList';
import StatsPanel from './components/widgets/StatsPanel';
import SessionManager from './components/SessionManager';
import SettingsModal from './components/SettingsModal';
import { ScrambleWidget } from './components/widgets/ScrambleWidget';
import { ScrambleImageWidget } from './components/widgets/ScrambleImageWidget';
import { TimeDistributionWidget } from './components/widgets/TimeDistributionWidget';
import { GoalsWidget } from './components/widgets/GoalsWidget';
import { SolvesOverTimeWidget } from './components/widgets/SolvesOverTimeWidget';
import { MetronomeWidget } from './components/widgets/MetronomeWidget';
import { TagAssignerWidget } from './components/widgets/TagAssignerWidget';
import { CommandPalette } from './components/CommandPalette';
import { ManualEntry } from './components/ManualEntry';
import { ProfileModal } from './components/ProfileModal';
import { DataManagementModal } from './components/DataManagementModal';
import { GoalManagerModal } from './components/GoalManagerModal';
import { MoveSolvesModal } from './components/MoveSolvesModal';
import AboutModal from './components/AboutModal';
import Fireworks from './components/Fireworks';
import SolveDetailsModal from './components/SolveDetailsModal';
import SessionSettingsModal from './components/SessionSettingsModal';
import StatisticsModal from './components/StatisticsModal';
import { VirtualCube } from './components/VirtualCube';
import { PluginWidgetWrapper } from './components/PluginWidgetWrapper';
import { pluginManager } from './plugins/PluginManager';
import { PluginDialogModal } from './components/PluginDialogModal';
import { ToastContainer, Toast } from './components/ToastContainer';

import { Settings as SettingsIcon, BarChart2, User, Save, ChevronLeft, Box, LayoutGrid, List, PieChart, Activity, Music, Tag, ChevronDown } from 'lucide-react';

const AppContent: React.FC = () => {
    const {
        sessions, solves, currentSession, currentSessionId, setCurrentSessionId,
        settings, setSettings, statsConfig, setStatsConfig, goals, plugins,
        effectiveSettings, currentScramble, computedSolves, auth,
        actions
    } = useAppStore();

    // Modals
    const [modal, setModal] = useState<{ type: string; data?: any; mode?: string; resolve?: (v: any) => void } | null>(null);
    const closeModal = () => setModal(null);

    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (msg: string, duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message: msg, duration }]);
    };
    const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Mobile State
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [activeMobileWidget, setActiveMobileWidget] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Plugin API Bridge ---
    const api = useMemo(() => ({
        getState: () => ({
            sessions,
            solves,
            settings,
            statsConfig,
            goals,
            plugins,
            currentSessionId,
            updatedAt: Date.now()
        } as FullStateData),
        addSolve: (time: number, penalty?: Penalty) => {
            actions.addSolve(time, -1, undefined, penalty);
        },
        updateSettings: (s: any) => setSettings({ ...settings, ...s }),
        toast: (msg: string) => addToast(msg),
        registerWidget: () => {}, 
        registerScrambler: () => {}, 
        registerScrambleRenderer: () => {},
        alert: (msg: string) => new Promise<void>((resolve) => {
            setModal({ type: 'PLUGIN_ALERT', data: msg, resolve });
        }),
        prompt: (msg: string, def?: string) => new Promise<string | null>((resolve) => {
            setModal({ type: 'PLUGIN_PROMPT', data: { msg, def }, resolve });
        }),
        onCleanup: () => {}
    }), [sessions, solves, settings, statsConfig, goals, plugins, currentSessionId, actions]);

    // Plugin Initialization & Update
    useEffect(() => {
        const uiCallbacks = {
            alert: api.alert,
            prompt: api.prompt
        };

        pluginManager.initialize(api as any, plugins, uiCallbacks);
        pluginManager.updateApi(api as any);
    }, [api, plugins]);

    // Timer State
    const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
    const [timerTime, setTimerTime] = useState(0);
    const [timerStartTime, setTimerStartTime] = useState(0);
    const [fireworks, setFireworks] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    const timeListRef = useRef<TimeListHandle>(null);

    // Scramble Visualizer Interaction State (shared between widgets)
    const [scrambleVisualizerState, setScrambleVisualizerState] = useState<{ activeScrambleIndex?: number; activeMoveIndex?: number }>({});

    const isVirtual = !!effectiveSettings.virtualCube;

    // Reset visualizer state when scramble changes
    useEffect(() => {
        setScrambleVisualizerState({});
    }, [currentScramble]);

    // Unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (auth.user && !auth.isSynced) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [auth.user, auth.isSynced]);

    // Timer Callbacks
    const handleTimerStart = (start: number) => {
        setTimerState(TimerState.RUNNING);
        setTimerStartTime(start);
        // Clear selection on start
        if (selectedIds.size > 0) setSelectedIds(new Set());
        setScrambleVisualizerState({}); // Reset visualizer
    };

    const handleTimerStop = (finalTime: number, inspection: number, phases: any[], penaltyOverride?: Penalty) => {
        setTimerState(TimerState.STOPPED);
        setTimerTime(finalTime);
        
        const { id, isPB } = actions.addSolve(finalTime, inspection, phases, penaltyOverride);
        
        // Auto Select new solve
        setSelectedIds(new Set([id]));
        setLastClickedId(id);
        
        if (isPB) {
            setFireworks(true);
            setTimeout(() => setFireworks(false), 5000);
        }

        // Delay to return to IDLE
        setTimeout(() => {
            setTimerState(TimerState.IDLE);
            setTimerTime(0);
        }, settings.restartDelayEnabled ? settings.restartDelayMs : 0);

        return id; // Return ID for DNF logic
    };

    // Touch handling for Mobile Timer
    const handleTouchStart = () => {
        if (timerState === TimerState.LOCKED) return;
        if (timerState === TimerState.RUNNING) {
            const now = performance.now();
            // Mobile simple stop
            // Calculate time immediately
            const finalTime = now - timerStartTime;
            // We don't support phases/splits easily on mobile touch stop yet
            const phases = [{ duration: finalTime, cumulative: finalTime }];
            handleTimerStop(finalTime, -1, phases); 
            return;
        }

        if (timerState === TimerState.IDLE || timerState === TimerState.STOPPED) {
            if (effectiveSettings.inspectionEnabled) {
                setTimerState(TimerState.INSPECTION);
            } else {
                setTimerState(TimerState.HOLDING);
                // Simple timeout to READY for touch
                setTimeout(() => {
                    setTimerState(current => current === TimerState.HOLDING ? TimerState.READY : current);
                }, effectiveSettings.holdToStart ? 300 : 0);
            }
        } else if (timerState === TimerState.INSPECTION) {
            setTimerState(TimerState.HOLDING);
            setTimeout(() => {
                setTimerState(current => current === TimerState.HOLDING ? TimerState.READY : current);
            }, effectiveSettings.holdToStart ? 300 : 0);
        }
    };

    const handleTouchEnd = () => {
        if (timerState === TimerState.READY) {
            const now = performance.now();
            handleTimerStart(now);
        } else if (timerState === TimerState.HOLDING) {
            setTimerState(TimerState.IDLE);
        }
    };

    // Virtual Cube Specific Handlers
    const handleVirtualMove = () => {
        if (timerState === TimerState.IDLE || timerState === TimerState.INSPECTION) {
            // Start timer
            handleTimerStart(performance.now());
        }
    };

    const handleVirtualSolve = () => {
        if (timerState === TimerState.RUNNING) {
            const now = performance.now();
            const finalTime = now - timerStartTime;
            // Virtual Cube only has 1 phase
            const phases = [{ duration: finalTime, cumulative: finalTime }];
            handleTimerStop(finalTime, -1, phases); // Inspection handled by Timer component display, we just pass -1 or capture it from Timer ref if we wanted to be precise
        }
    };

    // Keyboard Shortcuts
    const handleShortcut = (action: ShortcutAction) => {
        // Disable all shortcuts except ESC if modal is open
        if (modal && action !== ShortcutAction.ESCAPE) return;

        if (timerState === TimerState.RUNNING || timerState === TimerState.INSPECTION) {
             if (action === ShortcutAction.ESCAPE) {
                 // Escape to DNF Logic
                 const now = performance.now();
                 let finalTime = 0;
                 if (timerState === TimerState.RUNNING) finalTime = now - timerStartTime;
                 // If inspection, time is technically 0 but effectively counted as DNF by penalty
                 
                 const phases = [{ duration: finalTime, cumulative: finalTime }];
                 handleTimerStop(finalTime, -1, phases, Penalty.DNF);
                 return;
             }
             return; 
        }

        switch(action) {
            case ShortcutAction.NEXT_SCRAMBLE: actions.nextScramble(); break;
            case ShortcutAction.PREV_SCRAMBLE: actions.prevScramble(); break;
            case ShortcutAction.PENALTY_PLUS_TWO:
                if (currentSession.locked) return;
                if (selectedIds.size > 0) selectedIds.forEach(id => actions.updatePenalty(id, Penalty.PLUS_TWO));
                else if (computedSolves.length > 0) actions.updatePenalty(computedSolves[0].id, Penalty.PLUS_TWO);
                break;
            case ShortcutAction.PENALTY_DNF:
                if (currentSession.locked) return;
                if (selectedIds.size > 0) selectedIds.forEach(id => actions.updatePenalty(id, Penalty.DNF));
                else if (computedSolves.length > 0) actions.updatePenalty(computedSolves[0].id, Penalty.DNF);
                break;
            case ShortcutAction.DELETE_LAST:
                if (currentSession.locked) return;
                if (selectedIds.size > 0) {
                    // Default keyboard delete is current session only
                    actions.deleteSolves(Array.from(selectedIds), currentSessionId);
                    setSelectedIds(new Set());
                } else if (computedSolves.length > 0) {
                    if (confirm('Delete last solve?')) actions.deleteSolves([computedSolves[0].id], currentSessionId);
                }
                break;
            case ShortcutAction.OPEN_SESSION_MANAGER: setModal({ type: 'SESSION_MANAGER' }); break;
            case ShortcutAction.MANUAL_ENTRY: setModal({ type: 'MANUAL_ENTRY' }); break;
            case ShortcutAction.OPEN_DETAILS:
                if (selectedIds.size === 1) setModal({ type: 'DETAILS', data: Array.from(selectedIds)[0] });
                else if (computedSolves.length > 0) setModal({ type: 'DETAILS', data: computedSolves[0].id });
                break;
            case ShortcutAction.OPEN_COMMAND_PALETTE: setModal({ type: 'COMMAND' }); break;
            
            // Navigation
            case ShortcutAction.MOVE_SELECTION_UP: 
            case ShortcutAction.MOVE_SELECTION_DOWN:
                if (timeListRef.current) {
                    const d = action === ShortcutAction.MOVE_SELECTION_UP ? -1 : 1;
                    const newId = timeListRef.current.moveSelection(d, false);
                    if (newId) setLastClickedId(newId);
                }
                break;
            case ShortcutAction.EXTEND_SELECTION_UP:
            case ShortcutAction.EXTEND_SELECTION_DOWN:
                if (timeListRef.current) {
                    const d = action === ShortcutAction.EXTEND_SELECTION_UP ? -1 : 1;
                    const newId = timeListRef.current.moveSelection(d, true);
                    if (newId) setLastClickedId(newId);
                }
                break;
            
            // Puzzle Navigation (Scramble Visualizer)
            case ShortcutAction.NEXT_PUZZLE:
                if (currentScramble.length > 1) {
                    setScrambleVisualizerState(prev => ({ 
                        activeScrambleIndex: Math.min(currentScramble.length - 1, (prev.activeScrambleIndex ?? 0) + 1) 
                    }));
                }
                break;
            case ShortcutAction.PREV_PUZZLE:
                if (currentScramble.length > 1) {
                    setScrambleVisualizerState(prev => ({ 
                        activeScrambleIndex: Math.max(0, (prev.activeScrambleIndex ?? 0) - 1) 
                    }));
                }
                break;
        }
    };

    useKeyboardShortcuts(settings, handleShortcut);

    // Selection Handlers
    const handleSelect = (id: string, multi: boolean, range: boolean) => {
        const newSet = new Set(multi ? selectedIds : []);
        if (range && lastClickedId && lastClickedId !== id) {
            // Simple range selection in current view
            const idx1 = computedSolves.findIndex(s => s.id === lastClickedId);
            const idx2 = computedSolves.findIndex(s => s.id === id);
            if (idx1 !== -1 && idx2 !== -1) {
                const start = Math.min(idx1, idx2);
                const end = Math.max(idx1, idx2);
                for (let i = start; i <= end; i++) {
                    newSet.add(computedSolves[i].id);
                }
            }
        } else {
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
        }
        setSelectedIds(newSet);
        setLastClickedId(id);
    };

    // Derived Display Props for Timer
    const selectedSolve = useMemo(() => {
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            return computedSolves.find(s => s.id === id);
        }
        return null;
    }, [selectedIds, computedSolves]);

    const timerDisplayProps = useMemo(() => {
        if (selectedSolve) {
            return { time: selectedSolve.time, penalty: selectedSolve.penalty };
        }
        return { time: 0, penalty: Penalty.NONE };
    }, [selectedSolve]);

    // Layout Rendering
    const renderWidget = (id: string) => {
        switch (id) {
            case WidgetId.TIMER:
                return (
                    <div className="relative w-full h-full">
                        <div className={`absolute w-full transition-all duration-300 ${isVirtual ? 'top-0 pt-2 h-auto z-30 pointer-events-none' : 'inset-0 z-0'}`}>
                            <Timer 
                                state={timerState} 
                                time={timerDisplayProps.time}
                                penalty={timerDisplayProps.penalty}
                                startTime={timerStartTime}
                                settings={effectiveSettings}
                                numberOfPhases={effectiveSettings.numberOfPhases || 1}
                                onTimerStart={!isVirtual ? handleTimerStart : () => {}}
                                onTimerStop={!isVirtual ? handleTimerStop : () => {}}
                                onInspectionStart={() => setTimerState(TimerState.INSPECTION)}
                                onPrepare={() => !isVirtual && setTimerState(TimerState.HOLDING)}
                                onReady={() => !isVirtual && setTimerState(TimerState.READY)}
                                onCancelPrepare={() => !isVirtual && setTimerState(TimerState.IDLE)}
                            />
                        </div>
                        
                        {isVirtual && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center">
                                <div className="w-full h-full max-w-[600px] max-h-[600px]">
                                    <VirtualCube 
                                        scramble={currentScramble[0] || []}
                                        isActive={timerState === TimerState.RUNNING}
                                        onMove={handleVirtualMove}
                                        onSolve={handleVirtualSolve}
                                        config={settings.scrambleImage}
                                        timerState={timerState}
                                        isModalOpen={!!modal || activeMobileWidget !== null}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                );
            case WidgetId.TIMELIST:
                return <TimeList
                    ref={timeListRef}
                    solves={computedSolves}
                    selectedIds={selectedIds}
                    lastClickedId={lastClickedId}
                    precision={effectiveSettings.timePrecision}
                    paginationEnabled={settings.paginationEnabled}
                    pageSize={settings.pageSize}
                    columns={settings.timelistStats}
                    pbVisuals={settings.pbVisuals}
                    theme={settings.theme}
                    language={settings.language}
                    onSelect={handleSelect}
                    onDelete={(ids, global) => { 
                        actions.deleteSolves(ids, global ? undefined : currentSessionId); 
                        setSelectedIds(new Set()); 
                    }}
                    onPenalty={(id, p) => actions.updatePenalty(id, p)}
                    onDetails={(id) => setModal({ type: 'DETAILS', data: id })}
                    onMove={(ids) => setModal({ type: 'MOVE', data: ids, mode: 'MOVE' })}
                    onDuplicate={(ids) => setModal({ type: 'MOVE', data: ids, mode: 'DUPLICATE' })}
                    className="h-full"
                    sessionLocked={!!currentSession.locked}
                />;
            case WidgetId.STATS:
                return <div className="h-full overflow-y-auto custom-scrollbar p-2">
                    <StatsPanel 
                        config={statsConfig} 
                        solves={currentSession.solves} 
                        theme={settings.theme} 
                        pbVisuals={settings.pbVisuals}
                        precision={effectiveSettings.timePrecision}
                    />
                </div>;
            case WidgetId.SCRAMBLE:
                return <ScrambleWidget 
                    scramble={currentScramble} 
                    visualizerState={scrambleVisualizerState}
                    setVisualizerState={setScrambleVisualizerState}
                />;
            case WidgetId.SCRAMBLE_IMAGE:
                if(!isVirtual)
                return <ScrambleImageWidget 
                    scramble={currentScramble}
                    visualizerState={scrambleVisualizerState}
                    scramblerIds={currentSession.scramblerId}
                    imageConfig={settings.scrambleImage}
                />;
            case WidgetId.SESSION:
                return <div className="flex items-center justify-center h-full px-4">
                    <button 
                        onClick={() => setModal({ type: 'SESSION_MANAGER' })}
                        className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-lg font-bold truncate"
                    >
                        {currentSession.name}
                        <ChevronDown size={16} className="text-zinc-500" />
                    </button>
                </div>;
            case WidgetId.LOGO:
                return <div onClick={() => setModal({ type: 'ABOUT' })} className="flex items-center justify-center h-full">
                    <span className="font-black text-xl tracking-tighter text-zinc-500 select-none hover:text-zinc-200 transition-colors">
                        CMOSTimer v3
                    </span>
                </div>;
            case WidgetId.TOOLS:
                return <div className="flex items-center justify-center h-full gap-2 px-2">
                    <button onClick={() => setModal({ type: 'PROFILE' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><User size={20} className={auth.user ? 'text-blue-400' : ''}/></button>
                    <button onClick={() => setModal({ type: 'DATA' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Save size={20}/></button>
                    <button onClick={() => setModal({ type: 'STATISTICS' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><BarChart2 size={20}/></button>
                    <button onClick={() => setModal({ type: 'SETTINGS' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><SettingsIcon size={20}/></button>
                </div>;
            case WidgetId.TIME_DISTRIBUTION:
                return <TimeDistributionWidget 
                    solves={computedSolves} 
                    config={settings.timeDistribution} 
                    theme={settings.theme} 
                />;
            case WidgetId.GOALS:
                return <GoalsWidget 
                    goals={goals}
                    solves={computedSolves}
                    onAdd={() => setModal({ type: 'GOAL_MANAGER' })}
                    onEdit={(g) => setModal({ type: 'GOAL_MANAGER', data: g })}
                    config={settings.goalsWidget}
                    onUpdate={(cfg) => setSettings({ ...settings, goalsWidget: cfg })}
                />;
            case WidgetId.SOLVES_OVER_TIME:
                return <SolvesOverTimeWidget 
                    solves={computedSolves}
                    theme={settings.theme}
                    config={settings.solvesOverTime}
                    onUpdate={(cfg) => setSettings({ ...settings, solvesOverTime: cfg })}
                    dateFormat={settings.dateFormat}
                />;
            case WidgetId.METRONOME:
                return <MetronomeWidget
                    config={settings.metronome}
                    onUpdate={(cfg) => setSettings({ ...settings, metronome: cfg })}
                    sessionId={currentSessionId}
                />;
            case WidgetId.TAG_ASSIGNER:
                return <TagAssignerWidget
                    session={currentSession}
                    latestSolve={computedSolves[0]}
                    onUpdateSession={actions.updateSession}
                    onUpdateSolve={actions.updateSolve}
                />;
            default:
                // Check plugins
                if (pluginManager.getWidget(id)) {
                    return <PluginWidgetWrapper widgetId={id} className="h-full" />;
                }
                return null;
        }
    };

    const layoutPreset = getPreset(settings.layout.presetId);
    const areas = layoutPreset.areas;

    // Mobile Sidebar Configuration
    const getMobileWidgetIcon = (id: string) => {
        switch(id) {
            case WidgetId.TIMELIST: return List;
            case WidgetId.STATS: return PieChart;
            case WidgetId.TIME_DISTRIBUTION: return BarChart2;
            case WidgetId.GOALS: return LayoutGrid;
            case WidgetId.SOLVES_OVER_TIME: return Activity;
            case WidgetId.METRONOME: return Music;
            case WidgetId.TAG_ASSIGNER: return Tag;
            case WidgetId.SESSION: return Box;
            case WidgetId.SCRAMBLE_IMAGE: return Box;
            default: return Box;
        }
    };

    const mobileSidebarItems = [
        // Special Modals
        { id: 'OPT_PROFILE', icon: User, label: 'Profile', type: 'MODAL', modal: 'PROFILE' },
        { id: 'OPT_DATA', icon: Save, label: 'Data', type: 'MODAL', modal: 'DATA' },
        { id: 'OPT_STATS', icon: BarChart2, label: 'Stats', type: 'MODAL', modal: 'STATISTICS' },
        { id: 'OPT_SETTINGS', icon: SettingsIcon, label: 'Settings', type: 'MODAL', modal: 'SETTINGS' },
        { id: 'SEP', type: 'SEPARATOR' },
        // Standard Widgets (excluding timer, scramble, tools, logo)
        ...WIDGET_DEFINITIONS
            .filter(w => !['TIMER', 'SCRAMBLE', 'LOGO', 'TOOLS'].includes(w.id))
            .map(w => ({ id: w.id, icon: getMobileWidgetIcon(w.id), label: w.name, type: 'WIDGET' })),
        // Plugin Widgets
        ...pluginManager.getWidgets().map(w => ({ id: w.id, icon: Box, label: w.name, type: 'WIDGET' }))
    ];

    return (
        <div 
            className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200 relative transition-colors duration-300"
            style={{ 
                backgroundColor: settings.backgroundColor, 
                color: settings.textColor,
                backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Background Overlay for Opacity */}
            {settings.backgroundImage && (
                <div 
                    className="absolute inset-0 pointer-events-none" 
                    style={{ backgroundColor: settings.backgroundColor, opacity: (100 - settings.backgroundImageOpacity) / 100 }}
                />
            )}

            {fireworks && settings.pbFireworks && <Fireworks />}

            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {isMobile ? (
                // --- MOBILE LAYOUT ---
                <div className="flex h-full w-full relative">
                    {/* Left Sidebar */}
                    <div className="w-16 bg-zinc-950/90 backdrop-blur border-r border-zinc-800 flex flex-col items-center py-4 gap-4 overflow-y-auto z-10 no-scrollbar shrink-0">
                        {mobileSidebarItems.map((item: any, idx) => {
                            if (item.type === 'SEPARATOR') return <div key={idx} className="w-8 h-px bg-zinc-800 my-1 shrink-0" />;
                            
                            const Icon = item.icon;
                            const isActive = activeMobileWidget === item.id;
                            return (
                                <button 
                                    key={item.id}
                                    onClick={() => {
                                        if (item.type === 'MODAL') setModal({ type: item.modal });
                                        else setActiveMobileWidget(item.id);
                                    }}
                                    className={`p-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
                                    title={item.label}
                                >
                                    <Icon size={20} />
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Area: Scramble (Top) + Timer (Middle) */}
                    <div 
                        className="flex-1 flex flex-col relative overflow-hidden touch-none select-none"
                        onTouchStart={handleTouchStart}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleTouchStart}
                        onMouseUp={handleTouchEnd}
                    >
                        {/* Scramble Area - Top */}
                        <div className="h-32 shrink-0 bg-gradient-to-b from-zinc-950/50 to-transparent relative z-20 pointer-events-none">
                             {/* Using pointer-events-none on container but allowing interaction on scramble text if needed, 
                                 though touch timer usually needs whole screen. 
                                 Let's keep Scramble display purely visual on mobile main screen to prevent accidental clicks when stopping timer. */}
                             <ScrambleWidget 
                                scramble={currentScramble} 
                                visualizerState={scrambleVisualizerState}
                                setVisualizerState={() => {}} // Read-only on mobile main to avoid conflict
                                className="pointer-events-none"
                             />
                        </div>

                        {/* Timer Area - Fills rest */}
                        <div className="flex-1 flex items-center justify-center relative z-10">
                             <Timer 
                                state={timerState} 
                                time={timerDisplayProps.time}
                                penalty={timerDisplayProps.penalty}
                                startTime={timerStartTime}
                                settings={effectiveSettings}
                                numberOfPhases={effectiveSettings.numberOfPhases || 1}
                                onTimerStart={() => {}} // Handled by parent touch
                                onTimerStop={() => {}}
                                onInspectionStart={() => {}}
                                onPrepare={() => {}}
                                onReady={() => {}}
                                onCancelPrepare={() => {}}
                            />
                        </div>
                    </div>

                    {/* Fly-in Widget Panel */}
                    <div 
                        className={`absolute inset-0 bg-zinc-900 z-50 transition-transform duration-300 ease-in-out flex flex-col ${activeMobileWidget ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        {activeMobileWidget && (
                            <>
                                <div className="h-14 border-b border-zinc-800 flex items-center px-4 bg-zinc-950 shrink-0">
                                    <button 
                                        onClick={() => setActiveMobileWidget(null)}
                                        className="flex items-center gap-2 text-zinc-400 hover:text-white"
                                    >
                                        <ChevronLeft size={20} />
                                        <span className="font-bold">Back</span>
                                    </button>
                                    <div className="ml-auto font-bold text-zinc-200">
                                        {mobileSidebarItems.find((i:any) => i.id === activeMobileWidget)?.label}
                                    </div>
                                </div>
                                <div className="flex-1 overflow-hidden relative">
                                    {renderWidget(activeMobileWidget)}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                // --- DESKTOP LAYOUT ---
                <div className="relative z-10 w-full h-full">
                    {areas.map(area => {
                        const wId = settings.layout.widgetMapping[area.id];
                        if (!wId) return null;
                        
                        return (
                            <div 
                                key={area.id}
                                className="absolute overflow-hidden"
                                style={{
                                    left: `${area.x}%`,
                                    top: `${area.y}%`,
                                    width: `${area.w}%`,
                                    height: `${area.h}%`
                                }}
                            >
                                {renderWidget(wId)}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            {modal?.type === 'SETTINGS' && (
                <SettingsModal 
                    config={statsConfig} 
                    settings={settings}
                    sessions={sessions}
                    onSaveStats={setStatsConfig} 
                    onSaveSettings={setSettings} 
                    onClose={closeModal} 
                />
            )}
            {modal?.type === 'SESSION_MANAGER' && (
                <SessionManager 
                    sessions={sessions}
                    solvesMap={solves}
                    currentSessionId={currentSessionId}
                    settings={settings}
                    onSwitch={(id) => { setCurrentSessionId(id); closeModal(); }}
                    onCreate={actions.createSession}
                    onUpdate={actions.updateSession}
                    onDelete={actions.deleteSession}
                    onConfigure={(id) => setModal({ type: 'SESSION_SETTINGS', data: sessions.find(s => s.id === id) })}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'SESSION_SETTINGS' && modal.data && (
                <SessionSettingsModal 
                    session={modal.data}
                    sessions={sessions}
                    settings={settings}
                    language={settings.language}
                    onUpdate={actions.updateSession}
                    onClose={() => setModal({ type: 'SESSION_MANAGER' })}
                />
            )}
            {modal?.type === 'STATISTICS' && (
                <StatisticsModal 
                    sessions={sessions}
                    solvesMap={solves}
                    currentSessionId={currentSessionId}
                    settings={settings}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'PROFILE' && (
                <ProfileModal 
                    auth={auth}
                    actions={actions}
                    language={settings.language}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'DATA' && (
                <DataManagementModal 
                    sessions={sessions}
                    solvesMap={solves}
                    settings={settings}
                    statsConfig={statsConfig}
                    currentSessionId={currentSessionId}
                    actions={actions}
                    language={settings.language}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'MANUAL_ENTRY' && (
                <ManualEntry 
                    onConfirm={(ms) => { 
                        const { id } = actions.addSolve(ms, -1); 
                        setSelectedIds(new Set([id]));
                        setLastClickedId(id);
                        closeModal(); 
                    }} 
                    onCancel={closeModal} 
                    precision={effectiveSettings.timePrecision} 
                />
            )}
            {modal?.type === 'COMMAND' && (
                <CommandPalette 
                    onClose={closeModal}
                    settings={settings}
                    setSettings={setSettings}
                    computedSolves={computedSolves}
                    selectedIds={selectedIds}
                    lastClickedId={lastClickedId}
                    updateSolve={actions.updateSolve}
                />
            )}
            {modal?.type === 'ABOUT' && <AboutModal onClose={closeModal} language={settings.language} />}
            {modal?.type === 'DETAILS' && modal.data && (
                <SolveDetailsModal 
                    solve={computedSolves.find(s => s.id === modal.data)!}
                    language={settings.language}
                    precision={effectiveSettings.timePrecision}
                    onUpdatePenalty={actions.updatePenalty}
                    onUpdateSolve={actions.updateSolve}
                    onClose={closeModal}
                    sessionLocked={!!currentSession.locked}
                    dateFormat={settings.dateFormat}
                />
            )}
            {modal?.type === 'MOVE' && modal.data && (
                <MoveSolvesModal 
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    solveCount={modal.data.length}
                    onMove={(targetId) => { 
                        if (modal.mode === 'DUPLICATE') {
                            actions.duplicateSolves(targetId, modal.data);
                        } else {
                            actions.moveSolves(targetId, modal.data); 
                            setSelectedIds(new Set()); // Clear selection on move
                        }
                        closeModal(); 
                    }}
                    onClose={closeModal}
                    mode={modal.mode as 'MOVE' | 'DUPLICATE'}
                    language={settings.language}
                />
            )}
            {modal?.type === 'GOAL_MANAGER' && (
                <GoalManagerModal 
                    initialGoal={modal.data}
                    sessions={sessions}
                    onSave={(g) => { if(modal.data) actions.updateGoal(g.id, g); else actions.addGoal(g); }}
                    onDelete={actions.deleteGoal}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'PLUGIN_ALERT' && (
                <PluginDialogModal 
                    type="ALERT"
                    message={modal.data}
                    onConfirm={() => { if (modal.resolve) modal.resolve(null); closeModal(); }}
                    onCancel={() => { if (modal.resolve) modal.resolve(null); closeModal(); }}
                />
            )}
            {modal?.type === 'PLUGIN_PROMPT' && (
                <PluginDialogModal 
                    type="PROMPT"
                    message={modal.data.msg}
                    defaultValue={modal.data.def}
                    onConfirm={(val) => { if (modal.resolve) modal.resolve(val); closeModal(); }}
                    onCancel={() => { if (modal.resolve) modal.resolve(null); closeModal(); }}
                />
            )}
        </div>
    );
};

const App: React.FC = () => {
    return (
        <AppStoreProvider>
            <AppContent />
        </AppStoreProvider>
    );
};

export default App;
