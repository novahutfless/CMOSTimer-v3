import { Language } from '../types';
import { builtinDictionary } from './dictionaries';
import {
	getAvailableLanguages,
	getPluginTranslationsForLanguage,
	isKnownLanguage,
	registerPluginLanguage,
	registerPluginTranslations,
	unregisterPluginLocalizations
} from './pluginRegistry';

export const t = (key: string, lang: Language = Language.EN): string => {
	const pluginDict = getPluginTranslationsForLanguage(lang);
	if (pluginDict?.[key]) return pluginDict[key];

	const dict = builtinDictionary[lang] || builtinDictionary[Language.EN];
	return dict[key] || builtinDictionary[Language.EN][key] || key;
};

export {
	getAvailableLanguages,
	isKnownLanguage,
	registerPluginLanguage,
	registerPluginTranslations,
	unregisterPluginLocalizations
};
