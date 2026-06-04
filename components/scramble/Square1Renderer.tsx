import React from 'react';
import { Square1Layer, Square1Piece, Square1State } from '../../utils/puzzles/square1';
import { ScrambleRendererProps, getFaceColor } from './utils';

type Point = {
	x: number;
	y: number;
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

const pieceSize = (piece: Square1Piece): number => piece.type === 'corner' ? 2 : 1;

export const Square1Renderer: React.FC<ScrambleRendererProps<Square1State>> = ({
	state,
	config,
	className,
	width = '100%',
	height = '100%'
}) => {
	const isStickerless = config?.baseColor === 'stickerless';
	const stroke = isStickerless ? 'none' : 'rgba(0,0,0,0.22)';
	const faceRadius = 43;
	const cornerTipRadius = 50;
	const sideRadius = 54;

	const getFacePoints = (cx: number, cy: number, piece: Square1Piece, start: number, end: number): Point[] => {
		const mid = (start + end) / 2;
		if (piece.type === 'edge') {
			return [
				{ x: cx, y: cy },
				polarPoint(cx, cy, faceRadius, start),
				polarPoint(cx, cy, faceRadius, end)
			];
		}

		return [
			{ x: cx, y: cy },
			polarPoint(cx, cy, faceRadius, start),
			polarPoint(cx, cy, cornerTipRadius, mid),
			polarPoint(cx, cy, faceRadius, end)
		];
	};

	const getSidePoints = (cx: number, cy: number, start: number, end: number): Point[] => {
		return [
			polarPoint(cx, cy, faceRadius, start),
			polarPoint(cx, cy, sideRadius, start),
			polarPoint(cx, cy, sideRadius, end),
			polarPoint(cx, cy, faceRadius, end)
		];
	};

	const renderLayer = (layer: Square1Layer, offset: number, cx: number, cy: number, name: 'top' | 'bottom'): React.ReactElement[] => {
		let units = 0;
		const pieces: React.ReactElement[] = [];

		layer.forEach((piece, idx) => {
			const size = pieceSize(piece);
			const start = (offset + units) * 30;
			const end = (offset + units + size) * 30;
			const key = `${name}-${piece.id}-${idx}`;

			pieces.push(
				<polygon
					key={`${key}-face`}
					points={pointsToString(getFacePoints(cx, cy, piece, start, end))}
					fill={getFaceColor(piece.topColor, config)}
					stroke={stroke}
					strokeWidth={0.8}
					strokeLinejoin="round"
				/>
			);
			const sideSegmentSize = size / piece.sideColors.length;
			piece.sideColors.forEach((sideColor, sideIdx) => {
				const sideStart = (units + sideIdx * sideSegmentSize) * 30;
				const sideEnd = (units + (sideIdx + 1) * sideSegmentSize) * 30;

				pieces.push(
					<polygon
						key={`${key}-side-${sideIdx}`}
						points={pointsToString(getSidePoints(cx, cy, sideStart, sideEnd))}
						fill={getFaceColor(sideColor, config)}
						stroke={stroke}
						strokeWidth={0.8}
						strokeLinejoin="round"
					/>
				);
			});

			units += size;
		});

		return pieces;
	};

	return (
		<svg
			width={width}
			height={height}
			className={className}
			viewBox="0 0 240 125"
			preserveAspectRatio="xMidYMid meet"
		>
			{renderLayer(state.top, state.topOffset, 60, 62.5, 'top')}
			{renderLayer(state.bottom, state.bottomOffset, 180, 62.5, 'bottom')}
		</svg>
	);
};
