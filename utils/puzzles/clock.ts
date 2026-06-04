import { PuzzleInterface } from './types';

export type ClockState = { dials: number[], pins: boolean[] };

// Dials: 0-8 Front, 9-17 Back
// Pins: [UL, UR, DR, DL] (true = UP)

const getInitialStateClock = (): ClockState => ({
	dials: Array(18).fill(0), 
	pins: [false, false, false, false] 
});

const applyMoveClock = (state: ClockState, move: string): void => {
	if (move === 'y2') {
		const front = state.dials.slice(0, 9);
		const back = state.dials.slice(9, 18);
		state.dials = [...back, ...front];
        
		const [ul, ur, dr, dl] = state.pins;
		state.pins = [ur, ul, dl, dr];
		return;
	}

	if (['UR', 'DR', 'DL', 'UL'].includes(move)) {
		const idx = ['UL', 'UR', 'DR', 'DL'].indexOf(move);
		if (idx !== -1) state.pins[idx] = true;
		return;
	}

	const match = move.match(/([A-Z]+)(\d+)([+-])/);
	if (match) {
		const type = match[1];
		const amount = parseInt(match[2]);
		const dir = match[3] === '+' ? 1 : -1;
		const delta = amount * dir;

		const pins = [false, false, false, false]; // UL, UR, DR, DL
		if (type === 'ALL') {
			pins.fill(true); 
		} else {
			if (type.includes('UR')) pins[1] = true;
			if (type.includes('DR')) pins[2] = true;
			if (type.includes('DL')) pins[3] = true;
			if (type.includes('UL')) pins[0] = true;
            
			if (type === 'U') {
				pins[0] = true; pins[1] = true; 
			}
			if (type === 'D') {
				pins[3] = true; pins[2] = true; 
			}
			if (type === 'L') {
				pins[0] = true; pins[3] = true; 
			}
			if (type === 'R') {
				pins[1] = true; pins[2] = true; 
			}
		}
        
		state.pins = [...pins];

		const isAffected = (i: number, activePins: boolean[]): boolean => {
			if (i === 0) return activePins[0]; // UL
			if (i === 2) return activePins[1]; // UR
			if (i === 8) return activePins[2]; // DR
			if (i === 6) return activePins[3]; // DL
			if (i === 1) return activePins[0] || activePins[1]; // U
			if (i === 5) return activePins[1] || activePins[2]; // R
			if (i === 7) return activePins[3] || activePins[2]; // D
			if (i === 3) return activePins[0] || activePins[3]; // L
			if (i === 4) return activePins.some(p => p); // Center
			return false;
		};

		const isBackAffected = (i: number, activePins: boolean[]): boolean => {
			if (i === 0) return !activePins[0]; // UL
			if (i === 2) return !activePins[1]; // UR
			if (i === 8) return !activePins[2]; // DR
			if (i === 6) return !activePins[3]; // DL
			if (i === 1) return false;
			if (i === 5) return false;
			if (i === 7) return false;
			if (i === 3) return false;
			if (i === 4) return false;
			return false;
		};

		// Front
		for (let i = 0; i < 9; i++) 
			if (isAffected(i, pins)) 
				state.dials[i] = (state.dials[i] + delta + 120) % 12;

		// Back
		const backPins = [!pins[1], !pins[0], !pins[3], !pins[2]];
		for (let i = 0; i < 9; i++) 
			if (isBackAffected(i, backPins)) 
				state.dials[i + 9] = (state.dials[i + 9] - delta + 120) % 12;

		if (move == "ALL") //so that after ALL move, we can set the pins at the scramble end
			pins.fill(false);
	}
};

export const ClockPuzzle: PuzzleInterface<ClockState> = {
	getInitialState: () => getInitialStateClock(),
	applyMove: (state, move) => applyMoveClock(state, move)
};