
import React, { useMemo } from 'react';
import { getScrambleState } from '../../utils';
import { PuzzleType, ScrambleImageConfig } from '../../types';
import { ClockRenderer } from '../scramble/ClockRenderer';
import { PyraminxRenderer } from '../scramble/PyraminxRenderer';
import { SkewbRenderer } from '../scramble/SkewbRenderer';
import { NxNRenderer } from '../scramble/NxNRenderer';
import { ClockState } from '../../utils/puzzles/clock';
import { PyraState } from '../../utils/puzzles/pyraminx';
import { SkewbState } from '../../utils/puzzles/skewb';
import { NxNState } from '../../utils/puzzles/nxn';

interface Props {
    scramble: string[];
    type: PuzzleType;
    config?: ScrambleImageConfig;
    className?: string;
    width?: number | string;
    height?: number | string;
}

export const ScrambleDisplay: React.FC<Props> = ({ scramble, type, config, className, width, height }) => {
    const state = useMemo(() => getScrambleState(scramble, type), [scramble, type]);
    
    if (!state || type === PuzzleType.NO_VISUAL) return <div className={className} style={{ width, height }} />;

    if (type === PuzzleType.CLOCK) {
        return <ClockRenderer state={state as ClockState} config={config} className={className} width={width} height={height} />;
    }

    if (type === PuzzleType.PYRAMINX) {
        return <PyraminxRenderer state={state as PyraState} config={config} className={className} width={width} height={height} />;
    }

    if (type === PuzzleType.SKEWB) {
        return <SkewbRenderer state={state as SkewbState} config={config} className={className} width={width} height={height} />;
    }

    // NxN
    return <NxNRenderer state={state as NxNState} config={config} className={className} type={type} width={width} height={height} />;
};
