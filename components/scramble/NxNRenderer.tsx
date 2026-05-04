import React from 'react';
import { NxNState } from '../../utils/puzzles/nxn';
import { ScrambleRendererProps, getFaceColor } from './utils';
import { PuzzleType } from '../../types';

interface Props extends ScrambleRendererProps<NxNState> {
    type: PuzzleType;
    mask?: {
        rows?: number[];
        cols?: number[];
    }
}

export const NxNRenderer: React.FC<Props> = ({ state, config, className, type: _type, mask, width = "100%", height = "100%" }) => {
	const isStickerless = config?.baseColor === 'stickerless';
    
	let size = 3;
	// Detect size from state (U face length)
	if (state && state.U && state.U.length > 0) 
		size = state.U.length;
    

	const gap = isStickerless ? 0 : 1;
	const cellSize = 10;
    
	// Calculate Masked Geometry
	const hiddenRows = mask?.rows || [];
	const hiddenCols = mask?.cols || [];
    
	// Dimensions of Side Faces (F, B, L, R)
	// Height is determined by visible rows.
	// Width is determined by visible cols.
    
	const visibleRows = size - hiddenRows.length;
	const visibleCols = size - hiddenCols.length;
    
	// Face Dimensions in pixels
	const wFace = visibleCols * cellSize + (visibleCols - 1) * gap;
	const hFace = visibleRows * cellSize + (visibleRows - 1) * gap;
    
	// For Cuboids:
	// U/D faces: Dimensions are Width x Depth.
	// Since we assume W=D for standard cuboids (e.g. 3x3x4), U/D are square.
	// Their size is `wFace` x `wFace` (derived from visible cols).
	// F/B/L/R faces: Dimensions are Width x Height.
	// Their size is `wFace` x `hFace`.
    
	// Layout:
	//       U
	//     L F R B
	//       D
    
	// Offsets
	const xL = gap;
	const xF = xL + wFace + gap;
	const xR = xF + wFace + gap;
	const xB = xR + wFace + gap;
    
	const yU = gap;
	const yF = yU + wFace + gap; // U height is wFace (depth)
	const yD = yF + hFace + gap; // F height is hFace
    
	const totalWidth = xB + wFace + gap;
	const totalHeight = yD + wFace + gap; // D height is wFace

	const renderFaceNxN = (faceData: string[][], offsetX: number, offsetY: number, isCapFace: boolean): React.ReactElement[] => {
		if (!faceData) return null;
        
		// For Cap Faces (U/D), we ignore row masking (height masking) because their "height" visually corresponds to Depth.
		// Instead, we apply col masking to BOTH dimensions to keep them square (W x D).
		// For Side Faces (F/B/L/R), we apply row masking (height) and col masking (width).
        
		const rowsToSkip = isCapFace ? hiddenCols : hiddenRows; 
		const colsToSkip = hiddenCols;
        
		let currentY = offsetY;
        
		return faceData.flatMap((row, r) => {
			if (rowsToSkip.includes(r)) return null;
            
			let currentX = offsetX;
			const rowEls = row.map((faceId, c) => {
				if (colsToSkip.includes(c)) return null;
                
				const el = (
					<rect
						key={`${offsetX}-${offsetY}-${r}-${c}`}
						x={currentX}
						y={currentY}
						width={cellSize}
						height={cellSize}
						fill={getFaceColor(faceId, config)}
						stroke={isStickerless ? 'none' : "rgba(0,0,0,0.1)"}
						strokeWidth={isStickerless ? "0" : "0.5"}
						rx={isStickerless ? 0 : 0.5}
					/>
				);
				currentX += cellSize + gap;
				return el;
			});
			currentY += cellSize + gap;
			return rowEls;
		});
	};

	return (
		<svg 
			width={width} 
			height={height} 
			viewBox={`0 0 ${totalWidth} ${totalHeight}`} 
			className={className} 
			preserveAspectRatio="xMidYMid meet"
		>
			{/* U/D are Cap Faces (isCapFace=true) */}
			{renderFaceNxN(state.U, xF, yU, true)}
            
			{/* Side Faces */}
			{renderFaceNxN(state.L, xL, yF, false)}
			{renderFaceNxN(state.F, xF, yF, false)}
			{renderFaceNxN(state.R, xR, yF, false)}
			{renderFaceNxN(state.B, xB, yF, false)}
            
			{/* D Face */}
			{renderFaceNxN(state.D, xF, yD, true)}
		</svg>
	);
};
