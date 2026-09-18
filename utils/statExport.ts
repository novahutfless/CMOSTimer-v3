import { Language, Penalty, Solve, StatConfig, StatType, TimePrecision } from '../types';
import { getGeneratedByHeader } from './exportText';
import { formatTime, getStatLabel } from './formatting';
import { DNF_VALUE } from './constants';
import { getBestStatValue, getCurrentStatValue } from './math';

const normalize = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const findStatConfig = (stats: StatConfig[], selector: string, language: Language): StatConfig | undefined => {
	const needle = normalize(selector);
	return stats.find(stat => {
		const short = stat.type === StatType.SINGLE ? 'single' : `${stat.type === StatType.MEAN ? 'mo' : 'ao'}${stat.size}`;
		return [stat.id, short, getStatLabel(stat, language)].some(value => normalize(value) === needle);
	});
};

export const buildStatExport = (stat: StatConfig, solves: Solve[], best: boolean, precision: TimePrecision, language: Language, includeScrambles = true): string => {
	if (stat.type === StatType.SUCCESS_RATE || stat.size === 0) throw new Error('That statistic cannot be exported.');
	const current = getCurrentStatValue(stat, solves);
	const bestResult = getBestStatValue(stat, solves);
	const window = best ? bestResult.bestWindow : solves.length >= stat.size ? solves.slice(-stat.size) : null;
	const result = best ? bestResult.best : current;
	if (!window || result === null) throw new Error(`Not enough solves for ${getStatLabel(stat, language)}.`);
	const isFmc = [StatType.FMC_SINGLE, StatType.FMC_MEAN, StatType.FMC_AVERAGE].includes(stat.type);
	const formatted = result === DNF_VALUE ? 'DNF' : isFmc ? `${result} moves` : formatTime(result, Penalty.NONE, precision);
	const rows = window.map((solve, index) => {
		const time = isFmc ? `${solve.fmc?.moveCount ?? '-'} moves` : formatTime(solve.time, solve.penalty, precision);
		return includeScrambles ? `${index + 1}. ${time}   ${solve.scramble.map(part => part.join(' ')).join(' | ')}` : `${index + 1}. ${time}`;
	}).join('\n');
	return `${getGeneratedByHeader()}\n${getStatLabel(stat, language)}: ${formatted}\n${'-'.repeat(16)}\n${rows}`;
};
