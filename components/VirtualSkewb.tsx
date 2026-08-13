/* eslint-disable react/no-unknown-property */
import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { ScrambleImageConfig, TimerState } from '../types';
import { SkewbPuzzle, SkewbState } from '../utils/puzzles/skewb';
import { getFaceColor } from './scramble/utils';

type Props = {
	scramble: string[];
	onMove: () => void;
	onSolve: () => void;
	config: ScrambleImageConfig;
	timerState: TimerState;
	isModalOpen?: boolean;
};

type Face = keyof SkewbState;
type VectorTuple = [number, number, number];

const FACE_GEOMETRY: Record<Face, { normal: VectorTuple; right: VectorTuple; up: VectorTuple }> = {
	U: { normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
	R: { normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
	F: { normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
	D: { normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
	L: { normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
	B: { normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
};

const KEY_MAP: Record<string, string> = {
	j: 'U', f: "U'",
	i: 'R', k: "R'",
	d: 'L', e: "L'",
	w: 'B', o: "B'",
};

const addScaled = (target: THREE.Vector3, tuple: VectorTuple, scale: number): THREE.Vector3 =>
	target.add(new THREE.Vector3(...tuple).multiplyScalar(scale));

const createStickerGeometry = (face: Face, index: number): THREE.BufferGeometry => {
	const { normal, right, up } = FACE_GEOMETRY[face];
	const origin = new THREE.Vector3(...normal).multiplyScalar(1.011);
	const extent = 0.91;
	const midpoint = 0.47;
	const point = (rightScale: number, upScale: number): THREE.Vector3 => {
		const result = origin.clone();
		addScaled(result, right, rightScale);
		addScaled(result, up, upScale);
		return result;
	};

	const points = index === 0
		? [point(0, midpoint), point(midpoint, 0), point(0, -midpoint), point(-midpoint, 0)]
		: index === 1
			? [point(-extent, extent), point(0, extent), point(-extent, 0)]
			: index === 2
				? [point(extent, extent), point(extent, 0), point(0, extent)]
				: index === 3
					? [point(extent, -extent), point(0, -extent), point(extent, 0)]
					: [point(-extent, -extent), point(-extent, 0), point(0, -extent)];

	const positions = points.flatMap(vertex => vertex.toArray());
	const indices = points.length === 4 ? [0, 1, 2, 0, 2, 3] : [0, 1, 2];
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
};

const isSolved = (state: SkewbState): boolean =>
	Object.values(state).every(face => face.every(sticker => sticker === face[0]));

export const VirtualSkewb: React.FC<Props> = ({ scramble, onMove, onSolve, config, timerState, isModalOpen }) => {
	const [state, setState] = useState<SkewbState>(() => SkewbPuzzle.getInitialState());
	const geometries = useMemo(() => (Object.keys(FACE_GEOMETRY) as Face[]).flatMap(face =>
		Array.from({ length: 5 }, (_, index) => ({ face, index, geometry: createStickerGeometry(face, index) }))
	), []);

	useEffect(() => (): void => geometries.forEach(item => item.geometry.dispose()), [geometries]);

	useEffect(() => {
		const next = SkewbPuzzle.getInitialState();
		scramble.forEach(move => SkewbPuzzle.applyMove(next, move));
		setState(next);
	}, [scramble]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (isModalOpen || event.ctrlKey || event.altKey || event.metaKey) return;
			if (![TimerState.IDLE, TimerState.RUNNING, TimerState.INSPECTION].includes(timerState)) return;
			const move = KEY_MAP[event.key.toLowerCase()];
			if (!move) return;

			event.preventDefault();
			event.stopPropagation();
			if (timerState !== TimerState.RUNNING) onMove();
			setState(current => {
				const next: SkewbState = {
					U: [...current.U], R: [...current.R], F: [...current.F],
					D: [...current.D], L: [...current.L], B: [...current.B],
				};
				SkewbPuzzle.applyMove(next, move);
				if (isSolved(next)) onSolve();
				return next;
			});
		};

		window.addEventListener('keydown', handleKeyDown);
		return (): void => window.removeEventListener('keydown', handleKeyDown);
	}, [isModalOpen, onMove, onSolve, timerState]);

	const bodyColor = config.baseColor === 'white' ? '#e4e4e7' : '#18181b';

	return (
		<div className="h-full w-full">
			<Canvas camera={{ position: [4, 3.2, 5.5], fov: 38 }}>
				<ambientLight intensity={1.1} />
				<directionalLight position={[5, 8, 6]} intensity={1.1} />
				<OrbitControls enablePan={false} minDistance={3.2} maxDistance={12} />
				<RoundedBox args={[2, 2, 2]} radius={0.08} smoothness={4}>
					<meshStandardMaterial color={bodyColor} roughness={0.55} />
				</RoundedBox>
				{geometries.map(({ face, index, geometry }) => (
					<mesh key={`${face}-${index}`} geometry={geometry}>
						<meshBasicMaterial color={getFaceColor(state[face][index], config)} side={THREE.DoubleSide} />
					</mesh>
				))}
			</Canvas>
		</div>
	);
};
