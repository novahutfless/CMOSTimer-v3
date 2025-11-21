
import React from 'react';
import { SkewbState } from '../../utils/puzzles/skewb';
import { ScrambleRendererProps, getFaceColor } from './utils';

export const SkewbRenderer: React.FC<ScrambleRendererProps<SkewbState>> = ({ state, config, className }) => {
    const isStickerless = config?.baseColor === 'stickerless';
    const baseColor = config?.baseColor === 'white' ? '#f4f4f5' : config?.baseColor === 'black' ? '#18181b' : 'transparent';
    
    const renderSkewbFace = (face: string, x: number, y: number) => {
        const c = state[face as keyof SkewbState];
        if (!c) return null;

        // Indices: 0=Center, 1=NW, 2=NE, 3=SE, 4=SW
        // We use a polygon for the center to ensure it touches the midpoints of the square exactly,
        // matching the corners without gaps.
        // The corners are 15x15 triangles in a 30x30 box.
        // Midpoints are (15,0), (30,15), (15,30), (0,15).
        
        return (
            <g transform={`translate(${x}, ${y})`}>
                {/* Center (0) - Diamond */}
                <polygon points="15,0 30,15 15,30 0,15" fill={getFaceColor(c[0], config)} />
                
                {/* NW (1) - Top Left */}
                <polygon points="0,0 15,0 0,15" fill={getFaceColor(c[1], config)} />
                
                {/* NE (2) - Top Right */}
                <polygon points="30,0 30,15 15,0" fill={getFaceColor(c[2], config)} />
                
                {/* SE (3) - Bottom Right */}
                <polygon points="30,30 30,15 15,30" fill={getFaceColor(c[3], config)} />

                {/* SW (4) - Bottom Left */}
                <polygon points="0,30 0,15 15,30" fill={getFaceColor(c[4], config)} />
            </g>
        );
    };
    
    return (
        <svg viewBox="0 0 150 120" className={className}>
             {!isStickerless && <rect x="0" y="0" width="150" height="120" fill={baseColor} rx="4" />}
             {renderSkewbFace('U', 60, 10)}
             {renderSkewbFace('L', 25, 45)}
             {renderSkewbFace('F', 60, 45)}
             {renderSkewbFace('R', 95, 45)}
             {renderSkewbFace('D', 60, 80)}
             {renderSkewbFace('B', 130, 45)} 
        </svg>
    );
};
