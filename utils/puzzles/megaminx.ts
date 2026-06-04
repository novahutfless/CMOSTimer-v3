import { PuzzleInterface } from './types';

export type MegaminxFace =
	| 'U' | 'BL' | 'BR' | 'R' | 'F' | 'L'
	| 'D' | 'DR' | 'DBR' | 'B' | 'DBL' | 'DL';

export type MegaminxState = Record<MegaminxFace, string[]>;

const FACES: MegaminxFace[] = ['U', 'BL', 'BR', 'R', 'F', 'L', 'D', 'DR', 'DBR', 'B', 'DBL', 'DL'];
const CENTER_INDEX = 10;

const getInitialStateMegaminx = (): MegaminxState =>
	Object.fromEntries(FACES.map(face => [face, Array(11).fill(face)])) as MegaminxState;

const stateToImage = (state: MegaminxState): string[][] =>
	FACES.map(face => [...state[face]]);

const imageToState = (image: string[][]): MegaminxState =>
	Object.fromEntries(FACES.map((face, index) => [face, [...image[index]]])) as MegaminxState;

const swapOnSide = (
	image: string[][],
	base: number,
	f1: number, s1: number,
	f2: number, s2: number,
	f3: number, s3: number,
	f4: number, s4: number,
	f5: number, s5: number
): void => {
	for (let i = 0; i < 3; i++) {
		const temp = image[(f1 + base) % 12][(s1 + i) % 10];
		image[(f1 + base) % 12][(s1 + i) % 10] = image[(f2 + base) % 12][(s2 + i) % 10];
		image[(f2 + base) % 12][(s2 + i) % 10] = image[(f3 + base) % 12][(s3 + i) % 10];
		image[(f3 + base) % 12][(s3 + i) % 10] = image[(f4 + base) % 12][(s4 + i) % 10];
		image[(f4 + base) % 12][(s4 + i) % 10] = image[(f5 + base) % 12][(s5 + i) % 10];
		image[(f5 + base) % 12][(s5 + i) % 10] = temp;
	}
};

const swapOnFace = (image: string[][], faceIndex: number, s1: number, s2: number, s3: number, s4: number, s5: number): void => {
	const temp = image[faceIndex][s1];
	image[faceIndex][s1] = image[faceIndex][s2];
	image[faceIndex][s2] = image[faceIndex][s3];
	image[faceIndex][s3] = image[faceIndex][s4];
	image[faceIndex][s4] = image[faceIndex][s5];
	image[faceIndex][s5] = temp;
};

const rotateFace = (image: string[][], faceIndex: number): void => {
	swapOnFace(image, faceIndex, 0, 8, 6, 4, 2);
	swapOnFace(image, faceIndex, 1, 9, 7, 5, 3);
};

const turnFaceOnce = (image: string[][], faceIndex: number): void => {
	const base = faceIndex >= 6 ? 6 : 0;
	switch (faceIndex % 6) {
	case 0:
		swapOnSide(image, base, 1, 6, 5, 4, 4, 2, 3, 0, 2, 8);
		break;
	case 1:
		swapOnSide(image, base, 0, 0, 2, 0, 9, 6, 10, 6, 5, 2);
		break;
	case 2:
		swapOnSide(image, base, 0, 2, 3, 2, 8, 4, 9, 4, 1, 4);
		break;
	case 3:
		swapOnSide(image, base, 0, 4, 4, 4, 7, 2, 8, 2, 2, 6);
		break;
	case 4:
		swapOnSide(image, base, 0, 6, 5, 6, 11, 0, 7, 0, 3, 8);
		break;
	case 5:
		swapOnSide(image, base, 0, 8, 1, 8, 10, 8, 11, 8, 4, 0);
		break;
	}
	rotateFace(image, faceIndex);
};

const turnFace = (image: string[][], faceIndex: number, dir: number): void => {
	const normalized = ((dir % 5) + 5) % 5;
	for (let i = 0; i < normalized; i++) turnFaceOnce(image, faceIndex);
};

