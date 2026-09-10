
import React from 'react';
import { ScrambleImageConfig } from '../../types';
import { ClockState } from '../../utils/puzzles/clock';
import { ScrambleRendererProps } from './utils';

interface Props extends ScrambleRendererProps<ClockState> {
	backgroundColor?: string | undefined;
}

export const ClockRenderer: React.FC<Props> = ({ state, config, className, width = "100%", height = "100%", backgroundColor }) => {
	const baseColor = backgroundColor ?? (config?.baseColor === 'white' ? '#f4f4f5' : config?.baseColor === 'black' ? '#18181b' : 'transparent');
    
	const getClockColor = (key: keyof ScrambleImageConfig['clockColors'], defaultVal: string): string => {
		if (config && config.clockColors[key]) 
			return config.clockColors[key];

		return defaultVal;
	};

	const dialRadius = 10;
	const spacing = 26;
    
	const renderDial = (val: number, x: number, y: number): React.ReactElement => {
		const angle = (val * 30) - 90; // 0 = 12 o'clock
		const rad = angle * (Math.PI / 180);
		const x2 = x + Math.cos(rad) * 8;
		const y2 = y + Math.sin(rad) * 8;
		return (
			<g key={`${x}-${y}`}>
				<circle cx={x} cy={y} r={dialRadius} fill={getClockColor('clockFace', '#374151')} stroke="none" />
				<line x1={x} y1={y} x2={x2} y2={y2} stroke={getClockColor('marksF', '#FFF')} strokeWidth="2" strokeLinecap="round" />
				{[0].map(h => {
					const a = (h * 30) - 90;
					const r = a * Math.PI/180;
					return <circle key={h} cx={x + Math.cos(r)*7} cy={y + Math.sin(r)*7} r={1} fill={getClockColor('marksF', '#FFF')} />;
				})}
			</g>
		);
	};
    
	const dialsF = state.dials.slice(0, 9);
	const dialsB = state.dials.slice(9, 18);
    
	// Render Pin Function
	const renderPin = (active: boolean, x: number, y: number): React.ReactElement => (
		<circle cx={x} cy={y} r={3} fill={active ? getClockColor('pinUp', '#EAB308') : getClockColor('pinDown', '#4B5563')} stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />
	);

	// Drawing Logic
	// Front: 3x3 grid. Spacing 26.
	// Bounds:
	// x: 15 (center first) - 10 (radius) = 5. Max x: 15 + 2*26 + 10 = 77.
	// y: 15 - 10 = 5. Max y: 77.
	// Front Size: approx 80x80 roughly including margins.
	// Back: Same.
	// We put them side by side with gap.
	// Front Group transform(5,5) -> implies (5+5, 5+5) start.
    
	// ViewBox Calculation
	// Total Width: 5 (pad) + 72 (grid span) + 10 (radius*2/pad) -> ~85 per clock?
	// Let's use fixed viewbox for stability. 
	// Front takes 0-80. Back takes 85-165. Height 80.
    
	return (
		<svg 
			width={width} 
			height={height} 
			viewBox="0 0 170 90" 
			className={className}
			preserveAspectRatio="xMidYMid meet"
		>
			<rect x="0" y="0" width="170" height="90" fill={baseColor} rx="4"/>
			{/* Front */}
			<g transform="translate(5, 10)">
				<text x="38" y="-2" fontSize="8" fill="#888" textAnchor="middle" fontWeight="bold">FRONT</text>
				{dialsF.map((d, i) => {
					const r = Math.floor(i/3);
					const c = i%3;
					return renderDial(d, 15 + c*spacing, 15 + r*spacing);
				})}
				{[[0,0], [0,1], [1,1], [1,0]].map((pos, i) => {
					const r = pos[0]!;
					const c = pos[1]!;
					const active = state.pins[i]!;
					const px = 15 + 0.5*spacing + c*spacing;
					const py = 15 + 0.5*spacing + r*spacing;
					return <g key={`pinf-${i}`}>{renderPin(active, px, py)}</g>;
				})}
			</g>
			{/* Back */}
			<g transform="translate(90, 10)">
				<text x="38" y="-2" fontSize="8" fill="#888" textAnchor="middle" fontWeight="bold">BACK</text>
				{dialsB.map((d, i) => {
					const r = Math.floor(i/3);
					const c = i%3;
					return renderDial(d, 15 + c*spacing, 15 + r*spacing);
				})}
				{
					[
						{ r: 0, c: 0, pinIdx: 1 }, // Back UL -> Front UR
						{ r: 0, c: 1, pinIdx: 0 }, // Back UR -> Front UL
						{ r: 1, c: 1, pinIdx: 3 }, // Back DR -> Front DL
						{ r: 1, c: 0, pinIdx: 2 } // Back DL -> Front DR
					].map((p, k) => {
						const active = !state.pins[p.pinIdx]; 
						const px = 15 + 0.5*spacing + p.c*spacing;
						const py = 15 + 0.5*spacing + p.r*spacing;
						return <g key={`pinb-${k}`}>{renderPin(active, px, py)}</g>;
					})
				}
			</g>
		</svg>
	);
};
