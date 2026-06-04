import React from 'react';
import { AppTheme, ComputedSolve, Language, PBVisualType, StatConfig, TimePrecision } from '../../types';
import { TimeListRow } from '../TimeListRow';
import { t } from '../../translations';
import { ProcessedSolve } from './timeListTypes';

interface TimeListBodyProps {
  processedSolves: ProcessedSolve[];
  itemsToRender: ProcessedSolve[];
  solves: ComputedSolve[];
  columns: StatConfig[];
  selectedIds: Set<string>;
  theme: AppTheme;
  pbVisuals: PBVisualType;
  precision: TimePrecision;
  paginationEnabled: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  onSelect: (id: string, e: React.MouseEvent) => void;
  totalHeight: number;
  offsetY: number;
  rowHeight: number;
  language: Language;
}

export const TimeListBody: React.FC<TimeListBodyProps> = ({
	processedSolves,
	itemsToRender,
	solves,
	columns,
	selectedIds,
	theme,
	pbVisuals,
	precision,
	paginationEnabled,
	listRef,
	onScroll,
	onSelect,
	totalHeight,
	offsetY,
	rowHeight,
	language
}) => (
	<div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={listRef} onScroll={paginationEnabled ? undefined : onScroll}>
		{processedSolves.length === 0 ? (
			<div className="p-4 text-center text-zinc-600 text-xs italic">{t('list.empty', language)}</div>
		) : paginationEnabled ? (
			<div className="w-full">
				{itemsToRender.map(({ solve, originalIndex }) => (
					<TimeListRow
						key={solve.id}
						solve={solve}
						solves={solves}
						index={originalIndex}
						columns={columns}
						selected={selectedIds.has(solve.id)}
						theme={theme}
						pbVisuals={pbVisuals}
						precision={precision}
						onClick={(e) => onSelect(solve.id, e)}
						height={rowHeight}
					/>
				))}
			</div>
		) : (
			<div style={{ height: totalHeight }} className="w-full">
				<div style={{ transform: `translateY(${offsetY}px)` }}>
					{itemsToRender.map(({ solve, originalIndex }) => (
						<TimeListRow
							key={solve.id}
							solve={solve}
							solves={solves}
							index={originalIndex}
							columns={columns}
							selected={selectedIds.has(solve.id)}
							theme={theme}
							pbVisuals={pbVisuals}
							precision={precision}
							onClick={(e) => onSelect(solve.id, e)}
							height={rowHeight}
						/>
					))}
				</div>
			</div>
		)}
	</div>
);
