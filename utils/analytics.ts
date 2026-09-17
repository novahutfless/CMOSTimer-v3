import { Penalty, Session, Solve, SolveMap } from '../types';
import { calculateAverage, getSolveTime } from './math';

export interface AnalyticsFilter {
	sessionId: string;
	event: string;
	tag: string;
	penalty: string;
	from: string;
	to: string;
}

// Keep relays distinct from their individual constituent events.
export const analyticsEvent = (solve: Pick<Solve, 'scramblerId'>): string => JSON.stringify(solve.scramblerId);

export const filterAnalyticsSolves = (solvesMap: SolveMap, sessions: Session[], filter: AnalyticsFilter): Solve[] => {
	const sessionIds = filter.sessionId ? new Set(sessions.find(s => s.id === filter.sessionId)?.solveIds ?? []) : null;
	const start = filter.from ? new Date(`${filter.from}T00:00:00`).getTime() : -Infinity;
	const endDate = filter.to ? new Date(`${filter.to}T00:00:00`) : null;
	// Calendar arithmetic also handles daylight-saving transitions.
	if (endDate) endDate.setDate(endDate.getDate() + 1);
	const end = endDate?.getTime() ?? Infinity;
	return Object.values(solvesMap).filter(s =>
		(!sessionIds || sessionIds.has(s.id)) &&
		(!filter.event || analyticsEvent(s) === filter.event) &&
		(!filter.tag || s.tags?.includes(filter.tag)) &&
		(!filter.penalty || s.penalty === filter.penalty) &&
		s.timestamp >= start && s.timestamp < end
	).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
};

export interface AnalyticsSummary {
	count: number; valid: number; dnf: number; dns: number;
	mean: number | null; median: number | null; p10: number | null; p90: number | null;
	deviation: number | null; consistency: number | null;
	averages: { size: number; value: number | null }[];
}

export const summarizeAnalytics = (solves: Solve[]): AnalyticsSummary => {
	const chronological = [...solves].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
	const times = chronological.map(getSolveTime).filter((v): v is number => v !== null && Number.isFinite(v) && v >= 0);
	const sorted = [...times].sort((a, b) => a - b);
	const percentile = (p: number): number | null => {
		if (!sorted.length) return null;
		const index = (sorted.length - 1) * p;
		const lower = Math.floor(index);
		return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
	};
	const mean = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
	const variance = mean === null ? null : times.reduce((sum, v) => sum + (v - mean) ** 2, 0) / times.length;
	return {
		count: solves.length, valid: times.length,
		dnf: solves.filter(s => s.penalty === Penalty.DNF).length,
		dns: solves.filter(s => s.penalty === Penalty.DNS).length,
		mean, median: percentile(0.5), p10: percentile(0.1), p90: percentile(0.9),
		deviation: variance === null ? null : Math.sqrt(variance),
		consistency: mean && variance !== null ? Math.sqrt(variance) / mean * 100 : null,
		averages: [5, 12, 50, 100, 1000].map(size => ({ size, value: calculateAverage(chronological, size) }))
	};
};

export const compareAnalyticsWeeks = (solves: Solve[], now: number): { recent: AnalyticsSummary; previous: AnalyticsSummary } => {
	const today = new Date(now);
	today.setHours(0, 0, 0, 0);
	const end = new Date(today); end.setDate(end.getDate() + 1);
	const middle = new Date(end); middle.setDate(middle.getDate() - 7);
	const start = new Date(middle); start.setDate(start.getDate() - 7);
	return {
		recent: summarizeAnalytics(solves.filter(s => s.timestamp >= +middle && s.timestamp < +end)),
		previous: summarizeAnalytics(solves.filter(s => s.timestamp >= +start && s.timestamp < +middle))
	};
};
