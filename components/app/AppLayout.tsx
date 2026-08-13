import React, { useState, useEffect, useRef, useMemo, ReactElement } from 'react';
import { Settings as SettingsIcon, BarChart2, User, Save, ChevronLeft, Box, LayoutGrid, List, PieChart, Activity, Music, Tag, ChevronDown, LucideIcon, XCircle } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useModal } from '../ModalProvider';
import { WidgetId, TimerState, Penalty, ShortcutAction, SolvePhase, Settings, PluginHostApi, InspectionAbortAction } from '../../types';
import { getPreset, getWidgetSurfaceVars, WIDGET_DEFINITIONS } from '../../utils';
import Timer from '../Timer';
import TimeList, { TimeListHandle } from '../TimeList';
import StatsPanel from '../widgets/StatsPanel';
import { ScrambleWidget } from '../widgets/ScrambleWidget';
import { ScrambleImageWidget } from '../widgets/ScrambleImageWidget';
import { TimeDistributionWidget } from '../widgets/TimeDistributionWidget';
import { GoalsWidget } from '../widgets/GoalsWidget';
import { SolvesOverTimeWidget } from '../widgets/SolvesOverTimeWidget';
import { MetronomeWidget } from '../widgets/MetronomeWidget';
import { TagAssignerWidget } from '../widgets/TagAssignerWidget';
import LogoWidget from '../widgets/LogoWidget';
import Fireworks from '../Fireworks';
import { VirtualCube } from '../VirtualCube';
import { PluginWidgetWrapper } from '../PluginWidgetWrapper';
import { pluginManager } from '../../plugins/PluginManager';
import { createHostApi } from '../../plugins/runtime/createHostApi';
import { usePluginManagerRevision } from '../../plugins/usePluginManagerRevision';
import { ToastContainer, Toast } from '../ToastContainer';
import { LayoutRenderer } from '../LayoutRenderer';
import { t } from '../../translations';
import { storageStatus } from '../../utils/platformStorage';

type MobileSidebarItem =
	| { id: 'SEP'; type: 'SEPARATOR' }
	| { id: string; icon: LucideIcon; label: string; type: 'MODAL'; modal: 'PROFILE' | 'DATA' | 'STATISTICS' | 'SETTINGS' }
	| { id: string; icon: LucideIcon; label: string; type: 'WIDGET' };

export type AppLayoutProps = {
	selectedIds: Set<string>;
	setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
	lastClickedId: string | null;
	setLastClickedId: React.Dispatch<React.SetStateAction<string | null>>;
};

const HOLD_TO_START_DELAY_MS = 500;

