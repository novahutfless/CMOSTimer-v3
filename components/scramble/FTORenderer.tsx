import React from 'react';
import { ScrambleRendererProps, getFaceColor } from './utils';
import { FTOState } from '../../utils/puzzles/fto';

const STICKERS: Array<{ index: number; points: string }> = [
	{ index: 0, points: '19,9.6 30.8,9.6 24.9,15.5' },
	{ index: 1, points: '30.8,9.6 24.9,15.5 36.8,15.5' },
	{ index: 2, points: '30.8,9.6 36.8,15.5 42.7,9.6' },
	{ index: 3, points: '36.8,15.5 42.7,9.6 48.6,15.5' },
	{ index: 4, points: '42.7,9.6 48.6,15.5 54.5,9.6' },
	{ index: 5, points: '24.9,15.5 30.8,21.4 36.8,15.5' },
	{ index: 6, points: '30.8,21.4 36.8,15.5 42.7,21.4' },
	{ index: 7, points: '36.8,15.5 42.7,21.4 48.6,15.5' },
	{ index: 8, points: '30.8,21.4 36.8,27.3 42.7,21.4' },
	{ index: 9, points: '19,21.4 24.9,15.5 19,9.6' },
	{ index: 10, points: '24.9,27.3 19,21.4 24.9,15.5' },
	{ index: 11, points: '24.9,27.3 30.8,21.4 24.9,15.5' },
	{ index: 12, points: '30.8,33.3 24.9,27.3 30.8,21.4' },
	{ index: 13, points: '30.8,33.3 36.8,27.3 30.8,21.4' },
	{ index: 14, points: '19,33.3 24.9,27.3 19,21.4' },
	{ index: 15, points: '19,33.3 24.9,39.2 24.9,27.3' },
	{ index: 16, points: '24.9,39.2 30.8,33.3 24.9,27.3' },
	{ index: 17, points: '19,45.1 19,33.3 24.9,39.2' },
	{ index: 18, points: '42.7,33.3 36.8,27.3 30.8,33.3' },
	{ index: 19, points: '36.8,39.2 30.8,33.3 24.9,39.2' },
	{ index: 20, points: '42.7,33.3 36.8,39.2 30.8,33.3' },
	{ index: 21, points: '48.6,39.2 42.7,33.3 36.8,39.2' },
	{ index: 22, points: '30.8,45.1 24.9,39.2 19,45.1' },
	{ index: 23, points: '36.8,39.2 30.8,45.1 24.9,39.2' },
	{ index: 24, points: '42.7,45.1 36.8,39.2 30.8,45.1' },
	{ index: 25, points: '42.7,45.1 48.6,39.2 36.8,39.2' },
	{ index: 26, points: '54.5,45.1 42.7,45.1 48.6,39.2' },
	{ index: 27, points: '42.7,21.4 36.8,27.3 42.7,33.3' },
	{ index: 28, points: '42.7,21.4 48.6,27.3 42.7,33.3' },
	{ index: 29, points: '48.6,15.5 42.7,21.4 48.6,27.3' },
	{ index: 30, points: '54.5,21.4 48.6,15.5 48.6,27.3' },
	{ index: 31, points: '54.5,9.6 54.5,21.4 48.6,15.5' },
	{ index: 32, points: '48.6,27.3 42.7,33.3 48.6,39.2' },
	{ index: 33, points: '48.6,27.3 54.5,33.3 48.6,39.2' },
	{ index: 34, points: '54.5,21.4 48.6,27.3 54.5,33.3' },
	{ index: 35, points: '54.5,33.3 48.6,39.2 54.5,45.1' },
	{ index: 36, points: '19,63.5 24.9,57.6 19,51.7' },
	{ index: 37, points: '19,75.4 24.9,69.4 19,63.5' },
	{ index: 38, points: '24.9,69.4 19,63.5 24.9,57.6' },
	{ index: 39, points: '24.9,69.4 30.8,63.5 24.9,57.6' },
	{ index: 40, points: '19,87.2 19,75.4 24.9,81.3' },
	{ index: 41, points: '19,75.4 24.9,81.3 24.9,69.4' },
	{ index: 42, points: '24.9,81.3 30.8,75.4 24.9,69.4' },
	{ index: 43, points: '30.8,75.4 24.9,69.4 30.8,63.5' },
	{ index: 44, points: '30.8,75.4 36.8,69.4 30.8,63.5' },
	{ index: 45, points: '19,51.7 30.8,51.7 24.9,57.6' },
	{ index: 46, points: '30.8,51.7 24.9,57.6 36.8,57.6' },
	{ index: 47, points: '30.8,51.7 36.8,57.6 42.7,51.7' },
	{ index: 48, points: '36.8,57.6 42.7,51.7 48.6,57.6' },
	{ index: 49, points: '42.7,51.7 48.6,57.6 54.5,51.7' },
	{ index: 50, points: '24.9,57.6 30.8,63.5 36.8,57.6' },
	{ index: 51, points: '30.8,63.5 36.8,57.6 42.7,63.5' },
	{ index: 52, points: '36.8,57.6 42.7,63.5 48.6,57.6' },
	{ index: 53, points: '30.8,63.5 36.8,69.4 42.7,63.5' },
	{ index: 54, points: '54.5,51.7 54.5,63.5 48.6,57.6' },
	{ index: 55, points: '48.6,57.6 42.7,63.5 48.6,69.4' },
	{ index: 56, points: '54.5,63.5 48.6,57.6 48.6,69.4' },
	{ index: 57, points: '54.5,63.5 48.6,69.4 54.5,75.4' },
	{ index: 58, points: '42.7,63.5 36.8,69.4 42.7,75.4' },
	{ index: 59, points: '42.7,63.5 48.6,69.4 42.7,75.4' },
	{ index: 60, points: '48.6,69.4 42.7,75.4 48.6,81.3' },
	{ index: 61, points: '48.6,69.4 54.5,75.4 48.6,81.3' },
	{ index: 62, points: '54.5,75.4 48.6,81.3 54.5,87.2' },
	{ index: 63, points: '54.5,87.2 42.7,87.2 48.6,81.3' },
	{ index: 64, points: '42.7,87.2 48.6,81.3 36.8,81.3' },
	{ index: 65, points: '42.7,87.2 36.8,81.3 30.8,87.2' },
	{ index: 66, points: '36.8,81.3 30.8,87.2 24.9,81.3' },
	{ index: 67, points: '30.8,87.2 24.9,81.3 19,87.2' },
	{ index: 68, points: '48.6,81.3 42.7,75.4 36.8,81.3' },
	{ index: 69, points: '42.7,75.4 36.8,81.3 30.8,75.4' },
	{ index: 70, points: '36.8,81.3 30.8,75.4 24.9,81.3' },
	{ index: 71, points: '42.7,75.4 36.8,69.4 30.8,75.4' },
];

