export const createScrambleSeed = (): number => {
	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		return crypto.getRandomValues(new Uint32Array(1))[0];
	}
	return Math.floor(Math.random() * 0x1_0000_0000) >>> 0;
};

export const deriveScrambleSeed = (seed: number, index: number): number => {
	let value = (seed + Math.imul(index + 1, 0x9e3779b9)) >>> 0;
	value ^= value >>> 16;
	value = Math.imul(value, 0x21f0aaad);
	value ^= value >>> 15;
	value = Math.imul(value, 0x735a2d97);
	return (value ^ value >>> 15) >>> 0;
};

export const createSeededRandom = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let value = state;
		value = Math.imul(value ^ value >>> 15, value | 1);
		value ^= value + Math.imul(value ^ value >>> 7, value | 61);
		return ((value ^ value >>> 14) >>> 0) / 0x1_0000_0000;
	};
};

/** Built-in generators are synchronous, so replacing Math.random is scoped. */
export const withSeededRandom = <T>(seed: number, generate: () => T): T => {
	const originalRandom = Math.random;
	Math.random = createSeededRandom(seed);
	try {
		return generate();
	} finally {
		Math.random = originalRandom;
	}
};
