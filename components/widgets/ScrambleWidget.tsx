import React, { useEffect, useState } from 'react';

interface Props {
    scramble: string[];
    visualizerState: { active: number | null };
    setVisualizerState: (s: { active: number | null }) => void;
    className?: string;
}

export const ScrambleWidget: React.FC<Props> = ({ scramble, visualizerState, setVisualizerState, className }) => {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    useEffect(() => {
        setVisualizerState({ active: activeIndex });
    }, [activeIndex, setVisualizerState]);

    // Reset when scramble changes
    useEffect(() => {
        setActiveIndex(null);
    }, [scramble]);

    return (
        <div className={`flex items-center justify-center w-full h-full px-4 ${className}`}>
            <div className="flex items-center justify-center flex-wrap gap-x-3 gap-y-1 text-center max-w-full">
                {scramble.map((m, i) => (
                    <span 
                        key={i} 
                        onMouseDown={(e) => { e.preventDefault(); setActiveIndex(i); }}
                        className={`text-2xl xl:text-3xl font-mono cursor-pointer hover:text-blue-400 transition-colors select-none ${activeIndex === i ? 'text-blue-500 font-bold' : 'text-zinc-300'}`}
                    >
                        {m}
                    </span>
                ))}
            </div>
        </div>
    );
};