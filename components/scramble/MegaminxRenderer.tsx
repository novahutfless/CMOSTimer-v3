import React from 'react';
import { MegaminxFace, MegaminxState } from '../../utils/puzzles/megaminx';
import { ScrambleRendererProps, getFaceColor } from './utils';

type Point = { x: number; y: number };
type FacePlacement = { face: MegaminxFace; x: number; y: number; pointUp: boolean; rotateCounterClockwise: number; label?: string };

const GAP = 2;
const MINX_RAD = 30;
// Overall bounds of the unfolded 2-half megaminx layout, in face-radius units.
const UNFOLD_HEIGHT = 2 + 3 * Math.sin(0.3 * Math.PI) + Math.sin(0.1 * Math.PI);
const UNFOLD_WIDTH = 4 * Math.cos(0.1 * Math.PI) + 2 * Math.cos(0.3 * Math.PI);
// Reused pentagon spacing terms from the TNoodle geometry.
const X = MINX_RAD * Math.sqrt(2 * (1 - Math.cos(0.6 * Math.PI)));
const A = MINX_RAD * Math.cos(0.1 * Math.PI);
const B = X * Math.cos(0.1 * Math.PI);
const C = X * Math.cos(0.3 * Math.PI);
const D = X * Math.sin(0.1 * Math.PI);
const E = X * Math.sin(0.3 * Math.PI);
const LEFT_CENTER_X = GAP + A + B + D / 2;
const LEFT_CENTER_Y = GAP + X + MINX_RAD - D;
// Horizontal jump from the left 6-face cluster to the right 6-face cluster.
const SHIFT = LEFT_CENTER_X + (D * 0.6 + MINX_RAD * (Math.cos(0.1 * Math.PI) + Math.cos(0.2 * Math.PI)));
const VIEWBOX_WIDTH = UNFOLD_WIDTH * 2 * MINX_RAD + 3 * GAP;
const VIEWBOX_HEIGHT = UNFOLD_HEIGHT * MINX_RAD + 2 * GAP;

// Face centers/orientations in unfolded arrangement
const FACE_PLACEMENTS: FacePlacement[] = [
	{ face: 'U', x: LEFT_CENTER_X, y: LEFT_CENTER_Y, pointUp: true, rotateCounterClockwise: 0, label: 'U' },
	{ face: 'BL', x: LEFT_CENTER_X - C, y: LEFT_CENTER_Y - E, pointUp: false, rotateCounterClockwise: 1 },
	{ face: 'BR', x: LEFT_CENTER_X + C, y: LEFT_CENTER_Y - E, pointUp: false, rotateCounterClockwise: 1 },
	{ face: 'R', x: LEFT_CENTER_X + B, y: LEFT_CENTER_Y + D, pointUp: false, rotateCounterClockwise: 1 },
	{ face: 'F', x: LEFT_CENTER_X, y: LEFT_CENTER_Y + X, pointUp: false, rotateCounterClockwise: 1, label: 'F' },
	{ face: 'L', x: LEFT_CENTER_X - B, y: LEFT_CENTER_Y + D, pointUp: false, rotateCounterClockwise: 1 },
	{ face: 'D', x: SHIFT + GAP + A + B, y: GAP + X + MINX_RAD, pointUp: false, rotateCounterClockwise: 2 },
	{ face: 'DR', x: SHIFT + GAP + A + B - C, y: GAP + X + E + MINX_RAD, pointUp: true, rotateCounterClockwise: 2 },
	{ face: 'DBR', x: SHIFT + GAP + A, y: GAP + X - D + MINX_RAD, pointUp: true, rotateCounterClockwise: 2 },
	{ face: 'B', x: SHIFT + GAP + A + B, y: GAP + MINX_RAD, pointUp: true, rotateCounterClockwise: 2 },
	{ face: 'DBL', x: SHIFT + GAP + A + 2 * B, y: GAP + X - D + MINX_RAD, pointUp: true, rotateCounterClockwise: 2 },
	{ face: 'DL', x: SHIFT + GAP + A + B + C, y: GAP + X + E + MINX_RAD, pointUp: true, rotateCounterClockwise: 2 },
];

const pointString = (points: Point[]): string => points.map(point => `${point.x},${point.y}`).join(' ');

const pentagonPoints = (cx: number, cy: number, pointUp: boolean): Point[] => {
	// These five angles trace the outer pentagon; subtracting 0.2*pi flips it to "point up".
	const baseAngles = [1.3, 1.7, 0.1, 0.5, 0.9];
	return baseAngles.map(raw => {
		const angle = (raw + (pointUp ? -0.2 : 0)) * Math.PI;
		return {
			x: cx + MINX_RAD * Math.cos(angle),
			y: cy + MINX_RAD * Math.sin(angle)
		};
	});
};

