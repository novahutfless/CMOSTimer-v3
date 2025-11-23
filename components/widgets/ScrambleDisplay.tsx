
import React, { useMemo, useRef, useEffect } from 'react';
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
import { pluginManager } from '../../plugins/PluginManager';

interface Props {
    scramble: string[];
    type: PuzzleType | string;
    config?: ScrambleImageConfig;
    className?: string;
    width?: number | string;
    height?: number | string;
}

export const ScrambleDisplay: React.FC<Props> = ({ scramble, type, config, className, width, height }) => {
    // Check for custom renderer from plugins first
    const customRenderer = pluginManager.getRenderer(type);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (customRenderer && containerRef.current) {
            containerRef.current.innerHTML = '';
            try {
                customRenderer.render(containerRef.current, scramble, config);
            } catch (e) {
                containerRef.current.innerText = 'Render Error';
            }
        }
        return () => {
            if (customRenderer?.cleanup) customRenderer.cleanup();
        };
    }, [customRenderer, scramble, config, type]);

    if (customRenderer) {
        return <div ref={containerRef} className={className} style={{ width, height }} />;
    }

    // Built-in Renderers
    const state = useMemo(() => getScrambleState(scramble, type as PuzzleType), [scramble, type]);
    
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

    // NxN (Default)
    return <NxNRenderer state={state as NxNState} config={config} className={className} type={type as PuzzleType} width={width} height={height} />;
};
