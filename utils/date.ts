import { Solve, DateFormat, Language } from '../types';

export const isSameYear = (d1: Date, d2: Date): boolean =>
	d1.getFullYear() === d2.getFullYear();
export const isSameMonth = (d1: Date, d2: Date): boolean =>
	isSameYear(d1, d2) && d1.getMonth() === d2.getMonth();
export const isSameDay = (d1: Date, d2: Date): boolean =>
	isSameMonth(d1, d2) && d1.getDate() === d2.getDate();

export const getISOWeek = (d: Date): number => {
	const date = new Date(d.getTime());
	date.setHours(0, 0, 0, 0);
	// Thursday in current week decides the year.
	date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
	const week1 = new Date(date.getFullYear(), 0, 4);
	return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export const getHeatmapData = (solves: Solve[], filter: 'all' | 'year' | 'month'): { grid: number[][], max: number } => {
	const now = new Date();
	const grid = Array(7).fill(0).map(() => Array(24).fill(0));
	solves.forEach(s => {
		const d = new Date(s.timestamp);
		if (filter === 'year' && !isSameYear(d, now)) return;
		if (filter === 'month' && !isSameMonth(d, now)) return;
		let day = d.getDay() - 1;
		if (day < 0) day = 6; 
		const hour = d.getHours();
		grid[day][hour]++;
	});
	let max = 0;
	grid.forEach(row => row.forEach(val => max = Math.max(max, val)));
	return { grid, max };
};

export const getLocale = (lang: Language = Language.EN): string => {
	switch (lang) {
	case Language.DE:
		return 'de-DE';
	case Language.EO:
		return 'eo';
	case Language.EN:
	default:
		return 'en-US';
	}
};

export const getDayName = (idx: number, lang: Language = Language.EN): string => {
	const d = new Date();
	const currentDay = d.getDay();
	const distance = (1 + 7 - currentDay) % 7; 
	d.setDate(d.getDate() + distance + idx); 
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const daysDe = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const daysEo = ['Lu', 'Ma', 'Me', 'Ja', 'Ve', 'Sa', 'Di'];
	if (lang === Language.DE) return daysDe[idx];
	if (lang === Language.EO) return daysEo[idx];
	return days[idx];
};

// Goal Helpers
export const getStartOfDay = (now: number): number => {
	const d = new Date(now);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

export const getStartOfWeek = (now: number): number => {
	const d = new Date(now);
	const day = d.getDay();
	const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
	d.setDate(diff);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

export const getStartOfMonth = (now: number): number => {
	const d = new Date(now);
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

export const getStartOfYear = (now: number): number => {
	const d = new Date(now);
	d.setMonth(0, 1);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

export const formatDate = (dateInput: number | Date, format: DateFormat = DateFormat.ISO): string => {
	const d = new Date(dateInput);
	if (isNaN(d.getTime())) return '-';
	const year = d.getFullYear();
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	const day = d.getDate().toString().padStart(2, '0');

	switch(format) {
	case DateFormat.US:
		return `${month}/${day}/${year}`;
	case DateFormat.EU:
		return `${day}/${month}/${year}`;
	case DateFormat.ISO:
	default:
		return `${year}-${month}-${day}`;
	}
};
