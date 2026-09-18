import { SessionSettingsOverride, Settings } from '../types';

const normalize = (value: string): string => value.toLowerCase().replace(/[-_\s]/g, '');

export const findOptionKey = (settings: Settings, name: string): keyof Settings | undefined =>
	(Object.keys(settings) as Array<keyof Settings>).find(key => normalize(String(key)) === normalize(name));

const SESSION_OPTION_KEYS: Array<keyof SessionSettingsOverride> = [
	'inspectionEnabled', 'inspectionDirection', 'inspectionVoice', 'inspectionAbortAction', 'autoPenalty', 'holdToStart',
	'restartDelayEnabled', 'restartDelayMs', 'timePrecision', 'inspectionPrecision', 'hideWhileTiming', 'numberOfPhases',
	'prePBs', 'layout', 'useStackmat', 'virtualCube', 'groupTimeListBySubsession'
];

export const findSessionOptionKey = (name: string): keyof SessionSettingsOverride | undefined =>
	SESSION_OPTION_KEYS.find(key => normalize(String(key)) === normalize(name));

export const parseOptionValue = (rawValue: string, current: unknown): unknown => {
	const value = rawValue.trim();
	if (!value) throw new Error('An option value is required.');
	if (typeof current === 'boolean') {
		if (['true', 'on', 'yes', '1'].includes(value.toLowerCase())) return true;
		if (['false', 'off', 'no', '0'].includes(value.toLowerCase())) return false;
		throw new Error('Boolean options accept on/off or true/false.');
	}
	if (typeof current === 'number') {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) throw new Error('This option requires a number.');
		return parsed;
	}
	if (Array.isArray(current) || (current !== null && typeof current === 'object')) {
		try {
			return JSON.parse(value);
		} catch {
			throw new Error('This option requires a JSON value.');
		}
	}
	return value;
};
