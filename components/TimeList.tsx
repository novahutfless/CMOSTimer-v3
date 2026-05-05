import React, { useRef, useEffect, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { ComputedSolve, Penalty, TimePrecision, StatConfig, PBVisualType, AppTheme, Language } from '../types';
import { TimeListBody } from './timeList/TimeListBody';
import { TimeListColumns } from './timeList/TimeListColumns';
import { TimeListHeader } from './timeList/TimeListHeader';
import { TimeListPagination } from './timeList/TimeListPagination';
import { TimeListSelectionBar } from './timeList/TimeListSelectionBar';
import { ProcessedSolve } from './timeList/timeListTypes';
import { parseTimeExpression, getStatValue } from './timeList/timeListUtils';
import { DNF_VALUE } from '../utils';

export interface TimeListHandle {
	moveSelection: (direction: number, extend: boolean) => string | null;
}

interface TimeListProps {
	solves: ComputedSolve[];
	selectedIds: Set<string>;
	lastClickedId: string | null;
	filterText?: string;
	onFilterTextChange?: (value: string) => void;
	precision: TimePrecision;
	paginationEnabled: boolean;
	pageSize: number;
	columns: StatConfig[];
	pbVisuals: PBVisualType;
	theme: AppTheme;
	language: Language;
	onSelect: (id: string, multi: boolean, range: boolean) => void;
	onDelete: (ids: string[], global?: boolean) => void;
	onPenalty: (id: string, penalty: Penalty) => void;
	onDetails: (id: string) => void;
	onMove: (ids: string[]) => void;
	onDuplicate: (ids: string[]) => void;
	className?: string;
	sessionLocked?: boolean;
}

const ROW_HEIGHT = 40;
const OVERSCAN = 10;

export const TimeList = forwardRef<TimeListHandle, TimeListProps>(({
	solves, selectedIds, lastClickedId, filterText: controlledFilterText, onFilterTextChange: controlledOnFilterTextChange, precision, paginationEnabled, pageSize, columns, pbVisuals, theme, language,
	onSelect, onDelete, onPenalty, onDetails, onMove, onDuplicate, className, sessionLocked
}, ref): React.ReactElement => {
	const listRef = useRef<HTMLDivElement>(null);
	const [scrollTop, setScrollTop] = useState(0);
	const [containerHeight, setContainerHeight] = useState(0);
	const [currentPage, setCurrentPage] = useState(1);

	const [internalFilterText, setInternalFilterText] = useState('');
	const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
	const [showTagFilter, setShowTagFilter] = useState(false);
	const filterText = controlledFilterText ?? internalFilterText;
	const setFilterText = controlledOnFilterTextChange ?? setInternalFilterText;

	const [sortColId, setSortColId] = useState<string | null>(null);
	const [sortDesc, setSortDesc] = useState(true);

	const allTags = useMemo(() => {
		const tags = new Set<string>();
		solves.forEach(s => s.tags?.forEach(t => tags.add(t)));
		return Array.from(tags).sort();
	}, [solves]);

	const processedSolves = useMemo<ProcessedSolve[]>(() => {
		let result = solves.map((s, originalIndex) => ({ solve: s, originalIndex }));

		if (filterText) {
			const predicate = parseTimeExpression(filterText);
			if (predicate) {
				result = result.filter(({ solve }) => predicate(solve));
			}
		}

		if (filterTags.size > 0) {
			result = result.filter(({ solve }) =>
				solve.tags && Array.from(filterTags).every(t => solve.tags!.includes(t))
			);
		}

		if (sortColId) {
			const col = columns.find(c => c.id === sortColId);
			if (col)
				result.sort((a, b) => {
					const valA = getStatValue(a.solve, solves, a.originalIndex, col) ?? -Infinity;
					const valB = getStatValue(b.solve, solves, b.originalIndex, col) ?? -Infinity;

					if (valA === valB) return 0;

					const normA = valA === DNF_VALUE ? Infinity : valA;
					const normB = valB === DNF_VALUE ? Infinity : valB;

					return sortDesc ? normB - normA : normA - normB;
				});
			else if (sortColId === 'index')
				result.sort((a, b) => sortDesc ? a.originalIndex - b.originalIndex : b.originalIndex - a.originalIndex);
		}

		return result;
	}, [solves, filterText, filterTags, sortColId, sortDesc, columns]);

	useImperativeHandle(ref, () => ({
		moveSelection: (direction, extend): string | null => {
			if (processedSolves.length === 0) return null;

			let focusIndex = -1;
			if (lastClickedId)
				focusIndex = processedSolves.findIndex(item => item.solve.id === lastClickedId);

			if (focusIndex === -1) {
				const target = processedSolves[0];
				if (target) {
					onSelect(target.solve.id, false, false);
					return target.solve.id;
				}
				return null;
			}

			const nextIndex = focusIndex + direction;
			if (nextIndex >= 0 && nextIndex < processedSolves.length) {
				const targetId = processedSolves[nextIndex]!.solve.id;
				onSelect(targetId, extend, extend);
				ensureVisible(nextIndex);
				return targetId;
			}
			return null;
		}
	}));

	const ensureVisible = (index: number): void => {
		if (!listRef.current) return;
		const top = index * ROW_HEIGHT;
		if (top < scrollTop)
			listRef.current.scrollTo({ top: top, behavior: 'smooth' });
		else if (top > scrollTop + containerHeight - ROW_HEIGHT)
			listRef.current.scrollTo({ top: top - containerHeight + ROW_HEIGHT, behavior: 'smooth' });
	};

	useEffect(() => {
		if (!listRef.current) return;
		const observer = new ResizeObserver(entries => {
			if (entries[0]) setContainerHeight(entries[0].contentRect.height);
		});
		observer.observe(listRef.current);
		return (): void => observer.disconnect();
	}, []);

	const handleScroll = (e: React.UIEvent<HTMLDivElement>): void =>
		setScrollTop(e.currentTarget.scrollTop);

	const paginatedItems = useMemo<ProcessedSolve[]>(() => {
		if (!paginationEnabled) return [];
		const start = (currentPage - 1) * pageSize;
		return processedSolves.slice(start, start + pageSize);
	}, [processedSolves, paginationEnabled, currentPage, pageSize]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filterText, filterTags, paginationEnabled]);

	const totalPages = Math.ceil(processedSolves.length / pageSize);

	const { virtualItems, totalHeight, offsetY } = useMemo<{ virtualItems: ProcessedSolve[]; totalHeight: number; offsetY: number }>(() => {
		if (paginationEnabled) return { virtualItems: [], totalHeight: 0, offsetY: 0 };
		const totalHeight = processedSolves.length * ROW_HEIGHT;
		const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
		const endIndex = Math.min(processedSolves.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT));
		const renderStart = Math.max(0, startIndex - OVERSCAN);
		const renderEnd = Math.min(processedSolves.length, endIndex + OVERSCAN);

		const virtualItems = processedSolves.slice(renderStart, renderEnd);
		const offsetY = renderStart * ROW_HEIGHT;
		return { virtualItems, totalHeight, offsetY };
	}, [processedSolves, scrollTop, containerHeight, paginationEnabled]);

	const itemsToRender = paginationEnabled ? paginatedItems : virtualItems;

	const handleSort = (colId: string): void => {
		if (sortColId === colId) {
			setSortDesc(!sortDesc);
		} else {
			setSortColId(colId);
			setSortDesc(true);
		}
	};

	const handleRowClick = (id: string, e: React.MouseEvent): void => {
		onSelect(id, e.ctrlKey || e.metaKey, e.shiftKey);
	};
	const sessionLockedProp = sessionLocked === undefined ? {} : { sessionLocked };

	return (
		<div className={`flex flex-col border-l ${className}`} style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
			<TimeListHeader
				processedCount={processedSolves.length}
				totalCount={solves.length}
				{...sessionLockedProp}
				filterText={filterText}
				onFilterTextChange={setFilterText}
				showTagFilter={showTagFilter}
				onToggleTagFilter={() => setShowTagFilter(!showTagFilter)}
				allTags={allTags}
				filterTags={filterTags}
				onToggleTag={(tag) => {
					const next = new Set(filterTags);
					if (next.has(tag)) next.delete(tag); else next.add(tag);
					setFilterTags(next);
				}}
				onClearTags={() => setFilterTags(new Set())}
				language={language}
			/>

			<TimeListColumns
				columns={columns}
				sortColId={sortColId}
				sortDesc={sortDesc}
				onSort={handleSort}
				language={language}
			/>

			<TimeListBody
				processedSolves={processedSolves}
				itemsToRender={itemsToRender}
				solves={solves}
				columns={columns}
				selectedIds={selectedIds}
				theme={theme}
				pbVisuals={pbVisuals}
				precision={precision}
				paginationEnabled={paginationEnabled}
				listRef={listRef}
				onScroll={handleScroll}
				onSelect={handleRowClick}
				totalHeight={totalHeight}
				offsetY={offsetY}
				rowHeight={ROW_HEIGHT}
				language={language}
			/>

			{paginationEnabled && (
				<TimeListPagination
					currentPage={currentPage}
					totalPages={totalPages}
					onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
					onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
				/>
			)}

			<TimeListSelectionBar
				selectedIds={selectedIds}
				solves={solves}
				{...sessionLockedProp}
				language={language}
				onDetails={onDetails}
				onMove={onMove}
				onDuplicate={onDuplicate}
				onDelete={onDelete}
				onPenalty={onPenalty}
			/>
		</div>
	);
});

TimeList.displayName = 'TimeList';

export default TimeList;
