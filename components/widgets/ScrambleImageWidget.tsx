
import React, { useEffect, useState } from 'react';
import { PuzzleType, ScrambleImageConfig } from '../../types';
import { ScrambleDisplay } from './ScrambleDisplay';
import { getScrambler } from '../../utils/scramble';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
    scramble: string[][]; // Array of move arrays
    visualizerState: { activeScrambleIndex?: number; activeMoveIndex?: number };
    className?: string;
    scramblerIds: string[];
    imageConfig: ScrambleImageConfig;
}

export const ScrambleImageWidget: React.FC<Props> = ({ scramble, visualizerState, className, scramblerIds, imageConfig }) => {
    const [currentScrambleIdx, setCurrentScrambleIdx] = useState(0);
    const [limitMoves, setLimitMoves] = useState<number | null>(null);

    // Sync with ScrambleWidget clicks
    useEffect(() => {
        if (visualizerState.activeScrambleIndex !== undefined) {
            setCurrentScrambleIdx(visualizerState.activeScrambleIndex);
            setLimitMoves(visualizerState.activeMoveIndex ?? null);
        } else {
            // Reset
            setCurrentScrambleIdx(0);
            setLimitMoves(null);
        }
    }, [visualizerState]);

    // Reset when scramble changes
    useEffect(() => {
        setCurrentScrambleIdx(0);
        setLimitMoves(null);
    }, [scramble]);

    // Get current scrambler definition for the specific puzzle in relay
    const safeScramblerIds = scramblerIds && scramblerIds.length > 0 ? scramblerIds : ['333'];
    const currentScramblerId = safeScramblerIds[currentScrambleIdx] || safeScramblerIds[0]; // Fallback
    const scramblerDef = getScrambler(currentScramblerId);
    const visualType = scramblerDef ? scramblerDef.visualizer : PuzzleType.THREE;

    const currentMoves = scramble[currentScrambleIdx] || [];
    const displayMoves = limitMoves !== null ? currentMoves.slice(0, limitMoves + 1) : currentMoves;

    const prev = () => {
        setCurrentScrambleIdx(idx => Math.max(0, idx - 1));
        setLimitMoves(null);
    };

    const next = () => {
        setCurrentScrambleIdx(idx => Math.min(scramble.length - 1, idx + 1));
        setLimitMoves(null);
    };

    return (
        <div className={`flex flex-col items-center justify-center w-full h-full p-2 relative group ${className}`}>
            <ScrambleDisplay 
                scramble={displayMoves} 
                type={visualType}
                config={imageConfig}
                className="h-full max-h-[200px] w-auto opacity-90 hover:opacity-100 transition-opacity"
            />
            
            {/* Relay Navigation Overlay */}
            {scramble.length > 1 && (
                <div className="absolute inset-x-0 bottom-2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={prev} 
                        disabled={currentScrambleIdx === 0}
                        className="p-1 bg-zinc-900/80 rounded-full text-zinc-300 disabled:opacity-30 hover:bg-zinc-800"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="text-xs bg-zinc-900/80 px-2 py-1 rounded text-zinc-300 font-mono">
                        {currentScrambleIdx + 1} / {scramble.length}
                    </span>
                    <button 
                        onClick={next} 
                        disabled={currentScrambleIdx === scramble.length - 1}
                        className="p-1 bg-zinc-900/80 rounded-full text-zinc-300 disabled:opacity-30 hover:bg-zinc-800"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
};
