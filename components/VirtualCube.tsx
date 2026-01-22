// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ScrambleImageConfig, TimerState } from '../types';
import { NxNPuzzle, NxNState } from '../utils/puzzles/nxn';
import { getFaceColor } from './scramble/utils';

// Fix for R3F types if missing in environment
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      planeGeometry: any;
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      ambientLight: any;
      directionalLight: any;
      [elemName: string]: any;
    }
  }
}

interface Props {
    scramble: string[]; // The scramble sequence
    isActive: boolean; // Is the timer running?
    onMove: () => void; // Call on any move (starts timer)
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
	'/': "Dw'",            // Dw'
    
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
}

// A cubie consists of a plastic body and up to 3 sticker plates
const Cubie: React.FC<CubieProps> = ({ position, quaternion, initialPos, colorMap, baseColor }) => {
    
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
			{initialPos.x > 0.5 && (
				<mesh position={[STICKER_OFFSET, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.R} />
				</mesh>
			)}
			{/* Left (x-) */}
			{initialPos.x < -0.5 && (
				<mesh position={[-STICKER_OFFSET, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.L} />
				</mesh>
			)}
			{/* Top (y+) */}
			{initialPos.y > 0.5 && (
				<mesh position={[0, STICKER_OFFSET, 0]} rotation={[-Math.PI / 2, 0, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.U} />
				</mesh>
			)}
			{/* Bottom (y-) */}
			{initialPos.y < -0.5 && (
				<mesh position={[0, -STICKER_OFFSET, 0]} rotation={[Math.PI / 2, 0, 0]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.D} />
				</mesh>
			)}
			{/* Front (z+) */}
			{initialPos.z > 0.5 && (
				<mesh position={[0, 0, STICKER_OFFSET]}>
					<planeGeometry args={[STICKER_SIZE, STICKER_SIZE]} />
					<meshBasicMaterial color={colorMap.F} />
				</mesh>
			)}
			{/* Back (z-) */}
			{initialPos.z < -0.5 && (
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
		const saved = localStorage.getItem('cubetime_virtual_camera');
		if (saved) return new THREE.Vector3().fromArray(JSON.parse(saved));
	} catch {}
	return new THREE.Vector3(3.5, 2.5, 5); // Default
};

export const VirtualCube: React.FC<Props> = ({ scramble, isActive, onMove, onSolve, config, timerState, isModalOpen }) => {
	// Logical state (NxNState)
	const [logicState, setLogicState] = useState<NxNState>(NxNPuzzle.getInitialState(3));
	const [cubies, setCubies] = useState<CubieState[]>([]);
    
	const initialCameraPos = useMemo(() => loadInitialCamera(), []);

	// Colors from config
	const colors = useMemo(() => ({
		U: getFaceColor('U', config), D: getFaceColor('D', config),
		F: getFaceColor('F', config), B: getFaceColor('B', config),
		R: getFaceColor('R', config), L: getFaceColor('L', config)
	}), [config]);

	// Apply a rotation to a set of cubies (mutates them)
	const rotateCubies = (currentCubies: CubieState[], move: string) => {
		if (!move) return;
		const base = move.replace("'", "").replace("2", "");
		const isPrime = move.includes("'");
		const isDouble = move.includes("2");
        
		// Calculate Angle
		let angle = -Math.PI / 2;
		if (isPrime) angle = Math.PI / 2;
		if (isDouble) angle *= 2;

		const axis = new THREE.Vector3();
		let filter: (p: THREE.Vector3) => boolean = () => false;

		switch(base) {
		// --- Faces & Wide ---
		case 'R': 
			axis.set(1, 0, 0); 
			filter = p => p.x > 0.5; 
			break;
		case 'Rw':
			axis.set(1, 0, 0);
			filter = p => p.x > -0.5; // R and M
			break;
		case 'L': 
			axis.set(1, 0, 0); 
			filter = p => p.x < -0.5; 
			angle = -angle; 
			break;
		case 'Lw':
			axis.set(1, 0, 0);
			filter = p => p.x < 0.5; // L and M
			angle = -angle;
			break;
		case 'U': 
			axis.set(0, 1, 0); 
			filter = p => p.y > 0.5; 
			break;
		case 'Uw':
			axis.set(0, 1, 0);
			filter = p => p.y > -0.5;
			break;
		case 'D': 
			axis.set(0, 1, 0); 
			filter = p => p.y < -0.5; 
			angle = -angle; 
			break;
		case 'Dw':
			axis.set(0, 1, 0);
			filter = p => p.y < 0.5;
			angle = -angle;
			break;
		case 'F': 
			axis.set(0, 0, 1); 
			filter = p => p.z > 0.5; 
			break;
		case 'Fw':
			axis.set(0, 0, 1);
			filter = p => p.z > -0.5;
			break;
		case 'B': 
			axis.set(0, 0, 1); 
			filter = p => p.z < -0.5; 
			angle = -angle; 
			break;
		case 'Bw':
			axis.set(0, 0, 1);
			filter = p => p.z < 0.5;
			angle = -angle;
			break;
            
			// --- Slices ---
		case 'M': // Follows L
			axis.set(1, 0, 0);
			filter = p => Math.abs(p.x) < 0.5;
			angle = -angle; // L uses negative logic relative to X axis
			break;
		case 'E': // Follows D
			axis.set(0, 1, 0);
			filter = p => Math.abs(p.y) < 0.5;
			angle = -angle;
			break;
		case 'S': // Follows F
			axis.set(0, 0, 1);
			filter = p => Math.abs(p.z) < 0.5;
			break;

			// --- Rotations ---
		case 'x': // Rotate whole cube on R axis direction
			axis.set(1, 0, 0);
			filter = () => true;
			break;
		case 'y': // Rotate whole cube on U axis direction
			axis.set(0, 1, 0);
			filter = () => true;
			break;
		case 'z': // Rotate whole cube on F axis direction
			axis.set(0, 0, 1);
			filter = () => true;
			break;
            
		default: return;
		}

		const qRot = new THREE.Quaternion().setFromAxisAngle(axis, angle);

		for(let i=0; i<currentCubies.length; i++) {
			const c = currentCubies[i];
			if (filter(c.pos)) {
				c.pos.applyQuaternion(qRot);
				// Snap to avoid floating point drift
				c.pos.x = Math.round(c.pos.x * 100) / 100;
				c.pos.y = Math.round(c.pos.y * 100) / 100;
				c.pos.z = Math.round(c.pos.z * 100) / 100;
				c.q.premultiply(qRot);
			}
		}
	};

	// Init / Reset
	useEffect(() => {
		const newCubies: CubieState[] = [];
		let id = 0;
		for(let x=-1; x<=1; x++) 
			for(let y=-1; y<=1; y++) 
				for(let z=-1; z<=1; z++) {
					const pos = new THREE.Vector3(x * SPACING, y * SPACING, z * SPACING);
					newCubies.push({
						id: id++,
						pos: pos,
						initialPos: pos.clone(),
						q: new THREE.Quaternion()
					});
				}
            
        
        
		const state = NxNPuzzle.getInitialState(3);
        
		// Apply Scramble
		scramble.forEach(m => NxNPuzzle.applyMove(state, m, 3));
		setLogicState(state);

		// Apply Scramble to Visuals
		const tempCubies = newCubies.map(c => ({...c, pos: c.pos.clone(), q: c.q.clone()}));
		scramble.forEach(m => rotateCubies(tempCubies, m));
		setCubies(tempCubies);
        
	}, [scramble]);

	const handleKeyDown = (e: KeyboardEvent) => {
		if (isModalOpen) return; // Disable input if modal is open
        
		if (timerState !== TimerState.IDLE && timerState !== TimerState.RUNNING && timerState !== TimerState.INSPECTION) return;
		if (e.ctrlKey || e.altKey || e.metaKey) return;

		const key = e.key.toLowerCase();
        
		// Debug key
		if (e.key === '?') {
			console.log("--- VIRTUAL CUBE DEBUG ---");
			console.log("Solved Check:", NxNPuzzle.isSolved(logicState));
			console.log("Logic State:", JSON.parse(JSON.stringify(logicState)));
			return;
		}

		const move = KEY_MAP[key];
		if (!move) return;

		e.preventDefault();
		e.stopPropagation();

		const isRotation = ['x', 'y', 'z'].includes(move.charAt(0).toLowerCase());

		// 1. Trigger Start if needed (only on face turns, not rotations)
		if (!isRotation && timerState !== TimerState.RUNNING) 
			onMove();
        

		// 2. Logic Update
		const nextLogic = JSON.parse(JSON.stringify(logicState));
		NxNPuzzle.applyMove(nextLogic, move, 3);
		setLogicState(nextLogic);

		// 3. Visual Update
		const newCubies = cubies.map(c => ({
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

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [cubies, logicState, timerState, isModalOpen]);

	const handleCameraChange = (e: any) => {
		if (e?.target?.object?.position) 
			localStorage.setItem('cubetime_virtual_camera', JSON.stringify(e.target.object.position.toArray()));
        
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

				<group>
					{cubies.map(c => (
						<Cubie 
							key={c.id} 
							position={c.pos} 
							quaternion={c.q} 
							initialPos={c.initialPos}
							colorMap={colors}
							baseColor={config.baseColor}
						/>
					))}
				</group>
			</Canvas>
            
			<div className="absolute bottom-1 left-1 text-[9px] text-zinc-500 font-mono text-left pointer-events-none leading-tight select-none bg-zinc-950/50 p-1.5 rounded border border-zinc-800/50 backdrop-blur-sm">
				<div className="mb-1 text-zinc-300 font-bold underline">Controls</div>
				<div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
					<div>J/F: U/U'</div> <div>I/K: R/R'</div>
					<div>D/E: L/L'</div> <div>H/G: F/F'</div>
					<div>S/L: D/D'</div> <div>O/W: B/B'</div>
                    
					<div className="col-span-2 h-px bg-zinc-800 my-0.5"></div>
                    
					<div>U/M: Rw/Rw'</div> <div>R/V: Lw'/Lw</div>
					<div>,/C: Uw/Uw'</div> <div>/ : Dw'</div>
					<div>5,6: M</div> <div>./X: M'</div>
					<div>1/0: S'/S</div> <div>2/9: E/E'</div>

					<div className="col-span-2 h-px bg-zinc-800 my-0.5"></div>

					<div>Arr: Rotations</div> <div>T/Y/B/N: x/x'</div>
					<div>? : Debug</div>
				</div>
			</div>
		</div>
	);
};