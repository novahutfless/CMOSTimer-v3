import React, { useEffect, useRef } from 'react';
import { pluginManager } from '../plugins/PluginManager';
import { usePluginManagerRevision } from '../plugins/usePluginManagerRevision';

interface Props {
    widgetId: string;
    className?: string;
}

export const PluginWidgetWrapper: React.FC<Props> = ({ widgetId, className }) => {
	usePluginManagerRevision();
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetDef = pluginManager.getWidget(widgetId);

	useEffect(() => {
		let renderCleanup: (() => void) | undefined;
		if (containerRef.current && widgetDef) {
			containerRef.current.innerHTML = ''; // Clear prev
			try {
				const returnedCleanup = widgetDef.render(containerRef.current);
				renderCleanup = typeof returnedCleanup === 'function' ? returnedCleanup : widgetDef.cleanup;
			} catch (e) {
				containerRef.current.innerText = `Error rendering widget: ${e}`;
			}
		}
		return (): void => {
			renderCleanup?.();
		};
	}, [widgetId, widgetDef]);

	if (!widgetDef) 
		return (
			<div className={`flex items-center justify-center text-red-400 text-xs ${className}`}>
                Unknown Widget: {widgetId}
			</div>
		);
    

	return <div ref={containerRef} className={`w-full h-full overflow-hidden ${className}`} />;
};
