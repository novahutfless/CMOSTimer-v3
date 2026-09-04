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

const validateOptions = (value: unknown, label: string): Array<{ value: string; label: string }> => {
	if (!Array.isArray(value) || value.length === 0 || value.length > 200) throw new Error(`${label} must contain 1 to 200 entries.`);
	const seen = new Set<string>();
	return value.map((option, index) => {
		if (!option || typeof option !== 'object' || Array.isArray(option)) throw new Error(`${label} entry ${index} is invalid.`);
		const item = option as Record<string, unknown>;
		const optionValue = ensureNonEmptyString(item.value, `${label} value`, 500);
		if (seen.has(optionValue)) throw new Error(`${label} contains duplicate values.`);
		seen.add(optionValue);
		const optionLabel = ensureNonEmptyString(item.label, `${label} label`, 500);
		return { value: optionValue, label: optionLabel };
	});
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
		if (node.type === 'input') {
			if (typeof node.value !== 'string' || node.value.length > MAX_TEXT_LENGTH) throw new Error('Input values require bounded text.');
			if (node.placeholder !== undefined && (typeof node.placeholder !== 'string' || node.placeholder.length > 500)) throw new Error('Input placeholder is invalid.');
			ensureNonEmptyString(node.action, 'Input action', 200);
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Input disabled must be a boolean.');
			return value as PluginUiNode;
		}
		if (node.type === 'textarea') {
			const rows = node.rows;
			if (typeof node.value !== 'string' || node.value.length > MAX_TEXT_LENGTH) throw new Error('Textarea values require bounded text.');
			if (node.placeholder !== undefined && (typeof node.placeholder !== 'string' || node.placeholder.length > 500)) throw new Error('Textarea placeholder is invalid.');
			if (rows !== undefined && (typeof rows !== 'number' || !Number.isInteger(rows) || rows < 1 || rows > 30)) throw new Error('Textarea rows must be from 1 to 30.');
			ensureNonEmptyString(node.action, 'Textarea action', 200);
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Textarea disabled must be a boolean.');
			return value as PluginUiNode;
		}
		if (node.type === 'numberInput') {
			const min = node.min;
			const max = node.max;
			if (typeof node.value !== 'number' || !Number.isFinite(node.value)) throw new Error('Number input value must be finite.');
			for (const field of ['min', 'max', 'step']) if (node[field] !== undefined && (typeof node[field] !== 'number' || !Number.isFinite(node[field]) || (field === 'step' && node[field] <= 0))) throw new Error(`Number input ${field} is invalid.`);
			if (typeof min === 'number' && typeof max === 'number' && min > max) throw new Error('Number input min cannot exceed max.');
			if (typeof min === 'number' && node.value < min || typeof max === 'number' && node.value > max) throw new Error('Number input value is outside its range.');
			ensureNonEmptyString(node.action, 'Number input action', 200);
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Number input disabled must be a boolean.');
			return value as PluginUiNode;
		}
		if (node.type === 'checkbox') {
			if (typeof node.checked !== 'boolean') throw new Error('Checkbox checked must be a boolean.');
			ensureNonEmptyString(node.label, 'Checkbox label', 500);
			ensureNonEmptyString(node.action, 'Checkbox action', 200);
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Checkbox disabled must be a boolean.');
			return value as PluginUiNode;
		}
		if (node.type === 'select') {
			if (typeof node.value !== 'string' || node.value.length > 500) throw new Error('Select values require bounded text.');
			ensureNonEmptyString(node.action, 'Select action', 200);
			if (!Array.isArray(node.options) || node.options.length === 0 || node.options.length > 200) throw new Error('Select options must contain 1 to 200 entries.');
			const optionValues = new Set<string>();
			node.options.forEach((option, index) => {
				if (!option || typeof option !== 'object' || Array.isArray(option)) throw new Error(`Select option ${index} is invalid.`);
				const entry = option as Record<string, unknown>;
				const optionValue = typeof entry.value === 'string' && entry.value.length <= 500 ? entry.value : undefined;
				if (optionValue === undefined) throw new Error(`Select option ${index} value is invalid.`);
				if (optionValues.has(optionValue)) throw new Error(`Select option ${index} duplicates a value.`);
				optionValues.add(optionValue);
				if (typeof entry.label !== 'string' || entry.label.length > 500) throw new Error(`Select option ${index} label is invalid.`);
			});
			if (!optionValues.has(node.value)) throw new Error('Select value must match one of its options.');
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Select disabled must be a boolean.');
			return value as PluginUiNode;
		}
		if (node.type === 'tabs') {
			const tabs = validateOptions(node.tabs, 'Tabs');
			if (!tabs.some(tab => tab.value === node.value)) throw new Error('Tabs value must match one of its tabs.');
			ensureNonEmptyString(node.action, 'Tabs action', 200);
			if (node.disabled !== undefined && typeof node.disabled !== 'boolean') throw new Error('Tabs disabled must be a boolean.');
			return { ...node, tabs } as PluginUiNode;
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
		if (node.type === 'progress') {
			if (typeof node.value !== 'number' || !Number.isFinite(node.value) || node.value < 0) throw new Error('Progress value must be a non-negative finite number.');
			const max = node.max === undefined ? 100 : node.max;
			if (typeof max !== 'number' || !Number.isFinite(max) || max <= 0 || max > 1_000_000_000) throw new Error('Progress max must be a positive finite number.');
			if (node.value > max) throw new Error('Progress value cannot exceed max.');
			if (node.label !== undefined && (typeof node.label !== 'string' || node.label.length > 500)) throw new Error('Progress label is invalid.');
			optionalEnum(node.tone, UI_TONES, 'Progress tone');
			return value as PluginUiNode;
		}
		if (node.type === 'table') {
			if (!Array.isArray(node.columns) || node.columns.length === 0 || node.columns.length > 50) throw new Error('Table columns must contain 1 to 50 entries.');
			const keys = new Set<string>();
			const columns = node.columns.map((column, index) => {
				if (!column || typeof column !== 'object' || Array.isArray(column)) throw new Error(`Table column ${index} is invalid.`);
				const item = column as Record<string, unknown>;
				const key = ensureNonEmptyString(item.key, 'Table column key', 100);
				if (keys.has(key)) throw new Error('Table column keys must be unique.');
				keys.add(key);
				const label = ensureNonEmptyString(item.label, 'Table column label', 500);
				optionalEnum(item.align, new Set(['left', 'center', 'right']), 'Table column alignment');
				return { key, label, ...(item.align === undefined ? {} : { align: item.align as 'left' | 'center' | 'right' }) };
			});
			if (!Array.isArray(node.rows) || node.rows.length > 1000) throw new Error('Table rows must contain at most 1000 entries.');
			const rows = node.rows.map((row, rowIndex) => {
				if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Table row ${rowIndex} is invalid.`);
				return Object.fromEntries(Object.entries(row).map(([key, cell]) => {
					if (!keys.has(key)) throw new Error(`Table row contains unknown column "${key}".`);
					if (cell !== null && typeof cell !== 'string' && (typeof cell !== 'number' || !Number.isFinite(cell))) throw new Error('Table cells must be strings, numbers, or null.');
					if (typeof cell === 'string' && cell.length > 2000) throw new Error('Table cell text is too long.');
					return [key, cell] as const;
				}));
			});
			if (node.emptyText !== undefined && (typeof node.emptyText !== 'string' || node.emptyText.length > 500)) throw new Error('Table empty text is invalid.');
			if (node.compact !== undefined && typeof node.compact !== 'boolean') throw new Error('Table compact must be a boolean.');
			return { ...node, columns, rows } as PluginUiNode;
		}
		if (node.type === 'barChart' || node.type === 'lineChart') {
			const chartMin = node.min;
			const chartMax = node.max;
			if (!Array.isArray(node.data) || node.data.length > 200) throw new Error('Chart data must contain at most 200 entries.');
			const data = node.data.map((point, index) => {
				if (!point || typeof point !== 'object' || Array.isArray(point)) throw new Error(`Chart point ${index} is invalid.`);
				const item = point as Record<string, unknown>;
				const label = ensureNonEmptyString(item.label, 'Chart label', 200);
				if (typeof item.value !== 'number' || !Number.isFinite(item.value) || (node.type === 'barChart' && item.value < 0)) throw new Error('Chart values are invalid.');
				optionalEnum(item.tone, UI_TONES, 'Chart tone');
				return { label, value: item.value, ...(item.tone === undefined ? {} : { tone: item.tone as 'default' | 'muted' | 'accent' | 'success' | 'warning' | 'danger' }) };
			});
			if (node.max !== undefined && (typeof node.max !== 'number' || !Number.isFinite(node.max) || node.max <= 0)) throw new Error('Chart max is invalid.');
			if (node.type === 'barChart' && typeof chartMax === 'number' && data.some(point => point.value > chartMax)) throw new Error('Bar chart value cannot exceed max.');
			if (node.type === 'barChart' && node.showValues !== undefined && typeof node.showValues !== 'boolean') throw new Error('Bar chart showValues must be a boolean.');
			if (node.type === 'lineChart') {
				if (node.min !== undefined && (typeof node.min !== 'number' || !Number.isFinite(node.min))) throw new Error('Line chart min is invalid.');
				if (node.max !== undefined && (typeof node.max !== 'number' || !Number.isFinite(node.max))) throw new Error('Line chart max is invalid.');
				if (typeof chartMin === 'number' && typeof chartMax === 'number' && chartMin >= chartMax) throw new Error('Line chart min must be below max.');
			}
			return { ...node, data } as PluginUiNode;
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
