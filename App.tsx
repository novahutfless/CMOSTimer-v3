import React, { useState, useCallback, useEffect } from 'react';
import { TimerState, Language, SolvePhase, ShortcutAction, Penalty, WidgetId, LayoutConfig } from './types';
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
import { ManualEntry } from './components/ManualEntry';
import { MoveSolvesModal } from './components/MoveSolvesModal';
import AboutModal from './components/AboutModal';
import { Settings, List, BarChart2, Save, Menu, X } from 'lucide-react';
import { getScrambler } from './utils/scramble';
import { getPreset, validateLayout } from './utils/layouts';
import { ScrambleWidget } from './components/widgets/ScrambleWidget';
import { ScrambleImageWidget } from './components/widgets/ScrambleImageWidget';

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
    
    // Modals
    const [showSessionManager, setShowSessionManager] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showSessionSettings, setShowSessionSettings] = useState<string | null>(null);
    const [showStatistics, setShowStatistics] = useState(false);
    const [showSolveDetails, setShowSolveDetails] = useState<string | null>(null);
    const [showDataManagement, setShowDataManagement] = useState(false);
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [fireworksActive, setFireworksActive] = useState(false);
    
    // Mobile Toggle
    const [showTimeList, setShowTimeList] = useState(false);

    // Scramble Visualizer Interaction State (shared between widgets)
    const [scrambleVisualizerState, setScrambleVisualizerState] = useState<{ active: number | null }>({ active: null });

    // Manual Entry Handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (timerState === TimerState.IDLE && e.key === '1' && !e.ctrlKey && !e.altKey && !e.metaKey && !(e.target instanceof HTMLInputElement)) {
                setTimerState(TimerState.MANUAL_ENTRY);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [timerState]);

    // --- Timer Handlers ---
    const handleTimerStart = useCallback(() => {
        setTimerState(TimerState.RUNNING);
        setSelectedIds(new Set()); 
        setFireworksActive(false);
        if (window.innerWidth < 768) setShowTimeList(false);
        setScrambleVisualizerState({ active: null }); // Reset visualizer
    }, []);

    const handleTimerStop = useCallback((time: number, inspectionTime: number, phases: SolvePhase[]) => {
        setTimerState(TimerState.STOPPED);
        setLastSolveTime(time);
        
        setTimeout(() => {
            const isNewPB = actions.addSolve(time, inspectionTime, phases);
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
                    actions.addSolve(Date.now() - lastSolveTime, -1, undefined);
                } else if (timerState === TimerState.MANUAL_ENTRY) {
                    setTimerState(TimerState.IDLE);
                } else {
                    if (showSettings) setShowSettings(false);
                    else if (showStatistics) setShowStatistics(false);
                    else if (showSessionManager) setShowSessionManager(false);
                    else if (showDataManagement) setShowDataManagement(false);
                    else if (showSolveDetails) setShowSolveDetails(null);
                    else if (showMoveModal) setShowMoveModal(false);
                    else if (showAboutModal) setShowAboutModal(false);
                    else if (showTimeList) setShowTimeList(false);
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
    }, [timerState, selectedIds, computedSolves, actions, showSettings, showStatistics, showSessionManager, showDataManagement, showSolveDetails, showMoveModal, showAboutModal, showTimeList]);

    useKeyboardShortcuts(settings, handleShortcut);

    const shouldHideUI = settings.hideWhileTiming && (timerState === TimerState.RUNNING);
    const scramblerDef = getScrambler(currentSession.scramblerId || '333');

    // Layout Logic
    const activeLayoutConfig: LayoutConfig = currentSession.settingsOverride?.layout 
        ? validateLayout(currentSession.settingsOverride.layout) 
        : validateLayout(effectiveSettings.layout);
        
    const activePreset = getPreset(activeLayoutConfig.presetId);

    // Widget Renderers
    const renderWidget = (id: WidgetId) => {
        const opacityClass = shouldHideUI && id !== WidgetId.TIMER ? 'opacity-0 pointer-events-none' : 'opacity-100';
        
        switch(id) {
            case WidgetId.LOGO:
                return (
                    <div className={`flex items-center h-full w-full ${opacityClass} transition-opacity overflow-hidden`}>
                        <h1 onClick={() => setShowAboutModal(true)} className="font-bold text-xl text-zinc-500 tracking-tighter cursor-pointer hover:text-zinc-300 transition-colors select-none whitespace-nowrap">
                            CMOSTimer v3
                        </h1>
                    </div>
                );
            case WidgetId.SESSION:
                return (
                    <div className={`flex items-center h-full w-full ${opacityClass} transition-opacity overflow-hidden`}>
                         <button onClick={() => setShowSessionManager(true)} className="flex items-center gap-2 px-3 py-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-colors backdrop-blur-sm w-full max-w-full">
                            <List size={16} className="text-zinc-400 shrink-0" />
                            <span className="font-medium text-sm truncate">{currentSession.name}</span>
                            <span className="text-xs text-zinc-600 bg-zinc-900 px-1 rounded shrink-0">{scramblerDef.name}</span>
                        </button>
                    </div>
                );
            case WidgetId.TOOLS:
                return (
                    <div className={`flex items-center justify-end h-full gap-2 ${opacityClass} transition-opacity`}>
                        <button onClick={() => setShowDataManagement(true)} className="p-2 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors backdrop-blur-sm" title="Data"><Save size={20} /></button>
                        <button onClick={() => setShowStatistics(true)} className="p-2 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors backdrop-blur-sm" title="Stats"><BarChart2 size={20} /></button>
                        <button onClick={() => setShowSettings(true)} className="p-2 bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors backdrop-blur-sm" title="Settings"><Settings size={20} /></button>
                    </div>
                );
            case WidgetId.STATS:
                return (
                    <div className={`h-full w-full overflow-auto ${opacityClass} transition-opacity`}>
                         <StatsPanel config={statsConfig} solves={computedSolves} theme={settings.theme} pbVisuals={settings.pbVisuals} />
                    </div>
                );
            case WidgetId.TIMELIST:
                return (
                    <div className={`h-full w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 backdrop-blur ${opacityClass} transition-opacity`}>
                        <TimeList 
                            className="h-full w-full bg-transparent" 
                            solves={computedSolves} 
                            selectedIds={selectedIds} 
                            precision={settings.timePrecision} 
                            paginationEnabled={settings.paginationEnabled} 
                            pageSize={settings.pageSize} 
                            columns={settings.timelistStats} 
                            theme={settings.theme} 
                            language={settings.language || Language.EN} 
                            pbVisuals={settings.pbVisuals} 
                            onSelect={handleSelect} 
                            onDelete={(ids) => { actions.deleteSolves(ids); setSelectedIds(new Set()); }} 
                            onPenalty={actions.updatePenalty} 
                            onDetails={(id) => setShowSolveDetails(id)} 
                            onMove={() => setShowMoveModal(true)}
                        />
                    </div>
                );
            case WidgetId.SCRAMBLE:
                return (
                    <div className={`${opacityClass} transition-opacity h-full w-full flex items-center justify-center`}>
                        <ScrambleWidget 
                            scramble={currentScramble} 
                            visualizerState={scrambleVisualizerState}
                            setVisualizerState={setScrambleVisualizerState}
                        />
                    </div>
                );
            case WidgetId.SCRAMBLE_IMAGE:
                return (
                     <div className={`${opacityClass} transition-opacity h-full w-full`}>
                        <ScrambleImageWidget 
                            scramble={currentScramble} 
                            type={scramblerDef.visualizer}
                            visualizerState={scrambleVisualizerState}
                        />
                    </div>
                );
            case WidgetId.TIMER:
                return (
                    <div className="h-full w-full flex items-center justify-center">
                        <Timer 
                            state={timerState}
                            time={lastSolveTime}
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
                );
            default:
                return null;
        }
    };

    return (
        <div 
            className="h-screen w-screen overflow-hidden transition-colors duration-300 relative"
            style={{ backgroundColor: settings.backgroundColor, color: settings.textColor }}
        >
            {/* Background Image Layer */}
            {settings.backgroundImage && (
                <div 
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        backgroundImage: `url(${settings.backgroundImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: settings.backgroundImageOpacity / 100
                    }}
                />
            )}

            {fireworksActive && <Fireworks />}
            
            {/* Mobile Layout (Simple Stack) */}
            <div className="flex md:hidden flex-col h-full relative z-10">
                <div className={`flex flex-col gap-2 p-4 ${shouldHideUI ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between">
                        <h1 onClick={() => setShowAboutModal(true)} className="font-bold text-xl text-zinc-500 tracking-tighter">CMOSTimer v3</h1>
                        <button onClick={() => setShowSettings(true)} className="p-2 text-zinc-500"><Settings size={20} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={() => setShowTimeList(!showTimeList)} className="p-2 bg-zinc-900/80 rounded border border-zinc-800 text-zinc-400"><Menu size={20}/></button>
                         <button onClick={() => setShowSessionManager(true)} className="flex-1 flex items-center gap-2 px-3 py-2 bg-zinc-900/80 rounded border border-zinc-800 text-sm text-zinc-300 truncate">
                            <List size={14}/> {currentSession.name}
                         </button>
                    </div>
                    <div className="mt-2">
                         <StatsPanel config={statsConfig} solves={computedSolves} theme={settings.theme} pbVisuals={settings.pbVisuals} />
                    </div>
                </div>
                
                <div className={`flex-1 flex flex-col items-center justify-center relative`}>
                     <div className={`w-full px-4 mb-4 ${shouldHideUI ? 'opacity-0' : 'opacity-100'}`}>
                        <ScrambleWidget 
                             scramble={currentScramble} 
                             visualizerState={scrambleVisualizerState}
                             setVisualizerState={setScrambleVisualizerState}
                         />
                     </div>
                     <Timer 
                        state={timerState}
                        time={lastSolveTime}
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

            {/* Desktop Layout (Absolute Positioning) */}
            <div className="hidden md:block w-full h-full relative z-10">
                {activePreset.areas.map(area => {
                    const widgetId = activeLayoutConfig.widgetMapping[area.id];
                    if (!widgetId) return null;
                    return (
                        <div 
                            key={area.id} 
                            className="absolute"
                            style={{ 
                                left: `${area.x}%`, 
                                top: `${area.y}%`, 
                                width: `${area.w}%`, 
                                height: `${area.h}%` 
                            }}
                        >
                            {renderWidget(widgetId)}
                        </div>
                    );
                })}
            </div>

            {/* Mobile Sidebar Overlay */}
            <div className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity ${showTimeList ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowTimeList(false)} />
            <div className={`fixed inset-y-0 left-0 z-50 w-3/4 max-w-xs bg-zinc-900 transform transition-transform duration-300 border-r border-zinc-800 md:hidden ${showTimeList ? 'translate-x-0' : '-translate-x-full'}`}>
                 <div className="flex justify-end p-2"><button onClick={() => setShowTimeList(false)} className="p-2 text-zinc-500"><X size={20}/></button></div>
                 <TimeList 
                    className="h-full w-full bg-transparent" 
                    solves={computedSolves} 
                    selectedIds={selectedIds} 
                    precision={settings.timePrecision} 
                    paginationEnabled={settings.paginationEnabled} 
                    pageSize={settings.pageSize} 
                    columns={settings.timelistStats} 
                    theme={settings.theme} 
                    language={settings.language || Language.EN} 
                    pbVisuals={settings.pbVisuals} 
                    onSelect={handleSelect} 
                    onDelete={(ids) => { actions.deleteSolves(ids); setSelectedIds(new Set()); }} 
                    onPenalty={actions.updatePenalty} 
                    onDetails={(id) => setShowSolveDetails(id)} 
                    onMove={() => setShowMoveModal(true)}
                />
            </div>

            {/* Modals */}
            {timerState === TimerState.MANUAL_ENTRY && (
                <ManualEntry 
                    precision={settings.timePrecision}
                    onConfirm={(ms) => {
                        actions.addSolve(ms, -1, undefined);
                        setLastSolveTime(ms);
                        setTimerState(TimerState.IDLE);
                    }}
                    onCancel={() => setTimerState(TimerState.IDLE)}
                />
            )}
            {showMoveModal && (
                <MoveSolvesModal 
                    sessions={sessions} 
                    currentSessionId={currentSessionId} 
                    solveCount={selectedIds.size} 
                    onMove={(targetId) => {
                        actions.moveSolves(targetId, Array.from(selectedIds));
                        setSelectedIds(new Set());
                        setShowMoveModal(false);
                    }}
                    onClose={() => setShowMoveModal(false)}
                />
            )}
            {showSessionManager && (
                <SessionManager 
                    sessions={sessions} currentSessionId={currentSessionId}
                    onSwitch={(id) => { setCurrentSessionId(id); setShowSessionManager(false); }}
                    onCreate={actions.createSession} 
                    onRename={(id, name) => actions.updateSession(id, { name })}
                    onUpdateScrambler={(id, scramblerId, customConfig) => actions.updateSession(id, { scramblerId, customScramblerConfig: customConfig })}
                    onDelete={(id) => actions.deleteSession(id)}
                    onConfigure={(id) => setShowSessionSettings(id)} onClose={() => setShowSessionManager(false)}
                />
            )}
            {showSessionSettings && <SessionSettingsModal session={sessions.find(s => s.id === showSessionSettings)!} language={settings.language || Language.EN} onSave={(id, overrides) => actions.updateSession(id, { settingsOverride: overrides })} onClose={() => setShowSessionSettings(null)} />}
            {showStatistics && <StatisticsModal sessions={sessions} currentSessionId={currentSessionId} settings={settings} onClose={() => setShowStatistics(false)} />}
            {showSettings && <SettingsModal config={statsConfig} settings={settings} onSaveStats={setStatsConfig} onSaveSettings={setSettings} onClose={() => setShowSettings(false)} />}
            {showSolveDetails && <SolveDetailsModal solve={computedSolves.find(s => s.id === showSolveDetails)!} language={settings.language || Language.EN} precision={settings.timePrecision} onClose={() => setShowSolveDetails(null)} />}
            {showDataManagement && <DataManagementModal onClose={() => setShowDataManagement(false)} language={settings.language || Language.EN} />}
            {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
        </div>
    );
};

export default App;