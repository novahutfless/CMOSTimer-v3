import { AppTheme } from '../types';

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