import { CMOS_PLUGIN_API_VERSION, PLUGIN_PERMISSIONS, PluginPermission, PluginScript } from '../types';
import { utf8ByteLength } from '../utils/accountValidation';

export const PLUGIN_PACKAGE_FORMAT = 'cmostimer-plugin';
export const PLUGIN_PACKAGE_VERSION = 1;
export const PLUGIN_DOCS_URL = 'https://speed-cmos.com/v3/docs';
export const PLUGIN_ID_MAX_BYTES = 100;
export const PLUGIN_NAME_MAX_BYTES = 120;
export const PLUGIN_VERSION_MAX_BYTES = 64;
export const PLUGIN_API_VERSION_MAX_BYTES = 64;
export const PLUGIN_DESCRIPTION_MAX_BYTES = 20_000;
export const PLUGIN_CODE_MAX_BYTES = 1_000_000;
export const PLUGIN_CAPABILITIES_MAX = 100;
export const PLUGIN_CAPABILITY_MAX_BYTES = 100;

export interface PluginPackage {
	format: typeof PLUGIN_PACKAGE_FORMAT;
	formatVersion: typeof PLUGIN_PACKAGE_VERSION;
	plugin: PluginScript;
}

const requireString = (value: unknown, label: string): string => {
	if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be a non-empty string.`);
	return value.trim();
};

const requireBoundedString = (value: unknown, label: string, maxBytes: number): string => {
	const result = requireString(value, label);
	if (utf8ByteLength(result) > maxBytes) throw new Error(`${label} must be at most ${maxBytes.toLocaleString()} bytes.`);
	return result;
};

export const assertPluginServerLimits = (script: PluginScript): void => {
	const id = requireBoundedString(script.id, 'Plugin id', PLUGIN_ID_MAX_BYTES);
	if (!/^[a-z0-9][a-z0-9._-]{1,99}$/.test(id)) throw new Error('Plugin id must use 2-100 lowercase letters, numbers, dots, underscores, or hyphens.');
	requireBoundedString(script.name, 'Plugin name', PLUGIN_NAME_MAX_BYTES);
	requireBoundedString(script.version || '1.0.0', 'Plugin version', PLUGIN_VERSION_MAX_BYTES);
	requireBoundedString(script.apiVersion || CMOS_PLUGIN_API_VERSION, 'Plugin API version', PLUGIN_API_VERSION_MAX_BYTES);
	if (utf8ByteLength(script.description || '') > PLUGIN_DESCRIPTION_MAX_BYTES) throw new Error('Plugin description must be at most 20,000 bytes.');
	if (!script.code.trim()) throw new Error('Plugin code must be a non-empty string.');
	if (utf8ByteLength(script.code) > PLUGIN_CODE_MAX_BYTES) throw new Error('Plugin code must be at most 1,000,000 bytes.');
	const permissions = script.permissions?.length ? script.permissions : script.requestedPermissions || [];
	if (permissions.length > 50 || permissions.some(permission => !PLUGIN_PERMISSIONS.includes(permission))) throw new Error('Plugin permissions are invalid.');
	const capabilities = script.capabilities || [];
	if (capabilities.length > PLUGIN_CAPABILITIES_MAX || capabilities.some(item => !item.trim() || utf8ByteLength(item) > PLUGIN_CAPABILITY_MAX_BYTES)) {
		throw new Error('Plugins may declare at most 100 capabilities of up to 100 bytes each.');
	}
};

export const assertRegistryPackageServerLimits = (value: unknown): void => {
	if (!value || typeof value !== 'object') throw new Error('Invalid plugin package.');
	const candidate = value as Partial<PluginPackage>;
	if (candidate.format !== PLUGIN_PACKAGE_FORMAT || candidate.formatVersion !== PLUGIN_PACKAGE_VERSION || !candidate.plugin) {
		throw new Error('Invalid plugin package.');
	}
	assertPluginServerLimits(candidate.plugin);
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
	if (raw.capabilities !== undefined && (!Array.isArray(raw.capabilities) || raw.capabilities.some(capability => typeof capability !== 'string' || !capability.trim()))) throw new Error('capabilities must contain non-empty strings.');
	const capabilities = raw.capabilities as string[] | undefined;
	return {
		id,
		name,
		code,
		enabled: false,
		...(version === undefined ? {} : { version }),
		...(description === undefined ? {} : { description }),
		...(apiVersion === undefined ? {} : { apiVersion }),
		permissions: [],
		...(permissions === undefined ? {} : { requestedPermissions: permissions }),
		...(capabilities === undefined ? {} : { capabilities: Array.from(new Set(capabilities.map(item => item.trim()))) })
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
		permissions: script.permissions?.length ? script.permissions : script.requestedPermissions || [],
		capabilities: script.capabilities || []
	};
	return JSON.stringify({ format: PLUGIN_PACKAGE_FORMAT, formatVersion: PLUGIN_PACKAGE_VERSION, plugin } satisfies PluginPackage, null, 2);
};
