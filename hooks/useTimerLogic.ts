
import { useEffect, useRef, useState } from 'react';
import { TimerState, Settings, StartInputMethod } from '../types';

export const useTimerLogic = (
  state: TimerState, 
  settings: Settings, 
  numberOfPhases: number,
  callbacks: {
      onTimerStart: () => void;
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
      if (settings.startInput === StartInputMethod.CTRL_CTRL) {
          return pressedKeys.current.has('ControlLeft') && pressedKeys.current.has('ControlRight');
      }
      return true;
  };

  const handleTriggerDown = () => {
      if (state === TimerState.LOCKED) return;

      if (state === TimerState.RUNNING) {
          const now = performance.now();
          callbacks.onSplit({ now, startTime: startTimeRef.current });
          return;
      }

      if (state === TimerState.IDLE || state === TimerState.STOPPED) {
          if (settings.inspectionEnabled) callbacks.onInspectionStart();
          else if (isReady()) callbacks.onPrepare();
      } else if (state === TimerState.INSPECTION) {
          if (isReady()) callbacks.onPrepare();
      }
  };

  const handleTriggerUp = () => {
      if (state === TimerState.READY) {
          startTimeRef.current = performance.now();
          callbacks.onTimerStart();
      } else if (state === TimerState.HOLDING) {
          callbacks.onCancelPrepare();
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if (!isValidStartKey(e.code)) return;
        
        pressedKeys.current.add(e.code);

        if (settings.startInput === StartInputMethod.CTRL_CTRL) {
            if (state !== TimerState.RUNNING) {
                 if (pressedKeys.current.has('ControlLeft') && pressedKeys.current.has('ControlRight')) handleTriggerDown();
            } else handleTriggerDown();
        } else handleTriggerDown();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if (pressedKeys.current.has(e.code)) {
             pressedKeys.current.delete(e.code);
             handleTriggerUp();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state, settings, numberOfPhases]); // Dependencies must be correct
  
  return { startTimeRef };
};
