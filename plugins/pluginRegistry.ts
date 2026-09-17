import { RegistryPlugin } from '../types';

export const capabilityForScrambler = (scramblerId: string): string => `scrambler:${scramblerId}`;

export const recommendPlugins = (plugins: RegistryPlugin[], capability: string, installedIds: string[]): RegistryPlugin[] => {
	const installed = new Set(installedIds);
	return plugins.filter(plugin => !installed.has(plugin.id) && plugin.capabilities.includes(capability));
};
