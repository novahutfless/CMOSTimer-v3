import { CMOS_PLUGIN_API_VERSION, PLUGIN_PERMISSIONS, PluginPermission, PluginScript } from '../types';

export const PLUGIN_PACKAGE_FORMAT = 'cmostimer-plugin';
export const PLUGIN_PACKAGE_VERSION = 1;
export const PLUGIN_DOCS_URL = 'https://speed-cmos.com/v3/docs';

export interface PluginPackage {
	format: typeof PLUGIN_PACKAGE_FORMAT;
	formatVersion: typeof PLUGIN_PACKAGE_VERSION;
	plugin: PluginScript;
}

const requireString = (value: unknown, label: string): string => {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
	return value.trim();
};

export const parsePluginPackage = (source: string): PluginScript => {
	const parsed = JSON.parse(source) as Record<string, unknown>;
	if (parsed.format !== PLUGIN_PACKAGE_FORMAT || parsed.formatVersion !== PLUGIN_PACKAGE_VERSION) {
		throw new Error('Unsupported CMOSTimer plugin package format.');
	}
	if (!parsed.plugin || typeof parsed.plugin !== 'object') throw new Error('Plugin package is missing its plugin manifest.');
	const raw = parsed.plugin as Record<string, unknown>;
	const id = requireString(raw.id, 'Plugin id');
	const name = requireString(raw.name, 'Plugin name');
	const code = requireString(raw.code, 'Plugin code');
	const optionalString = (key: string): string | undefined => raw[key] === undefined ? undefined : requireString(raw[key], key);
	const version = optionalString('version');
	if (raw.description !== undefined && typeof raw.description !== 'string') throw new Error('description must be a string.');
	const description = raw.description as string | undefined;
	const apiVersion = optionalString('apiVersion');
	if (raw.permissions !== undefined && (!Array.isArray(raw.permissions) || raw.permissions.some(permission => !PLUGIN_PERMISSIONS.includes(permission as PluginPermission)))) throw new Error('permissions contains an unknown plugin permission.');
	const permissions = raw.permissions as PluginPermission[] | undefined;
	return {
		id,
		name,
		code,
		enabled: false,
		...(version === undefined ? {} : { version }),
		...(description === undefined ? {} : { description }),
		...(apiVersion === undefined ? {} : { apiVersion }),
		permissions: [],
		...(permissions === undefined ? {} : { requestedPermissions: permissions })
	};
};

export const serializePluginPackage = (script: PluginScript): string => {
	const plugin: PluginScript = {
		id: script.id,
		name: script.name,
		code: script.code,
		enabled: false,
		version: script.version || '1.0.0',
		description: script.description || '',
		apiVersion: script.apiVersion || CMOS_PLUGIN_API_VERSION,
		permissions: script.permissions?.length ? script.permissions : script.requestedPermissions || []
	};
	return JSON.stringify({ format: PLUGIN_PACKAGE_FORMAT, formatVersion: PLUGIN_PACKAGE_VERSION, plugin } satisfies PluginPackage, null, 2);
};
