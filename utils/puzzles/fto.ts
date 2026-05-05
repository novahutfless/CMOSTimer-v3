import { PuzzleInterface } from './types';

export type FTOState = number[];

const FACE_COUNT = 8;
const STICKERS_PER_FACE = 9;

const getInitialStateFTO = (): FTOState =>
	Array.from({ length: FACE_COUNT * STICKERS_PER_FACE }, (_, index) => Math.floor(index / STICKERS_PER_FACE));

const cycle3 = (state: FTOState, a: number, b: number, c: number): void => {
	const temp = state[a];
	state[a] = state[b];
	state[b] = state[c];
	state[c] = temp;
};

const applyCycles = (state: FTOState, cycles: number[][], times: number): void => {
	for (let i = 0; i < times; i++) cycles.forEach(([a, b, c]) => cycle3(state, a, b, c));
};

const R_CYCLES = [
	[4, 18, 40], [45, 13, 67], [31, 27, 35], [36, 8, 26], [7, 21, 37],
	[29, 32, 34], [3, 20, 41], [6, 25, 38], [30, 28, 33]
];
const RS_CYCLES = [
	[2, 19, 42], [47, 16, 70], [5, 24, 39], [11, 65, 50], [1, 23, 43], [12, 66, 46]
];
const BL_CYCLES = [
	[0, 44, 22], [49, 71, 17], [54, 58, 62], [9, 53, 63], [14, 52, 68],
	[55, 60, 57], [56, 59, 61], [10, 51, 64], [15, 48, 69]
];
const U_CYCLES = [
	[0, 8, 4], [49, 13, 31], [54, 18, 36], [9, 27, 45], [2, 5, 7],
	[47, 11, 29], [1, 6, 3], [12, 30, 48], [10, 28, 46]
];
const US_CYCLES = [
	[20, 56, 38], [15, 51, 33], [21, 57, 39], [41, 14, 50], [19, 55, 37], [16, 52, 43]
];
const D_CYCLES = [
	[63, 71, 67], [17, 53, 35], [22, 58, 40], [62, 44, 26], [65, 68, 70],
	[24, 60, 42], [64, 69, 66], [25, 61, 43], [23, 59, 41]
];
const L_CYCLES = [
	[0, 62, 18], [54, 22, 8], [49, 63, 27], [9, 17, 13], [11, 14, 16],
	[5, 57, 19], [10, 15, 12], [1, 61, 20], [6, 56, 23]
];
const LS_CYCLES = [
	[3, 59, 25], [28, 48, 64], [2, 60, 21], [47, 68, 32], [7, 55, 24], [29, 52, 65]
];
const BR_CYCLES = [
	[4, 26, 58], [36, 40, 44], [45, 35, 71], [31, 67, 53], [34, 70, 50],
	[37, 42, 39], [38, 41, 43], [30, 66, 51], [33, 69, 46]
];
const F_CYCLES = [
	[8, 62, 40], [18, 22, 26], [27, 17, 67], [13, 63, 35], [19, 24, 21],
	[16, 65, 32], [20, 23, 25], [28, 15, 66], [12, 64, 33]
];
const FS_CYCLES = [
	[6, 61, 41], [10, 69, 30], [7, 57, 42], [29, 14, 70], [5, 60, 37], [11, 68, 34]
];
const B_CYCLES = [
	[0, 36, 58], [49, 45, 53], [54, 4, 44], [9, 31, 71], [47, 50, 52],
	[2, 39, 55], [46, 51, 48], [3, 43, 56], [1, 38, 59]
];

const move = (state: FTOState, cycles: number[][], times: number): void => applyCycles(state, cycles, times);

