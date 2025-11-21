
import React from 'react';
import { SkewbState } from '../../utils/puzzles/skewb';
import { ScrambleRendererProps, getFaceColor } from './utils';

export const SkewbRenderer: React.FC<ScrambleRendererProps<SkewbState>> = ({ state, config, className, width = "100%", height = "100%" }) => {
    const isStickerless = config?.baseColor === 'stickerless';
    const baseColor = config?.baseColor === 'white' ? '#f4f4f5' : config?.baseColor === 'black' ? '#18181b' : 'transparent';
    
    const renderSkewbFace = (face: string, x: number, y: number) => {
        const c = state[face as keyof SkewbState];
        if (!c) return null;

        return (
            <g transform={`translate(${x}, ${y})`}>
                {/* Center (0) */}
                <polygon points="15,0 30,15 15,30 0,15" fill={getFaceColor(c[0], config)} stroke={isStickerless ? "none" : "rgba(0,0,0,0.2)"} strokeWidth="0.5" />
                {/* Corners */}
                <polygon points="0,0 15,0 0,15" fill={getFaceColor(c[1], config)} stroke={isStickerless ? "none" : "rgba(0,0,0,0.2)"} strokeWidth="0.5" />
                <polygon points="30,0 30,15 15,0" fill={getFaceColor(c[2], config)} stroke={isStickerless ? "none" : "rgba(0,0,0,0.2)"} strokeWidth="0.5" />
                <polygon points="30,30 30,15 15,30" fill={getFaceColor(c[3], config)} stroke={isStickerless ? "none" : "rgba(0,0,0,0.2)"} strokeWidth="0.5" />
                <polygon points="0,30 0,15 15,30" fill={getFaceColor(c[4], config)} stroke={isStickerless ? "none" : "rgba(0,0,0,0.2)"} strokeWidth="0.5" />
            </g>
        );
    };
    
    // Layout Bounds
    // U: 60, 10 (w30, h30). 
    // L: 25, 45
    // F: 60, 45
    // R: 95, 45
    // B: 130, 45
    // D: 60, 80
    // Min X: 25 (L). Max X: 130+30 = 160 (B).
    // Min Y: 10 (U). Max Y: 80+30 = 110 (D).
    
    return (
        <svg 
            width={width} 
            height={height} 
            viewBox="20 5 145 110" 
            className={className}
            preserveAspectRatio="xMidYMid meet"
        >
             {!isStickerless && <rect x="20" y="5" width="145" height="110" fill={baseColor} rx="4" />}
             {renderSkewbFace('U', 60, 10)}
             {renderSkewbFace('L', 25, 45)}
             {renderSkewbFace('F', 60, 45)}
             {renderSkewbFace('R', 95, 45)}
             {renderSkewbFace('D', 60, 80)}
             {renderSkewbFace('B', 130, 45)} 
        </svg>
    );
};
