import { describe, expect, it } from 'vitest';
import { findOptionKey, parseOptionValue } from '../../commands/optionValues';
import { DEFAULT_SETTINGS } from '../../store/defaults';

describe('command option values', () => {
	it('matches camel-case options using kebab-case names', () => {
		expect(findOptionKey(DEFAULT_SETTINGS, 'hold-to-start')).toBe('holdToStart');
	});

	it('coerces values based on the existing option type', () => {
		expect(parseOptionValue('off', true)).toBe(false);
		expect(parseOptionValue('250', 0)).toBe(250);
		expect(parseOptionValue('hello world', '')).toBe('hello world');
		expect(parseOptionValue('{"enabled":true}', {})).toEqual({ enabled: true });
	});
});
