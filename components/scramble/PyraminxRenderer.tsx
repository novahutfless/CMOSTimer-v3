
import React from 'react';
import { PyraState } from '../../utils/puzzles/pyraminx';
import { ScrambleRendererProps, getFaceColor } from './utils';

export const PyraminxRenderer: React.FC<ScrambleRendererProps<PyraState>> = ({ state, config, className }) => {
    const isStickerless = config?.baseColor === 'stickerless';
    // Default geometric params
    const triH = 24; 
    const triW = triH * 1.1547; // 2/sqrt(3) roughly, width of equilateral triangle
    const halfW = triW / 2;
    
    // Helper to draw a single 9-sticker face
    const renderFace = (faceId: string, x: number, y: number, pointUp: boolean) => {
        const colors = state[faceId] || Array(9).fill('x');
        const dir = pointUp ? 1 : -1;

        // Coordinates relative to center of the large triangle face.
        // We build it row by row.
        // Indices:
        // Point Up:
        //      0
        //     1 2 3
        //    4 5 6 7 8
        //
        // Point Down:
        //    8 7 6 5 4
        //     3 2 1
        //      0
        
        // We generate polygons.
        const polys = [];
        
        const r0y = pointUp ? -triH : triH;
        const r1y = 0;
        const r2y = pointUp ? triH : -triH;
        
        // Row height offset for rows 0, 1, 2
        // Let's do it by sticker center or tip
        
        // To simplify: define a unit triangle path pointing up and down
        const mkTri = (cx: number, cy: number, up: boolean, c: string, key: number) => {
            const h = triH / 3; // Height of small sticker
            const w = halfW / 3 * 2; // Width of small sticker base half
            
            // Points relative to cx, cy (centroid approx)
            // Up: 0,-h*2/3; -w,h/3; w,h/3
            // Down: 0,h*2/3; -w,-h/3; w,-h/3
            const yTop = up ? -h * 0.66 : h * 0.66; // Point
            const yBase = up ? h * 0.33 : -h * 0.33; // Base
            
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

        const hUnit = triH / 3;
        const wUnit = halfW / 3 * 2; // half width of small sticker

        if (pointUp) {
            // Row 0 (Tip)
            polys.push(mkTri(x, y - 2*hUnit, true, colors[0], 0));
            // Row 1
            polys.push(mkTri(x - wUnit, y, true, colors[1], 1));
            polys.push(mkTri(x, y - hUnit*0.7, false, colors[2], 2)); // Center (Down)
            polys.push(mkTri(x + wUnit, y, true, colors[3], 3));
            // Row 2
            polys.push(mkTri(x - 2*wUnit, y + 2*hUnit, true, colors[4], 4));
            polys.push(mkTri(x - wUnit, y + 1.3*hUnit, false, colors[5], 5));
            polys.push(mkTri(x, y + 2*hUnit, true, colors[6], 6));
            polys.push(mkTri(x + wUnit, y + 1.3*hUnit, false, colors[7], 7));
            polys.push(mkTri(x + 2*wUnit, y + 2*hUnit, true, colors[8], 8));
        } else {
            // Point Down (Indices rotated)
            // Row 0 (Top Wide)
            polys.push(mkTri(x - 2*wUnit, y - 2*hUnit, false, colors[4], 4));
            polys.push(mkTri(x - wUnit, y - 1.3*hUnit, true, colors[5], 5));
            polys.push(mkTri(x, y - 2*hUnit, false, colors[6], 6));
            polys.push(mkTri(x + wUnit, y - 1.3*hUnit, true, colors[7], 7));
            polys.push(mkTri(x + 2*wUnit, y - 2*hUnit, false, colors[8], 8));
            // Row 1
            polys.push(mkTri(x - wUnit, y, false, colors[3], 3));
            polys.push(mkTri(x, y + hUnit*0.7, true, colors[2], 2)); // Center (Up)
            polys.push(mkTri(x + wUnit, y, false, colors[1], 1));
            // Row 2 (Tip)
            polys.push(mkTri(x, y + 2*hUnit, false, colors[0], 0));
        }
        return polys;
    };

    // Layout: Center (F, Up). Left (L, Down). Right (R, Down). Bottom (D, Down).
    // Center coord
    const cx = 100;
    const cy = 60; 
    
    // Offsets based on small sticker size hUnit = 8
    const hUnit = triH / 3;
    const wUnit = halfW / 3 * 2;
    
    // Distance from center of F to center of neighbors
    // F Center is roughly at y+hUnit? No, geometric center of equilateral triangle is 1/3 from base.
    // Visually let's just attach them.
    
    // F (Up) Tip is at cy - 2*hUnit. Base is at cy + 2*hUnit + base_offset?
    // Using logic above:
    // Tip Y = y - 2*hUnit - ...
    // Let's trust the render logic coordinates.
    // F Base row Y = y + 2*hUnit.
    // D (Down) Top row Y = y - 2*hUnit.
    // So D should be shifted down by 4*hUnit relative to F?
    // F y=cy. D y=cy + 4*hUnit.
    
    // L (Left). Attached to Left Edge.
    // F Left Edge goes from Top (0, -2h) to BottomLeft (-2w, 2h).
    // L is Point Down. Its Right Edge goes from TopRight (2w, -2h) to Bottom (0, 2h).
    // To align F Left Edge and L Right Edge:
    // Shift L by x = -2w, y = 0? No.
    // If F center is 0,0. F Left Corner is -2w, 2h.
    // L (Down) Right Corner is 2w, -2h.
    // We want F Left Corner to match L Bottom Tip? No.
    // F Left Edge matches L Right Edge.
    // Shift L so its Right Edge aligns with F Left Edge.
    // Shift x = -wUnit * 2. Shift y = hUnit * 2? 
    // Actually, simple lattice:
    // F is at (0,0).
    // L is at (-2wUnit, 2hUnit)? No, triangle grid.
    // L is at (-2 * wUnit * 1.5, hUnit)?
    // Let's use simple offsets.
    const yOff = hUnit * 3;
    const xOff = wUnit * 3; 

    return (
        <svg viewBox="0 0 200 140" className={className}>
            {renderFace('F', cx, cy - hUnit, true)}
            {renderFace('L', cx - xOff, cy + hUnit, false)}
            {renderFace('R', cx + xOff, cy + hUnit, false)}
            {renderFace('D', cx, cy + yOff + hUnit, false)}
        </svg>
    );
};
