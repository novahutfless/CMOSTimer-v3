
import React from 'react';
import { ClockState } from '../../utils/puzzles/clock';
import { ScrambleRendererProps } from './utils';

export const ClockRenderer: React.FC<ScrambleRendererProps<ClockState>> = ({ state, config, className }) => {
    const baseColor = config?.baseColor === 'white' ? '#f4f4f5' : config?.baseColor === 'black' ? '#18181b' : 'transparent';
    
    const getClockColor = (key: string, defaultVal: string) => {
        if (config && config.clockColors && (config.clockColors as any)[key]) {
            return (config.clockColors as any)[key];
        }
        return defaultVal;
    };

    const radius = 12;
    const dialRadius = 10;
    const spacing = 26;
    
    const renderDial = (val: number, x: number, y: number) => {
        const angle = (val * 30) - 90; // 0 = 12 o'clock
        const rad = angle * (Math.PI / 180);
        const x2 = x + Math.cos(rad) * 8;
        const y2 = y + Math.sin(rad) * 8;
        return (
            <g key={`${x}-${y}`}>
                <circle cx={x} cy={y} r={dialRadius} fill={getClockColor('clockFace', '#374151')} stroke="none" />
                <line x1={x} y1={y} x2={x2} y2={y2} stroke={getClockColor('marksF', '#FFF')} strokeWidth="2" strokeLinecap="round" />
                {[0,3,6,9].map(h => {
                    const a = (h * 30) - 90;
                    const r = a * Math.PI/180;
                    return <circle key={h} cx={x + Math.cos(r)*7} cy={y + Math.sin(r)*7} r={1} fill={getClockColor('marksF', '#FFF')} />
                })}
            </g>
        );
    };
    
    const dialsF = state.dials.slice(0, 9);
    const dialsB = state.dials.slice(9, 18);
    
    // Render Pin Function
    const renderPin = (active: boolean, x: number, y: number) => (
        <circle cx={x} cy={y} r={3} fill={active ? getClockColor('pinUp', '#EAB308') : getClockColor('pinDown', '#4B5563')} stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />
    );

    return (
        <svg viewBox="0 0 160 80" className={className}>
            <rect x="0" y="0" width="160" height="80" fill={baseColor} rx="4"/>
            {/* Front */}
            <g transform="translate(5, 5)">
                {dialsF.map((d, i) => {
                    const r = Math.floor(i/3);
                    const c = i%3;
                    return renderDial(d, 15 + c*spacing, 15 + r*spacing);
                })}
                {/* Pins Front: [UL, UR, DR, DL] mapped to grid positions */}
                {[[0,0], [0,1], [1,1], [1,0]].map((pos, i) => {
                     // Map i (0=UL, 1=UR, 2=DR, 3=DL) to visual grid (r, c)
                     // 0(UL) -> r0, c0
                     // 1(UR) -> r0, c1
                     // 2(DR) -> r1, c1
                     // 3(DL) -> r1, c0
                     const r = pos[0];
                     const c = pos[1];
                     // state.pins matches this order exactly
                     const active = state.pins[i];
                     const px = 15 + 0.5*spacing + c*spacing;
                     const py = 15 + 0.5*spacing + r*spacing;
                     return <g key={`pinf-${i}`}>{renderPin(active, px, py)}</g>
                })}
            </g>
             {/* Back */}
             <g transform="translate(85, 5)">
                {dialsB.map((d, i) => {
                    const r = Math.floor(i/3);
                    const c = i%3;
                    return renderDial(d, 15 + c*spacing, 15 + r*spacing);
                })}
                {/* Pins Back: Inverted logic. 
                    Front UL (Active) -> Back UR (Inactive/Recessed).
                    If Front UL is Active (UP), on Back it is Recessed (DOWN).
                    If Front UL is Inactive (DOWN), on Back it is Protruding (UP).
                    
                    Visual Mapping on Back Face:
                    Back Grid 0,0 (UL on Back) corresponds to Front UR (Pin 1).
                    Back Grid 0,1 (UR on Back) corresponds to Front UL (Pin 0).
                    Back Grid 1,1 (DR on Back) corresponds to Front DL (Pin 3).
                    Back Grid 1,0 (DL on Back) corresponds to Front DR (Pin 2).
                */}
                {
                    [
                        { r: 0, c: 0, pinIdx: 1 }, // Back UL -> Front UR
                        { r: 0, c: 1, pinIdx: 0 }, // Back UR -> Front UL
                        { r: 1, c: 1, pinIdx: 3 }, // Back DR -> Front DL
                        { r: 1, c: 0, pinIdx: 2 }  // Back DL -> Front DR
                    ].map((p, k) => {
                        const active = !state.pins[p.pinIdx]; // Inverse of front
                        const px = 15 + 0.5*spacing + p.c*spacing;
                        const py = 15 + 0.5*spacing + p.r*spacing;
                        return <g key={`pinb-${k}`}>{renderPin(active, px, py)}</g>
                    })
                }
            </g>
        </svg>
    );
};
