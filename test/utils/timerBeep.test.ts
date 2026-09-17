import { describe, expect, it } from 'vitest';
import { getMultiBlindReminderMs } from '../../utils/timerBeep';

describe('multi-blind reminder', () => {
	it('uses ten minutes per cube with a sixty-minute cap', () => {
		expect(getMultiBlindReminderMs(2)).toBe(20 * 60_000);
		expect(getMultiBlindReminderMs(5)).toBe(50 * 60_000);
		expect(getMultiBlindReminderMs(7)).toBe(60 * 60_000);
	});
});
