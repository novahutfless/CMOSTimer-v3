import { Language, LanguageCode } from '../types';

export type RegisteredLanguage = {
	code: LanguageCode;
	name: string;
	localizedNames?: Record<LanguageCode, string>;
};

export const builtinLanguages: RegisteredLanguage[] = [
	{ code: Language.EN, name: 'English', localizedNames: { [Language.EN]: 'English', [Language.DE]: 'Englisch', [Language.EO]: 'Angla' } },
	{ code: Language.DE, name: 'Deutsch', localizedNames: { [Language.EN]: 'German', [Language.DE]: 'Deutsch', [Language.EO]: 'Germana' } },
	{ code: Language.EO, name: 'Esperanto', localizedNames: { [Language.EN]: 'Esperanto', [Language.DE]: 'Esperanto', [Language.EO]: 'Esperanto' } }
];
