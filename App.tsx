

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from './hooks/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { WidgetId, TimerState, Penalty, ShortcutAction, Goal, AppTheme } from './types';
import { getPreset } from './utils';
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

import { Settings as SettingsIcon, BarChart2, User, Save } from 'lucide-react';

const App: React.FC = () => {
    const {
        sessions, solves, currentSession, currentSessionId, setCurrentSessionId,
        settings, setSettings, statsConfig, setStatsConfig, goals,
        effectiveSettings, currentScramble, computedSolves, auth,
        actions
    } = useAppStore();

    // Timer State
    const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
    const [timerTime, setTimerTime] = useState(0);
    const [timerStartTime, setTimerStartTime] = useState(0);
    const [fireworks, setFireworks] = useState(false);

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    const timeListRef = useRef<TimeListHandle>(null);

    // Modals
    const [modal, setModal] = useState<{ type: string; data?: any } | null>(null);
    const closeModal = () => setModal(null);

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

    const handleTimerStop = (finalTime: number, inspection: number, phases: any[]) => {
        setTimerState(TimerState.STOPPED);
        setTimerTime(finalTime);
        
        const isPB = actions.addSolve(finalTime, inspection, phases);
        
        if (isPB) {
            setFireworks(true);
            setTimeout(() => setFireworks(false), 5000);
        }

        // Delay to return to IDLE
        setTimeout(() => {
            setTimerState(TimerState.IDLE);
            setTimerTime(0);
        }, settings.restartDelayEnabled ? settings.restartDelayMs : 0);
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
        // Virtual Cube overrides shortcuts during solve/interactions, but global shortcuts like "Next Scramble" should still work if IDLE
        // If Virtual Cube is running, key events are trapped by VirtualCube component mostly
        
        if (timerState === TimerState.RUNNING || timerState === TimerState.INSPECTION) {
             if (action === ShortcutAction.ESCAPE) {
                 setTimerState(TimerState.IDLE);
                 setTimerTime(0);
                 return;
             }
             // If virtual, ignore scramble nav during run, but allow others?
             // Virtual moves consume keys.
             return; 
        }

        switch(action) {
            case ShortcutAction.NEXT_SCRAMBLE: actions.nextScramble(); break;
            case ShortcutAction.PREV_SCRAMBLE: actions.prevScramble(); break;
            case ShortcutAction.PENALTY_PLUS_TWO: 
                if (selectedIds.size > 0) selectedIds.forEach(id => actions.updatePenalty(id, Penalty.PLUS_TWO));
                else if (computedSolves.length > 0) actions.updatePenalty(computedSolves[0].id, Penalty.PLUS_TWO);
                break;
            case ShortcutAction.PENALTY_DNF:
                if (selectedIds.size > 0) selectedIds.forEach(id => actions.updatePenalty(id, Penalty.DNF));
                else if (computedSolves.length > 0) actions.updatePenalty(computedSolves[0].id, Penalty.DNF);
                break;
            case ShortcutAction.DELETE_LAST:
                if (selectedIds.size > 0) {
                    actions.deleteSolves(Array.from(selectedIds));
                    setSelectedIds(new Set());
                } else if (computedSolves.length > 0) {
                    if (confirm('Delete last solve?')) actions.deleteSolves([computedSolves[0].id]);
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

    // Layout Rendering
    const renderWidget = (id: WidgetId) => {
        switch (id) {
            case WidgetId.TIMER:
                return (
                    <div className="relative w-full h-full">
                        {/* Timer Display - Positioned at top if Virtual Cube is active to avoid overlap */}
                        <div className={`absolute w-full transition-all duration-300 ${isVirtual ? 'top-0 pt-2 h-auto z-30 pointer-events-none' : 'inset-0 z-0'}`}>
                            <Timer 
                                state={timerState} 
                                time={timerTime} 
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
                        
                        {/* Virtual Cube Layer - Renders in center, behind timer text generally, interactive */}
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
                    onDelete={(ids) => { actions.deleteSolves(ids); setSelectedIds(new Set()); }}
                    onPenalty={(id, p) => actions.updatePenalty(id, p)}
                    onDetails={(id) => setModal({ type: 'DETAILS', data: id })}
                    onMove={(ids) => setModal({ type: 'MOVE', data: ids })}
                    className="h-full"
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
                return null;
        }
    };

    const layoutPreset = getPreset(settings.layout.presetId);
    const areas = layoutPreset.areas;

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

            {/* Modals */}
            {modal?.type === 'SETTINGS' && (
                <SettingsModal 
                    config={statsConfig} 
                    settings={settings} 
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
                    language={settings.language}
                    onSave={(id, overrides) => actions.updateSession(id, { settingsOverride: overrides })}
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
                    onConfirm={(ms) => { actions.addSolve(ms, -1); closeModal(); }} 
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
            {modal?.type === 'ABOUT' && <AboutModal onClose={closeModal} />}
            {modal?.type === 'DETAILS' && modal.data && (
                <SolveDetailsModal 
                    solve={computedSolves.find(s => s.id === modal.data)!}
                    language={settings.language}
                    precision={effectiveSettings.timePrecision}
                    onUpdatePenalty={actions.updatePenalty}
                    onUpdateSolve={actions.updateSolve}
                    onClose={closeModal}
                />
            )}
            {modal?.type === 'MOVE' && modal.data && (
                <MoveSolvesModal 
                    sessions={sessions}
                    currentSessionId={currentSessionId}
                    solveCount={modal.data.length}
                    onMove={(targetId) => { actions.moveSolves(targetId, modal.data); setSelectedIds(new Set()); closeModal(); }}
                    onClose={closeModal}
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
        </div>
    );
};

export default App;