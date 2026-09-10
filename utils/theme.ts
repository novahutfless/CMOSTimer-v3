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

const lightenColor = (color: RgbColor, amount: number): RgbColor => ({
	r: clampChannel(color.r + (255 - color.r) * amount),
	g: clampChannel(color.g + (255 - color.g) * amount),
	b: clampChannel(color.b + (255 - color.b) * amount)
});

const isLightColor = (color: RgbColor): boolean =>
	(0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) >= 160;

const toRgba = (color: RgbColor, alpha: number): string =>
	`rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;

type ThemeClasses = {
	accentText: string;
	idleText: string;
	selectedSurface: string;
};

const THEME_CLASSES: Record<AppTheme, ThemeClasses> = {
	[AppTheme.ZINC]: {
		accentText: 'text-zinc-200',
		idleText: 'text-zinc-200',
		selectedSurface: 'bg-zinc-700/50 text-zinc-100'
	},
	[AppTheme.LIGHT]: {
		accentText: 'text-blue-700',
		idleText: 'text-zinc-800',
		selectedSurface: 'bg-blue-100 text-blue-950'
	},
	[AppTheme.BLUE]: {
		accentText: 'text-blue-400',
		idleText: 'text-blue-200',
		selectedSurface: 'bg-blue-900/30 text-blue-100'
	},
	[AppTheme.GREEN]: {
		accentText: 'text-emerald-400',
		idleText: 'text-emerald-200',
		selectedSurface: 'bg-emerald-900/30 text-emerald-100'
	},
	[AppTheme.ORANGE]: {
		accentText: 'text-orange-400',
		idleText: 'text-orange-200',
		selectedSurface: 'bg-orange-900/30 text-orange-100'
	},
	[AppTheme.PURPLE]: {
		accentText: 'text-purple-400',
		idleText: 'text-purple-200',
		selectedSurface: 'bg-purple-900/30 text-purple-100'
	},
	[AppTheme.ROSE]: {
		accentText: 'text-rose-400',
		idleText: 'text-rose-200',
		selectedSurface: 'bg-rose-900/30 text-rose-100'
	}
};

export const getWidgetSurfaceVars = (backgroundColor: string): Record<string, string> => {
	const parsed = parseHexColor(backgroundColor) || parseHexColor(THEME_PRESETS[AppTheme.ZINC].bg)!;
	if (isLightColor(parsed)) {
		const surface = lightenColor(parsed, 0.6);
		const muted = lightenColor(parsed, 0.3);
		const strong = lightenColor(parsed, 0.78);
		const border = darkenColor(parsed, 0.12);

		return {
			'--widget-surface': toRgba(surface, 0.9),
			'--widget-surface-muted': toRgba(muted, 0.82),
			'--widget-surface-strong': toRgba(strong, 0.96),
			'--widget-border': toRgba(border, 0.5),
			'--widget-hover': toRgba(muted, 0.9)
		};
	}

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
	return THEME_CLASSES[theme].accentText;
};

export const getThemeIdleTextColorClass = (theme: AppTheme): string =>
	THEME_CLASSES[theme].idleText;

export const getThemeSelectedSurfaceClass = (theme: AppTheme): string =>
	THEME_CLASSES[theme].selectedSurface;

export const getThemeHex = (theme: AppTheme): string => {
	switch(theme) {
	case AppTheme.LIGHT: return '#2563eb';
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
	[AppTheme.LIGHT]: { bg: '#f4f4f5', text: '#18181b' },
	[AppTheme.BLUE]: { bg: '#172554', text: '#bfdbfe' },
	[AppTheme.GREEN]: { bg: '#052e16', text: '#bbf7d0' },
	[AppTheme.ORANGE]: { bg: '#431407', text: '#fed7aa' },
	[AppTheme.PURPLE]: { bg: '#3b0764', text: '#e9d5ff' },
	[AppTheme.ROSE]: { bg: '#4c0519', text: '#fecdd3' },
};

export const THEME_OPTIONS = [
	AppTheme.ZINC,
	AppTheme.LIGHT,
	AppTheme.BLUE,
	AppTheme.GREEN,
	AppTheme.ORANGE,
	AppTheme.PURPLE,
	AppTheme.ROSE
];
