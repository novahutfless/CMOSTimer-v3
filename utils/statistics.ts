import { Language, Penalty, Session, Solve, StatConfig, StatType } from '../types';
import { getISOWeek, isSameDay } from './date';
import { getSolveTime, calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage } from './math';
import { DNF_VALUE } from './constants';
import { getStatLabel } from './formatting';

export type HeatmapFilter = 'all' | 'year' | 'month';
export type Interval = 'day' | 'week' | 'month' | 'year';

export interface GlobalStatsSummary {
  count: number;
  time: number;
  avg: number;
}

export interface DailySummaryEntry {
  day: number;
  date: Date;
  sessions: Record<string, number>;
  total: number;
}

export interface ChartPoint {
  idx: number;
  val: number | null;
}

export interface FrequencyPoint {
  time: number;
  count: number;
  label: string;
}

export interface PenaltySlice {
  name: string;
  value: number;
  color: string;
}

export interface PbHistoryEntry {
  solve: Solve;
  val: number;
}

export const buildGlobalStats = (solves: Solve[]): GlobalStatsSummary => {
	const totalCount = solves.length;
	let totalTime = 0;
	let validSolvesCount = 0;

	solves.forEach(s => {
		if (s.penalty !== Penalty.DNF && s.penalty !== Penalty.DNS) {
			const t = getSolveTime(s);
			if (t !== null) {
				totalTime += t;
				validSolvesCount++;
			}
		}
	});

	return {
		count: totalCount,
		time: totalTime,
		avg: validSolvesCount > 0 ? totalTime / validSolvesCount : 0
	};
};

export const buildDailySummaryData = (solves: Solve[], sessions: Session[], viewDate: Date): DailySummaryEntry[] => {
	const data: DailySummaryEntry[] = [];
	const solveToSessionName = new Map<string, string>();
	sessions.forEach(s => {
		s.solveIds.forEach(id => solveToSessionName.set(id, s.name));
	});

	const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
	for (let i = 1; i <= daysInMonth; i++) {
		const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
		const daySessions: Record<string, number> = {};
		let total = 0;

		solves.forEach(s => {
			if (isSameDay(new Date(s.timestamp), d)) {
				const sessName = solveToSessionName.get(s.id) || 'Unknown';
				daySessions[sessName] = (daySessions[sessName] || 0) + 1;
				total++;
			}
		});

		if (total > 0)
			data.push({ day: i, date: d, sessions: daySessions, total });
	}

	return data;
};

export const buildAvailableStats = (statsConfig: StatConfig[], lang: Language): {
    id: string;
    type: StatType;
    size: number;
    name: string;
}[] => {
	const hasSingle = statsConfig.some(s => s.type === StatType.SINGLE);
	const base = hasSingle
		? []
		: [{ id: 'time_single', type: StatType.SINGLE, size: 1, name: 'Single' }];
	return [
		...base,
		...statsConfig.map(s => ({ ...s, name: getStatLabel(s, lang) }))
	];
};

export const buildSolveChartData = (solves: Solve[], stat: StatConfig | null): ChartPoint[] => {
	if (!stat) return [];
	const isPercent = stat.type === StatType.SUCCESS_RATE;

	return solves.map((s, idx) => {
		let val: number | null = null;

		if (stat.type === StatType.SINGLE) {
			val = getSolveTime(s);
			if (val === null && s.penalty === Penalty.DNF) val = null;
		} else {
			if (idx >= stat.size - 1) {
				const window = solves.slice(idx - stat.size + 1, idx + 1);
				if (stat.type === StatType.MEAN)
					val = calculateMean(window, stat.size);
				else if (stat.type === StatType.AVERAGE)
					val = calculateAverage(window, stat.size);
				else if (stat.type === StatType.STD_DEV)
					val = calculateStandardDeviation(window, stat.size);
				else if (stat.type === StatType.SUCCESS_RATE)
					val = calculateSuccessRate(window, stat.size);
				else if (stat.type === StatType.WEIGHTED_AVG)
					val = calculateWeightedAverage(window, stat.size);
			}
		}

		if (val === DNF_VALUE) val = null;

		return {
			idx: idx + 1,
			val: (val !== null) ? (isPercent ? val * 100 : val / 1000) : null
		};
	});
};

