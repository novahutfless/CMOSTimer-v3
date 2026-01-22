import { useEffect, useRef } from 'react';
import { TimerState, Settings, StartInputMethod } from '../types';

export const useTimerLogic = (
	state: TimerState, 
	settings: Settings, 
	numberOfPhases: number,
	callbacks: {
      onTimerStart: (startTime: number) => void;
      onTimerStop: (phases: any[]) => void;
      onInspectionStart: () => void;
      onPrepare: () => void;
      onReady: () => void;
      onCancelPrepare: () => void;
      onSplit: (phaseData: any) => void;
  }
) => {
	const pressedKeys = useRef<Set<string>>(new Set());
	const startTimeRef = useRef<number>(0);
  
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
			if (settings.inspectionEnabled) callbacksRef.current.onInspectionStart();
			else if (isReady()) callbacksRef.current.onPrepare();
		} else if (state === TimerState.INSPECTION) {
			if (isReady()) callbacksRef.current.onPrepare();
		}
	};

	const handleTriggerUp = (): void => {
		if (state === TimerState.READY) {
			const now = performance.now();
			startTimeRef.current = now;
			callbacksRef.current.onTimerStart(now);
		} else if (state === TimerState.HOLDING) {
			callbacksRef.current.onCancelPrepare();
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
