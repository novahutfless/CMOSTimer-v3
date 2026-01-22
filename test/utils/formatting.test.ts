import { describe, it, expect } from 'vitest';
import { formatTime, formatDuration } from '../../utils/formatting';
import { Penalty, TimePrecision } from '../../types';
import { DNF_VALUE } from '../../utils/constants';

describe('Formatting Utils', () => {
	describe('formatTime', () => {
		it('formats sub-minute times correctly', () => {
			// 12.34 seconds
			expect(formatTime(12340)).toBe('12.34');
		});

		it('formats single digit seconds with leading zero if minutes exist', () => {
			// 1 minute, 5 seconds
			expect(formatTime(65000)).toBe('1:05.00');
		});

		it('formats sub-10s times without leading zero', () => {
			expect(formatTime(9120)).toBe('9.12');
		});

		it('applies +2 penalty to visual output', () => {
			// 10s + 2s = 12s
			expect(formatTime(10000, Penalty.PLUS_TWO)).toBe('12.00+');
		});

		it('formats DNF', () => {
			expect(formatTime(10000, Penalty.DNF)).toBe('DNF');
			expect(formatTime(DNF_VALUE)).toBe('DNF');
		});

		it('respects millisecond precision', () => {
			expect(formatTime(12345, Penalty.NONE, TimePrecision.MILLI)).toBe('12.345');
		});

		it('respects decisecond precision', () => {
			expect(formatTime(12345, Penalty.NONE, TimePrecision.DECI)).toBe('12.3');
		});

		it('respects seconds precision (integers)', () => {
			expect(formatTime(12345, Penalty.NONE, TimePrecision.SECONDS)).toBe('12');
		});
	});

	describe('formatDuration', () => {
		it('formats seconds', () => {
			expect(formatDuration(45000)).toBe('45s');
		});
		it('formats minutes', () => {
			expect(formatDuration(125000)).toBe('2m 5s');
		});
		it('formats hours', () => {
			expect(formatDuration(3725000)).toBe('1h 2m');
		});
		it('formats days', () => {
			expect(formatDuration(90061000)).toBe('1d 1h');
		});
	});
});
