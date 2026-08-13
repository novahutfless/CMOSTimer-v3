import React, { useMemo, useRef, useEffect } from 'react';
import { getScrambleState } from '../../utils';
import { PuzzleType, ScrambleImageConfig } from '../../types';
import { ClockRenderer } from '../scramble/ClockRenderer';
import { PyraminxRenderer } from '../scramble/PyraminxRenderer';
import { SkewbRenderer } from '../scramble/SkewbRenderer';
import { Square1Renderer } from '../scramble/Square1Renderer';
import { MegaminxRenderer } from '../scramble/MegaminxRenderer';
import { FTORenderer } from '../scramble/FTORenderer';
import { NxNRenderer } from '../scramble/NxNRenderer';
import { ClockState } from '../../utils/puzzles/clock';
import { PyraState } from '../../utils/puzzles/pyraminx';
import { SkewbState } from '../../utils/puzzles/skewb';
import { Square1State } from '../../utils/puzzles/square1';
import { MegaminxState } from '../../utils/puzzles/megaminx';
import { FTOState } from '../../utils/puzzles/fto';
import { NxNState } from '../../utils/puzzles/nxn';
import { pluginManager } from '../../plugins/PluginManager';
import { usePluginManagerRevision } from '../../plugins/usePluginManagerRevision';
import { renderPluginUi } from '../../plugins/runtime/renderPluginUi';

interface Props {
    scramble: string[];
    type: PuzzleType | string;
    config?: ScrambleImageConfig | undefined;
    className?: string | undefined;
    width?: number | string | undefined;
    height?: number | string | undefined;
}

export const ScrambleDisplay: React.FC<Props> = (dta: Props) => {
	const pluginRevision = usePluginManagerRevision();
	const { scramble, type, config, className, width, height } = dta;
	const customRenderer = pluginManager.getRenderer(type);
	const containerRef = useRef<HTMLDivElement>(null);
	const state = useMemo(() => customRenderer ? null : getScrambleState(scramble, type as PuzzleType), [customRenderer, scramble, type]);

	useEffect(() => {
		let cancelled = false;
		let renderCleanup: (() => void) | undefined;
		if (customRenderer && containerRef.current) {
			const container = containerRef.current;
			container.textContent = 'Loading visualizer...';
			void customRenderer.render(scramble, config).then(node => {
				if (!cancelled) renderCleanup = renderPluginUi(container, node);
			}).catch(() => {
				if (!cancelled) container.textContent = 'Render Error';
			});
		}
		return (): void => {
			cancelled = true;
			renderCleanup?.();
		};
	}, [customRenderer, scramble, config, type, pluginRevision]);

	if (customRenderer) 
		return <div ref={containerRef} className={className} style={{ width, height }} />;
    

	if (!state || type === PuzzleType.NO_VISUAL)
		return <div className={className} style={{ width, height }} />;

	if (type === PuzzleType.CLOCK) 
		return <ClockRenderer state={state as ClockState} config={config} className={className} width={width} height={height} />;
    
	if (type === PuzzleType.PYRAMINX) 
		return <PyraminxRenderer state={state as PyraState} config={config} className={className} width={width} height={height} />;
    
	if (type === PuzzleType.SKEWB) 
		return <SkewbRenderer state={state as SkewbState} config={config} className={className} width={width} height={height} />;

	if (type === PuzzleType.SQUARE1)
		return <Square1Renderer state={state as Square1State} config={config} className={className} width={width} height={height} />;

	if (type === PuzzleType.MEGAMINX)
		return <MegaminxRenderer state={state as MegaminxState} config={config} className={className} width={width} height={height} />;

	if (type === PuzzleType.FTO)
		return <FTORenderer state={state as FTOState} config={config} className={className} width={width} height={height} />;
    
	// NxN & Cuboids Masking Logic
	let mask = undefined;
	const dimMatch = (type as string).match(/^(\d+)x(\d+)x(\d+)$/);
    
	if (dimMatch) {
		const w = parseInt(dimMatch[1]);
		const d = parseInt(dimMatch[2]); // Depth (maps to Width/Cols in renderer usually)
		const h = parseInt(dimMatch[3]);
		const size = Math.max(w, d, h);
        
		// Align Top-Left: keep 0..W-1. Mask W..S-1.
		// NxNRenderer uses cols for Width, rows for Height.
		// In cuboid notation 3x3x4 usually means 3x3 base, 4 high.
		// So W=3, D=3, H=4.
		// Face Layout:
		// U/D are W x D.
		// F/B/L/R are W x H (or D x H).
		// If base is Size S.
		// We mask cols `w` to `S-1`.
		// We mask rows `h` to `S-1`.
        
		// Assuming symmetrical base W=D.
		const colsToMask = [];
		const rowsToMask = [];
        
		for(let c = w; c < size; c++) colsToMask.push(c);
		for(let r = h; r < size; r++) rowsToMask.push(r);
        
		if (colsToMask.length > 0 || rowsToMask.length > 0) 
			mask = { rows: rowsToMask, cols: colsToMask };
        
	}

	return <NxNRenderer state={state as NxNState} config={config} className={className} type={type as PuzzleType} mask={mask} width={width} height={height} />;
};