const swap = (
	image: string[][],
	f1: number, s1: number,
	f2: number, s2: number,
	f3: number, s3: number,
	f4: number, s4: number,
	f5: number, s5: number
): void => {
	const temp = image[f1][s1];
	image[f1][s1] = image[f2][s2];
	image[f2][s2] = image[f3][s3];
	image[f3][s3] = image[f4][s4];
	image[f4][s4] = image[f5][s5];
	image[f5][s5] = temp;
};

const swapCenters = (image: string[][], f1: number, f2: number, f3: number, f4: number, f5: number): void => {
	swap(image, f1, CENTER_INDEX, f2, CENTER_INDEX, f3, CENTER_INDEX, f4, CENTER_INDEX, f5, CENTER_INDEX);
};

const swapWholeFace = (
	image: string[][],
	f1: number, s1: number,
	f2: number, s2: number,
	f3: number, s3: number,
	f4: number, s4: number,
	f5: number, s5: number
): void => {
	for (let i = 0; i < 10; i++) {
		const temp = image[f1 % 12][(s1 + i) % 10];
		image[f1 % 12][(s1 + i) % 10] = image[f2 % 12][(s2 + i) % 10];
		image[f2 % 12][(s2 + i) % 10] = image[f3 % 12][(s3 + i) % 10];
		image[f3 % 12][(s3 + i) % 10] = image[f4 % 12][(s4 + i) % 10];
		image[f4 % 12][(s4 + i) % 10] = image[f5 % 12][(s5 + i) % 10];
		image[f5 % 12][(s5 + i) % 10] = temp;
	}
	swapCenters(image, f1, f2, f3, f4, f5);
};

const bigTurnOnce = (image: string[][], faceIndex: number): void => {
	if (faceIndex === FACES.indexOf('DBR')) {
		for (let i = 0; i < 7; i++)
			swap(image, 0, (1 + i) % 10, 4, (3 + i) % 10, 11, (1 + i) % 10, 10, (1 + i) % 10, 1, (1 + i) % 10);
		swapCenters(image, 0, 4, 11, 10, 1);
		swapWholeFace(image, 2, 0, 3, 0, 7, 0, 6, 8, 9, 8);
		rotateFace(image, faceIndex);
		return;
	}

	for (let i = 0; i < 7; i++)
		swap(image, 1, (9 + i) % 10, 2, (1 + i) % 10, 3, (3 + i) % 10, 4, (5 + i) % 10, 5, (7 + i) % 10);
	swapCenters(image, 1, 2, 3, 4, 5);
	swapWholeFace(image, 11, 0, 10, 8, 9, 6, 8, 4, 7, 2);
	rotateFace(image, faceIndex);
};

const bigTurn = (image: string[][], faceIndex: number, dir: number): void => {
	const normalized = ((dir % 5) + 5) % 5;
	for (let i = 0; i < normalized; i++) bigTurnOnce(image, faceIndex);
};

const applyMoveMegaminx = (state: MegaminxState, move: string): void => {
	const image = stateToImage(state);

	switch (move) {
	case 'U':
		turnFace(image, 0, 1);
		break;
	case 'U2':
		turnFace(image, 0, 2);
		break;
	case "U2'":
		turnFace(image, 0, 3);
		break;
	case "U'":
		turnFace(image, 0, 4);
		break;
	case 'R+':
		bigTurn(image, 8, 1);
		break;
	case 'R++':
		bigTurn(image, 8, 2);
		break;
	case 'R--':
		bigTurn(image, 8, 3);
		break;
	case 'R-':
		bigTurn(image, 8, 4);
		break;
	case 'D+':
		bigTurn(image, 6, 1);
		break;
	case 'D++':
		bigTurn(image, 6, 2);
		break;
	case 'D--':
		bigTurn(image, 6, 3);
		break;
	case 'D-':
		bigTurn(image, 6, 4);
		break;
	default:
		return;
	}

	const nextState = imageToState(image);
	FACES.forEach(face => {
		state[face] = nextState[face];
	});
};

export const MegaminxPuzzle: PuzzleInterface<MegaminxState> = {
	getInitialState: () => getInitialStateMegaminx(),
	applyMove: (state, move) => applyMoveMegaminx(state, move)
};
