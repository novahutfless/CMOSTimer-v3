declare module 'min2phase/src/min2phase.js' {
	export interface Min2PhaseCube {
		cp: number[];
		co: number[];
		ep: number[];
		eo: number[];
	}

	export function initialize(): void;
	export function solve(cube: Min2PhaseCube): string;
}
