import { Language, LanguageCode } from '../types';
import { builtinLanguages, RegisteredLanguage } from './languages';

export type TranslationRecord = Record<string, string>;

const pluginLanguagesByOwner = new Map<string, Map<string, RegisteredLanguage>>();
const pluginTranslationsByOwner = new Map<string, Map<string, TranslationRecord>>();

const getRegisteredPluginLanguages = (): Map<string, RegisteredLanguage> => {
	const resolved = new Map<string, RegisteredLanguage>();
	for (const definitions of pluginLanguagesByOwner.values()) {
		for (const [code, definition] of definitions.entries()) resolved.set(code, definition);
	}
	return resolved;
};

export const getPluginTranslationsForLanguage = (languageCode: LanguageCode): TranslationRecord => {
	const merged: TranslationRecord = {};
	for (const definitions of pluginTranslationsByOwner.values()) {
		const languageTranslations = definitions.get(languageCode);
		if (languageTranslations) Object.assign(merged, languageTranslations);
	}
	return merged;
};

export const isKnownLanguage = (code: LanguageCode): boolean =>
	builtinLanguages.some(lang => lang.code === code) || getRegisteredPluginLanguages().has(code);

export const getAvailableLanguages = (uiLanguage: Language = Language.EN): { code: string; label: string }[] => {
	const pluginEntries = Array.from(getRegisteredPluginLanguages().values())
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(lang => ({
			code: lang.code,
			label: lang.localizedNames?.[uiLanguage] || lang.localizedNames?.[lang.code] || lang.name || lang.code
		}));

	return [
		...builtinLanguages.map(lang => ({
			code: lang.code,
			label: lang.localizedNames?.[uiLanguage] || lang.name
		})),
		...pluginEntries
	];
};

export const registerPluginLanguage = (
	ownerId: string,
	definition: { code: LanguageCode; name: string; localizedNames?: Record<LanguageCode, string>; translations?: Record<string, string> }
): void => {
	const ownedLanguages = pluginLanguagesByOwner.get(ownerId) || new Map<string, RegisteredLanguage>();
	ownedLanguages.set(definition.code, definition.localizedNames === undefined
		? {
			code: definition.code,
			name: definition.name
		}
		: {
			code: definition.code,
			name: definition.name,
			localizedNames: definition.localizedNames
		});
	pluginLanguagesByOwner.set(ownerId, ownedLanguages);

	if (definition.translations) registerPluginTranslations(ownerId, definition.code, definition.translations);
};

export const registerPluginTranslations = (ownerId: string, languageCode: LanguageCode, translations: Record<string, string>): void => {
	const ownedTranslations = pluginTranslationsByOwner.get(ownerId) || new Map<string, TranslationRecord>();
	const current = ownedTranslations.get(languageCode) || {};
	ownedTranslations.set(languageCode, { ...current, ...translations });
	pluginTranslationsByOwner.set(ownerId, ownedTranslations);
};

export const unregisterPluginLocalizations = (ownerId: string): void => {
	pluginLanguagesByOwner.delete(ownerId);
	pluginTranslationsByOwner.delete(ownerId);
};
