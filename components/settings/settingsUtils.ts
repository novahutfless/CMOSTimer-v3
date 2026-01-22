import { Language } from '../../types';

export const getLang = (settings: { language?: Language }): Language =>
	settings.language || Language.EN;

export const removeIndex = <T,>(items: T[], index: number): T[] => {
	const next = [...items];
	next.splice(index, 1);
	return next;
};

export const replaceIndex = <T,>(items: T[], index: number, value: T): T[] => {
	const next = [...items];
	next[index] = value;
	return next;
};

export const moveIndex = <T,>(items: T[], index: number, direction: -1 | 1): T[] => {
	const target = index + direction;
	if (target < 0 || target >= items.length) return items;
	const next = [...items];
	const temp = next[index];
	next[index] = next[target];
	next[target] = temp;
	return next;
};