const AppLayout: React.FC<AppLayoutProps> = ({
	selectedIds,
	setSelectedIds,
	lastClickedId,
	setLastClickedId
}) => {
	const {
		sessions, solves, currentSession, currentSessionId, setCurrentSessionId,
		settings, setSettings, statsConfig, goals, plugins,
		effectiveSettings, currentScramble, computedSolves, auth, hasPendingSyncActions,
		actions
	} = useAppStore();

	const { openModal, closeModal, isModalOpen } = useModal();

	const [toasts, setToasts] = useState<Toast[]>([]);
	const addToast = (msg: string, duration = 3000): void => {
		const id = Math.random().toString(36).substring(2, 9);
		setToasts(prev => [...prev, { id, message: msg, duration }]);
	};
	const dismissToast = (id: string): void => setToasts(prev => prev.filter(t => t.id !== id));

	const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
	const [activeMobileWidget, setActiveMobileWidget] = useState<string | null>(null);
	const [timeListFilterText, setTimeListFilterText] = useState('');
	const [timerState, setTimerState] = useState<TimerState>(TimerState.IDLE);
	const [timerTime, setTimerTime] = useState(0);
	const [timerStartTime, setTimerStartTime] = useState(0);
	const [fireworks, setFireworks] = useState(false);
	usePluginManagerRevision();

	useEffect(() => {
		const handleResize = (): void => setIsMobile(window.innerWidth < 768);
		window.addEventListener('resize', handleResize);
		return (): void => window.removeEventListener('resize', handleResize);
	}, []);

	const api = useMemo<PluginHostApi>(() => createHostApi({
		sessions,
		solves,
		settings,
		statsConfig,
		goals,
		plugins,
		currentSessionId,
		timerState,
		getTimerElapsed: (): number => timerState === TimerState.RUNNING ? Math.max(0, performance.now() - timerStartTime) : timerTime,
		currentScramble,
		startInspection: (): void => {
			if (!effectiveSettings.inspectionEnabled) throw new Error('Inspection is disabled for the current session.');
			if (timerState !== TimerState.IDLE) throw new Error(`Cannot start inspection while timer is ${timerState}.`);
			setTimerState(TimerState.INSPECTION);
		},
		startTimer: (): void => {
			if (timerState === TimerState.RUNNING) return;
			if (![TimerState.IDLE, TimerState.INSPECTION, TimerState.HOLDING, TimerState.READY].includes(timerState)) throw new Error(`Cannot start timer while it is ${timerState}.`);
			handleTimerStart(performance.now());
		},
		stopTimer: (input): string | null => {
			if (timerState !== TimerState.RUNNING && input?.time === undefined) return null;
			const finalTime = input?.time ?? Math.max(0, performance.now() - timerStartTime);
			const phases = input?.phases ?? [{ duration: finalTime, cumulative: finalTime }];
			return handleTimerStop(finalTime, input?.inspectionTime ?? -1, phases, input?.penalty);
		},
		cancelTimer: (): void => {
			setTimerState(TimerState.IDLE);
			setTimerTime(0);
		},
		addSolve: ({ time, inspectionTime = -1, phases, penalty }): string => {
			return actions.addSolve(time, inspectionTime, phases, penalty).id;
		},
		updateSolve: actions.updateSolve,
		deleteSolves: actions.deleteSolves,
		updateSettings: (nextSettings: Partial<Settings>): void => setSettings({ ...settings, ...nextSettings }),
		setCurrentSession: (sessionId: string): void => {
			if (!sessions.some(session => session.id === sessionId)) throw new Error(`Unknown session "${sessionId}".`);
			setCurrentSessionId(sessionId);
		},
		nextScramble: actions.nextScramble,
		previousScramble: actions.prevScramble,
		toast: (msg: string): void => addToast(msg),
		alert: (msg: string): Promise<void> => new Promise<void>((resolve) => {
			openModal({ type: 'PLUGIN_ALERT', data: msg, resolve: () => resolve() });
		}),
		prompt: (msg: string, def?: string): Promise<string | null> => new Promise<string | null>((resolve) => {
			openModal({ type: 'PLUGIN_PROMPT', data: def === undefined ? { msg } : { msg, def }, resolve });
		})
	}), [sessions, solves, settings, statsConfig, goals, plugins, currentSessionId, timerState, timerStartTime, timerTime, currentScramble, effectiveSettings.inspectionEnabled, actions, openModal, setCurrentSessionId]);

	useEffect(() => {
		pluginManager.initialize(api, plugins);
		pluginManager.updateApi(api);
	}, [api, plugins]);

	const mobileHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const previousSolveIdsRef = useRef(new Set(Object.keys(solves)));

	useEffect(() => pluginManager.emit('timerStateChanged', timerState), [timerState]);
	useEffect(() => pluginManager.emit('scrambleChanged', currentScramble), [currentScramble]);
	useEffect(() => pluginManager.emit('stateChanged', api.getState()), [sessions, solves, settings, statsConfig, goals, plugins, currentSessionId]);
	useEffect(() => {
		pluginManager.emit('sessionChanged', { currentSessionId, session: sessions.find(session => session.id === currentSessionId) || null });
	}, [currentSessionId, sessions]);
	useEffect(() => {
		const previousIds = previousSolveIdsRef.current;
		Object.values(solves).forEach(solve => {
			if (!previousIds.has(solve.id)) pluginManager.emit('solveAdded', solve);
		});
		previousSolveIdsRef.current = new Set(Object.keys(solves));
	}, [solves]);
	const timeListRef = useRef<TimeListHandle>(null);
	const [scrambleVisualizerState, setScrambleVisualizerState] = useState<{ activeScrambleIndex?: number; activeMoveIndex?: number }>({});

	const isVirtual = !!effectiveSettings.virtualCube;
	const hasUnsyncedData = Boolean(auth.user) && !auth.isSynced;
	const shouldWarnBeforeUnload = hasPendingSyncActions && (Boolean(auth.user) || !storageStatus.isBrowserStorageWritable());

	useEffect(() => {
		setScrambleVisualizerState({});
	}, [currentScramble]);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
			if (shouldWarnBeforeUnload) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', handleBeforeUnload);
		return (): void => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [shouldWarnBeforeUnload]);

	const handleTimerStart = (start: number): void => {
		setTimerState(TimerState.RUNNING);
		setTimerStartTime(start);
		if (selectedIds.size > 0) setSelectedIds(new Set());
		setScrambleVisualizerState({});
	};

	const handleTimerStop = (finalTime: number, inspection: number, phases: SolvePhase[], penaltyOverride?: Penalty): string => {
		setTimerState(TimerState.STOPPED);
		setTimerTime(finalTime);

		const { id, isPB } = actions.addSolve(finalTime, inspection, phases, penaltyOverride);

		setSelectedIds(new Set([id]));
		setLastClickedId(id);

		if (isPB) {
			setFireworks(true);
			setTimeout(() => setFireworks(false), 5000);
		}

		setTimeout(() => {
			setTimerState(TimerState.IDLE);
			setTimerTime(0);
		}, settings.restartDelayEnabled ? settings.restartDelayMs : 0);

		return id;
	};

	const isInspectionCountingState = (state: TimerState): boolean => {
		if (!effectiveSettings.inspectionEnabled) return false;
		return state === TimerState.INSPECTION || state === TimerState.HOLDING || state === TimerState.READY;
	};

	const abortInspection = (): void => {
		if (!isInspectionCountingState(timerState)) return;
		if (mobileHoldTimeoutRef.current) {
			clearTimeout(mobileHoldTimeoutRef.current);
			mobileHoldTimeoutRef.current = null;
		}
		if (effectiveSettings.inspectionAbortAction === InspectionAbortAction.CANCEL) {
			setTimerState(TimerState.IDLE);
			setTimerTime(0);
			return;
		}
		const phases: SolvePhase[] = [{ duration: 0, cumulative: 0 }];
		handleTimerStop(0, -1, phases, Penalty.DNF);
	};

	useEffect(() => {
		return (): void => {
			if (mobileHoldTimeoutRef.current) clearTimeout(mobileHoldTimeoutRef.current);
		};
	}, []);

	const handleTouchStart = (): void => {
		if (timerState === TimerState.LOCKED) return;
		if (timerState === TimerState.RUNNING) {
			const finalTime = performance.now() - timerStartTime;
			const phases: SolvePhase[] = [{ duration: finalTime, cumulative: finalTime }];
			handleTimerStop(finalTime, -1, phases);
			return;
		}

		if (timerState === TimerState.IDLE || timerState === TimerState.STOPPED) {
			if (effectiveSettings.inspectionEnabled) {
				setTimerState(TimerState.INSPECTION);
			} else if (effectiveSettings.holdToStart) {
				setTimerState(TimerState.HOLDING);
				if (mobileHoldTimeoutRef.current) clearTimeout(mobileHoldTimeoutRef.current);
				mobileHoldTimeoutRef.current = setTimeout(() => {
					mobileHoldTimeoutRef.current = null;
					setTimerState(current => current === TimerState.HOLDING ? TimerState.READY : current);
				}, HOLD_TO_START_DELAY_MS);
			} else {
				setTimerState(TimerState.READY);
			}
		} else if (timerState === TimerState.INSPECTION) {
			if (effectiveSettings.holdToStart) {
				setTimerState(TimerState.HOLDING);
				if (mobileHoldTimeoutRef.current) clearTimeout(mobileHoldTimeoutRef.current);
				mobileHoldTimeoutRef.current = setTimeout(() => {
					mobileHoldTimeoutRef.current = null;
					setTimerState(current => current === TimerState.HOLDING ? TimerState.READY : current);
				}, HOLD_TO_START_DELAY_MS);
			} else {
				setTimerState(TimerState.READY);
			}
		}
	};

	const handleTouchEnd = (): void => {
		if (mobileHoldTimeoutRef.current) {
			clearTimeout(mobileHoldTimeoutRef.current);
			mobileHoldTimeoutRef.current = null;
		}

		if (timerState === TimerState.READY) {
			handleTimerStart(performance.now());
		} else if (timerState === TimerState.HOLDING) {
			setTimerState(effectiveSettings.inspectionEnabled ? TimerState.INSPECTION : TimerState.IDLE);
		}
	};

	const handleVirtualMove = (): void => {
		if (timerState === TimerState.IDLE || timerState === TimerState.INSPECTION) {
			handleTimerStart(performance.now());
		}
	};

	const handleVirtualSolve = (): void => {
		if (timerState === TimerState.RUNNING) {
			const finalTime = performance.now() - timerStartTime;
			const phases: SolvePhase[] = [{ duration: finalTime, cumulative: finalTime }];
			handleTimerStop(finalTime, -1, phases);
		}
	};

	const handleShortcut = (action: ShortcutAction): void => {
		if (isModalOpen && action !== ShortcutAction.ESCAPE) return;

		if (action === ShortcutAction.ESCAPE) {
			if (isInspectionCountingState(timerState)) {
				abortInspection();
				return;
			}
			if (timerState === TimerState.RUNNING) {
				const finalTime = performance.now() - timerStartTime;
				const phases: SolvePhase[] = [{ duration: finalTime, cumulative: finalTime }];
				handleTimerStop(finalTime, -1, phases, Penalty.DNF);
				return;
			}
		}

		if (timerState === TimerState.RUNNING || isInspectionCountingState(timerState)) return;

		switch (action) {
		case ShortcutAction.ESCAPE:
			if (activeMobileWidget) {
				setActiveMobileWidget(null);
				break;
			}
			if (isModalOpen) closeModal();
			break;
		case ShortcutAction.NEXT_SCRAMBLE:
			actions.nextScramble();
			break;
		case ShortcutAction.PREV_SCRAMBLE:
			actions.prevScramble();
			break;
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
				actions.deleteSolves(Array.from(selectedIds), currentSessionId);
				setSelectedIds(new Set());
			} else if (computedSolves.length > 0 && confirm('Delete last solve?')) {
				actions.deleteSolves([computedSolves[0].id], currentSessionId);
			}
			break;
		case ShortcutAction.OPEN_SESSION_MANAGER:
			openModal({ type: 'SESSION_MANAGER' });
			break;
		case ShortcutAction.MANUAL_ENTRY:
			openModal({ type: 'MANUAL_ENTRY' });
			break;
		case ShortcutAction.OPEN_DETAILS:
			if (selectedIds.size === 1) openModal({ type: 'DETAILS', data: Array.from(selectedIds)[0] });
			else if (computedSolves.length > 0) openModal({ type: 'DETAILS', data: computedSolves[0].id });
			break;
		case ShortcutAction.OPEN_COMMAND_PALETTE:
			openModal({ type: 'COMMAND' });
			break;
		case ShortcutAction.MOVE_SELECTION_UP:
		case ShortcutAction.MOVE_SELECTION_DOWN:
			if (timeListRef.current) {
				const delta = action === ShortcutAction.MOVE_SELECTION_UP ? -1 : 1;
				const newId = timeListRef.current.moveSelection(delta, false);
				if (newId) setLastClickedId(newId);
			}
			break;
		case ShortcutAction.EXTEND_SELECTION_UP:
		case ShortcutAction.EXTEND_SELECTION_DOWN:
			if (timeListRef.current) {
				const delta = action === ShortcutAction.EXTEND_SELECTION_UP ? -1 : 1;
				const newId = timeListRef.current.moveSelection(delta, true);
				if (newId) setLastClickedId(newId);
			}
			break;
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

	const handleSelect = (id: string, multi: boolean, range: boolean): void => {
		const newSet = new Set(multi ? selectedIds : []);
		if (range && lastClickedId && lastClickedId !== id) {
			const idx1 = computedSolves.findIndex(s => s.id === lastClickedId);
			const idx2 = computedSolves.findIndex(s => s.id === id);
			if (idx1 !== -1 && idx2 !== -1) {
				const start = Math.min(idx1, idx2);
				const end = Math.max(idx1, idx2);
				for (let i = start; i <= end; i++) {
					newSet.add(computedSolves[i].id);
				}
			}
		} else if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		setSelectedIds(newSet);
		setLastClickedId(id);
	};

	const selectedSolve = useMemo(() => {
		if (selectedIds.size === 1) {
			const id = Array.from(selectedIds)[0];
			return computedSolves.find(s => s.id === id) ?? null;
		}
		return null;
	}, [selectedIds, computedSolves]);

	const timerDisplayProps = useMemo(() => {
		if (selectedSolve) {
			return { time: selectedSolve.time, penalty: selectedSolve.penalty };
		}
		return { time: timerTime, penalty: Penalty.NONE };
	}, [selectedSolve, timerTime]);

	const renderWidget = (id: string): ReactElement | null => {
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
							onTimerStart={!isVirtual ? handleTimerStart : (): void => {}}
							onTimerStop={!isVirtual ? handleTimerStop : (): string => ''}
							onInspectionStart={() => setTimerState(TimerState.INSPECTION)}
							onPrepare={() => !isVirtual && setTimerState(TimerState.HOLDING)}
							onReady={() => !isVirtual && setTimerState(TimerState.READY)}
							onCancelPrepare={(returnToInspection) => !isVirtual && setTimerState(returnToInspection ? TimerState.INSPECTION : TimerState.IDLE)}
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
									isModalOpen={isModalOpen || activeMobileWidget !== null}
								/>
							</div>
						</div>
					)}
				</div>
			);
		case WidgetId.TIMELIST:
			return (
				<TimeList
					ref={timeListRef}
					solves={computedSolves}
					selectedIds={selectedIds}
					lastClickedId={lastClickedId}
					filterText={timeListFilterText}
					onFilterTextChange={setTimeListFilterText}
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
					onPenalty={(solveId, penalty) => actions.updatePenalty(solveId, penalty)}
					onDetails={(solveId) => openModal({ type: 'DETAILS', data: solveId })}
					onMove={(ids) => openModal({ type: 'MOVE', data: ids, mode: 'MOVE' })}
					onDuplicate={(ids) => openModal({ type: 'MOVE', data: ids, mode: 'DUPLICATE' })}
					className="h-full"
					sessionLocked={!!currentSession.locked}
				/>
			);
		case WidgetId.STATS:
			return (
				<div className="h-full overflow-y-auto custom-scrollbar p-2">
					<StatsPanel
						config={statsConfig}
						solves={currentSession.solves}
						theme={settings.theme}
						pbVisuals={settings.pbVisuals}
						precision={effectiveSettings.timePrecision}
					/>
				</div>
			);
		case WidgetId.SCRAMBLE:
			return (
				<ScrambleWidget
					scramble={currentScramble}
					scramblerIds={currentSession.scramblerId}
					visualizerState={scrambleVisualizerState}
					setVisualizerState={setScrambleVisualizerState}
				/>
			);
		case WidgetId.SCRAMBLE_IMAGE:
			if (!isVirtual) {
				return (
					<ScrambleImageWidget
						scramble={currentScramble}
						visualizerState={scrambleVisualizerState}
						scramblerIds={currentSession.scramblerId}
						imageConfig={settings.scrambleImage}
						language={settings.language}
					/>
				);
			}
			return null;
		case WidgetId.SESSION:
			return (
				<div className="flex items-center justify-center h-full px-4">
					<button
						onClick={() => openModal({ type: 'SESSION_MANAGER' })}
						className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors text-lg font-bold truncate"
					>
						{currentSession.name}
						<ChevronDown size={16} className="text-zinc-500" />
					</button>
				</div>
			);
		case WidgetId.LOGO:
			return <LogoWidget onClick={() => openModal({ type: 'ABOUT' })} hasUnsyncedData={hasUnsyncedData} />;
		case WidgetId.TOOLS:
			return (
				<div className="flex items-center justify-center h-full gap-2 px-2">
					<button onClick={() => openModal({ type: 'PROFILE' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><User size={20} className={auth.user ? 'text-blue-400' : ''} /></button>
					<button onClick={() => openModal({ type: 'DATA' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><Save size={20} /></button>
					<button onClick={() => openModal({ type: 'STATISTICS' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><BarChart2 size={20} /></button>
					<button onClick={() => openModal({ type: 'SETTINGS' })} className="p-2 text-zinc-500 hover:text-zinc-200 transition-colors"><SettingsIcon size={20} /></button>
				</div>
			);
		case WidgetId.TIME_DISTRIBUTION:
			return (
				<TimeDistributionWidget
					solves={computedSolves}
					config={settings.timeDistribution}
					theme={settings.theme}
					onApplyFilter={setTimeListFilterText}
					language={settings.language}
				/>
			);
		case WidgetId.GOALS:
			return (
				<GoalsWidget
					goals={goals}
					solves={computedSolves}
					sessions={sessions}
					currentSessionId={currentSessionId}
					onAdd={() => openModal({ type: 'GOAL_MANAGER' })}
					onEdit={(goal) => openModal({ type: 'GOAL_MANAGER', data: goal })}
					config={settings.goalsWidget}
					onUpdate={(config) => setSettings({ ...settings, goalsWidget: config })}
					language={settings.language}
					dateFormat={settings.dateFormat}
				/>
			);
		case WidgetId.SOLVES_OVER_TIME:
			return (
				<SolvesOverTimeWidget
					solves={computedSolves}
					theme={settings.theme}
					config={settings.solvesOverTime}
					onUpdate={(config) => setSettings({ ...settings, solvesOverTime: config })}
					dateFormat={settings.dateFormat}
					language={settings.language}
				/>
			);
		case WidgetId.METRONOME:
			return (
				<MetronomeWidget
					config={settings.metronome}
					onUpdate={(config) => setSettings({ ...settings, metronome: config })}
					sessionId={currentSessionId}
					language={settings.language}
				/>
			);
		case WidgetId.TAG_ASSIGNER:
			return (
				<TagAssignerWidget
					session={currentSession}
					latestSolve={computedSolves[0]}
					onUpdateSession={actions.updateSession}
					onUpdateSolve={actions.updateSolve}
				/>
			);
		default:
			if (pluginManager.getWidget(id)) {
				return <PluginWidgetWrapper widgetId={id} className="h-full" />;
			}
			return null;
		}
	};

	const layoutPreset = getPreset(effectiveSettings.layout.presetId);
	const areas = layoutPreset.areas;

	const getMobileWidgetIcon = (id: string): LucideIcon => {
		switch (id) {
		case WidgetId.TIMELIST:
			return List;
		case WidgetId.STATS:
			return PieChart;
		case WidgetId.TIME_DISTRIBUTION:
			return BarChart2;
		case WidgetId.GOALS:
			return LayoutGrid;
		case WidgetId.SOLVES_OVER_TIME:
			return Activity;
		case WidgetId.METRONOME:
			return Music;
		case WidgetId.TAG_ASSIGNER:
			return Tag;
		case WidgetId.SESSION:
		case WidgetId.SCRAMBLE_IMAGE:
		default:
			return Box;
		}
	};

	const mobileSidebarItems: MobileSidebarItem[] = [
		{ id: 'OPT_PROFILE', icon: User, label: 'Profile', type: 'MODAL', modal: 'PROFILE' },
		{ id: 'OPT_DATA', icon: Save, label: 'Data', type: 'MODAL', modal: 'DATA' },
		{ id: 'OPT_STATS', icon: BarChart2, label: 'Stats', type: 'MODAL', modal: 'STATISTICS' },
		{ id: 'OPT_SETTINGS', icon: SettingsIcon, label: 'Settings', type: 'MODAL', modal: 'SETTINGS' },
		{ id: 'SEP', type: 'SEPARATOR' },
		...WIDGET_DEFINITIONS
			.filter(w => !['TIMER', 'SCRAMBLE', 'LOGO', 'TOOLS', 'SESSION'].includes(w.id))
			.map((w): MobileSidebarItem => ({ id: w.id, icon: getMobileWidgetIcon(w.id), label: w.name, type: 'WIDGET' })),
		...pluginManager.getWidgets().map((w): MobileSidebarItem => ({ id: w.id, icon: Box, label: w.name, type: 'WIDGET' }))
	];

	const mobileBottomWidgets = [
		settings.mobileLayout?.slot1 || WidgetId.EMPTY,
		settings.mobileLayout?.slot2 || WidgetId.EMPTY
	].filter((id): id is WidgetId => id !== WidgetId.EMPTY);
	const hasTransparentWidgetSurface = (id: string): boolean => id === WidgetId.SCRAMBLE_IMAGE;
	const mobileScrambleHeightClass = settings.mobileLayout?.enabled && mobileBottomWidgets.length > 0
		? 'h-[22vh] min-h-[6.5rem] max-h-[11rem]'
		: 'h-[30vh] min-h-[8rem] max-h-[16rem]';
	const themeStyle = {
		backgroundColor: settings.backgroundColor,
		color: settings.textColor,
		backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none',
		backgroundSize: 'cover',
		backgroundPosition: 'center',
		...getWidgetSurfaceVars(settings.backgroundColor)
	} as React.CSSProperties;

	return (
		<div className="h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-200 relative transition-colors duration-300" style={themeStyle}>
			{settings.backgroundImage && (
				<div
					className="absolute inset-0 pointer-events-none"
					style={{ backgroundColor: settings.backgroundColor, opacity: (100 - settings.backgroundImageOpacity) / 100 }}
				/>
			)}
			{fireworks && settings.pbFireworks && <Fireworks />}
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />
			{isMobile ? (
				<div className="flex h-full w-full relative">
					<div className="w-16 backdrop-blur border-r flex flex-col items-center py-4 gap-4 overflow-y-auto z-10 no-scrollbar shrink-0" style={{ backgroundColor: 'var(--widget-surface-strong)', borderColor: 'var(--widget-border)' }}>
						{mobileSidebarItems.map((item, idx) => {
							if (item.type === 'SEPARATOR') return <div key={idx} className="w-8 h-px bg-zinc-800 my-1 shrink-0" />;

							const Icon = item.icon;
							const isActive = activeMobileWidget === item.id;
							return (
								<button
									key={item.id}
									onClick={() => {
										if (item.type === 'MODAL') openModal({ type: item.modal });
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
					<div className="flex-1 flex flex-col relative overflow-hidden touch-none select-none">
						<div className="h-14 shrink-0 border-b z-20" style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
							{renderWidget(WidgetId.SESSION)}
						</div>
						<div className={`${mobileScrambleHeightClass} shrink-0 bg-gradient-to-b from-zinc-950/50 to-transparent relative z-20 pointer-events-none`}>
							<ScrambleWidget
								scramble={currentScramble}
								scramblerIds={currentSession.scramblerId}
								visualizerState={scrambleVisualizerState}
								setVisualizerState={() => {}}
								className="pointer-events-none"
							/>
						</div>
						<div
							className="flex-1 flex items-center justify-center relative z-10"
							onTouchStart={handleTouchStart}
							onTouchEnd={handleTouchEnd}
							onMouseDown={handleTouchStart}
							onMouseUp={handleTouchEnd}
						>
							<Timer
								state={timerState}
								time={timerDisplayProps.time}
								penalty={timerDisplayProps.penalty}
								startTime={timerStartTime}
								settings={effectiveSettings}
								numberOfPhases={effectiveSettings.numberOfPhases || 1}
								onTimerStart={() => {}}
								onTimerStop={() => ''}
								onInspectionStart={() => {}}
								onPrepare={() => {}}
								onReady={() => {}}
								onCancelPrepare={(_returnToInspection) => {}}
							/>
							{isInspectionCountingState(timerState) && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										abortInspection();
									}}
									onMouseDown={(e) => e.stopPropagation()}
									onTouchStart={(e) => e.stopPropagation()}
									className="absolute top-3 right-3 z-30 inline-flex items-center gap-2 rounded-lg border border-red-500/50 bg-zinc-950/80 px-3 py-2 text-xs font-bold text-red-300"
								>
									<XCircle size={14} />
									{t('timer.abortInspection', settings.language)}
								</button>
							)}
						</div>
						{settings.mobileLayout?.enabled && mobileBottomWidgets.length > 0 && (
							<div className={`shrink-0 border-t p-2 grid gap-2 ${mobileBottomWidgets.length > 1 ? 'grid-cols-2 h-44' : 'grid-cols-1 h-32'}`} style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
								{mobileBottomWidgets.map(widgetId => (
									<div
										key={widgetId}
										className="min-h-0 overflow-hidden rounded border"
										style={hasTransparentWidgetSurface(widgetId)
											? { backgroundColor: 'transparent', borderColor: 'transparent' }
											: { backgroundColor: 'var(--widget-surface-muted)', borderColor: 'var(--widget-border)' }}
									>
										{renderWidget(widgetId)}
									</div>
								))}
							</div>
						)}
					</div>
					<div
						className={`absolute inset-0 z-50 transition-transform duration-300 ease-in-out flex flex-col ${activeMobileWidget ? 'translate-x-0' : '-translate-x-full'}`}
						style={{ backgroundColor: activeMobileWidget && hasTransparentWidgetSurface(activeMobileWidget) ? 'transparent' : 'var(--widget-surface-strong)' }}
					>
						{activeMobileWidget && (
							<>
								<div className="h-14 border-b flex items-center px-4 shrink-0" style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
									<button onClick={() => setActiveMobileWidget(null)} className="flex items-center gap-2 text-zinc-400 hover:text-white">
										<ChevronLeft size={20} />
										<span className="font-bold">Back</span>
									</button>
									<div className="ml-auto font-bold text-zinc-200">
										{mobileSidebarItems.find((item): item is Exclude<MobileSidebarItem, { type: 'SEPARATOR' }> => item.id === activeMobileWidget && item.type !== 'SEPARATOR')?.label}
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
				<LayoutRenderer
					areas={areas}
					widgetMapping={effectiveSettings.layout.widgetMapping}
					mirror={!!effectiveSettings.layout.mirror}
					renderWidget={renderWidget}
				/>
			)}
		</div>
	);
};

export default AppLayout;
