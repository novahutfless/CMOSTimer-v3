/* eslint-disable react/no-unknown-property */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ScrambleImageConfig, TimerState } from '../types';
import { PYRAMINX_STICKERS, PyraminxPuzzle, PyraState, PyraVertex, PyraWeights } from '../utils/puzzles/pyraminx';
import { getFaceColor } from './scramble/utils';

type Props = {
	scramble: string[];
	onMove: (move: string) => boolean;
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

const CLOCKWISE_VERTEX_CYCLES: Record<PyraVertex, Record<PyraVertex, PyraVertex>> = {
	U: { U: 'U', L: 'B', B: 'R', R: 'L' },
	L: { L: 'L', U: 'R', R: 'B', B: 'U' },
	R: { R: 'R', U: 'B', B: 'L', L: 'U' },
	B: { B: 'B', U: 'L', L: 'R', R: 'U' },
};

type TouchGesture = {
	startX: number;
	startY: number;
	center: PyraWeights;
	maxCornerWeight: PyraWeights;
	camera: THREE.Camera;
	viewport: { width: number; height: number };
	orientation: THREE.Quaternion;
};

const pointFromWeights = (weights: PyraWeights): THREE.Vector3 => {
	const point = new THREE.Vector3();
	(Object.keys(VERTICES) as PyraVertex[]).forEach(vertex => point.addScaledVector(VERTICES[vertex], weights[vertex] / 3));
	return point;
};

const rotateWeights = (weights: PyraWeights, vertex: PyraVertex, prime: boolean): PyraWeights => {
	const cycle = CLOCKWISE_VERTEX_CYCLES[vertex];
	const result = { U: 0, L: 0, R: 0, B: 0 };
	(Object.keys(VERTICES) as PyraVertex[]).forEach(source => {
		const target = prime
			? (Object.keys(cycle) as PyraVertex[]).find(key => cycle[key] === source)!
			: cycle[source];
		result[target] = weights[source];
	});
	return result;
};

const projectPoint = (point: THREE.Vector3, camera: THREE.Camera, viewport: TouchGesture['viewport']): THREE.Vector2 => {
	const projected = point.clone().project(camera);
	return new THREE.Vector2(projected.x * viewport.width, -projected.y * viewport.height);
};

const getTouchMove = (gesture: TouchGesture, endX: number, endY: number): string | null => {
	const drag = new THREE.Vector2(endX - gesture.startX, endY - gesture.startY);
	if (drag.length() < 24) return null;
	drag.normalize();
	const source = projectPoint(pointFromWeights(gesture.center).applyQuaternion(gesture.orientation), gesture.camera, gesture.viewport);
	let best: { move: string; score: number } | null = null;

	(Object.keys(VERTICES) as PyraVertex[]).forEach(vertex => {
		if (gesture.maxCornerWeight[vertex] < 2) return;
		([false, true] as const).forEach(prime => {
			const targetWeights = rotateWeights(gesture.center, vertex, prime);
			const targetPoint = pointFromWeights(targetWeights).applyQuaternion(gesture.orientation);
			const direction = projectPoint(targetPoint, gesture.camera, gesture.viewport).sub(source);
			if (direction.lengthSq() < 0.0001) return;
			const score = direction.normalize().dot(drag);
			const isTip = gesture.maxCornerWeight[vertex] === 3;
			const base = isTip ? vertex.toLowerCase() : vertex;
			if (!best || score > best.score) best = { move: `${base}${prime ? "'" : ''}`, score };
		});
	});

	const selected = best as { move: string; score: number } | null;
	return selected && selected.score > 0.35 ? selected.move : null;
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
	const [touchGesture, setTouchGesture] = useState<TouchGesture | null>(null);
	const puzzleGroupRef = useRef<THREE.Group>(null);
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

	const applyMove = (move: string): void => {
		if (!onMove(move)) return;
		setState(current => {
			const next: PyraState = { F: [...current.F], L: [...current.L], R: [...current.R], D: [...current.D] };
			PyraminxPuzzle.applyMove(next, move);
			if (isSolved(next)) onSolve();
			return next;
		});
	};

	const startTouchGesture = (event: ThreeEvent<PointerEvent>, center: PyraWeights, maxCornerWeight: PyraWeights): void => {
		if (event.nativeEvent.pointerType !== 'touch' || isModalOpen) return;
		event.stopPropagation();
		(event.target as Element).setPointerCapture?.(event.nativeEvent.pointerId);
		const bounds = (event.nativeEvent.currentTarget as Element).getBoundingClientRect();
		setTouchGesture({
			startX: event.nativeEvent.clientX,
			startY: event.nativeEvent.clientY,
			center,
			maxCornerWeight,
			camera: event.camera,
			viewport: { width: bounds.width, height: bounds.height },
			orientation: puzzleGroupRef.current?.quaternion.clone() || new THREE.Quaternion(),
		});
	};

	const continueTouchGesture = (event: ThreeEvent<PointerEvent>): void => {
		if (!touchGesture) return;
		event.stopPropagation();
		const move = getTouchMove(touchGesture, event.nativeEvent.clientX, event.nativeEvent.clientY);
		if (!move) return;
		setTouchGesture(null);
		applyMove(move);
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			if (isModalOpen || event.ctrlKey || event.altKey || event.metaKey) return;
			if (![TimerState.IDLE, TimerState.RUNNING, TimerState.INSPECTION].includes(timerState)) return;
			const rotation: Record<string, { vertex: PyraVertex; direction: number }> = {
				arrowleft: { vertex: 'U', direction: 1 },
				arrowright: { vertex: 'U', direction: -1 },
				arrowup: { vertex: 'R', direction: 1 },
				arrowdown: { vertex: 'R', direction: -1 },
			};
			const rotationCommand = rotation[event.key.toLowerCase()];
			if (rotationCommand && puzzleGroupRef.current) {
				event.preventDefault();
				puzzleGroupRef.current.rotateOnAxis(
					VERTICES[rotationCommand.vertex].clone().normalize(),
					rotationCommand.direction * Math.PI * 2 / 3
				);
				return;
			}
			const mappedMove = KEY_MAP[event.key.toLowerCase()];
			if (!mappedMove) return;
			const move = event.shiftKey ? `${mappedMove.charAt(0).toLowerCase()}${mappedMove.slice(1)}` : mappedMove;

			event.preventDefault();
			event.stopPropagation();
			applyMove(move);
		};

		window.addEventListener('keydown', handleKeyDown);
		return (): void => window.removeEventListener('keydown', handleKeyDown);
	}, [isModalOpen, onMove, onSolve, timerState]);

	const bodyColor = config.baseColor === 'white' ? '#e4e4e7' : '#18181b';

	return (
		<div className="h-full w-full touch-none">
			<Canvas camera={{ position: [4.2, 3.2, 6], fov: 38 }}>
				<ambientLight intensity={1.1} />
				<directionalLight position={[5, 8, 6]} intensity={1.1} />
				<OrbitControls enablePan={false} enableRotate={!touchGesture} minDistance={3.5} maxDistance={13} />
				<group ref={puzzleGroupRef}>
					<mesh geometry={bodyGeometry}>
						<meshStandardMaterial color={bodyColor} roughness={0.55} side={THREE.DoubleSide} />
					</mesh>
					{stickerGeometries.map(sticker => (
						<mesh
							key={`${sticker.face}-${sticker.index}`}
							geometry={sticker.geometry}
							onPointerDown={event => startTouchGesture(event, sticker.center, sticker.maxCornerWeight)}
							onPointerMove={continueTouchGesture}
							onPointerUp={() => setTouchGesture(null)}
							onPointerCancel={() => setTouchGesture(null)}
						>
							<meshBasicMaterial color={getPyraminxColor(state[sticker.face][sticker.index], config)} side={THREE.DoubleSide} />
						</mesh>
					))}
				</group>
			</Canvas>
		</div>
	);
};
