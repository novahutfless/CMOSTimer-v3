/* eslint-disable react/no-unknown-property */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ScrambleImageConfig, TimerState } from '../types';
import { NxNPuzzle, NxNState } from '../utils/puzzles/nxn';
import { getFaceColor } from './scramble/utils';
import { storage } from '../utils/platformStorage';

interface Props {
    scramble: string[]; // The scramble sequence
	size: number;
    isActive: boolean; // Is the timer running?
    onMove: (move: string) => boolean; // Call on any move (starts timer); false rejects locked input
    onSolve: () => void; // Call when solved
    config: ScrambleImageConfig;
    timerState: TimerState;
    isModalOpen?: boolean;
}

// --- Logic Constants ---
const SPACING = 1.02; // Slightly spaced out
const ROUNDING = 0.08;
const STICKER_OFFSET = 0.51; // Slightly above the 1x1x1 box surface (0.5)
const STICKER_SIZE = 0.88;
const POSITION_EPSILON = 0.01;

// Keymap
const KEY_MAP: Record<string, string> = {
	// Basic Face Moves
	'j': 'U', 'f': "U'",
	'i': 'R', 'k': "R'",
	'd': 'L', 'e': "L'",
	'h': 'F', 'g': "F'",
	's': 'D', 'l': "D'",
	'w': 'B', 'o': "B'",
    
	// Wide Moves
	'u': 'Rw', 'm': "Rw'", // Rw, Rw'
	'r': "Lw'", 'v': 'Lw', // Lw', Lw
	'c': "Uw'", ',': 'Uw', // Uw', Uw
	'/': "Dw'", // Dw'
    
	// Slice Moves
	'5': 'M', '6': 'M',
	'.': "M'", 'x': "M'",
	'1': "S'", '0': 'S',
	'2': 'E', '9': "E'",

	// Rotations (Arrows)
	'arrowright': 'y', 'arrowleft': "y'",
	'arrowup': 'x', 'arrowdown': "x'",
    
	// Rotations (Custom)
	'a': "y'",
	'q': "z'",
	't': 'x', 'y': 'x',
	'p': 'z',
	'ö': 'y', ';': 'y',
	'b': "x'", 'n': "x'",
};

interface CubieProps {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    initialPos: THREE.Vector3; // Used to determine which stickers to show
    colorMap: Record<string, string>;
    baseColor: string;
	outerCoordinate: number;
}

