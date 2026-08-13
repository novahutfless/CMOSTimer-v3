import { describe, expect, it } from 'vitest';
import { parsePluginPackage, serializePluginPackage } from '../../plugins/pluginPackage';
import { CMOS_PLUGIN_API_VERSION, PluginScript } from '../../types';

describe('plugin packages', () => {
	it('round-trips metadata and always imports disabled', () => {
		const plugin: PluginScript = {
			id: 'package-test',
			name: 'Package Test',
			version: '2.3.4',
			description: 'Example',
			apiVersion: CMOS_PLUGIN_API_VERSION,
			code: `cmos.toast('hello');`,
			enabled: true,
			permissions: ['state:read', 'devices'],
			lastKnownGoodCode: `cmos.toast('old');`
		};
		const imported = parsePluginPackage(serializePluginPackage(plugin));
		expect(imported).toMatchObject({
			id: plugin.id,
			name: plugin.name,
			version: plugin.version,
			description: plugin.description,
			apiVersion: plugin.apiVersion,
			code: plugin.code,
			enabled: false
		});
		expect(imported.lastKnownGoodCode).toBeUndefined();
		expect(imported.permissions).toEqual([]);
		expect(imported.requestedPermissions).toEqual(['state:read', 'devices']);
	});

	it('rejects unrelated JSON files', () => {
		expect(() => parsePluginPackage('{"hello":"world"}')).toThrow(/Unsupported/);
	});

	it('round-trips an empty optional description', () => {
		const plugin: PluginScript = { id: 'empty-description', name: 'Empty', code: '// valid', enabled: false, description: '' };
		expect(parsePluginPackage(serializePluginPackage(plugin)).description).toBe('');
	});
});
