
import React from 'react';
import { PyraState } from '../../utils/puzzles/pyraminx';
import { ScrambleRendererProps, getFaceColor } from './utils';

export const PyraminxRenderer: React.FC<ScrambleRendererProps<PyraState>> = ({ state, config, className, width = "100%", height = "100%" }) => {
    const isStickerless = config?.baseColor === 'stickerless';
    
    // Geometric params
    const triH = 24; 
    const triW = triH * 1.1547; 
    const halfW = triW / 2;
    
    const mkTri = (cx: number, cy: number, up: boolean, c: string, key: number) => {
        const h = triH / 3; 
        const w = halfW / 3 * 2; 
        
        const yTop = up ? -h * 0.66 : h * 0.66; 
        const yBase = up ? h * 0.33 : -h * 0.33; 
        
        const pts = `${cx},${cy+yTop} ${cx-w},${cy+yBase} ${cx+w},${cy+yBase}`;
        
        return (
            <polygon 
                key={key} 
                points={pts} 
                fill={getFaceColor(c, config)} 
                stroke={isStickerless ? 'none' : 'rgba(0,0,0,0.15)'}
                strokeWidth={isStickerless ? 0 : 0.5}
                strokeLinejoin="round"
            />
        );
    };

    const renderFace = (faceId: string, x: number, y: number, pointUp: boolean) => {
        const colors = state[faceId] || Array(9).fill('x');
        const polys = [];
        const hUnit = triH / 3;
        const wUnit = halfW / 3 * 2; 

        if (pointUp) {
            // Row 0 (Tip)
            polys.push(mkTri(x, y - 2*hUnit, true, colors[0], 0));
            // Row 1
            polys.push(mkTri(x - wUnit, y, true, colors[1], 1));
            polys.push(mkTri(x, y - hUnit*0.7, false, colors[2], 2)); // Center
            polys.push(mkTri(x + wUnit, y, true, colors[3], 3));
            // Row 2
            polys.push(mkTri(x - 2*wUnit, y + 2*hUnit, true, colors[4], 4));
            polys.push(mkTri(x - wUnit, y + 1.3*hUnit, false, colors[5], 5));
            polys.push(mkTri(x, y + 2*hUnit, true, colors[6], 6));
            polys.push(mkTri(x + wUnit, y + 1.3*hUnit, false, colors[7], 7));
            polys.push(mkTri(x + 2*wUnit, y + 2*hUnit, true, colors[8], 8));
        } else {
            // Point Down
            // Row 0 (Top Wide)
            polys.push(mkTri(x - 2*wUnit, y - 2*hUnit, false, colors[4], 4));
            polys.push(mkTri(x - wUnit, y - 1.3*hUnit, true, colors[5], 5));
            polys.push(mkTri(x, y - 2*hUnit, false, colors[6], 6));
            polys.push(mkTri(x + wUnit, y - 1.3*hUnit, true, colors[7], 7));
            polys.push(mkTri(x + 2*wUnit, y - 2*hUnit, false, colors[8], 8));
            // Row 1
            polys.push(mkTri(x - wUnit, y, false, colors[3], 3));
            polys.push(mkTri(x, y + hUnit*0.7, true, colors[2], 2)); 
            polys.push(mkTri(x + wUnit, y, false, colors[1], 1));
            // Row 2 (Tip)
            polys.push(mkTri(x, y + 2*hUnit, false, colors[0], 0));
        }
        return polys;
    };

    // Tighter layout calculation
    const hUnit = triH / 3; // 8
    const wUnit = halfW / 3 * 2; // ~9.24
    
    // Center of F (Up)
    const cx = 100; 
    const cy = 50; 
    
    // Offsets
    const yOff = hUnit * 3;
    const xOff = wUnit * 3; 

    // Calculate approximate bounding box to set viewBox
    // F Top Tip: cy - 2*hUnit - h*0.66 = 50 - 16 - 5.3 = ~28
    // D Bottom Tip: cy + yOff + hUnit + 2*hUnit + h*0.66 = 50 + 24 + 8 + 16 + 5.3 = ~103
    // L Left Extent: cx - xOff - 2*wUnit - w = 100 - 27.7 - 18.5 - 9.2 = ~44
    // R Right Extent: cx + xOff + 2*wUnit + w = ~156
    
    // ViewBox padding
    const vbX = 40;
    const vbY = 20;
    const vbW = 120;
    const vbH = 90;

    return (
        <svg 
            width={width} 
            height={height} 
            viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`} 
            className={className}
            preserveAspectRatio="xMidYMid meet"
        >
            {renderFace('F', cx, cy - hUnit, true)}
            {renderFace('L', cx - xOff, cy + hUnit, false)}
            {renderFace('R', cx + xOff, cy + hUnit, false)}
            {renderFace('D', cx, cy + yOff + hUnit, false)}
        </svg>
    );
};
