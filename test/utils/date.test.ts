import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	isSameYear,
	isSameMonth,
	isSameDay,
	getISOWeek,
	getHeatmapData,
	getDayName,
	getStartOfDay,
	getStartOfWeek,
	getStartOfMonth,
	getStartOfYear,
	formatDate
} from '../../utils/date';
import { DateFormat, Penalty, Solve } from '../../types';

const createSolve = (timestamp: number, id = 's1'): Solve => ({
	id,
	timestamp,
	time: 1000,
	inspectionTime: 0,
	scramble: [],
	scramblerId: [],
	penalty: Penalty.NONE
});

describe('Date Utils', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('compares year/month/day correctly', () => {
		const d1 = new Date('2025-01-10T10:00:00');
		const d2 = new Date('2025-01-20T10:00:00');
		const d3 = new Date('2025-02-10T10:00:00');
		expect(isSameYear(d1, d2)).toBe(true);
		expect(isSameMonth(d1, d2)).toBe(true);
		expect(isSameDay(d1, d2)).toBe(false);
		expect(isSameMonth(d1, d3)).toBe(false);
	});

	it('calculates ISO week for a known date', () => {
		const d = new Date('2025-01-15T12:00:00'); // 2025-01-15 is ISO week 3
		expect(getISOWeek(d)).toBe(3);
	});

	it('builds heatmap data with filters', () => {
		const now = new Date('2025-01-15T12:00:00').getTime();
		const yesterday = new Date('2025-01-14T12:00:00').getTime();
		const lastYear = new Date('2024-01-15T12:00:00').getTime();
		const solves = [createSolve(now, 's1'), createSolve(yesterday, 's2'), createSolve(lastYear, 's3')];

		const all = getHeatmapData(solves, 'all');
		expect(all.max).toBeGreaterThan(0);

		const year = getHeatmapData(solves, 'year');
		expect(year.max).toBeGreaterThan(0);
		const month = getHeatmapData(solves, 'month');
		expect(month.max).toBeGreaterThan(0);
	});

	it('returns localized day labels', () => {
		expect(getDayName(0, 'en-US')).toBe('Mon');
		expect(getDayName(0, 'de')).toBe('Mo');
	});

	it('calculates start-of ranges', () => {
		const now = new Date('2025-01-15T12:34:56').getTime();
		expect(new Date(getStartOfDay(now)).getHours()).toBe(0);
		expect(new Date(getStartOfWeek(now)).getDay()).toBe(1);
		expect(new Date(getStartOfMonth(now)).getDate()).toBe(1);
		expect(new Date(getStartOfYear(now)).getMonth()).toBe(0);
	});

	it('formats dates using selected format', () => {
		const d = new Date('2025-03-05T10:00:00');
		expect(formatDate(d, DateFormat.ISO)).toBe('2025-03-05');
		expect(formatDate(d, DateFormat.US)).toBe('03/05/2025');
		expect(formatDate(d, DateFormat.EU)).toBe('05/03/2025');
	});
});
