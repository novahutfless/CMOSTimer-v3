
import { Penalty, TimePrecision } from '../types';
import { DNF_VALUE } from './constants';

const PENALTY_LABELS: Record<string, string> = {
	[Penalty.PLUS_TWO]: '+', // Standard convention is just +
	[Penalty.PLUS_FOUR]: '+4',
	[Penalty.PLUS_SIX]: '+6',
	[Penalty.PLUS_EIGHT]: '+8',
	[Penalty.PLUS_TEN]: '+10',
	[Penalty.PLUS_TWELVE]: '+12',
	[Penalty.PLUS_FOURTEEN]: '+14',
	[Penalty.PLUS_SIXTEEN]: '+16',
};

const PENALTY_ADDITIONS: Record<string, number> = {
	[Penalty.PLUS_TWO]: 2000,
	[Penalty.PLUS_FOUR]: 4000,
	[Penalty.PLUS_SIX]: 6000,
	[Penalty.PLUS_EIGHT]: 8000,
	[Penalty.PLUS_TEN]: 10000,
	[Penalty.PLUS_TWELVE]: 12000,
	[Penalty.PLUS_FOURTEEN]: 14000,
	[Penalty.PLUS_SIXTEEN]: 16000,
};

export const formatTime = (ms: number, penalty: Penalty = Penalty.NONE, precision: TimePrecision = TimePrecision.CENTI): string => {
	if (penalty === Penalty.DNF || ms === DNF_VALUE) return 'DNF';
	if (penalty === Penalty.DNS) return 'DNS';
  
	let finalTime = ms;
	if (PENALTY_ADDITIONS[penalty]) 
		finalTime += PENALTY_ADDITIONS[penalty];
  

	finalTime = Math.round(finalTime);

	const minutes = Math.floor(finalTime / 60000);
	const seconds = Math.floor((finalTime % 60000) / 1000);
  
	let fraction = 0;
	let fractionDigits = 0;

	switch(precision) {
	case TimePrecision.MILLI:
		fraction = finalTime % 1000;
		fractionDigits = 3;
		break;
	case TimePrecision.CENTI:
		fraction = Math.floor((finalTime % 1000) / 10);
		fractionDigits = 2;
		break;
	case TimePrecision.DECI:
		fraction = Math.floor((finalTime % 1000) / 100);
		fractionDigits = 1;
		break;
	case TimePrecision.SECONDS:
		fractionDigits = 0;
		break;
	}

	const mStr = minutes > 0 ? `${minutes}:` : '';
	const sStr = minutes > 0 && seconds < 10 ? `0${seconds}` : `${seconds}`;
  
	let timeStr = `${mStr}${sStr}`;
  
	if (fractionDigits > 0) {
		const fStr = fraction.toString().padStart(fractionDigits, '0');
		timeStr += `.${fStr}`;
	}

	const suffix = PENALTY_LABELS[penalty] || '';
	return `${timeStr}${suffix}`;
};

export const formatDuration = (ms: number): string => {
	const seconds = Math.floor(ms / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) return `${days}d ${hours % 24}h`;
	if (hours > 0) return `${hours}h ${minutes % 60}m`;
	if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
	return `${seconds}s`;
};

export const formatPercent = (val: number): string => {
	return `${(val * 100).toFixed(1)}%`;
};

export const invertHex = (hex: string) => {
	if (hex.indexOf('#') === 0) 
		hex = hex.slice(1);
    
	if (hex.length === 3) 
		hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    
	if (hex.length !== 6) 
		return '#ffffff';
    
	const r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16);
	const g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16);
	const b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
	const padZero = (str: string) => ('00' + str).slice(-2);
	return "#" + padZero(r) + padZero(g) + padZero(b);
};