const applyMoveFTO = (state: FTOState, rawMove: string): void => {
	const moveName = rawMove.trim();
	switch (moveName) {
	case 'R': move(state, R_CYCLES, 1); break;
	case "R'": move(state, R_CYCLES, 2); break;
	case 'Rs': case "BLs'": move(state, RS_CYCLES, 1); break;
	case "Rs'": case 'BLs': move(state, RS_CYCLES, 2); break;
	case 'Rw': move(state, R_CYCLES, 1); move(state, RS_CYCLES, 1); break;
	case "Rw'": move(state, R_CYCLES, 2); move(state, RS_CYCLES, 2); break;
	case 'Ro': case "BLo'": move(state, R_CYCLES, 1); move(state, RS_CYCLES, 1); move(state, BL_CYCLES, 2); break;
	case "Ro'": case 'BLo': move(state, R_CYCLES, 2); move(state, RS_CYCLES, 2); move(state, BL_CYCLES, 1); break;

	case 'U': move(state, U_CYCLES, 1); break;
	case "U'": move(state, U_CYCLES, 2); break;
	case 'Us': case "Ds'": case "E'": move(state, US_CYCLES, 1); break;
	case "Us'": case 'Ds': case 'E': move(state, US_CYCLES, 2); break;
	case 'Uw': move(state, U_CYCLES, 1); move(state, US_CYCLES, 1); break;
	case "Uw'": move(state, U_CYCLES, 2); move(state, US_CYCLES, 2); break;
	case 'Uo': case "Do'": move(state, U_CYCLES, 1); move(state, US_CYCLES, 1); move(state, D_CYCLES, 2); break;
	case "Uo'": case 'Do': move(state, U_CYCLES, 2); move(state, US_CYCLES, 2); move(state, D_CYCLES, 1); break;

	case 'L': move(state, L_CYCLES, 1); break;
	case "L'": move(state, L_CYCLES, 2); break;
	case 'Ls': case "BRs'": move(state, LS_CYCLES, 1); break;
	case "Ls'": case 'BRs': move(state, LS_CYCLES, 2); break;
	case 'Lw': move(state, L_CYCLES, 1); move(state, LS_CYCLES, 1); break;
	case "Lw'": move(state, L_CYCLES, 2); move(state, LS_CYCLES, 2); break;
	case 'Lo': case "BRo'": move(state, L_CYCLES, 1); move(state, LS_CYCLES, 1); move(state, BR_CYCLES, 2); break;
	case "Lo'": case 'BRo': move(state, L_CYCLES, 2); move(state, LS_CYCLES, 2); move(state, BR_CYCLES, 1); break;

	case 'F': move(state, F_CYCLES, 1); break;
	case "F'": move(state, F_CYCLES, 2); break;
	case 'Fs': case "Bs'": case 'S': move(state, FS_CYCLES, 1); break;
	case "Fs'": case 'Bs': case "S'": move(state, FS_CYCLES, 2); break;
	case 'Fw': move(state, F_CYCLES, 1); move(state, FS_CYCLES, 1); break;
	case "Fw'": move(state, F_CYCLES, 2); move(state, FS_CYCLES, 2); break;
	case 'Fo': case "Bo'": move(state, F_CYCLES, 1); move(state, FS_CYCLES, 1); move(state, B_CYCLES, 2); break;
	case "Fo'": case 'Bo': move(state, F_CYCLES, 2); move(state, FS_CYCLES, 2); move(state, B_CYCLES, 1); break;

	case 'D': move(state, D_CYCLES, 1); break;
	case "D'": move(state, D_CYCLES, 2); break;
	case 'Dw': move(state, D_CYCLES, 1); move(state, US_CYCLES, 2); break;
	case "Dw'": move(state, D_CYCLES, 2); move(state, US_CYCLES, 1); break;
	case 'B': move(state, B_CYCLES, 1); break;
	case "B'": move(state, B_CYCLES, 2); break;
	case 'Bw': move(state, B_CYCLES, 1); move(state, FS_CYCLES, 2); break;
	case "Bw'": move(state, B_CYCLES, 2); move(state, FS_CYCLES, 1); break;
	case 'BR': move(state, BR_CYCLES, 1); break;
	case "BR'": move(state, BR_CYCLES, 2); break;
	case 'BRw': move(state, BR_CYCLES, 1); move(state, LS_CYCLES, 2); break;
	case "BRw'": move(state, BR_CYCLES, 2); move(state, LS_CYCLES, 1); break;
	case 'BL': move(state, BL_CYCLES, 1); break;
	case "BL'": move(state, BL_CYCLES, 2); break;
	case 'BLw': move(state, BL_CYCLES, 1); move(state, RS_CYCLES, 2); break;
	case "BLw'": move(state, BL_CYCLES, 2); move(state, RS_CYCLES, 1); break;
	}
};

export const FTOPuzzle: PuzzleInterface<FTOState> = {
	getInitialState: () => getInitialStateFTO(),
	applyMove: (state, moveName) => applyMoveFTO(state, moveName)
};
