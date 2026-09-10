import { describe, expect, it } from 'vitest';
import { parseTime } from '../../utils/importers/parseTime';

describe('parseTime', () => {
	it('parses seconds and minute-separated times', () => {
		expect(parseTime('12.345')).toBe(12345);
		expect(parseTime('1:05.25')).toBe(65250);
	});

	it('rejects malformed times instead of returning NaN', () => {
		expect(parseTime('')).toBeNull();
		expect(parseTime('1:60')).toBeNull();
		expect(parseTime('not a time')).toBeNull();
	});
});
