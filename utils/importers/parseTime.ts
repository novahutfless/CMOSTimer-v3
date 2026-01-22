export const parseTime = (str: string): number => {
	const parts = str.split(':');
	let seconds = 0;
	if (parts.length === 2) {
		seconds += parseInt(parts[0]) * 60;
		seconds += parseFloat(parts[1]);
	} else {
		seconds += parseFloat(parts[0]);
	}
	return Math.round(seconds * 1000);
};