export const buildSolveFrequencyData = (solves: Solve[], interval: Interval): FrequencyPoint[] => {
	if (solves.length === 0) return [];

	const buckets: Record<number, number> = {};
	const getBucketTime = (ts: number): number => {
		const d = new Date(ts);
		d.setHours(0, 0, 0, 0);
		if (interval === 'week') {
			const day = d.getDay() || 7;
			if (day !== 1) d.setHours(-24 * (day - 1));
		} else if (interval === 'month') {
			d.setDate(1);
		} else if (interval === 'year') {
			d.setMonth(0, 1);
		}
		return d.getTime();
	};

	const startTime = getBucketTime(solves[0]!.timestamp);
	const endTime = getBucketTime(solves[solves.length - 1]!.timestamp);

	const current = new Date(startTime);
	const end = new Date(endTime);

	while (current <= end) {
		buckets[current.getTime()] = 0;
		if (interval === 'day') current.setDate(current.getDate() + 1);
		else if (interval === 'week') current.setDate(current.getDate() + 7);
		else if (interval === 'month') current.setMonth(current.getMonth() + 1);
		else if (interval === 'year') current.setFullYear(current.getFullYear() + 1);
	}

	solves.forEach(s => {
		const b = getBucketTime(s.timestamp);
		if (buckets[b] !== undefined) buckets[b]++;
	});

	return Object.entries(buckets)
		.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
		.map(([ts, count]) => {
			const t = parseInt(ts);
			const date = new Date(t);
			let label = '';
			if (interval === 'day') label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
			else if (interval === 'week') label = `W${getISOWeek(date)}`;
			else if (interval === 'month') label = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
			else label = date.getFullYear().toString();

			return { time: t, count, label };
		});
};

export const buildPenaltyData = (solves: Solve[], themeColor: string): PenaltySlice[] => {
	const cleanCount = solves.filter(s => s.penalty === Penalty.NONE).length;
	const plusTwoCount = solves.filter(s => s.penalty === Penalty.PLUS_TWO).length;
	const dnfCount = solves.filter(s => s.penalty === Penalty.DNF).length;
	const dnsCount = solves.filter(s => s.penalty === Penalty.DNS).length;
	const otherPlusCount = solves.filter(s => s.penalty.startsWith('PLUS_') && s.penalty !== Penalty.PLUS_TWO).length;

	return [
		{ name: 'Clean', value: cleanCount, color: themeColor },
		{ name: '+2', value: plusTwoCount, color: '#fbbf24' },
		{ name: '+Misc', value: otherPlusCount, color: '#d97706' },
		{ name: 'DNF', value: dnfCount, color: '#ef4444' },
		{ name: 'DNS', value: dnsCount, color: '#9ca3af' }
	].filter(d => d.value > 0);
};

export const buildPbHistory = (solves: Solve[], pbStatType: StatType, pbStatSize: number): PbHistoryEntry[] => {
	const history: PbHistoryEntry[] = [];
	let best = Infinity;

	for (let i = 0; i < solves.length; i++) {
		const s = solves[i]!;
		let val: number | null = null;

		if (pbStatType === StatType.SINGLE) {
			const t = getSolveTime(s);
			if (t !== null && t !== DNF_VALUE)
				val = t;
		} else {
			if (i >= pbStatSize - 1) {
				const subset = solves.slice(0, i + 1);
				if (pbStatType === StatType.MEAN) val = calculateMean(subset, pbStatSize);
				if (pbStatType === StatType.AVERAGE) val = calculateAverage(subset, pbStatSize);
			}
		}

		if (val !== null && val !== DNF_VALUE && val < best) {
			best = val;
			history.push({ solve: s, val });
		}
	}

	return history.reverse();
};

export const buildTotals = (solves: Solve[]): {time: number, inspection: number} => solves.reduce((acc, s) => {
	const t = getSolveTime(s);
	if (t !== null && t !== DNF_VALUE) acc.time += t;
	if (s.inspectionTime > 0) acc.inspection += s.inspectionTime;
	return acc;
}, { time: 0, inspection: 0 });
