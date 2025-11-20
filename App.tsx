
import React, { useState, useCallback } from 'react';
import { TimerState, Language, SolvePhase, ShortcutAction, Penalty } from './types';
import { useAppStore } from './hooks/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Timer from './components/Timer';
import TimeList from './components/TimeList';
import SessionManager from './components/SessionManager';
import SessionSettingsModal from './components/SessionSettingsModal';
import StatsPanel from './components/StatsPanel';
import SettingsModal from './components/SettingsModal';
import StatisticsModal from './components/StatisticsModal';
import SolveDetailsModal from './components/SolveDetailsModal';
import Fireworks from './components/Fireworks';
import { DataManagementModal } from './components/DataManagementModal';
import { Settings, List, BarChart2, Save } from 'lucide-react';

const App: React.FC = () => {
    const {
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
        actions
    } = useAppStore();

    const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
    const [lastSolveTime, setLastSolveTime] = useState<number>(0); 
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastClickedId, setLastClickedId] = useState<string | null>(null);
    
    const [showSessionManager, setShowSessionManager] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSessionSettings, setShowSessionSettings] = useState<string | null>(null);
    const [showStatistics, setShowStatistics] = useState(false);
    const [showSolveDetails, setShowSolveDetails] = useState<string | null>(null);
    const [showDataManagement, setShowDataManagement] = useState(false);
    const [fireworksActive, setFireworksActive] = useState(false);

    // --- Timer Handlers ---
    const handleTimerStart = useCallback(() => {
        setTimerState(TimerState.RUNNING);
        setSelectedIds(new Set()); 
        setFireworksActive(false);
    }, []);

    const handleTimerStop = useCallback((time: number, phases: SolvePhase[]) => {
        setTimerState(TimerState.STOPPED);
        setLastSolveTime(time);
        
        setTimeout(() => {
            const isNewPB = actions.addSolve(time, phases);
            if (isNewPB && settings.pbFireworks) {
                setFireworksActive(true);
                setTimeout(() => setFireworksActive(false), 4000);
            }

            if (effectiveSettings.restartDelayEnabled) {
                setTimerState(TimerState.LOCKED);
                setTimeout(() => setTimerState(TimerState.IDLE), effectiveSettings.restartDelayMs);
            } else {
                setTimerState(TimerState.IDLE);
            }
        }, 200); 
    }, [effectiveSettings, settings.pbFireworks, actions]); 

    const handleInspectionStart = useCallback(() => setTimerState(TimerState.INSPECTION), []);
    const handlePrepare = useCallback(() => setTimerState(TimerState.HOLDING), []);
    const handleReady = useCallback(() => setTimerState(TimerState.READY), []);
    const handleCancelPrepare = useCallback(() => {
        if (timerState === TimerState.INSPECTION || timerState === TimerState.HOLDING) {
            if (effectiveSettings.inspectionEnabled) setTimerState(TimerState.INSPECTION);
            else setTimerState(TimerState.IDLE);
        } else {
             setTimerState(TimerState.IDLE);
        }
    }, [timerState, effectiveSettings.inspectionEnabled]);

    // --- Selection Logic ---
    const handleSelect = (id: string, multi: boolean, range: boolean) => {
        const newSet = new Set(multi ? selectedIds : []);
        if (range && lastClickedId && computedSolves.length > 0) {
            const idx1 = computedSolves.findIndex(s => s.id === lastClickedId);
            const idx2 = computedSolves.findIndex(s => s.id === id);
            if (idx1 !== -1 && idx2 !== -1) {
                const start = Math.min(idx1, idx2);
                const end = Math.max(idx1, idx2);
                for (let i = start; i <= end; i++) newSet.add(computedSolves[i].id);
            }
        } else {
            if (multi && newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
        }
        setSelectedIds(newSet);
        setLastClickedId(id);
    };

    // --- Shortcuts ---
    const handleShortcut = useCallback((action: ShortcutAction) => {
        if (timerState === TimerState.RUNNING && action !== ShortcutAction.ESCAPE) return;
        
        const getLastSolveId = () => computedSolves.length > 0 ? computedSolves[0].id : null;
        const getTargetIds = () => selectedIds.size > 0 ? Array.from(selectedIds) : (getLastSolveId() ? [getLastSolveId()!] : []);

        switch (action) {
            case ShortcutAction.NEXT_SCRAMBLE:
                actions.nextScramble();
                break;
            case ShortcutAction.PREV_SCRAMBLE:
                actions.prevScramble();
                break;
            case ShortcutAction.PENALTY_PLUS_TWO:
                getTargetIds().forEach(id => {
                    const s = computedSolves.find(s => s.id === id);
                    if(s) actions.updatePenalty(id, s.penalty === Penalty.PLUS_TWO ? Penalty.NONE : Penalty.PLUS_TWO);
                });
                break;
            case ShortcutAction.PENALTY_DNF:
                 getTargetIds().forEach(id => {
                    const s = computedSolves.find(s => s.id === id);
                    if(s) actions.updatePenalty(id, s.penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF);
                });
                break;
            case ShortcutAction.DELETE_LAST:
                const idsToDelete = getTargetIds();
                if (idsToDelete.length > 0) {
                    if (window.confirm(`Delete ${idsToDelete.length} solves?`)) {
                        actions.deleteSolves(idsToDelete);
                        setSelectedIds(new Set());
                    }
                }
                break;
            case ShortcutAction.SELECT_FIRST:
                if (computedSolves.length > 0) handleSelect(computedSolves[computedSolves.length - 1].id, false, false);
                break;
            case ShortcutAction.OPEN_DETAILS:
                 const detailsId = getTargetIds()[0];
                 if (detailsId) setShowSolveDetails(detailsId);
                 break;
            case ShortcutAction.ESCAPE:
                if (timerState === TimerState.INSPECTION) {
                    setTimerState(TimerState.IDLE);
                } else if (timerState === TimerState.RUNNING) {
                    setTimerState(TimerState.IDLE);
                    // Record DNF
                    actions.addSolve(Date.now() - lastSolveTime, undefined); // Time inaccurate if not tracking
                    // For simplicity, abort to IDLE is standard
                } else {
                    if (showSettings) setShowSettings(false);
                    else if (showStatistics) setShowStatistics(false);
                    else if (showSessionManager) setShowSessionManager(false);
                    else if (showDataManagement) setShowDataManagement(false);
                    else if (showSolveDetails) setShowSolveDetails(null);
                    else setSelectedIds(new Set());
                }
                break;
            case ShortcutAction.MOVE_SELECTION_UP:
            case ShortcutAction.MOVE_SELECTION_DOWN:
                if (selectedIds.size === 1) {
                    const current = Array.from(selectedIds)[0];
                    const idx = computedSolves.findIndex(s => s.id === current);
                    if (idx !== -1) {
                        const nextIdx = action === ShortcutAction.MOVE_SELECTION_UP ? idx + 1 : idx - 1;
                        if (nextIdx >= 0 && nextIdx < computedSolves.length) {
                            handleSelect(computedSolves[nextIdx].id, false, false);
                        }
                    }
                }
                break;
        }
    }, [timerState, selectedIds, computedSolves, actions, showSettings, showStatistics, showSessionManager, showDataManagement, showSolveDetails]);

    useKeyboardShortcuts(settings, handleShortcut);

    const shouldHideUI = settings.hideWhileTiming && (timerState === TimerState.RUNNING);

    return (
        <div 
            className="h-screen w-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-300"
            style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
        >
            {fireworksActive && <Fireworks />}
            
            {/* Main Area */}
            <div className="flex-1 flex flex-col relative order-2 md:order-1">
                {/* Top Bar */}
                <div className={`flex flex-col gap-2 p-4 z-20 pointer-events-auto lg:absolute lg:top-0 lg:left-0 lg:right-0 lg:flex-row lg:justify-between lg:items-start transition-opacity duration-300 ${shouldHideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex flex-col items-start gap-2 w-full lg:w-auto">
                        <div className="flex items-center gap-4">
                            <h1 className="font-bold text-xl text-zinc-500 tracking-tighter hidden lg:block">CMOSTimer v3</h1>
                            <button onClick={() => setShowSessionManager(true)} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors backdrop-blur-sm w-full lg:w-auto justify-center lg:justify-start">
                                <List size={16} className="text-zinc-400" />
                                <span className="font-medium text-sm truncate max-w-[150px]">{currentSession.name}</span>
                                <span className="text-xs text-zinc-600 bg-zinc-900 px-1 rounded">{currentSession.scrambleType || '3x3'}</span>
                            </button>
                        </div>
                        <StatsPanel config={statsConfig} solves={computedSolves} theme={settings.theme} pbVisuals={settings.pbVisuals} />
                    </div>
                    <div className="flex gap-2 justify-end w-full lg:w-auto">
                        <button onClick={() => setShowDataManagement(true)} className="p-2 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors backdrop-blur-sm" title="Data Management"><Save size={20} /></button>
                        <button onClick={() => setShowStatistics(true)} className="p-2 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors backdrop-blur-sm"><BarChart2 size={20} /></button>
                        <button onClick={() => setShowSettings(true)} className="p-2 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors backdrop-blur-sm"><Settings size={20} /></button>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex-grow flex flex-col relative">
                     <Timer 
                        state={timerState}
                        time={lastSolveTime}
                        scramble={currentScramble}
                        scrambleType={currentSession.scrambleType || '3x3' as any}
                        settings={effectiveSettings}
                        numberOfPhases={effectiveSettings.numberOfPhases || 1}
                        onTimerStart={handleTimerStart}
                        onTimerStop={handleTimerStop}
                        onInspectionStart={handleInspectionStart}
                        onPrepare={handlePrepare}
                        onReady={handleReady}
                        onCancelPrepare={handleCancelPrepare}
                    />
                </div>
            </div>

            {/* Sidebar */}
            <div className={`h-[40vh] md:h-full md:w-96 flex-shrink-0 z-30 shadow-2xl border-t md:border-t-0 md:border-l border-zinc-800 order-3 md:order-2 transition-opacity duration-300 ${shouldHideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <TimeList className="h-full w-full" solves={computedSolves} selectedIds={selectedIds} precision={settings.timePrecision} paginationEnabled={settings.paginationEnabled} pageSize={settings.pageSize} columns={settings.timelistStats} theme={settings.theme} language={settings.language || Language.EN} pbVisuals={settings.pbVisuals} onSelect={handleSelect} onDelete={(ids) => { actions.deleteSolves(ids); setSelectedIds(new Set()); }} onPenalty={actions.updatePenalty} onDetails={(id) => setShowSolveDetails(id)} />
            </div>

            {/* Modals */}
            {showSessionManager && (
                <SessionManager 
                    sessions={sessions} currentSessionId={currentSessionId}
                    onSwitch={(id) => { setCurrentSessionId(id); setShowSessionManager(false); }}
                    onCreate={actions.createSession} onRename={(id, name) => actions.updateSession(id, { name })}
                    onUpdateType={(id, type) => actions.updateSession(id, { scrambleType: type })}
                    onDelete={(id) => actions.deleteSession(id)}
                    onConfigure={(id) => setShowSessionSettings(id)} onClose={() => setShowSessionManager(false)}
                />
            )}
            {showSessionSettings && <SessionSettingsModal session={sessions.find(s => s.id === showSessionSettings)!} language={settings.language || Language.EN} onSave={(id, overrides) => actions.updateSession(id, { settingsOverride: overrides })} onClose={() => setShowSessionSettings(null)} />}
            {showStatistics && <StatisticsModal sessions={sessions} currentSessionId={currentSessionId} settings={settings} onClose={() => setShowStatistics(false)} />}
            {showSettings && <SettingsModal config={statsConfig} settings={settings} onSaveStats={setStatsConfig} onSaveSettings={setSettings} onClose={() => setShowSettings(false)} />}
            {showSolveDetails && <SolveDetailsModal solve={computedSolves.find(s => s.id === showSolveDetails)!} language={settings.language || Language.EN} precision={settings.timePrecision} onClose={() => setShowSolveDetails(null)} />}
            {showDataManagement && <DataManagementModal onClose={() => setShowDataManagement(false)} language={settings.language || Language.EN} />}
        </div>
    );
};

export default App;
