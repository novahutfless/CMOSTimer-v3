import { useEffect, useRef } from 'react';
import { TimerState, Settings, StartInputMethod, SolvePhase } from '../types';

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
	useEffect(() => {
		callbacksRef.current = callbacks;
	});

	const isValidStartKey = (code: string): boolean => {
		switch(settings.startInput) {
		case StartInputMethod.SPACE: return code === 'Space';
		case StartInputMethod.CTRL_CTRL: return code === 'ControlLeft' || code === 'ControlRight';
		case StartInputMethod.NEAR_SPACE: return ['Space', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'AltLeft', 'AltRight'].includes(code);
		case StartInputMethod.ANY: return true;
		default: return code === 'Space';
		}
	};

	const isReady = (): boolean => {
		if (settings.startInput === StartInputMethod.CTRL_CTRL) 
			return pressedKeys.current.has('ControlLeft') && pressedKeys.current.has('ControlRight');
      
		return true;
	};

	const handleTriggerDown = (): void => {
		if (state === TimerState.LOCKED) return;

		if (state === TimerState.RUNNING) {
			const now = performance.now();
			callbacksRef.current.onSplit({ now, startTime: startTimeRef.current });
			return;
		}

		if (state === TimerState.IDLE || state === TimerState.STOPPED) {
			if (settings.inspectionEnabled) {
				prepareFromInspectionRef.current = false;
				callbacksRef.current.onInspectionStart();
			} else if (isReady()) {
				prepareFromInspectionRef.current = false;
				if (settings.holdToStart) callbacksRef.current.onPrepare();
				else callbacksRef.current.onReady();
			}
		} else if (state === TimerState.INSPECTION) {
			if (isReady()) {
				prepareFromInspectionRef.current = true;
				if (settings.holdToStart) callbacksRef.current.onPrepare();
				else callbacksRef.current.onReady();
			}
		}
	};

	const handleTriggerUp = (): void => {
		if (state === TimerState.READY) {
			const now = performance.now();
			startTimeRef.current = now;
			callbacksRef.current.onTimerStart(now);
			prepareFromInspectionRef.current = false;
		} else if (state === TimerState.HOLDING) {
			callbacksRef.current.onCancelPrepare(prepareFromInspectionRef.current);
		}
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent): void => {
			if (e.repeat) return;
			if ((e.target as HTMLElement).tagName === 'INPUT') return;
			if (!isValidStartKey(e.code)) return;
        
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
			if ((e.target as HTMLElement).tagName === 'INPUT') return;
			if (pressedKeys.current.has(e.code)) {
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
