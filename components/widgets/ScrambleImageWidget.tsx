
import React, { useEffect, useState } from 'react';
import { ScrambleType } from '../../types';
import { ScrambleDisplay } from '../ScrambleDisplay';

interface Props {
    scramble: string[];
    type: ScrambleType;
    visualizerState: { active: number | null };
    className?: string;
}

export const ScrambleImageWidget: React.FC<Props> = ({ scramble, type, visualizerState, className }) => {
    const [displayScramble, setDisplayScramble] = useState<string[]>(scramble);

    useEffect(() => {
        if (visualizerState.active === null) {
            setDisplayScramble(scramble);
        } else {
            setDisplayScramble(scramble.slice(0, visualizerState.active + 1));
        }
    }, [scramble, visualizerState.active]);

    return (
        <div className={`flex items-center justify-center w-full h-full p-2 ${className}`}>
            <ScrambleDisplay 
                scramble={displayScramble} 
                type={type} 
                className="h-full max-h-[200px] w-auto opacity-80 hover:opacity-100 transition-opacity"
            />
        </div>
    );
};
