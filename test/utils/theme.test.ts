import { describe, it, expect } from 'vitest';
import { getThemeHex, getThemeTextColorClass, THEME_PRESETS, THEME_OPTIONS } from '../../utils/theme';
import { AppTheme } from '../../types';

describe('Theme Utils', () => {
	it('maps theme to text class and hex', () => {
		expect(getThemeTextColorClass(AppTheme.BLUE)).toBe('text-blue-400');
		expect(getThemeHex(AppTheme.BLUE)).toBe('#60a5fa');
	});

	it('contains presets for each theme', () => {
		THEME_OPTIONS.forEach(theme => {
			expect(THEME_PRESETS[theme]).toBeDefined();
		});
	});
});
