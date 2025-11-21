
import React, { useEffect, useState, useRef } from 'react';
import { TimerState, Settings, Penalty, AppTheme, InspectionDirection, SolvePhase } from '../types';
import { formatTime, invertHex } from '../utils';
import { useTimerLogic } from '../hooks/useTimerLogic';

interface TimerProps {
  state: TimerState;
  time: number;
  settings: Settings;
  numberOfPhases?: number;
  onTimerStart: () => void;
  onTimerStop: (finalTime: number, inspectionTime: number, phases: SolvePhase[]) => void;
  onInspectionStart: () => void;
  onPrepare: () => void;
  onReady: () => void;
  onCancelPrepare: () => void;
}

const Timer: React.FC<TimerProps> = ({
  state,
  time,
  settings,
  numberOfPhases = 1,
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

  const requestRef = useRef<number>(0);
  const inspectionStartRef = useRef<number>(0);
  const phaseSplits = useRef<SolvePhase[]>([]);
  const lastInspectionDurationRef = useRef<number>(-1);
  
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

  const { startTimeRef } = useTimerLogic(state, settings, numberOfPhases, {
      onTimerStart,
      onTimerStop: handleStop,
      onInspectionStart,
      onPrepare, 
      onReady,   
      onCancelPrepare,
      onSplit: handleSplit
  });

  // Animation Loop
  const animate = (now: number) => {
    if (state === TimerState.RUNNING) {
        const elapsed = Math.max(0, now - startTimeRef.current);
        setDisplayTime(elapsed);
    } else if (state === TimerState.INSPECTION) {
        const elapsed = Math.max(0, now - inspectionStartRef.current);
        lastInspectionDurationRef.current = elapsed;
        checkFlash(elapsed);
        let val = elapsed;
        if (settings.inspectionDirection === InspectionDirection.DOWN) {
            val = 15000 - elapsed;
        }
        setInspectionTime(val);
    }
    requestRef.current = requestAnimationFrame(animate);
  };

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

  useEffect(() => {
    if (state === TimerState.RUNNING) {
      phaseSplits.current = [];
      setCurrentPhase(1);
      requestRef.current = requestAnimationFrame(animate);
    } else if (state === TimerState.INSPECTION) {
      inspectionStartRef.current = performance.now();
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
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [state, time, settings.inspectionEnabled, settings.inspectionDirection]);

  useEffect(() => setFlashColor(invertHex(settings.backgroundColor)), [settings.backgroundColor]);

  const getDisplayColor = () => {
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
      if (state === TimerState.INSPECTION) {
          return formatTime(Math.abs(inspectionTime), Penalty.NONE, settings.inspectionPrecision);
      }
      if (state === TimerState.RUNNING) {
          if (settings.hideWhileTiming) return settings.hideWhileTimingText || "Solving...";
          return formatTime(displayTime, Penalty.NONE, settings.timePrecision);
      }
      if (state === TimerState.STOPPED || state === TimerState.IDLE || state === TimerState.LOCKED) {
          return formatTime(displayTime, Penalty.NONE, settings.timePrecision);
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
        {state === TimerState.IDLE && <p className="text-zinc-500 text-sm">{settings.inspectionEnabled ? "Press to Inspect" : "Press to Start"}</p>}
        {state === TimerState.LOCKED && <p className="text-zinc-600 text-xs uppercase tracking-wider">Wait...</p>}
        {state === TimerState.INSPECTION && <p className="text-amber-500/50 text-xs uppercase tracking-wider">Inspection</p>}
        {numberOfPhases > 1 && state === TimerState.RUNNING && <p className="text-zinc-500 text-xs uppercase tracking-wider">Phase {currentPhase} / {numberOfPhases}</p>}
      </div>
    </div>
  );
};

export default Timer;
