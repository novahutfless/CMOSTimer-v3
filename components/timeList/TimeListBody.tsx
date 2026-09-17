import React from 'react';
import { AppTheme, ComputedSolve, Language, PBVisualType, StatConfig, TimePrecision } from '../../types';
import { TimeListRow } from '../TimeListRow';
import { SubsessionRow } from './SubsessionRow';
import { t } from '../../translations';
import { ProcessedSolve, TimeListItem } from './timeListTypes';

interface TimeListBodyProps {
  processedSolves: ProcessedSolve[];
  itemsToRender: TimeListItem[];
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
  onToggleSubsession: (id: string) => void;
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
	language,
	onToggleSubsession
}) => (
	<div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={listRef} onScroll={paginationEnabled ? undefined : onScroll}>
		{processedSolves.length === 0 ? (
			<div className="p-4 text-center text-zinc-600 text-xs italic">{t('list.empty', language)}</div>
		) : paginationEnabled ? (
			<div className="w-full">
				{itemsToRender.map(item => item.kind === 'solve' ? (
					<TimeListRow key={item.item.solve.id} solve={item.item.solve} solves={solves} index={item.item.originalIndex} columns={columns} selected={selectedIds.has(item.item.solve.id)} theme={theme} pbVisuals={pbVisuals} precision={precision} onClick={(e) => onSelect(item.item.solve.id, e)} height={rowHeight} />
				) : (
					<SubsessionRow key={item.group.id} group={item.group} expanded={item.expanded} precision={precision} language={language} onClick={() => onToggleSubsession(item.group.id)} height={rowHeight} />
				))}
			</div>
		) : (
			<div style={{ height: totalHeight }} className="w-full">
				<div style={{ transform: `translateY(${offsetY}px)` }}>
					{itemsToRender.map(item => item.kind === 'solve' ? (
						<TimeListRow key={item.item.solve.id} solve={item.item.solve} solves={solves} index={item.item.originalIndex} columns={columns} selected={selectedIds.has(item.item.solve.id)} theme={theme} pbVisuals={pbVisuals} precision={precision} onClick={(e) => onSelect(item.item.solve.id, e)} height={rowHeight} />
					) : (
						<SubsessionRow key={item.group.id} group={item.group} expanded={item.expanded} precision={precision} language={language} onClick={() => onToggleSubsession(item.group.id)} height={rowHeight} />
					))}
				</div>
			</div>
		)}
	</div>
);
