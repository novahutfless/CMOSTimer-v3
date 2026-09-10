export const parseTime = (str: string): number | null => {
	const match = /^(?:(\d+):)?(\d+(?:\.\d+)?|\.\d+)$/.exec(str.trim());
	if (!match) return null;

	const minutes = match[1] === undefined ? 0 : Number.parseInt(match[1], 10);
	const seconds = Number(match[2]);
	if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || (match[1] !== undefined && seconds >= 60)) return null;

	return Math.round((minutes * 60 + seconds) * 1000);
};
