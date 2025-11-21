
import React, { useMemo } from 'react';
import { getScrambleState } from '../utils';
import { ScrambleType, ScrambleImageConfig } from '../types';
import { ClockRenderer } from './scramble/ClockRenderer';
import { PyraminxRenderer } from './scramble/PyraminxRenderer';
import { SkewbRenderer } from './scramble/SkewbRenderer';
import { NxNRenderer } from './scramble/NxNRenderer';
import { ClockState } from '../utils/puzzles/clock';
import { PyraState } from '../utils/puzzles/pyraminx';
import { SkewbState } from '../utils/puzzles/skewb';
import { NxNState } from '../utils/puzzles/nxn';

interface Props {
    scramble: string[];
    type: ScrambleType;
    config?: ScrambleImageConfig;
    className?: string;
}

export const ScrambleDisplay: React.FC<Props> = ({ scramble, type, config, className }) => {
    const state = useMemo(() => getScrambleState(scramble, type), [scramble, type]);
    
    if (!state || type === ScrambleType.NO_VISUAL) return <div className={className} />;

    if (type === ScrambleType.CLOCK) {
        return <ClockRenderer state={state as ClockState} config={config} className={className} />;
    }

    if (type === ScrambleType.PYRAMINX) {
        return <PyraminxRenderer state={state as PyraState} config={config} className={className} />;
    }

    if (type === ScrambleType.SKEWB) {
        return <SkewbRenderer state={state as SkewbState} config={config} className={className} />;
    }

    // NxN
    return <NxNRenderer state={state as NxNState} config={config} className={className} type={type} />;
};
