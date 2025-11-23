

import React, { useEffect, useState, useRef } from 'react';
import { TimerState, Settings, Penalty, AppTheme, InspectionDirection, SolvePhase, InspectionVoice } from '../types';
import { formatTime, invertHex, voicem8s, voicem12s, voicef8s, voicef12s, Stackmat, StackmatState } from '../utils';
import { useTimerLogic } from '../hooks/useTimerLogic';
import { Mic, MicOff } from 'lucide-react';

interface TimerProps {
  state: TimerState;
  time: number;
  startTime: number;
  settings: Settings;
  numberOfPhases?: number;
  penalty?: Penalty;
  onTimerStart: (startTime: number) => void;
  onTimerStop: (finalTime: number, inspectionTime: number, phases: SolvePhase[]) => void;
  onInspectionStart: () => void;
  onPrepare: () => void;
  onReady: () => void;
  onCancelPrepare: () => void;
}

const Timer: React.FC<TimerProps> = ({
  state,
  time,
  startTime,
  settings,
  numberOfPhases = 1,
  penalty = Penalty.NONE,
  onTimerStart,
  onTimerStop,
  onInspectionStart,
  onPrepare,
  onReady,
  onCancelPrepare,
}) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [inspectionTime, setInspectionTime] = useState(0);
  const [isFlashed, setIsFlashed] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(1);
  const [flashColor, setFlashColor] = useState('transparent');
  
  // Stackmat state
  const [stackmatSignal, setStackmatSignal] = useState<StackmatState | null>(null);
  const lastStackmatRunning = useRef(false);

  const requestRef = useRef<number>(0);
  const inspectionStartRef = useRef<number>(0);
  const phaseSplits = useRef<SolvePhase[]>([]);
  const lastInspectionDurationRef = useRef<number>(-1);
  
  // Voice tracking
  const voiceTriggers = useRef<{ '8': boolean; '12': boolean }>({ '8': false, '12': false });

  // Stackmat Integration
  useEffect(() => {
      if (settings.useStackmat) {
          const handleStackmatUpdate = (data: StackmatState) => {
              setStackmatSignal(data);
              
              // Sync app state with Stackmat state
              if (data.running && !lastStackmatRunning.current) {
                  // Stackmat started - use current time as rough start time for sync if needed, but stackmat provides time directly
                  onTimerStart(performance.now());
              } else if (!data.running && lastStackmatRunning.current) {
                  // Stackmat stopped
                  const finalTime = data.time_milli;
                  // For stackmat, we just have 1 phase usually
                  const phases = [{ duration: finalTime, cumulative: finalTime }];
                  onTimerStop(finalTime, -1, phases);
              }
              
              // If timer is not running but we have a signal with time > 0, it might be a stopped time.
              // We update displayTime in the render logic based on this state.
              
              lastStackmatRunning.current = data.running;
          };

          Stackmat.init(handleStackmatUpdate);
          return () => Stackmat.stop();
      } else {
          setStackmatSignal(null);
      }
  }, [settings.useStackmat, onTimerStart, onTimerStop]);

  useEffect(() => {
      let timeout: ReturnType<typeof setTimeout>;
      if (state === TimerState.HOLDING) {
          if (settings.holdToStart) {
              timeout = setTimeout(() => {
                  onReady();
              }, 500);
          } else {
              onReady();
          }
      }
      return () => clearTimeout(timeout);
  }, [state, settings.holdToStart, onReady]);


  const handleStop = (phases: any[]) => {
      const inspectionUsed = settings.inspectionEnabled ? lastInspectionDurationRef.current : -1;
      onTimerStop(phases[phases.length-1].cumulative, inspectionUsed, phases);
  };

  const handleSplit = (data: { now: number, startTime: number }) => {
      const totalElapsed = data.now - data.startTime;
      const prevSum = phaseSplits.current.reduce((acc, p) => acc + p.duration, 0);
      const duration = totalElapsed - prevSum;
      phaseSplits.current.push({ duration, cumulative: totalElapsed });
      
      if (currentPhase < numberOfPhases) {
          setCurrentPhase(p => p + 1);
      } else {
          const inspectionUsed = settings.inspectionEnabled ? lastInspectionDurationRef.current : -1;
          onTimerStop(totalElapsed, inspectionUsed, phaseSplits.current);
      }
  };

  const handleStart = (ts: number) => {
      onTimerStart(ts);
  };

  // Conditional logic hook: Only active if Stackmat is NOT used
  const { startTimeRef } = useTimerLogic(state, settings, numberOfPhases, {
      onTimerStart: handleStart,
      onTimerStop: handleStop,
      onInspectionStart,
      onPrepare, 
      onReady,   
      onCancelPrepare,
      onSplit: handleSplit
  });

  // Synchronize the ref with the prop passed from App
  // This ensures that if this Timer instance didn't trigger the start, it still has the correct start time
  useEffect(() => {
      if (startTime > 0) {
          startTimeRef.current = startTime;
      }
  }, [startTime]);

  const checkFlash = (elapsed: number) => {
     if (!settings.inspectionFlashes) return;
     const prevElapsed = elapsed - 16;
     const cross = (sec: number) => elapsed >= sec * 1000 && prevElapsed < sec * 1000;
     let shouldFlash = false;
     
     if (settings.inspectionFlashes.enabled8 && cross(8)) shouldFlash = true;
     if (settings.inspectionFlashes.enabled12 && cross(12)) shouldFlash = true;
     if (settings.inspectionFlashes.enabled15 && cross(15)) shouldFlash = true;

     if (shouldFlash) {
         setIsFlashed(true);
         setTimeout(() => setIsFlashed(false), 50);
     }
  };

  const checkVoice = (elapsed: number) => {
    if (settings.inspectionVoice === InspectionVoice.NONE) return;

    if (!voiceTriggers.current['8'] && elapsed >= 8000) {
        voiceTriggers.current['8'] = true;
        if (settings.inspectionVoice === InspectionVoice.MALE) voicem8s.play().catch(() => {});
        else voicef8s.play().catch(() => {});
    }
    if (!voiceTriggers.current['12'] && elapsed >= 12000) {
        voiceTriggers.current['12'] = true;
        if (settings.inspectionVoice === InspectionVoice.MALE) voicem12s.play().catch(() => {});
        else voicef12s.play().catch(() => {});
    }
  };

  useEffect(() => {
    const animate = (now: number) => {
        if (settings.useStackmat) {
             return;
        }

        if (state === TimerState.RUNNING) {
            if (startTimeRef.current > 0) {
                const elapsed = Math.max(0, now - startTimeRef.current);
                setDisplayTime(elapsed);
            }
            requestRef.current = requestAnimationFrame(animate);
        } else if (state === TimerState.INSPECTION) {
            const elapsed = Math.max(0, now - inspectionStartRef.current);
            lastInspectionDurationRef.current = elapsed;
            checkFlash(elapsed);
            checkVoice(elapsed);
            let val = elapsed;
            if (settings.inspectionDirection === InspectionDirection.DOWN) {
                val = 15000 - elapsed;
            }
            setInspectionTime(val);
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    if (!settings.useStackmat) {
        if (state === TimerState.RUNNING) {
          phaseSplits.current = [];
          setCurrentPhase(1);
          requestRef.current = requestAnimationFrame(animate);
        } else if (state === TimerState.INSPECTION) {
          inspectionStartRef.current = performance.now();
          voiceTriggers.current = { '8': false, '12': false };
          requestRef.current = requestAnimationFrame(animate);
        } else {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
          setIsFlashed(false);
          if (state === TimerState.STOPPED || state === TimerState.IDLE || state === TimerState.LOCKED) {
            setDisplayTime(time);
          } else if (state === TimerState.HOLDING || state === TimerState.READY) {
             if (!settings.inspectionEnabled) setDisplayTime(0);
          }
        }
    }
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [state, time, settings.inspectionEnabled, settings.inspectionDirection, startTimeRef, settings.useStackmat]);

  useEffect(() => setFlashColor(invertHex(settings.backgroundColor)), [settings.backgroundColor]);

  const getDisplayColor = () => {
      if (settings.useStackmat && stackmatSignal) {
          if (!stackmatSignal.on) return "text-zinc-600";
          if (stackmatSignal.greenLight) return "text-green-500";
          if (stackmatSignal.leftHand || stackmatSignal.rightHand) return "text-red-500";
          if (stackmatSignal.running) return "text-zinc-100";
          return "text-zinc-200";
      }

      if (state === TimerState.LOCKED) return "text-zinc-600";
      if (state === TimerState.HOLDING) return "text-red-500";
      if (state === TimerState.READY) return "text-green-500";
      if (state === TimerState.RUNNING) return "text-zinc-100";
      if (state === TimerState.INSPECTION) return "text-amber-400";
      switch(settings.theme) {
          case AppTheme.BLUE: return "text-blue-200";
          case AppTheme.GREEN: return "text-emerald-200";
          case AppTheme.ORANGE: return "text-orange-200";
          case AppTheme.PURPLE: return "text-purple-200";
          case AppTheme.ROSE: return "text-rose-200";
          default: return "text-zinc-200";
      }
  };

  const renderMainDisplay = () => {
      // Stackmat Override
      if (settings.useStackmat && stackmatSignal) {
          if (!stackmatSignal.on) return "OFF";
          return formatTime(stackmatSignal.time_milli, Penalty.NONE, settings.timePrecision);
      }

      if (state === TimerState.INSPECTION) {
          if (settings.autoPenalty) {
              let elapsed = inspectionTime;
              if (settings.inspectionDirection === InspectionDirection.DOWN) {
                  elapsed = 15000 - inspectionTime;
              }
              if (elapsed >= 17000) return "DNF";
              if (elapsed >= 15000) return "+2";
          }
          return formatTime(Math.abs(inspectionTime), Penalty.NONE, settings.inspectionPrecision);
      }
      if (state === TimerState.RUNNING) {
          if (settings.hideWhileTiming) return settings.hideWhileTimingText || "Solving...";
          return formatTime(displayTime, Penalty.NONE, settings.timePrecision);
      }
      if (state === TimerState.STOPPED || state === TimerState.IDLE || state === TimerState.LOCKED) {
          return formatTime(displayTime, penalty, settings.timePrecision);
      }
      return formatTime(0, Penalty.NONE, settings.timePrecision);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative select-none min-h-[200px]">
      {isFlashed && <div className="absolute inset-0 z-50 pointer-events-none" style={{ backgroundColor: flashColor }} />}
      
      <div className={`font-mono text-[8rem] lg:text-[12rem] leading-none transition-colors duration-100 ${getDisplayColor()} text-center scale-75 md:scale-100`}>
        {renderMainDisplay()}
      </div>
      
      <div className="h-8 mt-4 flex flex-col items-center gap-1">
        {settings.useStackmat ? (
            <div className="flex items-center gap-2 text-zinc-500 text-sm">
                {stackmatSignal?.on ? <Mic size={16} className="text-green-500 animate-pulse"/> : <MicOff size={16} className="text-red-500"/>}
                <span>Stackmat {stackmatSignal?.on ? 'Connected' : 'Signal Lost'}</span>
            </div>
        ) : (
            <>
                {state === TimerState.IDLE && <p className="text-zinc-500 text-sm">{settings.inspectionEnabled ? "Press to Inspect" : "Press to Start"}</p>}
                {state === TimerState.LOCKED && <p className="text-zinc-600 text-xs uppercase tracking-wider">Wait...</p>}
                {state === TimerState.INSPECTION && <p className="text-amber-500/50 text-xs uppercase tracking-wider">Inspection</p>}
                {numberOfPhases > 1 && state === TimerState.RUNNING && <p className="text-zinc-500 text-xs uppercase tracking-wider">Phase {currentPhase} / {numberOfPhases}</p>}
            </>
        )}
      </div>
    </div>
  );
};

export default Timer;
