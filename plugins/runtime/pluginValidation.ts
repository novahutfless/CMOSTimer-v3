import {
	PluginLanguageDefinition,
	PluginScramblerDefinition,
	PluginUiNode
} from '../../types';

const MAX_UI_DEPTH = 12;
const MAX_UI_NODES = 500;
const MAX_TEXT_LENGTH = 20_000;
const UI_TONES = new Set(['default', 'muted', 'accent', 'success', 'warning', 'danger']);
const UI_SIZES = new Set(['small', 'medium', 'large']);

const optionalEnum = (value: unknown, allowed: Set<string>, label: string): void => {
	if (value !== undefined && (typeof value !== 'string' || !allowed.has(value))) throw new Error(`${label} is invalid.`);
};

export const ensureNonEmptyString = (value: unknown, label: string, maxLength = 200): string => {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
	const normalized = value.trim();
	if (normalized.length > maxLength) throw new Error(`${label} exceeds ${maxLength} characters.`);
	return normalized;
};

export const validateLanguageRegistration = (definition: PluginLanguageDefinition): PluginLanguageDefinition => {
	if (!definition || typeof definition !== 'object') throw new Error('Language definition must be an object.');
	const code = ensureNonEmptyString(definition.code, 'Language code', 50);
	const name = ensureNonEmptyString(definition.name, 'Language name');
	if (definition.localizedNames) {
		for (const [localizedCode, localizedName] of Object.entries(definition.localizedNames)) {
			ensureNonEmptyString(localizedCode, 'Localized language code', 50);
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
	if (!translations || typeof translations !== 'object' || Array.isArray(translations)) throw new Error('Translations must be an object.');
	const entries = Object.entries(translations);
	if (entries.length > 5000) throw new Error('A plugin may register at most 5000 translations.');
	return Object.fromEntries(entries.map(([key, value]) => {
		const normalizedKey = ensureNonEmptyString(key, 'Translation key', 300);
		if (typeof value !== 'string') throw new Error(`Translation value for "${normalizedKey}" must be a string.`);
		if (value.length > MAX_TEXT_LENGTH) throw new Error(`Translation value for "${normalizedKey}" is too long.`);
		return [normalizedKey, value] as const;
	}));
};

export const validateScramblerRegistration = (definition: PluginScramblerDefinition): PluginScramblerDefinition => {
	if (!definition || typeof definition !== 'object') throw new Error('Scrambler definition must be an object.');
	const id = ensureNonEmptyString(definition.id, 'Scrambler id', 100);
	const name = ensureNonEmptyString(definition.name, 'Scrambler name');
	const category = ensureNonEmptyString(definition.category, 'Scrambler category');
	const visualizer = ensureNonEmptyString(definition.visualizer, 'Scrambler visualizer', 100);
	if (!Array.isArray(definition.moves) || definition.moves.length === 0 || definition.moves.length > 500) throw new Error('Scrambler moves must contain 1 to 500 tokens.');
	const moves = definition.moves.map((move, index) => ensureNonEmptyString(move, `Scrambler move ${index}`, 50));
	if (!Number.isInteger(definition.length) || definition.length < 1 || definition.length > 1000) throw new Error('Scrambler length must be an integer from 1 to 1000.');
	const opposites = definition.opposites?.map((pair, index) => ensureNonEmptyString(pair, `Scrambler opposite ${index}`, 100));
	return { id, name, category, visualizer, moves, length: definition.length, ...(opposites === undefined ? {} : { opposites }) };
};

export const validateUiNode = (root: unknown): PluginUiNode => {
	const serialized = JSON.stringify(root);
	if (serialized !== undefined && serialized.length > 1_000_000) throw new Error('Plugin UI exceeds the 1 MB payload limit.');
	let nodeCount = 0;
	const visit = (value: unknown, depth: number): PluginUiNode => {
		nodeCount += 1;
		if (nodeCount > MAX_UI_NODES) throw new Error(`Plugin UI exceeds ${MAX_UI_NODES} nodes.`);
		if (depth > MAX_UI_DEPTH) throw new Error(`Plugin UI exceeds ${MAX_UI_DEPTH} levels.`);
		if (typeof value === 'string') {
			if (value.length > MAX_TEXT_LENGTH) throw new Error('Plugin UI text is too long.');
			return value;
		}
		if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Plugin UI nodes must be strings or node objects.');
		const node = value as Record<string, unknown>;
		if (node.type === 'text') {
			if (typeof node.text !== 'string' || node.text.length > MAX_TEXT_LENGTH) throw new Error('Text nodes require bounded text.');
			optionalEnum(node.tone, UI_TONES, 'Text tone');
			optionalEnum(node.size, UI_SIZES, 'Text size');
			return value as PluginUiNode;
		}
		if (node.type === 'button' || node.type === 'deviceButton') {
			ensureNonEmptyString(node.text, 'Button text', 500);
			ensureNonEmptyString(node.action, 'Button action', 200);
			optionalEnum(node.tone, UI_TONES, 'Button tone');
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Button disabled must be a boolean.');
			if (node.type === 'deviceButton') {
				if (!node.request || typeof node.request !== 'object' || Array.isArray(node.request)) throw new Error('Device buttons require a device request.');
				const request = node.request as Record<string, unknown>;
				if (!['serial', 'hid', 'usb', 'bluetooth'].includes(String(request.kind))) throw new Error('Device button kind is invalid.');
				if (request.filters !== undefined && (!Array.isArray(request.filters) || request.filters.length > 50)) throw new Error('Device filters must contain at most 50 entries.');
				if (request.baudRate !== undefined && (!Number.isInteger(request.baudRate) || Number(request.baudRate) < 1 || Number(request.baudRate) > 10_000_000)) throw new Error('Device baud rate is invalid.');
				for (const field of ['configurationValue', 'interfaceNumber']) if (request[field] !== undefined && (!Number.isInteger(request[field]) || Number(request[field]) < 0)) throw new Error(`Device ${field} is invalid.`);
			}
			return value as PluginUiNode;
		}
		if (node.type === 'spacer') {
			optionalEnum(node.size, UI_SIZES, 'Spacer size');
			return value as PluginUiNode;
		}
		if (node.type === 'container') {
			if (!Array.isArray(node.children)) throw new Error('Container nodes require a children array.');
			optionalEnum(node.direction, new Set(['row', 'column']), 'Container direction');
			optionalEnum(node.align, new Set(['start', 'center', 'end', 'stretch']), 'Container alignment');
			optionalEnum(node.gap, UI_SIZES, 'Container gap');
			return { ...node, children: node.children.map(child => visit(child, depth + 1)) } as PluginUiNode;
		}
		throw new Error(`Unknown plugin UI node type "${String(node.type)}".`);
	};
	return visit(root, 0);
};

export const once = (fn: () => void | Promise<void>): (() => Promise<void>) => {
	let called = false;
	return async (): Promise<void> => {
		if (called) return;
		called = true;
		await fn();
	};
};
