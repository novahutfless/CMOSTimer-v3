
import React from 'react';
import { NxNState } from '../../utils/puzzles/nxn';
import { ScrambleRendererProps, getFaceColor } from './utils';
import { PuzzleType } from '../../types';

interface Props extends ScrambleRendererProps<NxNState> {
    type: PuzzleType;
}

export const NxNRenderer: React.FC<Props> = ({ state, config, className, type, width = "100%", height = "100%" }) => {
    const isStickerless = config?.baseColor === 'stickerless';
    const baseColor = config?.baseColor === 'white' ? '#f4f4f5' : config?.baseColor === 'black' ? '#18181b' : 'transparent';
    
    const size = type === PuzzleType.TWO ? 2 : type === PuzzleType.FOUR ? 4 : type === PuzzleType.FIVE ? 5 : type === PuzzleType.SIX ? 6 : type === PuzzleType.SEVEN ? 7 : 3;
    
    const gap = isStickerless ? 0 : 1;
    const cellSize = 10;
    const faceSize = size * cellSize + (size - 1) * gap;
    
    // Layout:
    //       U
    //     L F R B
    //       D
    // Cols: L(0) F(1) R(2) B(3). Total 4 faces width.
    // Rows: U(0) F(1) D(2). Total 3 faces height.
    
    // Offsets logic in standard net:
    // Left Margin for L: gap
    // Top Margin for U: gap
    // U X: L width + gaps.
    
    const spacer = 10; // Space between faces in net? No, usually minimal in net
    // Net construction usually has faces touching or small gap
    const faceGap = gap * 2; // Visual separation between major faces if needed, or just standard gap
    
    // Re-calculating precise positions
    // x coords:
    // Col 0 (L): gap
    // Col 1 (F, U, D): gap + faceSize + faceGap
    // Col 2 (R): gap + 2*(faceSize + faceGap)
    // Col 3 (B): gap + 3*(faceSize + faceGap)
    
    // y coords:
    // Row 0 (U): gap
    // Row 1 (L, F, R, B): gap + faceSize + faceGap
    // Row 2 (D): gap + 2*(faceSize + faceGap)
    
    const xL = gap;
    const xF = xL + faceSize + gap;
    const xR = xF + faceSize + gap;
    const xB = xR + faceSize + gap;
    
    const yU = gap;
    const yF = yU + faceSize + gap;
    const yD = yF + faceSize + gap;
    
    const totalWidth = xB + faceSize + gap;
    const totalHeight = yD + faceSize + gap;

    const renderFaceNxN = (faceData: string[][], offsetX: number, offsetY: number) => {
        if (!faceData) return null;
        return faceData.flatMap((row, r) => 
            row.map((faceId, c) => (
                <rect
                    key={`${offsetX}-${offsetY}-${r}-${c}`}
                    x={offsetX + c * (cellSize + gap)}
                    y={offsetY + r * (cellSize + gap)}
                    width={cellSize}
                    height={cellSize}
                    fill={getFaceColor(faceId, config)}
                    stroke={isStickerless ? 'none' : "rgba(0,0,0,0.1)"}
                    strokeWidth={isStickerless ? "0" : "0.5"}
                    rx={isStickerless ? 0 : 0.5}
                />
            ))
        );
    };

    return (
        <svg 
            width={width} 
            height={height} 
            viewBox={`0 0 ${totalWidth} ${totalHeight}`} 
            className={className} 
            preserveAspectRatio="xMidYMid meet"
        >
            {!isStickerless && <rect x="0" y="0" width={totalWidth} height={totalHeight} fill={baseColor} rx="4" />}
            {renderFaceNxN(state.U, xF, yU)}
            {renderFaceNxN(state.L, xL, yF)}
            {renderFaceNxN(state.F, xF, yF)}
            {renderFaceNxN(state.R, xR, yF)}
            {renderFaceNxN(state.B, xB, yF)}
            {renderFaceNxN(state.D, xF, yD)}
        </svg>
    );
};