// A cubie consists of a plastic body and up to 3 sticker plates
const Cubie: React.FC<CubieProps> = ({ position, quaternion, initialPos, colorMap, baseColor, outerCoordinate }) => {
    
	const bodyColor = baseColor === 'white' ? '#e4e4e7' : '#18181b';
    
	// Determine visible stickers based on INITIAL solved position
    
	return (
		<group position={position} quaternion={quaternion}>
			{/* Plastic Body */}
			<RoundedBox args={[1, 1, 1]} radius={ROUNDING} smoothness={4}>
				<meshStandardMaterial color={bodyColor} roughness={0.5} metalness={0.1} />
			</RoundedBox>

			{/* Stickers - Rendered as separate planes to ensure visibility */}
            
			{/* Right (x+) */}
			{initialPos.x > outerCoordinate - POSITION_EPSILON && (
				<mesh position={[STICKER_OFFSET, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.R} />
				</mesh>
			)}
			{/* Left (x-) */}
			{initialPos.x < -outerCoordinate + POSITION_EPSILON && (
				<mesh position={[-STICKER_OFFSET, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.L} />
				</mesh>
			)}
			{/* Top (y+) */}
			{initialPos.y > outerCoordinate - POSITION_EPSILON && (
				<mesh position={[0, STICKER_OFFSET, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.U} />
				</mesh>
			)}
			{/* Bottom (y-) */}
			{initialPos.y < -outerCoordinate + POSITION_EPSILON && (
				<mesh position={[0, -STICKER_OFFSET, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.D} />
				</mesh>
			)}
			{/* Front (z+) */}
			{initialPos.z > outerCoordinate - POSITION_EPSILON && (
				<mesh position={[0, 0, STICKER_OFFSET]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.F} />
				</mesh>
			)}
			{/* Back (z-) */}
			{initialPos.z < -outerCoordinate + POSITION_EPSILON && (
				<mesh position={[0, 0, -STICKER_OFFSET]} rotation={[0, Math.PI, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.B} />
				</mesh>
			)}
		</group>
	);
};

interface CubieState {
    id: number;
    pos: THREE.Vector3;
    initialPos: THREE.Vector3; 
    q: THREE.Quaternion;
}

const loadInitialCamera = (): THREE.Vector3 => {
	try {
		const saved = storage.getItem('cmostimer_virtual_camera');
		if (saved) return new THREE.Vector3().fromArray(JSON.parse(saved));
	} catch {
		// Ignore malformed persisted camera data and use the default camera position.
	}
	return new THREE.Vector3(3.5, 2.5, 5); // Default
};

type FaceColorMap = Record<'U' | 'D' | 'F' | 'B' | 'R' | 'L', string>;

type ControlRowProps = {
	label: string;
	keys: string;
	move: string;
};

const ControlRow: React.FC<ControlRowProps> = ({ label, keys, move }) => (
	<div className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-2 py-1.5 text-xs">
		<span className="font-semibold text-zinc-300">{label}</span>
		<kbd className="justify-self-start rounded border border-zinc-700 bg-zinc-950/70 px-2 py-0.5 font-mono text-[11px] text-zinc-300 shadow-sm">{keys}</kbd>
		<span className="font-mono text-zinc-500">{move}</span>
	</div>
);

export const VirtualCubeControls: React.FC<{ size: number }> = ({ size }) => (
	<div className="h-full overflow-y-auto custom-scrollbar p-4">
		<div className="mb-3">
			<h2 className="text-sm font-bold text-zinc-100">Keyboard controls</h2>
			<p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Paired keys turn clockwise and counter-clockwise.</p>
		</div>

		<div className="divide-y divide-zinc-800/70">
			<div className="pb-2">
				<div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Faces</div>
				<ControlRow label="Up" keys="J / F" move="U / U′" />
				<ControlRow label="Right" keys="I / K" move="R / R′" />
				<ControlRow label="Left" keys="D / E" move="L / L′" />
				<ControlRow label="Front" keys="H / G" move="F / F′" />
				<ControlRow label="Down" keys="S / L" move="D / D′" />
				<ControlRow label="Back" keys="W / O" move="B / B′" />
			</div>

			{size > 2 && (
				<div className="py-3">
					<div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Wide &amp; slice turns</div>
					{size > 3 && <ControlRow label="Wide" keys="Shift + face" move="2 layers" />}
					{size >= 6 && <ControlRow label="Deep" keys="3, then face" move="3 layers" />}
					<ControlRow label="R wide" keys="U / M" move="Rw / Rw′" />
					<ControlRow label="L wide" keys="V / R" move="Lw / Lw′" />
					<ControlRow label="U wide" keys=", / C" move="Uw / Uw′" />
					<ControlRow label="D wide" keys="/" move="Dw′" />
					<ControlRow label="M slice" keys="5·6 / .·X" move="M / M′" />
					<ControlRow label="E slice" keys="2 / 9" move="E / E′" />
					<ControlRow label="S slice" keys="0 / 1" move="S / S′" />
				</div>
			)}

			<div className="pt-3">
				<div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Cube rotations</div>
				<ControlRow label="Cube" keys="Arrow keys" move="x / y" />
				<ControlRow label="X axis" keys="T·Y / B·N" move="x / x′" />
				<ControlRow label="Z axis" keys="P / Q" move="z / z′" />
			</div>
		</div>
	</div>
);

const SimplePuzzleControls: React.FC<{ name: string; showTips?: boolean }> = ({ name, showTips = false }) => (
	<div className="h-full overflow-y-auto custom-scrollbar p-4">
		<div className="mb-3">
			<h2 className="text-sm font-bold text-zinc-100">{name} controls</h2>
			<p className="mt-1 text-[11px] leading-relaxed text-zinc-500">Paired keys turn clockwise and counter-clockwise.</p>
		</div>
		<div className="divide-y divide-zinc-800/70">
			<div className="pb-3">
				<div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Turns</div>
				<ControlRow label="Up" keys="J / F" move="U / U′" />
				<ControlRow label="Right" keys="I / K" move="R / R′" />
				<ControlRow label="Left" keys="D / E" move="L / L′" />
				<ControlRow label="Back" keys="W / O" move="B / B′" />
			</div>
			{showTips && (
				<div className="py-3">
					<div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Tips</div>
					<ControlRow label="Tip" keys="Shift + turn" move="u · r · l · b" />
					<ControlRow label="Rotate" keys="Arrow keys" move="120°" />
				</div>
			)}
			<div className="pt-3 text-[11px] leading-relaxed text-zinc-500">
				On touch screens, drag a sticker to turn its layer. Drag from the background to inspect the puzzle.
			</div>
		</div>
	</div>
);

export const VirtualPyraminxControls: React.FC = () => <SimplePuzzleControls name="Pyraminx" showTips />;
export const VirtualSkewbControls: React.FC = () => <SimplePuzzleControls name="Skewb" />;

export const VirtualCube: React.FC<Props> = ({ scramble, size, isActive: _isActive, onMove, onSolve, config, timerState, isModalOpen }) => {
	// Logical state (NxNState)
	const [logicState, setLogicState] = useState<NxNState>(() => NxNPuzzle.getInitialState(size));
	const [cubies, setCubies] = useState<CubieState[]>([]);
	const pendingWideDepthRef = useRef<{ depth: number; expiresAt: number } | null>(null);
    
	const initialCameraPos = useMemo<THREE.Vector3>(() => loadInitialCamera(), []);

	// Colors from config
	const colors = useMemo<FaceColorMap>(() => ({
		U: getFaceColor('U', config), D: getFaceColor('D', config),
		F: getFaceColor('F', config), B: getFaceColor('B', config),
		R: getFaceColor('R', config), L: getFaceColor('L', config)
	}), [config]);

	// Apply a rotation to a set of cubies (mutates them)
	const rotateCubies = (currentCubies: CubieState[], move: string): void => {
		if (!move) return;
		const base = move.replace(/['2]$/, '');
		const isPrime = move.includes("'");
		const isDouble = move.includes("2");
        
		// Calculate Angle
		let angle = -Math.PI / 2;
		if (isPrime) angle = Math.PI / 2;
		if (isDouble) angle *= 2;

		const axis = new THREE.Vector3();
		let filter: (p: THREE.Vector3) => boolean = (): boolean => false;
		const outerCoordinate = ((size - 1) / 2) * SPACING;
		const faceMove = base.match(/^(\d*)([URFDLB])(w?)$/);

		if (faceMove) {
			const [, depthPrefix, face, wideSuffix] = faceMove;
			const depth = depthPrefix ? Number(depthPrefix) : (wideSuffix ? 2 : 1);
			const innerCoordinate = outerCoordinate - (depth - 1) * SPACING;
			if (depth < 1 || depth > size) return;

			switch (face) {
			case 'R':
				axis.set(1, 0, 0);
				filter = (p: THREE.Vector3): boolean => p.x >= innerCoordinate - POSITION_EPSILON;
				break;
			case 'L':
				axis.set(1, 0, 0);
				filter = (p: THREE.Vector3): boolean => p.x <= -innerCoordinate + POSITION_EPSILON;
				angle = -angle;
				break;
			case 'U':
				axis.set(0, 1, 0);
				filter = (p: THREE.Vector3): boolean => p.y >= innerCoordinate - POSITION_EPSILON;
				break;
			case 'D':
				axis.set(0, 1, 0);
				filter = (p: THREE.Vector3): boolean => p.y <= -innerCoordinate + POSITION_EPSILON;
				angle = -angle;
				break;
			case 'F':
				axis.set(0, 0, 1);
				filter = (p: THREE.Vector3): boolean => p.z >= innerCoordinate - POSITION_EPSILON;
				break;
			case 'B':
				axis.set(0, 0, 1);
				filter = (p: THREE.Vector3): boolean => p.z <= -innerCoordinate + POSITION_EPSILON;
				angle = -angle;
				break;
			}
		} else {

			switch(base) {
			// --- Slices ---
			case 'M': // Follows L
				axis.set(1, 0, 0);
				filter = (p: THREE.Vector3): boolean => Math.abs(p.x - (-outerCoordinate + Math.floor(size / 2) * SPACING)) < POSITION_EPSILON;
				angle = -angle; // L uses negative logic relative to X axis
				break;
			case 'E': // Follows D
				axis.set(0, 1, 0);
				filter = (p: THREE.Vector3): boolean => Math.abs(p.y - (-outerCoordinate + Math.floor(size / 2) * SPACING)) < POSITION_EPSILON;
				angle = -angle;
				break;
			case 'S': // Follows F
				axis.set(0, 0, 1);
				filter = (p: THREE.Vector3): boolean => Math.abs(p.z - (outerCoordinate - Math.floor(size / 2) * SPACING)) < POSITION_EPSILON;
				break;

			// --- Rotations ---
			case 'x': // Rotate whole cube on R axis direction
				axis.set(1, 0, 0);
				filter = (): boolean => true;
				break;
			case 'y': // Rotate whole cube on U axis direction
				axis.set(0, 1, 0);
				filter = (): boolean => true;
				break;
			case 'z': // Rotate whole cube on F axis direction
				axis.set(0, 0, 1);
				filter = (): boolean => true;
				break;
            
			default: return;
			}
		}

		const qRot = new THREE.Quaternion().setFromAxisAngle(axis, angle);

		for(let i=0; i<currentCubies.length; i++) {
			const c = currentCubies[i];
			if (filter(c.pos)) {
				c.pos.applyQuaternion(qRot);
				// Snap to avoid floating point drift
				const snap = (value: number): number => (Math.round(value / SPACING + (size - 1) / 2) - (size - 1) / 2) * SPACING;
				c.pos.x = snap(c.pos.x);
				c.pos.y = snap(c.pos.y);
				c.pos.z = snap(c.pos.z);
				c.q.premultiply(qRot);
			}
		}
	};

	// Init / Reset
	useEffect((): void => {
		const newCubies: CubieState[] = [];
		let id = 0;
		const offset = (size - 1) / 2;
		for(let x=0; x<size; x++)
			for(let y=0; y<size; y++)
				for(let z=0; z<size; z++) {
					if (x > 0 && x < size - 1 && y > 0 && y < size - 1 && z > 0 && z < size - 1) continue;
					const pos = new THREE.Vector3((x - offset) * SPACING, (y - offset) * SPACING, (z - offset) * SPACING);
					newCubies.push({
						id: id++,
						pos: pos,
						initialPos: pos.clone(),
						q: new THREE.Quaternion()
					});
				}
            
        
        
		const state = NxNPuzzle.getInitialState(size);
        
		// Apply Scramble
		scramble.forEach((m): void => NxNPuzzle.applyMove(state, m, size));
		setLogicState(state);

		// Apply Scramble to Visuals
		const tempCubies = newCubies.map((c): CubieState => ({...c, pos: c.pos.clone(), q: c.q.clone()}));
		scramble.forEach((m): void => rotateCubies(tempCubies, m));
		setCubies(tempCubies);
        
	}, [scramble, size]);

	const handleKeyDown = (e: KeyboardEvent): void => {
		if (isModalOpen) return; // Disable input if modal is open
        
		if (timerState !== TimerState.IDLE && timerState !== TimerState.RUNNING && timerState !== TimerState.INSPECTION) return;
		if (e.ctrlKey || e.altKey || e.metaKey) return;

		const key = e.key.toLowerCase();

		if (key === '3' && size >= 6) {
			pendingWideDepthRef.current = { depth: 3, expiresAt: Date.now() + 2000 };
			e.preventDefault();
			return;
		}
        
		// Debug key
		if (e.key === '?') {
			console.log("--- VIRTUAL CUBE DEBUG ---");
			console.log("Solved Check:", NxNPuzzle.isSolved(logicState));
			console.log("Logic State:", JSON.parse(JSON.stringify(logicState)));
			return;
		}

		let move = KEY_MAP[key];
		if (!move) return;
		if (size === 2 && (move.includes('w') || ['M', 'E', 'S'].includes(move.charAt(0)))) return;

		const basicFaceMove = move.match(/^([URFDLB])(['2]?)$/);
		const pendingDepth = pendingWideDepthRef.current;
		pendingWideDepthRef.current = null;
		if (basicFaceMove && pendingDepth && pendingDepth.expiresAt >= Date.now()) {
			move = `${pendingDepth.depth}${basicFaceMove[1]}w${basicFaceMove[2]}`;
		} else if (basicFaceMove && e.shiftKey && size > 3) {
			move = `${basicFaceMove[1]}w${basicFaceMove[2]}`;
		}

		e.preventDefault();
		e.stopPropagation();

		const isRotation = ['x', 'y', 'z'].includes(move.charAt(0).toLowerCase());

		// 1. Trigger Start if needed (only on face turns, not rotations)
		if (!isRotation && !onMove(move)) return;
        

		// 2. Logic Update
		const nextLogic = JSON.parse(JSON.stringify(logicState));
		NxNPuzzle.applyMove(nextLogic, move, size);
		setLogicState(nextLogic);

		// 3. Visual Update
		const newCubies = cubies.map((c): CubieState => ({
			...c,
			pos: c.pos.clone(),
			q: c.q.clone()
		}));
		rotateCubies(newCubies, move);
		setCubies(newCubies);

		// 4. Check Solved
		if (NxNPuzzle.isSolved(nextLogic)) 
			onSolve();
        
	};

	useEffect((): (() => void) => {
		window.addEventListener('keydown', handleKeyDown);
		return (): void => window.removeEventListener('keydown', handleKeyDown);
	}, [cubies, logicState, timerState, isModalOpen, size]);

	const handleCameraChange = (event?: unknown): void => {
		const target = event && typeof event === 'object' && 'target' in event
			? (event as { target?: { object?: THREE.Camera } }).target
			: undefined;
		if (target?.object?.position) {
			const pos = target.object.position;
			storage.setItem('cmostimer_virtual_camera', JSON.stringify(pos.toArray()));
			// TODO: Debounce this save. Saving on every change eats performance.
		}
	};

	return (
		<div className="w-full h-full flex items-center justify-center relative">
			<Canvas camera={{ position: initialCameraPos, fov: 40 }}>
				<ambientLight intensity={1.0} />
				<directionalLight position={[5, 10, 7]} intensity={1.2} />
				<directionalLight position={[-5, -10, -7]} intensity={0.5} />
                
				<OrbitControls 
					enablePan={false} 
					enableZoom={true}
					minDistance={3}
					maxDistance={15}
					onEnd={handleCameraChange}
				/>

				<group scale={3 / size}>
					{cubies.map((c): React.ReactElement => (
						<Cubie 
							key={c.id} 
							position={c.pos} 
							quaternion={c.q} 
							initialPos={c.initialPos}
							colorMap={colors}
							baseColor={config.baseColor}
							outerCoordinate={((size - 1) / 2) * SPACING}
						/>
					))}
				</group>
			</Canvas>
            
		</div>
	);
};

