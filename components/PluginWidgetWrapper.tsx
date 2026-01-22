
import React, { useEffect, useRef } from 'react';
import { pluginManager } from '../plugins/PluginManager';

interface Props {
    widgetId: string;
    className?: string;
}

export const PluginWidgetWrapper: React.FC<Props> = ({ widgetId, className }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const widgetDef = pluginManager.getWidget(widgetId);

	useEffect(() => {
		if (containerRef.current && widgetDef) {
			containerRef.current.innerHTML = ''; // Clear prev
			try {
				widgetDef.render(containerRef.current);
			} catch (e) {
				containerRef.current.innerText = `Error rendering widget: ${e}`;
			}
		}
		return () => {
			if (widgetDef?.cleanup) widgetDef.cleanup();
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
