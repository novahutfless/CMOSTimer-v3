import { CustomRendererDefinition, CustomScramblerDefinition, PluginLanguageDefinition, PluginWidgetDefinition } from '../../types';

const ensureNonEmptyString = (value: string, label: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw new Error(`${label} must be a non-empty string.`);
	}
	return value.trim();
};

const ensureFunction = (value: unknown, label: string): void => {
	if (typeof value !== 'function') {
		throw new Error(`${label} must be a function.`);
	}
};

export const once = (fn: () => void): (() => void) => {
	let called = false;
	return (): void => {
		if (called) return;
		called = true;
		fn();
	};
};

export const wrapCleanup = (cleanup?: () => void): (() => void) | undefined =>
	cleanup ? once(cleanup) : undefined;

export const validateWidgetRegistration = (id: string, name: string, render: (el: HTMLElement) => void): PluginWidgetDefinition => {
	const normalizedId = ensureNonEmptyString(id, 'Widget id');
	const normalizedName = ensureNonEmptyString(name, 'Widget name');
	ensureFunction(render, 'Widget render');
	return { id: normalizedId, name: normalizedName, render };
};

export const validateRendererRegistration = (
	visualizerType: string,
	render: (el: HTMLElement, scramble: string[], config: unknown) => void
): CustomRendererDefinition => {
	const normalizedType = ensureNonEmptyString(visualizerType, 'Renderer visualizer type');
	ensureFunction(render, 'Renderer render');
	return { visualizerType: normalizedType, render };
};

export const validateLanguageRegistration = (definition: PluginLanguageDefinition): PluginLanguageDefinition => {
	const code = ensureNonEmptyString(definition.code, 'Language code');
	const name = ensureNonEmptyString(definition.name, 'Language name');
	if (definition.localizedNames) {
		for (const [localizedCode, localizedName] of Object.entries(definition.localizedNames)) {
			ensureNonEmptyString(localizedCode, 'Localized language code');
			ensureNonEmptyString(localizedName, `Localized name for "${localizedCode}"`);
		}
	}
	if (definition.translations) validateTranslations(definition.translations);
	return {
		code,
		name,
		...(definition.localizedNames === undefined ? {} : { localizedNames: definition.localizedNames }),
		...(definition.translations === undefined ? {} : { translations: definition.translations })
	};
};

export const validateTranslations = (translations: Record<string, string>): Record<string, string> => {
	const validatedEntries = Object.entries(translations).map(([key, value]) => {
		const normalizedKey = ensureNonEmptyString(key, 'Translation key');
		if (typeof value !== 'string') {
			throw new Error(`Translation value for "${normalizedKey}" must be a string.`);
		}
		return [normalizedKey, value] as const;
	});
	return Object.fromEntries(validatedEntries);
};

export const validateScramblerRegistration = (definition: CustomScramblerDefinition): CustomScramblerDefinition => {
	const id = ensureNonEmptyString(definition.id, 'Scrambler id');
	const name = ensureNonEmptyString(definition.name, 'Scrambler name');
	const category = ensureNonEmptyString(String(definition.category), 'Scrambler category');
	const visualizer = ensureNonEmptyString(String(definition.visualizer), 'Scrambler visualizer');
	ensureFunction(definition.generate, 'Scrambler generate');
	return {
		id,
		name,
		category,
		visualizer,
		generate: definition.generate
	};
};