const FACE_IDS = ['U', 'face11', 'R', 'F', 'face8', 'B', 'L', 'face12'];
const FALLBACK_COLORS = ['#ffffff', '#7c3aed', '#dc2626', '#16a34a', '#f472b6', '#2563eb', '#ea580c', '#27272a'];

const getFTOColor = (value: number, config: ScrambleRendererProps<FTOState>['config']): string => {
	const faceId = FACE_IDS[value];
	if (!faceId) return '#333333';
	const configured = getFaceColor(faceId, config);
	return configured === '#888' ? FALLBACK_COLORS[value] : configured;
};

export const FTORenderer: React.FC<ScrambleRendererProps<FTOState>> = ({
	state,
	config,
	className,
	width = '100%',
	height = '100%'
}) => {
	const isStickerless = config?.baseColor === 'stickerless';
	const stickerStroke = isStickerless ? 'rgba(0,0,0,0.08)' : 'rgba(80,80,80,0.55)';
	const faceStroke = isStickerless ? 'rgba(0,0,0,0.18)' : 'rgba(80,80,80,0.85)';

	return (
		<svg width={width} height={height} className={className} viewBox="8 5 58 87" preserveAspectRatio="xMidYMid meet">
			<polygon points="19,9.6 19,45.1 54.5,45.1 54.5,9.6" fill="none" stroke={faceStroke} strokeWidth={1.2} />
			<polygon points="19,51.7 54.5,51.7 54.5,87.2 19,87.2" fill="none" stroke={faceStroke} strokeWidth={1.2} />
			{STICKERS.map(({ index, points }) => (
				<polygon
					key={index}
					points={points}
					fill={getFTOColor(state[index], config)}
					stroke={stickerStroke}
					strokeWidth={0.16}
					strokeLinejoin="round"
				/>
			))}
			{[
				'19,9.6 54.5,9.6 36.8,27.3',
				'19,45.1 19,9.6 36.8,27.3',
				'54.5,9.6 54.5,45.1 36.8,27.3',
				'54.5,45.1 19,45.1 36.8,27.3',
				'19,51.7 54.5,51.7 36.8,69.4',
				'19,87.2 19,51.7 36.8,69.4',
				'54.5,51.7 54.5,87.2 36.8,69.4',
				'54.5,87.2 19,87.2 36.8,69.4'
			].map((points, index) => (
				<polygon key={`face-${index}`} points={points} fill="none" stroke={faceStroke} strokeWidth={0.5} />
			))}
		</svg>
	);
};
