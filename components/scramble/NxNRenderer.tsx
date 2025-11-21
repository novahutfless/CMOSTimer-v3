
import React from 'react';
import { NxNState } from '../../utils/puzzles/nxn';
import { ScrambleRendererProps, getFaceColor } from './utils';
import { ScrambleType } from '../../types';

interface Props extends ScrambleRendererProps<NxNState> {
    type: ScrambleType;
}

export const NxNRenderer: React.FC<Props> = ({ state, config, className, type }) => {
    const isStickerless = config?.baseColor === 'stickerless';
    const baseColor = config?.baseColor === 'white' ? '#f4f4f5' : config?.baseColor === 'black' ? '#18181b' : 'transparent';
    
    const size = type === ScrambleType.TWO ? 2 : type === ScrambleType.FOUR ? 4 : type === ScrambleType.FIVE ? 5 : type === ScrambleType.SIX ? 6 : type === ScrambleType.SEVEN ? 7 : 3;
    
    const gap = isStickerless ? 0 : 1;
    const cellSize = 10;
    const faceSize = size * cellSize + (size - 1) * gap;
    const totalWidth = faceSize * 4 + gap * 3 + 20;
    const totalHeight = faceSize * 3 + gap * 2 + 20;

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

    const posU = { x: faceSize + gap + 10, y: 10 };
    const posL = { x: 10, y: faceSize + gap + 10 };
    const posF = { x: faceSize + gap + 10, y: faceSize + gap + 10 };
    const posR = { x: (faceSize + gap) * 2 + 10, y: faceSize + gap + 10 };
    const posB = { x: (faceSize + gap) * 3 + 10, y: faceSize + gap + 10 };
    const posD = { x: faceSize + gap + 10, y: (faceSize + gap) * 2 + 10 };

    return (
        <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className={className} preserveAspectRatio="xMidYMid meet">
            {!isStickerless && <rect x="0" y="0" width={totalWidth} height={totalHeight} fill={baseColor} rx="4" />}
            {renderFaceNxN(state.U, posU.x, posU.y)}
            {renderFaceNxN(state.L, posL.x, posL.y)}
            {renderFaceNxN(state.F, posF.x, posF.y)}
            {renderFaceNxN(state.R, posR.x, posR.y)}
            {renderFaceNxN(state.B, posB.x, posB.y)}
            {renderFaceNxN(state.D, posD.x, posD.y)}
        </svg>
    );
};
