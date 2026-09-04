import { useSyncExternalStore } from 'react';
import { pluginManager } from './PluginManager';

export const usePluginManagerRevision = (): number => useSyncExternalStore(
	pluginManager.subscribe,
	pluginManager.getRevision,
	pluginManager.getRevision
);

export const usePluginWidgetRevision = (widgetId: string): number => useSyncExternalStore(
	(listener) => pluginManager.subscribeWidget(widgetId, listener),
	() => pluginManager.getWidgetRevision(widgetId),
	() => pluginManager.getWidgetRevision(widgetId)
);
