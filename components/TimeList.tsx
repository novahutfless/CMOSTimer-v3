import React, { useRef, useEffect, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { ComputedSolve, Penalty, TimePrecision, StatConfig, PBVisualType, AppTheme, Language, SolveMap } from '../types';
import { TimeListBody } from './timeList/TimeListBody';
import { TimeListColumns } from './timeList/TimeListColumns';
import { TimeListHeader } from './timeList/TimeListHeader';
import { TimeListPagination } from './timeList/TimeListPagination';
import { TimeListSelectionBar } from './timeList/TimeListSelectionBar';
import { ProcessedSolve, TimeListItem } from './timeList/timeListTypes';
import { parseTimeExpression, getStatValue } from './timeList/timeListUtils';
import { buildSubsessions, DNF_VALUE, SUBSESSION_GAP_MS } from '../utils';

export interface TimeListHandle {
	moveSelection: (direction: number, extend: boolean) => string | null;
}

interface TimeListProps {
	solves: ComputedSolve[];
	allSolves: SolveMap;
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
	groupBySubsession: boolean;
	onGroupBySubsessionChange: (value: boolean) => void;
}

const ROW_HEIGHT = 40;
const OVERSCAN = 10;

export const TimeList = forwardRef<TimeListHandle, TimeListProps>(({
	solves, allSolves, selectedIds, lastClickedId, filterText: controlledFilterText, onFilterTextChange: controlledOnFilterTextChange, precision, paginationEnabled, pageSize, columns, pbVisuals, theme, language,
	onSelect, onDelete, onPenalty, onDetails, onMove, onDuplicate, className, sessionLocked, groupBySubsession, onGroupBySubsessionChange
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
	const [expandedSubsessionIds, setExpandedSubsessionIds] = useState<Set<string>>(new Set());
	const [subsessionClock, setSubsessionClock] = useState(() => Date.now());

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

	// Filters and custom sorting operate on individual solves, so grouping is only
	// applied to the unfiltered chronological list where summaries stay accurate.
	const canGroupBySubsession = groupBySubsession && !filterText && filterTags.size === 0 && sortColId === null;
	useEffect(() => {
		if (!canGroupBySubsession || solves.length === 0) return;
		const mostRecentTimestamp = Math.max(...solves.map(solve => solve.timestamp));
		const delay = mostRecentTimestamp + SUBSESSION_GAP_MS - Date.now();
		if (delay <= 0) {
			setSubsessionClock(Date.now());
			return;
		}
		const timeout = window.setTimeout(() => setSubsessionClock(Date.now()), delay + 1);
		return (): void => window.clearTimeout(timeout);
	}, [canGroupBySubsession, solves]);
	const timeListItems = useMemo<TimeListItem[]>(() => {
		if (!canGroupBySubsession) return processedSolves.map(item => ({ kind: 'solve', item }));

		const subsessions = buildSubsessions(solves, allSolves);
		const newest = subsessions.at(-1);
		const newestSolve = newest?.solves.at(-1);
		const newestIsOngoing = newestSolve !== undefined && subsessionClock - newestSolve.timestamp <= SUBSESSION_GAP_MS;
		const completedSubsessionBySolveId = new Map<string, typeof subsessions[number]>();
		// Only a recent trailing block can still grow; old sessions collapse completely.
		(newestIsOngoing ? subsessions.slice(0, -1) : subsessions).forEach(subsession => {
			subsession.solves.forEach(solve => completedSubsessionBySolveId.set(solve.id, subsession));
		});

		const emitted = new Set<string>();
		const result: TimeListItem[] = [];
		processedSolves.forEach(item => {
			const subsession = completedSubsessionBySolveId.get(item.solve.id);
			if (!subsession) {
				result.push({ kind: 'solve', item });
				return;
			}
			if (emitted.has(subsession.id)) return;
			emitted.add(subsession.id);
			const items = processedSolves.filter(candidate => completedSubsessionBySolveId.get(candidate.solve.id)?.id === subsession.id);
			const expanded = expandedSubsessionIds.has(subsession.id);
			result.push({ kind: 'subsession', group: subsession, items, expanded });
			if (expanded) items.forEach(groupItem => result.push({ kind: 'solve', item: groupItem }));
		});
		return result;
	}, [allSolves, canGroupBySubsession, expandedSubsessionIds, processedSolves, solves, subsessionClock]);

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

	const paginatedItems = useMemo<TimeListItem[]>(() => {
		if (!paginationEnabled) return [];
		const start = (currentPage - 1) * pageSize;
		return timeListItems.slice(start, start + pageSize);
	}, [timeListItems, paginationEnabled, currentPage, pageSize]);

	useEffect(() => {
		setCurrentPage(1);
	}, [filterText, filterTags, paginationEnabled, canGroupBySubsession]);

	const totalPages = Math.ceil(timeListItems.length / pageSize);
	useEffect(() => {
		setCurrentPage(page => Math.min(page, Math.max(1, totalPages)));
	}, [totalPages]);

	const { virtualItems, totalHeight, offsetY } = useMemo<{ virtualItems: TimeListItem[]; totalHeight: number; offsetY: number }>(() => {
		if (paginationEnabled) return { virtualItems: [], totalHeight: 0, offsetY: 0 };
		const totalHeight = timeListItems.length * ROW_HEIGHT;
		const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
		const endIndex = Math.min(timeListItems.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT));
		const renderStart = Math.max(0, startIndex - OVERSCAN);
		const renderEnd = Math.min(timeListItems.length, endIndex + OVERSCAN);

		const virtualItems = timeListItems.slice(renderStart, renderEnd);
		const offsetY = renderStart * ROW_HEIGHT;
		return { virtualItems, totalHeight, offsetY };
	}, [timeListItems, scrollTop, containerHeight, paginationEnabled]);

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
				groupBySubsession={groupBySubsession}
				onToggleGroupBySubsession={() => onGroupBySubsessionChange(!groupBySubsession)}
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
				onToggleSubsession={(id) => setExpandedSubsessionIds(previous => {
					const next = new Set(previous);
					if (next.has(id)) next.delete(id); else next.add(id);
					return next;
				})}
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
