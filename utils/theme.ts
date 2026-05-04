import { AppTheme } from '../types';

type RgbColor = {
	r: number;
	g: number;
	b: number;
};

const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));

const parseHexColor = (color: string): RgbColor | null => {
	const normalized = color.trim().replace(/^#/, '');
	if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) return null;

	const fullHex = normalized.length === 3
		? normalized.split('').map(char => `${char}${char}`).join('')
		: normalized;

	return {
		r: parseInt(fullHex.slice(0, 2), 16),
		g: parseInt(fullHex.slice(2, 4), 16),
		b: parseInt(fullHex.slice(4, 6), 16)
	};
};

const darkenColor = (color: RgbColor, amount: number): RgbColor => ({
	r: clampChannel(color.r * (1 - amount)),
	g: clampChannel(color.g * (1 - amount)),
	b: clampChannel(color.b * (1 - amount))
});

const toRgba = (color: RgbColor, alpha: number): string =>
	`rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

export const getWidgetSurfaceVars = (backgroundColor: string): Record<string, string> => {
	const parsed = parseHexColor(backgroundColor) || parseHexColor(THEME_PRESETS[AppTheme.ZINC].bg)!;
	const surface = darkenColor(parsed, 0.22);
	const elevated = darkenColor(parsed, 0.34);
	const border = darkenColor(parsed, 0.45);

	return {
		'--widget-surface': toRgba(surface, 0.82),
		'--widget-surface-muted': toRgba(elevated, 0.72),
		'--widget-surface-strong': toRgba(elevated, 0.9),
		'--widget-border': toRgba(border, 0.72),
		'--widget-hover': toRgba(elevated, 0.86)
	};
};

export const getThemeTextColorClass = (theme: AppTheme): string => {
	switch(theme) {
	case AppTheme.BLUE: return 'text-blue-400';
	case AppTheme.GREEN: return 'text-emerald-400';
	case AppTheme.ORANGE: return 'text-orange-400';
	case AppTheme.PURPLE: return 'text-purple-400';
	case AppTheme.ROSE: return 'text-rose-400';
	default: return 'text-zinc-200';
	}
};

export const getThemeHex = (theme: AppTheme): string => {
	switch(theme) {
	case AppTheme.BLUE: return '#60a5fa';
	case AppTheme.GREEN: return '#34d399';
	case AppTheme.ORANGE: return '#fb923c';
	case AppTheme.PURPLE: return '#c084fc';
	case AppTheme.ROSE: return '#fb7185';
	default: return '#e4e4e7';
	}
};

export const THEME_PRESETS: Record<AppTheme, { bg: string, text: string }> = {
	[AppTheme.ZINC]: { bg: '#18181b', text: '#e4e4e7' },
	[AppTheme.BLUE]: { bg: '#172554', text: '#bfdbfe' },
	[AppTheme.GREEN]: { bg: '#052e16', text: '#bbf7d0' },
	[AppTheme.ORANGE]: { bg: '#431407', text: '#fed7aa' },
	[AppTheme.PURPLE]: { bg: '#3b0764', text: '#e9d5ff' },
	[AppTheme.ROSE]: { bg: '#4c0519', text: '#fecdd3' },
};

export const THEME_OPTIONS = [
	AppTheme.ZINC,
	AppTheme.BLUE,
	AppTheme.GREEN,
	AppTheme.ORANGE,
	AppTheme.PURPLE,
	AppTheme.ROSE
];
