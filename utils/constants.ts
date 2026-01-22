export const DNF_VALUE = -1;

export const APP_VERSION = '3.0.0';
const meta = import.meta as ImportMeta & { env?: { VITE_COMMIT_HASH?: string } };
export const COMMIT_HASH = meta.env?.VITE_COMMIT_HASH;

export const TAG_PRESETS = {
	CROSS: ['White', 'Yellow', 'Red', 'Green', 'Orange', 'Blue'].map(a=>a + " Cross"),
	SKIPS: ['OLL Skip', 'PLL Skip'],
	PLL: [
		'Aa', 'Ab', 'E', 'F', 'Ga', 'Gb', 'Gc', 'Gd', 'H', 'Ja', 'Jb', 
		'Na', 'Nb', 'Ra', 'Rb', 'T', 'Ua', 'Ub', 'V', 'Y', 'Z'
	].map(a=>a + "-Perm")
};
