import React, { useEffect, useRef } from 'react';
import { pluginManager } from '../plugins/PluginManager';
import { renderPluginUi } from '../plugins/runtime/renderPluginUi';
import { usePluginManagerRevision } from '../plugins/usePluginManagerRevision';

interface Props { widgetId: string; className?: string; }

export const PluginWidgetWrapper: React.FC<Props> = ({ widgetId, className }) => {
	const revision = usePluginManagerRevision();
	const containerRef = useRef<HTMLDivElement>(null);
	const widget = pluginManager.getWidget(widgetId);

	useEffect(() => {
		let cancelled = false;
		let cleanup: (() => void) | undefined;
		const container = containerRef.current;
		if (container && widget) {
			container.textContent = 'Loading plugin widget...';
			void widget.render().then(node => {
				if (cancelled) return;
				cleanup = renderPluginUi(container, node, widget.handleAction);
			}).catch(error => {
				if (!cancelled) container.textContent = `Plugin widget error: ${error instanceof Error ? error.message : String(error)}`;
			});
		}
		return (): void => {
			cancelled = true;
			cleanup?.();
		};
	}, [widgetId, widget, revision]);

	if (!widget) return <div className={`flex items-center justify-center text-red-400 text-xs ${className}`}>Unknown Widget: {widgetId}</div>;
	return <div ref={containerRef} className={`w-full h-full overflow-auto ${className}`} />;
};
