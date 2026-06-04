import React, { ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutArea, WidgetId } from '../types';
import { getAreaLeft } from '../utils/layouts';

type LayoutRendererProps = {
	areas: LayoutArea[];
	widgetMapping: Record<string, WidgetId>;
	renderWidget: (id: string) => ReactElement | null;
	mirror?: boolean;
};

const TOOL_SLOT_MIN_HEIGHT_PX = 268;
const TOOL_SLOT_ID_REGEX = /^slot\d+$/i;

export const LayoutRenderer: React.FC<LayoutRendererProps> = ({ areas, widgetMapping, renderWidget, mirror = false }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerHeight, setContainerHeight] = useState(0);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		const measure = (): void => setContainerHeight(el.clientHeight);
		measure();

		if (typeof ResizeObserver !== 'undefined') {
			const observer = new ResizeObserver(() => measure());
			observer.observe(el);
			return (): void => observer.disconnect();
		}

		window.addEventListener('resize', measure);
		return (): void => window.removeEventListener('resize', measure);
	}, []);

	const areaStyles = useMemo(() => {
		const styles = new Map<string, React.CSSProperties>();
		const slotAreas = areas.filter(area => TOOL_SLOT_ID_REGEX.test(area.id));
		const hasMeasuredHeight = containerHeight > 0;

		areas.forEach(area => {
			styles.set(area.id, {
				left: `${getAreaLeft(area, mirror)}%`,
				top: `${area.y}%`,
				width: `${area.w}%`,
				height: `${area.h}%`
			});
		});

		if (!hasMeasuredHeight || slotAreas.length === 0) return styles;

		const rowGroups = new Map<string, LayoutArea[]>();
		slotAreas.forEach(area => {
			const key = area.y.toFixed(4);
			const existing = rowGroups.get(key) || [];
			existing.push(area);
			rowGroups.set(key, existing);
		});

		const rows = Array.from(rowGroups.entries())
			.map(([key, rowAreas]) => {
				const topPx = Math.min(...rowAreas.map(a => (a.y / 100) * containerHeight));
				const bottomPx = Math.max(...rowAreas.map(a => ((a.y + a.h) / 100) * containerHeight));
				const heightPx = bottomPx - topPx;
				return {
					key,
					areas: rowAreas,
					topPx,
					bottomPx,
					heightPx,
					newTopPx: topPx,
					newHeightPx: Math.max(heightPx, TOOL_SLOT_MIN_HEIGHT_PX)
				};
			})
			.sort((a, b) => a.topPx - b.topPx);

		const needsResize = rows.some(row => row.heightPx < TOOL_SLOT_MIN_HEIGHT_PX);
		if (!needsResize) return styles;

		const bottomGapPx = containerHeight - rows[rows.length - 1]!.bottomPx;
		const gaps = rows.slice(1).map((row, idx) => row.topPx - rows[idx]!.bottomPx);

		let nextBottomPx = containerHeight - bottomGapPx;
		for (let i = rows.length - 1; i >= 0; i--) {
			const row = rows[i]!;
			row.newTopPx = nextBottomPx - row.newHeightPx;
			const gapAbove = i > 0 ? gaps[i - 1]! : 0;
			nextBottomPx = row.newTopPx - gapAbove;
		}

		rows.forEach(row => {
			row.areas.forEach(area => {
				styles.set(area.id, {
					left: `${getAreaLeft(area, mirror)}%`,
					top: `${row.newTopPx}px`,
					width: `${area.w}%`,
					height: `${row.newHeightPx}px`
				});
			});
		});

		return styles;
	}, [areas, containerHeight, mirror]);

	return (
		<div ref={containerRef} className="relative z-10 w-full h-full">
			{areas.map(area => {
				const wId = widgetMapping[area.id];
				if (!wId) return null;

				return (
					<div
						key={area.id}
						className="absolute overflow-hidden"
						style={areaStyles.get(area.id)}
					>
						{renderWidget(wId)}
					</div>
				);
			})}
		</div>
	);
};
