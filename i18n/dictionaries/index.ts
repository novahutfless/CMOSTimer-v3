import { LanguageCode } from '../../types';
import { deTranslations } from './de';
import { enTranslations } from './en';
import { eoTranslations } from './eo';

export const builtinDictionary: Record<LanguageCode, Record<string, string>> = {
	en: enTranslations,
	eo: eoTranslations,
	de: deTranslations
};
