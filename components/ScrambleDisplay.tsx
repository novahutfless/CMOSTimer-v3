
import React, { useMemo } from 'react';
import { getScrambleState } from '../utils';
import { ScrambleType } from '../types';

interface Props {
    scramble: string;
    type: ScrambleType;
    className?: string;
}

export const ScrambleDisplay: React.FC<Props> = ({ scramble, type, className }) => {
    const state = useMemo(() => getScrambleState(scramble, type), [scramble, type]);
    
    const size = type === ScrambleType.TWO ? 2 : type === ScrambleType.FOUR ? 4 : type === ScrambleType.FIVE ? 5 : 3;
    const cellSize = 10;
    const gap = 1;
    const faceSize = size * cellSize + (size - 1) * gap;
    const totalWidth = faceSize * 4 + gap * 3 + 20;
    const totalHeight = faceSize * 3 + gap * 2 + 20;

    // Layout:
    //   U
    // L F R B
    //   D

    const renderFace = (faceData: string[][], offsetX: number, offsetY: number) => {
        if (!faceData) return null;
        return faceData.flatMap((row, r) => 
            row.map((color, c) => (
                <rect
                    key={`${offsetX}-${offsetY}-${r}-${c}`}
                    x={offsetX + c * (cellSize + gap)}
                    y={offsetY + r * (cellSize + gap)}
                    width={cellSize}
                    height={cellSize}
                    fill={color}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="0.5"
                />
            ))
        );
    };

    // Coordinates based on faceSize
    const posU = { x: faceSize + gap + 10, y: 10 };
    const posL = { x: 10, y: faceSize + gap + 10 };
    const posF = { x: faceSize + gap + 10, y: faceSize + gap + 10 };
    const posR = { x: (faceSize + gap) * 2 + 10, y: faceSize + gap + 10 };
    const posB = { x: (faceSize + gap) * 3 + 10, y: faceSize + gap + 10 };
    const posD = { x: faceSize + gap + 10, y: (faceSize + gap) * 2 + 10 };

    return (
        <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} className={className} preserveAspectRatio="xMidYMid meet">
            {renderFace(state.U, posU.x, posU.y)}
            {renderFace(state.L, posL.x, posL.y)}
            {renderFace(state.F, posF.x, posF.y)}
            {renderFace(state.R, posR.x, posR.y)}
            {renderFace(state.B, posB.x, posB.y)}
            {renderFace(state.D, posD.x, posD.y)}
        </svg>
    );
};
