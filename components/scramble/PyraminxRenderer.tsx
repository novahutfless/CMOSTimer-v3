import React from 'react';
import { PyraState } from '../../utils/puzzles/pyraminx';
import { ScrambleRendererProps, getFaceColor } from './utils';

export const PyraminxRenderer: React.FC<ScrambleRendererProps<PyraState>> = ({
	state,
	config,
	className,
	width = "100%",
	height = "100%"
}) => {

	const isStickerless = config?.baseColor === 'stickerless';

	// Geometry
	const triSize = 20; // size per sticker triangle
	const h = triSize * Math.sqrt(3)/2; // triangle height
	const stroke = isStickerless ? 'none' : 'rgba(0,0,0,0.15)';

	/**
     * Make a triangle at (x,y), orientation up or down.
     */
	const tri = (
		x: number,
		y: number,
		up: boolean,
		color: string,
		key: string
	): React.ReactElement => {
		const pts = up
			? `${x},${y-h/2} ${x-triSize/2},${y+h/2} ${x+triSize/2},${y+h/2}`
			: `${x},${y+h/2} ${x-triSize/2},${y-h/2} ${x+triSize/2},${y-h/2}`;

		return (
			<polygon
				key={key}
				points={pts}
				fill={getFaceColor(color, config)}
				stroke={stroke}
				strokeWidth={0.6}
				strokeLinejoin="round"
			/>
		);
	};

	/**
	 * Correct grid generator for a 3×3 triangular Pyraminx face.
	 *
	 * Row layout:
	 *   r=0 → 1 sticker (index 0)
	 *   r=1 → 3 stickers (1,2,3)
	 *   r=2 → 5 stickers (4–8)
	 */
	const renderFace = (
		faceId: string,
		cx: number,
		cy: number,
		facePointsUp: boolean
	): React.ReactElement[] => {
		const colors = state[faceId] || Array(9).fill('x');
		const out: React.ReactElement[] = [];

		const ORIENT_UP = [
			[true],
			[true, false, true],
			[true, false, true, false, true]
		];

		const ORIENT_DOWN = [
			[false, true, false, true, false],
			[false, true, false],
			[false]
		];

		const orient = facePointsUp ? ORIENT_UP : ORIENT_DOWN;

		let idx = 0;

		for (let r = 0; r < orient.length; r++) {
			const row = orient[r];
			const count = row.length;

			for (let i = 0; i < count; i++) {
				const x = cx + (i - row.length/2 + 0.5) * (triSize / 2);
				const y = cy + r * h;

				out.push(tri(
					x,
					y,
					row[i],
					colors[idx],
					`${faceId}-${idx}`
				));
				idx++;
			}
		}

		return out;
	};

	// Face placement
	const F = { x: 100, y: 40, up: true };
	const L = { x: 60, y: 40, up: false };
	const R = { x: 140, y: 40, up: false };
	const D = { x: 100, y: 100, up: false };

	return (
		<svg
			width={width}
			height={height}
			className={className}
			viewBox="40 10 120 130"
			preserveAspectRatio="xMidYMid meet"
		>
			{renderFace("F", F.x, F.y, F.up)}
			{renderFace("L", L.x, L.y, L.up)}
			{renderFace("R", R.x, R.y, R.up)}
			{renderFace("D", D.x, D.y, D.up)}
		</svg>
	);
};
