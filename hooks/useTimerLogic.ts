import { useEffect, useRef } from 'react';
import { TimerState, Settings, StartInputMethod, SolvePhase } from '../types';
import { isTimerStartKey, nextTimerPressIntent, nextTimerReleaseIntent } from '../utils/timerTransitions';

export const useTimerLogic = (
	state: TimerState, 
	settings: Settings, 
	numberOfPhases: number,
	callbacks: {
      onTimerStart: (startTime: number) => void;
      onTimerStop: (phases: SolvePhase[]) => void;
      onInspectionStart: () => void;
      onPrepare: () => void;
      onReady: () => void;
      onCancelPrepare: (returnToInspection: boolean) => void;
      onSplit: (phaseData: { now: number; startTime: number }) => void;
  }
): {
    startTimeRef: React.RefObject<number>;
} => {
	const pressedKeys = useRef<Set<string>>(new Set());
	const startTimeRef = useRef<number>(0);
	const prepareFromInspectionRef = useRef(false);
  
	// Use ref for callbacks to avoid stale closures without re-binding listeners
	const callbacksRef = useRef(callbacks);
	const isEditableTarget = (target: EventTarget | null): boolean => {
		const element = target as HTMLElement | null;
		return !!element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT' || element.isContentEditable || !!element.closest?.('[role="dialog"]'));
	};
	useEffect(() => {
		callbacksRef.current = callbacks;
	});

	const handleTriggerDown = (): void => {
		const intent = nextTimerPressIntent(state, settings, pressedKeys.current);
		if (intent === 'SPLIT') {
			const now = performance.now();
			callbacksRef.current.onSplit({ now, startTime: startTimeRef.current });
			return;
		}
		if (intent === 'INSPECTION') {
			prepareFromInspectionRef.current = false;
			callbacksRef.current.onInspectionStart(); return;
		}
		if (intent === 'PREPARE' || intent === 'READY') {
			prepareFromInspectionRef.current = state === TimerState.INSPECTION;
			if (intent === 'PREPARE') callbacksRef.current.onPrepare(); else callbacksRef.current.onReady();
		}
	};

	const handleTriggerUp = (): void => {
		const intent = nextTimerReleaseIntent(state, prepareFromInspectionRef.current);
		if (intent === 'START') {
			const now = performance.now();
			startTimeRef.current = now;
			callbacksRef.current.onTimerStart(now);
			prepareFromInspectionRef.current = false;
		} else if (intent === 'CANCEL_TO_IDLE' || intent === 'CANCEL_TO_INSPECTION') {
			callbacksRef.current.onCancelPrepare(intent === 'CANCEL_TO_INSPECTION');
		}
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (isEditableTarget(e.target)) return;
			if (!isTimerStartKey(settings.startInput, e.code)) return;
			// Timer keys must not also activate a focused button (e.g. the session selector).
			e.preventDefault();
			if (e.repeat) return;
        
			pressedKeys.current.add(e.code);

			if (settings.startInput === StartInputMethod.CTRL_CTRL) {
				if (state !== TimerState.RUNNING) {
					if (pressedKeys.current.has('ControlLeft') && pressedKeys.current.has('ControlRight')) handleTriggerDown();
				} else {
					handleTriggerDown();
				}
			} else {
				handleTriggerDown();
			}
		};

		const handleKeyUp = (e: KeyboardEvent): void => {
			if (isEditableTarget(e.target)) return;
			if (pressedKeys.current.has(e.code)) {
				e.preventDefault();
				pressedKeys.current.delete(e.code);
				handleTriggerUp();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);
		return (): void => {
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
		};
	}, [state, settings, numberOfPhases]); 
  
	return { startTimeRef };
};
