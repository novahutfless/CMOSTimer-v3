import React, { ReactElement } from 'react';
import { LayoutArea, WidgetId } from '../types';

type LayoutRendererProps = {
	areas: LayoutArea[];
	widgetMapping: Record<string, WidgetId>;
	renderWidget: (id: string) => ReactElement | null;
};

export const LayoutRenderer: React.FC<LayoutRendererProps> = ({ areas, widgetMapping, renderWidget }) => {
	return (
		<div className="relative z-10 w-full h-full">
			{areas.map(area => {
				const wId = widgetMapping[area.id];
				if (!wId) return null;

				return (
					<div
						key={area.id}
						className="absolute overflow-hidden"
						style={{
							left: `${area.x}%`,
							top: `${area.y}%`,
							width: `${area.w}%`,
							height: `${area.h}%`
						}}
					>
						{renderWidget(wId)}
					</div>
				);
			})}
		</div>
	);
};
