import { describe, it, expect } from 'vitest';
import { getThemeHex, getThemeTextColorClass, getWidgetSurfaceVars, THEME_PRESETS, THEME_OPTIONS } from '../../utils/theme';
import { AppTheme } from '../../types';

describe('Theme Utils', () => {
	it('maps theme to text class and hex', () => {
		expect(getThemeTextColorClass(AppTheme.BLUE)).toBe('text-blue-400');
		expect(getThemeHex(AppTheme.BLUE)).toBe('#60a5fa');
	});

	it('provides a dedicated light preset with light widget surfaces', () => {
		expect(THEME_PRESETS[AppTheme.LIGHT]).toEqual({ bg: '#f4f4f5', text: '#18181b' });
		expect(getThemeTextColorClass(AppTheme.LIGHT)).toBe('text-blue-700');

		const vars = getWidgetSurfaceVars(THEME_PRESETS[AppTheme.LIGHT].bg);
		expect(vars['--widget-surface']).toBe('rgba(251, 251, 251, 0.9)');
		expect(vars['--widget-border']).toBe('rgba(215, 215, 216, 0.5)');
	});

	it('contains presets for each theme', () => {
		THEME_OPTIONS.forEach(theme => {
			expect(THEME_PRESETS[theme]).toBeDefined();
		});
	});

	it('derives widget surfaces from custom backgrounds', () => {
		const vars = getWidgetSurfaceVars('#336699');

		expect(vars['--widget-surface']).toBe('rgba(40, 80, 119, 0.82)');
		expect(vars['--widget-border']).toBe('rgba(28, 56, 84, 0.72)');
	});

	it('falls back to the default theme background for invalid colors', () => {
		const vars = getWidgetSurfaceVars('not-a-color');

		expect(vars['--widget-surface']).toBe('rgba(19, 19, 21, 0.82)');
	});
});
