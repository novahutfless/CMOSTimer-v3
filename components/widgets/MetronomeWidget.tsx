
import React, { useEffect, useRef, useState } from 'react';
import { MetronomeConfig } from '../../types';
import { Play, Pause, Volume2 } from 'lucide-react';

interface Props {
    config: MetronomeConfig;
    onUpdate: (config: MetronomeConfig) => void;
    sessionId: string;
    className?: string;
}

export const MetronomeWidget: React.FC<Props> = ({ config, onUpdate, sessionId, className }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const nextNoteTimeRef = useRef<number>(0);
    const timerIdRef = useRef<number | null>(null);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0); // Reference for precise visual phase alignment
    
    // Visual state
    const [pendulumAngle, setPendulumAngle] = useState(0);

    // Stop when session changes
    useEffect(() => {
        if (isPlaying) stop();
    }, [sessionId]);

    // Audio Logic
    useEffect(() => {
        const AC = (window.AudioContext || (window as any).webkitAudioContext);
        if (AC) audioCtxRef.current = new AC();
        
        return () => {
            if (audioCtxRef.current) audioCtxRef.current.close();
            if (timerIdRef.current) clearTimeout(timerIdRef.current);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const playClick = (time: number) => {
        if (!audioCtxRef.current) return;
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        
        // Short click
        osc.frequency.setValueAtTime(1200, time);
        osc.frequency.exponentialRampToValueAtTime(600, time + 0.05);
        
        const vol = (config.volume / 100);
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
        
        osc.start(time);
        osc.stop(time + 0.05);
    };

    // Use ref for config to access latest inside scheduler closure
    const configRef = useRef(config);
    useEffect(() => { configRef.current = config; }, [config]);

    const scheduler = () => {
        if (!audioCtxRef.current) return;
        while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
            playClick(nextNoteTimeRef.current);
            nextNoteTimeRef.current += 60.0 / configRef.current.bpm;
        }
        timerIdRef.current = window.setTimeout(scheduler, 25);
    };

    const start = () => {
        if (!audioCtxRef.current) return;
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        
        const now = audioCtxRef.current.currentTime;
        // Schedule first click immediately (with tiny offset to ensure it's future)
        const startDelay = 0.05; 
        nextNoteTimeRef.current = now + startDelay;
        startTimeRef.current = nextNoteTimeRef.current; // Sync visual phase origin exactly to the first click time
        
        scheduler();
        setIsPlaying(true);
    };

    const stop = () => {
        if (timerIdRef.current) clearTimeout(timerIdRef.current);
        setIsPlaying(false);
        setPendulumAngle(0);
    };

    const toggle = () => {
        if (isPlaying) stop();
        else start();
    };

    // Visual Loop
    useEffect(() => {
        if (isPlaying) {
            const animate = () => {
                if (!audioCtxRef.current) return;
                
                // Time elapsed relative to the sync point (first click)
                const t = audioCtxRef.current.currentTime - startTimeRef.current;
                const beatDuration = 60 / configRef.current.bpm;
                
                // Angle Calculation:
                // We want extremes at t=0, t=beatDuration, etc.
                // We want to start LEFT. Left is typically negative rotation.
                // cos(0) = 1. We want negative result. -> -35 * cos(...)
                // t=0 -> -35 (Left Extreme). Click 1.
                // t=1bd -> -35 * cos(PI) = -35 * -1 = 35 (Right Extreme). Click 2.
                
                const angle = -35 * Math.cos(Math.PI * t / beatDuration);
                setPendulumAngle(angle);
                
                requestRef.current = requestAnimationFrame(animate);
            };
            requestRef.current = requestAnimationFrame(animate);
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            setPendulumAngle(0); // Reset to center vertical
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [isPlaying]);

    return (
        <div className={`w-full h-full flex flex-col bg-zinc-900/80 rounded-lg border border-zinc-800 overflow-hidden ${className}`}>
            {/* Visualizer Area */}
            <div className="flex-1 relative bg-zinc-950/30 flex items-center justify-center overflow-hidden min-h-[150px]">
                
                {/* Scale markings (Top) */}
                <div className="absolute top-4 w-full flex justify-center gap-12 text-[10px] text-zinc-700 font-mono pointer-events-none select-none">
                    <span>40</span>
                    <span>208</span>
                </div>

                {/* Pivot Origin (Bottom) */}
                <div className="absolute bottom-4 left-1/2 w-4 h-4 bg-zinc-700 rounded-full -translate-x-1/2 z-10 border-2 border-zinc-600 shadow-sm" />
                
                {/* Rod */}
                <div 
                    className="absolute bottom-5 left-1/2 w-1.5 bg-zinc-500 origin-bottom -translate-x-1/2 rounded-t-full will-change-transform"
                    style={{ 
                        height: '85%', 
                        transform: `translateX(-50%) rotate(${pendulumAngle}deg)`,
                        boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                    }}
                >
                    {/* Sliding Weight */}
                    <div 
                        className="absolute w-6 h-8 bg-zinc-300 rounded-sm shadow-md -left-2.5 border border-zinc-400 z-20 flex items-center justify-center"
                        style={{ 
                            // Physics: Lower BPM = Longer Pendulum = Weight Higher Up
                            // 40 BPM -> Top (90%)
                            // 208 BPM -> Bottom (10%)
                            bottom: `${10 + ((208 - config.bpm) / (208 - 40)) * 80}%`
                        }} 
                    >
                        <div className="w-4 h-0.5 bg-zinc-400/50 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="p-3 bg-zinc-900 border-t border-zinc-800 space-y-3">
                <div className="flex justify-between items-center">
                    <button 
                        onClick={toggle}
                        className={`p-3 rounded-full transition-all ${isPlaying ? 'bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg'}`}
                    >
                        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5"/>}
                    </button>
                    
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-mono font-bold text-zinc-200">{config.bpm}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">BPM</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-bold">
                        <span>Tempo</span>
                    </div>
                    <input 
                        type="range" 
                        min="40" 
                        max="208" 
                        value={config.bpm} 
                        onChange={(e) => onUpdate({ ...config, bpm: parseInt(e.target.value) })}
                        className="w-full accent-blue-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-bold items-center">
                        <span className="flex items-center gap-1"><Volume2 size={10} /> Volume</span>
                        <span>{config.volume}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={config.volume} 
                        onChange={(e) => onUpdate({ ...config, volume: parseInt(e.target.value) })}
                        className="w-full accent-zinc-500 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
        </div>
    );
};
