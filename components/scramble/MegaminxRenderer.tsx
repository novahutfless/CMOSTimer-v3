import React from 'react';
import { MegaminxFace, MegaminxState } from '../../utils/puzzles/megaminx';
import { ScrambleRendererProps, getFaceColor } from './utils';

type Point = {
	x: number;
	y: number;
};

type FacePlacement = {
	face: MegaminxFace;
	x: number;
	y: number;
	rotation: number;
};

const polarPoint = (cx: number, cy: number, radius: number, angleDeg: number): Point => {
	const angle = (angleDeg - 90) * Math.PI / 180;
	return {
		x: cx + radius * Math.cos(angle),
		y: cy + radius * Math.sin(angle)
	};
};

const pointsToString = (points: Point[]): string =>
	points.map(point => `${point.x},${point.y}`).join(' ');

const pentagonPoints = (cx: number, cy: number, radius: number, rotation: number): Point[] =>
	Array.from({ length: 5 }, (_, idx) => polarPoint(cx, cy, radius, rotation + idx * 72));

const FACE_PLACEMENTS: FacePlacement[] = [
	{ face: 'U', x: 132, y: 42, rotation: 0 },
	{ face: 'L', x: 62, y: 86, rotation: 36 },
	{ face: 'F', x: 118, y: 96, rotation: 36 },
	{ face: 'R', x: 174, y: 86, rotation: 36 },
	{ face: 'BL', x: 76, y: 146, rotation: 0 },
	{ face: 'BR', x: 188, y: 146, rotation: 0 },
	{ face: 'DL', x: 62, y: 206, rotation: 36 },
	{ face: 'DF', x: 118, y: 216, rotation: 36 },
	{ face: 'DR', x: 174, y: 206, rotation: 36 },
	{ face: 'DBL', x: 76, y: 266, rotation: 0 },
	{ face: 'D', x: 132, y: 276, rotation: 0 },
	{ face: 'DBR', x: 188, y: 266, rotation: 0 },
];

export const MegaminxRenderer: React.FC<ScrambleRendererProps<MegaminxState>> = ({
	state,
	config,
	className,
	width = '100%',
	height = '100%'
}) => {
	const isStickerless = config?.baseColor === 'stickerless';
	const stroke = isStickerless ? 'none' : 'rgba(0,0,0,0.18)';
	const faceRadius = 25;
	const centerRadius = 9;

	const renderFace = ({ face, x, y, rotation }: FacePlacement): React.ReactElement[] => {
		const stickers = state[face] || Array(11).fill(face);
		const outer = pentagonPoints(x, y, faceRadius, rotation);
		const middle = pentagonPoints(x, y, 14, rotation);
		const elements: React.ReactElement[] = [];

		for (let i = 0; i < 5; i++) {
			const next = (i + 1) % 5;
			const edgeMid = polarPoint(x, y, 20, rotation + i * 72 + 36);

			elements.push(
				<polygon
					key={`${face}-corner-${i}`}
					points={pointsToString([middle[i], outer[i], edgeMid])}
					fill={getFaceColor(stickers[1 + i], config)}
					stroke={stroke}
					strokeWidth={0.5}
					strokeLinejoin="round"
				/>
			);
			elements.push(
				<polygon
					key={`${face}-edge-${i}`}
					points={pointsToString([middle[i], edgeMid, outer[next], middle[next]])}
					fill={getFaceColor(stickers[6 + i], config)}
					stroke={stroke}
					strokeWidth={0.5}
					strokeLinejoin="round"
				/>
			);
		}

		elements.push(
			<polygon
				key={`${face}-center`}
				points={pointsToString(pentagonPoints(x, y, centerRadius, rotation))}
				fill={getFaceColor(stickers[0], config)}
				stroke={stroke}
				strokeWidth={0.5}
				strokeLinejoin="round"
			/>
		);

		return elements;
	};

	return (
		<svg
			width={width}
			height={height}
			className={className}
			viewBox="25 10 215 295"
			preserveAspectRatio="xMidYMid meet"
		>
			{FACE_PLACEMENTS.flatMap(renderFace)}
		</svg>
	);
};
