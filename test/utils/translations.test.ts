import { afterEach, describe, expect, it } from 'vitest';
import { Language } from '../../types';
import {
	getAvailableLanguages,
	isKnownLanguage,
	registerPluginLanguage,
	registerPluginTranslations,
	t,
	unregisterPluginLocalizations
} from '../../translations';

const OWNER_ID = 'test-plugin-translations';
const OWNER_ID_2 = 'test-plugin-translations-2';

describe('translations plugin registry', () => {
	afterEach(() => {
		unregisterPluginLocalizations(OWNER_ID);
		unregisterPluginLocalizations(OWNER_ID_2);
	});

	it('registers plugin languages for the UI and command palette', () => {
		registerPluginLanguage(OWNER_ID, {
			code: 'pirate',
			name: 'Pirate',
			localizedNames: {
				en: 'Pirate',
				de: 'Piratisch'
			}
		});

		expect(isKnownLanguage('pirate')).toBe(true);
		expect(getAvailableLanguages(Language.EN).some(language => language.code === 'pirate' && language.label === 'Pirate')).toBe(true);
		expect(getAvailableLanguages(Language.DE).some(language => language.code === 'pirate' && language.label === 'Piratisch')).toBe(true);
	});

	it('falls back to English when plugin language translations are incomplete', () => {
		registerPluginLanguage(OWNER_ID, {
			code: 'pirate',
			name: 'Pirate',
			translations: {
				'settings.title': 'Cap\'n Settings'
			}
		});

		expect(t('settings.title', 'pirate')).toBe('Cap\'n Settings');
		expect(t('btn.cancel', 'pirate')).toBe('Cancel');
	});

	it('merges translations from multiple plugins and cleans them up independently', () => {
		registerPluginTranslations(OWNER_ID, 'pirate', { 'settings.title': 'Cap\'n Settings' });
		registerPluginTranslations(OWNER_ID_2, 'pirate', { 'btn.cancel': 'Belay' });

		expect(t('settings.title', 'pirate')).toBe('Cap\'n Settings');
		expect(t('btn.cancel', 'pirate')).toBe('Belay');

		unregisterPluginLocalizations(OWNER_ID);

		expect(t('settings.title', 'pirate')).toBe('Settings');
		expect(t('btn.cancel', 'pirate')).toBe('Belay');
	});
});
