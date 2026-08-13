import { useSyncExternalStore } from 'react';
import { pluginManager } from './PluginManager';

export const usePluginManagerRevision = (): number => useSyncExternalStore(
	pluginManager.subscribe,
	pluginManager.getRevision,
	pluginManager.getRevision
);
