/* eslint-disable react/no-unknown-property */
import React, { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ScrambleImageConfig, TimerState } from '../types';
import { PYRAMINX_STICKERS, PyraminxPuzzle, PyraState, PyraVertex, PyraWeights } from '../utils/puzzles/pyraminx';
import { getFaceColor } from './scramble/utils';

type Props = {
	scramble: string[];
	onMove: () => void;
	onSolve: () => void;
	config: ScrambleImageConfig;
	timerState: TimerState;
	isModalOpen?: boolean;
};

const SCALE = 2;
const SQRT_TWO = Math.sqrt(2);
const VERTICES: Record<PyraVertex, THREE.Vector3> = {
	U: new THREE.Vector3(0, 1, 0).multiplyScalar(SCALE),
	L: new THREE.Vector3(-Math.sqrt(2 / 3), -1 / 3, SQRT_TWO / 3).multiplyScalar(SCALE),
	R: new THREE.Vector3(Math.sqrt(2 / 3), -1 / 3, SQRT_TWO / 3).multiplyScalar(SCALE),
	B: new THREE.Vector3(0, -1 / 3, -2 * SQRT_TWO / 3).multiplyScalar(SCALE),
};

const BODY_FACES: PyraVertex[][] = [
	['U', 'L', 'R'], ['L', 'B', 'U'], ['R', 'U', 'B'], ['B', 'L', 'R'],
];

const KEY_MAP: Record<string, string> = {
	j: 'U', f: "U'",
	i: 'R', k: "R'",
	d: 'L', e: "L'",
	w: 'B', o: "B'",
};

const pointFromWeights = (weights: PyraWeights): THREE.Vector3 => {
	const point = new THREE.Vector3();
	(Object.keys(VERTICES) as PyraVertex[]).forEach(vertex => point.addScaledVector(VERTICES[vertex], weights[vertex] / 3));
	return point;
};

const createTriangleGeometry = (weights: PyraWeights[]): THREE.BufferGeometry => {
	const rawPoints = weights.map(pointFromWeights);
	const center = rawPoints.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / 3);
	const points = rawPoints.map(point => center.clone().add(point.clone().sub(center).multiplyScalar(0.91)));
	const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
	if (normal.dot(center) < 0) normal.negate();
	points.forEach(point => point.addScaledVector(normal, 0.025));

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap(point => point.toArray()), 3));
	geometry.setIndex([0, 1, 2]);
	geometry.computeVertexNormals();
	return geometry;
};

const createBodyGeometry = (): THREE.BufferGeometry => {
	const positions = BODY_FACES.flatMap(face => face.flatMap(vertex => VERTICES[vertex].toArray()));
	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.computeVertexNormals();
	return geometry;
};

const isSolved = (state: PyraState): boolean =>
	Object.values(state).every(face => face.every(sticker => sticker === face[0]));

const getPyraminxColor = (color: string, config: ScrambleImageConfig): string =>
	getFaceColor(color === 'R' ? 'B' : color === 'L' ? 'R' : color, config);

export const VirtualPyraminx: React.FC<Props> = ({ scramble, onMove, onSolve, config, timerState, isModalOpen }) => {
	const [state, setState] = useState<PyraState>(() => PyraminxPuzzle.getInitialState());
	const bodyGeometry = useMemo(() => createBodyGeometry(), []);
	const stickerGeometries = useMemo(() => PYRAMINX_STICKERS.map(sticker => ({
		...sticker,
		geometry: createTriangleGeometry(sticker.corners),
	})), []);

	useEffect(() => (): void => {
		bodyGeometry.dispose();
		stickerGeometries.forEach(sticker => sticker.geometry.dispose());
	}, [bodyGeometry, stickerGeometries]);

	useEffect(() => {
		const next = PyraminxPuzzle.getInitialState();
		scramble.forEach(move => PyraminxPuzzle.applyMove(next, move));
		setState(next);
	}, [scramble]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (isModalOpen || event.ctrlKey || event.altKey || event.metaKey) return;
			if (![TimerState.IDLE, TimerState.RUNNING, TimerState.INSPECTION].includes(timerState)) return;
			const mappedMove = KEY_MAP[event.key.toLowerCase()];
			if (!mappedMove) return;
			const move = event.shiftKey ? `${mappedMove.charAt(0).toLowerCase()}${mappedMove.slice(1)}` : mappedMove;

			event.preventDefault();
			event.stopPropagation();
			if (timerState !== TimerState.RUNNING) onMove();
			setState(current => {
				const next: PyraState = { F: [...current.F], L: [...current.L], R: [...current.R], D: [...current.D] };
				PyraminxPuzzle.applyMove(next, move);
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
			<Canvas camera={{ position: [4.2, 3.2, 6], fov: 38 }}>
				<ambientLight intensity={1.1} />
				<directionalLight position={[5, 8, 6]} intensity={1.1} />
				<OrbitControls enablePan={false} minDistance={3.5} maxDistance={13} />
				<mesh geometry={bodyGeometry}>
					<meshStandardMaterial color={bodyColor} roughness={0.55} side={THREE.DoubleSide} />
				</mesh>
				{stickerGeometries.map(sticker => (
					<mesh key={`${sticker.face}-${sticker.index}`} geometry={sticker.geometry}>
						<meshBasicMaterial color={getPyraminxColor(state[sticker.face][sticker.index], config)} side={THREE.DoubleSide} />
					</mesh>
				))}
			</Canvas>
		</div>
	);
};