const lineIntersection = (a1: Point, a2: Point, b1: Point, b2: Point): Point => {
	const det = (p: Point, q: Point): number => p.x * q.y - p.y * q.x;
	const xDiff = { x: a1.x - a2.x, y: b1.x - b2.x };
	const yDiff = { x: a1.y - a2.y, y: b1.y - b2.y };
	const div = det(xDiff, yDiff);
	const d1 = det(a1, a2);
	const d2 = det(b1, b2);
	return {
		x: (d1 * xDiff.y - xDiff.x * d2) / div,
		y: (d1 * yDiff.y - yDiff.x * d2) / div
	};
};

const centerLabelPosition = (points: Point[]): { x: number; y: number; dy: number } => {
	const center = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
	const ys = points.map(point => point.y);
	const pentagonHeight = Math.max(...ys) - Math.min(...ys);
	return {
		x: center.x / points.length,
		y: center.y / points.length,
		dy: Math.round(pentagonHeight * 0.2)
	};
};

export const MegaminxRenderer: React.FC<ScrambleRendererProps<MegaminxState>> = ({
	state,
	config,
	className,
	width = '100%',
	height = '100%'
}) => {
	const stroke = config?.baseColor === 'stickerless' ? 'none' : 'rgba(0,0,0,0.2)';

	const renderFace = ({ face, x, y, pointUp, rotateCounterClockwise, label }: FacePlacement): React.ReactElement[] => {
		const stickers = state[face];
		const pentagon = pentagonPoints(x, y, pointUp);
		const xs = Array.from({ length: 10 }, () => 0);
		const ys = Array.from({ length: 10 }, () => 0);

		for (let i = 0; i < 5; i++) {
			// 40/60 and 60/40 split points reproduce the TNoodle sticker band widths.
			xs[i] = 0.4 * pentagon[(i + 1) % 5].x + 0.6 * pentagon[i].x;
			ys[i] = 0.4 * pentagon[(i + 1) % 5].y + 0.6 * pentagon[i].y;
			xs[i + 5] = 0.6 * pentagon[(i + 1) % 5].x + 0.4 * pentagon[i].x;
			ys[i + 5] = 0.6 * pentagon[(i + 1) % 5].y + 0.4 * pentagon[i].y;
		}

		const innerPentagon = Array.from({ length: 5 }, (_, i) =>
			lineIntersection(
				{ x: xs[i], y: ys[i] },
				{ x: xs[5 + ((3 + i) % 5)], y: ys[5 + ((3 + i) % 5)] },
				{ x: xs[(i + 1) % 5], y: ys[(i + 1) % 5] },
				{ x: xs[5 + ((4 + i) % 5)], y: ys[5 + ((4 + i) % 5)] }
			)
		);

		const polygons = Array.from({ length: 11 }, () => [] as Point[]);
		polygons[10] = [...innerPentagon];

		for (let i = 0; i < 5; i++) {
			polygons[2 * i] = [
				pentagon[i],
				{ x: xs[i], y: ys[i] },
				innerPentagon[i],
				{ x: xs[5 + ((4 + i) % 5)], y: ys[5 + ((4 + i) % 5)] }
			];
			polygons[2 * i + 1] = [
				{ x: xs[i], y: ys[i] },
				{ x: xs[i + 5], y: ys[i + 5] },
				innerPentagon[(i + 1) % 5],
				innerPentagon[i]
			];
		}

		const stickerIndexForPolygon = (index: number): number =>
			index < 10 ? (index + 2 * rotateCounterClockwise) % 10 : 10;

		const labelPos = label ? centerLabelPosition(innerPentagon) : null;

		return [
			...polygons.map((polygon, index) => (
				<polygon
					key={`${face}-${index}`}
					points={pointString(polygon)}
					fill={getFaceColor(stickers[stickerIndexForPolygon(index)], config)}
					stroke={stroke}
					strokeWidth={0.8}
					strokeLinejoin="round"
				/>
			)),
			...(label && labelPos ? [
				<text
					key={`${face}-label`}
					x={labelPos.x}
					y={labelPos.y}
					dy={`${labelPos.dy}px`}
					textAnchor="middle"
					fontFamily="sans-serif"
					fontSize="10"
					fill="rgba(0,0,0,0.65)"
				>
					{label}
				</text>
			] : [])
		];
	};

	return (
		<svg
			width={width}
			height={height}
			className={className}
			viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
			preserveAspectRatio="xMidYMid meet"
		>
			{FACE_PLACEMENTS.flatMap(renderFace)}
		</svg>
	);
};
