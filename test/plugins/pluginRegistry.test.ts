import { describe, expect, it } from 'vitest';
import { capabilityForScrambler, recommendPlugins } from '../../plugins/pluginRegistry';
import { RegistryPlugin } from '../../types';

const plugin = (id: string, capabilities: string[]): RegistryPlugin => ({ id, capabilities, name: id, version: '1.0.0', description: '', author: '', apiVersion: '2.4.0', permissions: [], updatedAt: 1 });

describe('plugin registry recommendations', () => {
	it('matches exact machine-readable capabilities and excludes installed plugins', () => {
		const catalog = [plugin('clock-pack', ['scrambler:clock-carrot']), plugin('other', ['ui:analytics'])];
		expect(recommendPlugins(catalog, capabilityForScrambler('clock-carrot'), [])).toEqual([catalog[0]]);
		expect(recommendPlugins(catalog, 'scrambler:clock-carrot', ['clock-pack'])).toEqual([]);
	});
});
