
import React, { useRef, useEffect, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { ComputedSolve, Penalty, TimePrecision, StatConfig, StatType, PBVisualType, AppTheme, Language } from '../types';
import { ChevronLeft, ChevronRight, ArrowRightLeft, Filter, ArrowUp, ArrowDown, X, Tag, Lock, Copy, Trash2, ChevronUp, AlertCircle } from 'lucide-react';
import { t } from '../translations';
import { TimeListRow } from './TimeListRow';
import { DNF_VALUE, getSolveTime, calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage } from '../utils';

export interface TimeListHandle {
    moveSelection: (direction: number, extend: boolean) => string | null;
}

interface TimeListProps {
  solves: ComputedSolve[];
  selectedIds: Set<string>;
  lastClickedId: string | null;
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

// --- Filtering Helpers ---
const parseTimeExpression = (expr: string): ((t: number, p: Penalty) => boolean) | null => {
    const clean = expr.trim();
    if (!clean) return null;
    
    // AND/OR logic
    if (clean.includes('&')) {
        const parts = clean.split('&').map(parseTimeExpression);
        return (t, p) => parts.every(fn => fn ? fn(t, p) : true);
    }
    if (clean.includes('|')) {
        const parts = clean.split('|').map(parseTimeExpression);
        return (t, p) => parts.some(fn => fn ? fn(t, p) : false);
    }

    // Specific Values
    if (clean.toUpperCase() === 'DNF') return (_, p) => p === Penalty.DNF;
    if (clean.toUpperCase() === 'DNS') return (_, p) => p === Penalty.DNS;

    // Operators
    let operator = '==';
    let numStr = clean;
    if (clean.startsWith('<=')) { operator = '<='; numStr = clean.substring(2); }
    else if (clean.startsWith('>=')) { operator = '>='; numStr = clean.substring(2); }
    else if (clean.startsWith('<')) { operator = '<'; numStr = clean.substring(1); }
    else if (clean.startsWith('>')) { operator = '>'; numStr = clean.substring(1); }
    
    const numVal = parseFloat(numStr);
    if (isNaN(numVal)) return null;

    const msVal = numVal < 1000 ? numVal * 1000 : numVal; // Heuristic: if < 1000, assumes seconds

    return (time: number, penalty: Penalty) => {
        if (penalty === Penalty.DNF || penalty === Penalty.DNS) return false;
        const realTime = time + (penalty === Penalty.PLUS_TWO ? 2000 : 0);
        switch(operator) {
            case '<': return realTime < msVal;
            case '>': return realTime > msVal;
            case '<=': return realTime <= msVal;
            case '>=': return realTime >= msVal;
            default: return Math.abs(realTime - msVal) < 10; // Equality with tolerance
        }
    };
};

const getStatValue = (solve: ComputedSolve, solves: ComputedSolve[], index: number, stat: StatConfig): number | null => {
    if (stat.type === StatType.SINGLE) {
        if (solve.penalty === Penalty.DNF) return DNF_VALUE;
        return solve.time + (solve.penalty === Penalty.PLUS_TWO ? 2000 : 0);
    }
    // For pre-calculated stats in ComputedSolve
    if (stat.type === StatType.MEAN && stat.size === 3) return solve.stats.mean3;
    if (stat.type === StatType.AVERAGE && stat.size === 5) return solve.stats.avg5;
    if (stat.type === StatType.AVERAGE && stat.size === 12) return solve.stats.avg12;

    // Expensive calculation for custom columns during sort - minimize usage in large lists
    // We have to calculate it relative to the list.
    // Since `solves` passed here is the FULL list in reverse chronological order, index matches
    const endIndex = index + stat.size;
    if (endIndex > solves.length) return null;
    const window = solves.slice(index, endIndex).reverse();

    switch(stat.type) {
        case StatType.MEAN: return calculateMean(window, stat.size);
        case StatType.AVERAGE: return calculateAverage(window, stat.size);
        case StatType.STD_DEV: return calculateStandardDeviation(window, stat.size);
        case StatType.SUCCESS_RATE: return calculateSuccessRate(window, stat.size);
        case StatType.WEIGHTED_AVG: return calculateWeightedAverage(window, stat.size);
        default: return null;
    }
};

export const TimeList = forwardRef<TimeListHandle, TimeListProps>(({ 
  solves, selectedIds, lastClickedId, precision, paginationEnabled, pageSize, columns, pbVisuals, theme, language,
  onSelect, onDelete, onPenalty, onDetails, onMove, onDuplicate, className, sessionLocked
}, ref) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter State
  const [filterText, setFilterText] = useState('');
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Sort State
  const [sortColId, setSortColId] = useState<string | null>(null);
  const [sortDesc, setSortDesc] = useState(true); // Default: newest/largest first

  // Dropup Menu State
  const [activeMenu, setActiveMenu] = useState<'PENALTY' | 'STATUS' | 'MOVE' | 'DELETE' | null>(null);

  useEffect(() => {
      const handleClickOutside = () => setActiveMenu(null);
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleMenu = (e: React.MouseEvent, menu: typeof activeMenu) => {
      e.stopPropagation();
      setActiveMenu(activeMenu === menu ? null : menu);
  };

  // --- Derived Data ---
  
  // Unique tags from solves
  const allTags = useMemo(() => {
      const tags = new Set<string>();
      solves.forEach(s => s.tags?.forEach(t => tags.add(t)));
      return Array.from(tags).sort();
  }, [solves]);

  // Filter & Sort
  const processedSolves = useMemo(() => {
      // 1. Filter
      let result = solves.map((s, originalIndex) => ({ solve: s, originalIndex })); // Keep original index for accurate stat calc if needed
      
      if (filterText) {
          const predicate = parseTimeExpression(filterText);
          if (predicate) {
              result = result.filter(({ solve }) => predicate(solve.time, solve.penalty));
          }
      }
      
      if (filterTags.size > 0) {
          result = result.filter(({ solve }) => 
              solve.tags && Array.from(filterTags).every(t => solve.tags!.includes(t))
          );
      }

      // 2. Sort
      if (sortColId) {
          const col = columns.find(c => c.id === sortColId);
          if (col) {
              result.sort((a, b) => {
                  const valA = getStatValue(a.solve, solves, a.originalIndex, col) ?? -Infinity;
                  const valB = getStatValue(b.solve, solves, b.originalIndex, col) ?? -Infinity;
                  
                  if (valA === valB) return 0;
                  
                  // Handle DNF (-1) for sorting: usually DNF is worst (largest)
                  const normA = valA === DNF_VALUE ? Infinity : valA;
                  const normB = valB === DNF_VALUE ? Infinity : valB;

                  return sortDesc ? normB - normA : normA - normB;
              });
          } else if (sortColId === 'index') {
             result.sort((a, b) => sortDesc ? a.originalIndex - b.originalIndex : b.originalIndex - a.originalIndex);
          }
      }

      return result;
  }, [solves, filterText, filterTags, sortColId, sortDesc, columns]);

  // --- Navigation Logic (Exposed via Ref) ---
  useImperativeHandle(ref, () => ({
      moveSelection: (direction, extend) => {
          if (processedSolves.length === 0) return null;
          
          // Find current "focus" index in the PROCESSED list
          let focusIndex = -1;
          if (lastClickedId) {
              focusIndex = processedSolves.findIndex(item => item.solve.id === lastClickedId);
          }

          // If no selection or not found, select first (or last if moving up?)
          if (focusIndex === -1) {
              if (processedSolves.length > 0) {
                  const target = processedSolves[0].solve.id;
                  onSelect(target, false, false);
                  return target;
              }
              return null;
          }

          const nextIndex = focusIndex + direction;
          if (nextIndex >= 0 && nextIndex < processedSolves.length) {
              const targetId = processedSolves[nextIndex].solve.id;
              onSelect(targetId, extend, extend); 
              ensureVisible(nextIndex);
              return targetId;
          }
          return null;
      }
  }));

  const ensureVisible = (index: number) => {
      if (!listRef.current) return;
      const top = index * ROW_HEIGHT;
      if (top < scrollTop) {
           listRef.current.scrollTo({ top: top, behavior: 'smooth' });
      } else if (top > scrollTop + containerHeight - ROW_HEIGHT) {
           listRef.current.scrollTo({ top: top - containerHeight + ROW_HEIGHT, behavior: 'smooth' });
      }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const observer = new ResizeObserver(entries => { if (entries[0]) setContainerHeight(entries[0].contentRect.height); });
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

  // Render Items Logic
  const paginatedItems = useMemo(() => {
      if (!paginationEnabled) return [];
      const start = (currentPage - 1) * pageSize;
      return processedSolves.slice(start, start + pageSize);
  }, [processedSolves, paginationEnabled, currentPage, pageSize]);

  const totalPages = Math.ceil(processedSolves.length / pageSize);

  const { virtualItems, totalHeight, offsetY } = useMemo(() => {
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
  
  const handleSort = (colId: string) => {
      if (sortColId === colId) {
          setSortDesc(!sortDesc);
      } else {
          setSortColId(colId);
          setSortDesc(true);
      }
  };
  
  const getLabel = (c: StatConfig) => {
      switch(c.type) {
          case StatType.SINGLE: return t('stat.single', language);
          case StatType.MEAN: return `mo${c.size}`;
          case StatType.AVERAGE: return `ao${c.size}`;
          case StatType.STD_DEV: return `σ${c.size}`;
          case StatType.SUCCESS_RATE: return `Suc${c.size === 0 ? '%' : c.size}`;
          case StatType.WEIGHTED_AVG: return `wa${c.size}`;
          default: return '';
      }
  };

  const gridStyleHeader = { gridTemplateColumns: `3rem ${columns.map(() => '1fr').join(' ')}` };

  // Selected solve details for context menus
  const firstSelectedSolve = useMemo(() => {
      const id = Array.from(selectedIds)[0]; 
      return solves.find(x => x.id === id);
  }, [selectedIds, solves]);

  const handleBulkPenalty = (p: Penalty) => {
      Array.from(selectedIds).forEach(id => {
          const s = solves.find(x => x.id === id);
          if (s) onPenalty(id, s.penalty === p ? Penalty.NONE : p);
      });
      setActiveMenu(null);
  };

  return (
    <div className={`flex flex-col bg-zinc-900 border-l border-zinc-800 ${className}`}>
      {/* Top Bar: Title & Filter */}
      <div className="p-2 border-b border-zinc-800 bg-zinc-900 z-10 shrink-0 flex flex-col gap-2">
        <div className="flex justify-between items-center">
             <div className="flex items-baseline gap-2">
                 <h2 className="font-bold text-zinc-100 text-md flex items-center gap-1">
                     Solves
                     {sessionLocked && <Lock size={12} className="text-amber-500" />}
                 </h2>
                 <span className="text-xs text-zinc-500 font-mono">
                     {processedSolves.length !== solves.length ? `${processedSolves.length}/${solves.length}` : solves.length}
                 </span>
             </div>
        </div>
        
        <div className="flex gap-2">
            <div className="relative flex-1">
                <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                <input 
                    type="text" 
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                    placeholder={t('list.filter.time', language)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded pl-7 pr-2 py-1 text-xs text-zinc-300 outline-none focus:border-blue-500"
                />
            </div>
            <button 
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={`p-1.5 rounded border ${filterTags.size > 0 ? 'bg-blue-900/30 border-blue-500 text-blue-300' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
            >
                <Tag size={12} />
            </button>
        </div>

        {showTagFilter && allTags.length > 0 && (
            <div className="flex flex-wrap gap-1 p-1 bg-zinc-950 rounded border border-zinc-800">
                {allTags.map(tag => (
                    <button
                        key={tag}
                        onClick={() => {
                            const next = new Set(filterTags);
                            if (next.has(tag)) next.delete(tag); else next.add(tag);
                            setFilterTags(next);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                            filterTags.has(tag) ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-500'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
                {filterTags.size > 0 && <button onClick={() => setFilterTags(new Set())} className="text-[10px] text-red-400 ml-auto px-1"><X size={10}/></button>}
            </div>
        )}
      </div>

      {/* Column Headers */}
      <div style={gridStyleHeader} className="grid gap-2 px-4 py-2 text-[10px] font-bold text-zinc-500 border-b border-zinc-800 shrink-0 bg-zinc-900 select-none">
        <div 
            className="cursor-pointer hover:text-zinc-300 flex items-center gap-1"
            onClick={() => handleSort('index')}
        >
            # {sortColId === 'index' && (sortDesc ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
        </div>
        {columns.map(c => (
            <div 
                key={c.id} 
                className="cursor-pointer hover:text-zinc-300 flex items-center gap-1 truncate"
                onClick={() => handleSort(c.id)}
            >
                {getLabel(c)} {sortColId === c.id && (sortDesc ? <ArrowDown size={10}/> : <ArrowUp size={10}/>)}
            </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={listRef} onScroll={paginationEnabled ? undefined : handleScroll}>
        {processedSolves.length === 0 ? (
            <div className="p-4 text-center text-zinc-600 text-xs italic">{t('list.empty', language)}</div>
        ) : paginationEnabled ? (
            <div className="w-full">
                {itemsToRender.map(({ solve, originalIndex }) => (
                    <TimeListRow key={solve.id} solve={solve} solves={solves} index={originalIndex} columns={columns} selected={selectedIds.has(solve.id)} theme={theme} pbVisuals={pbVisuals} precision={precision} onClick={(e) => onSelect(solve.id, e.ctrlKey || e.metaKey, e.shiftKey)} height={ROW_HEIGHT} />
                ))}
            </div>
        ) : (
            <div style={{ height: totalHeight }} className="w-full">
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {itemsToRender.map(({ solve, originalIndex }) => (
                        <TimeListRow key={solve.id} solve={solve} solves={solves} index={originalIndex} columns={columns} selected={selectedIds.has(solve.id)} theme={theme} pbVisuals={pbVisuals} precision={precision} onClick={(e) => onSelect(solve.id, e.ctrlKey || e.metaKey, e.shiftKey)} height={ROW_HEIGHT} />
                    ))}
                </div>
            </div>
        )}
      </div>
      
      {paginationEnabled && totalPages > 1 && (
          <div className="p-2 border-t border-zinc-800 flex items-center justify-center gap-4 bg-zinc-900 text-sm">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"><ChevronLeft size={20} /></button>
              <span className="text-zinc-400 font-mono">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
      )}

      {/* Selection Actions */}
      {selectedIds.size > 0 && (
          <div className="p-2 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 flex gap-2 justify-center items-center flex-wrap z-20">
              {selectedIds.size >= 1 && (
                 <>
                    {/* +2 Button Group */}
                    <div className="relative flex items-stretch rounded border border-zinc-700 bg-zinc-800 h-7">
                        <button 
                            disabled={sessionLocked}
                            onClick={() => handleBulkPenalty(Penalty.PLUS_TWO)}
                            className={`px-3 text-xs rounded-l hover:bg-zinc-700 font-medium ${firstSelectedSolve?.penalty === Penalty.PLUS_TWO ? 'text-blue-400' : 'text-zinc-300'} disabled:opacity-50`}
                        >
                            +2
                        </button>
                        <div className="w-px bg-zinc-700"></div>
                        <button 
                            disabled={sessionLocked}
                            onClick={(e) => toggleMenu(e, 'PENALTY')}
                            className="px-1 text-zinc-400 hover:bg-zinc-700 rounded-r disabled:opacity-50"
                        >
                            <ChevronUp size={12} />
                        </button>
                        {activeMenu === 'PENALTY' && (
                            <div 
                                className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[100px] flex flex-col z-50 max-h-[200px] overflow-y-auto custom-scrollbar"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {[2, 4, 6, 8, 10, 12, 14, 16].map(val => {
                                    const p = Penalty[`PLUS_${val === 2 ? 'TWO' : val === 4 ? 'FOUR' : val === 6 ? 'SIX' : val === 8 ? 'EIGHT' : val === 10 ? 'TEN' : val === 12 ? 'TWELVE' : val === 14 ? 'FOURTEEN' : 'SIXTEEN'}` as keyof typeof Penalty];
                                    return (
                                        <button 
                                            key={val}
                                            onClick={() => handleBulkPenalty(p)}
                                            className="px-3 py-2 hover:bg-zinc-700 text-left text-xs text-zinc-200 flex justify-between items-center"
                                        >
                                            <span>+{val}</span>
                                            {firstSelectedSolve?.penalty === p && <span className="text-blue-400">✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* DNF Button Group */}
                    <div className="relative flex items-stretch rounded border border-zinc-700 bg-zinc-800 h-7">
                        <button 
                            disabled={sessionLocked}
                            onClick={() => handleBulkPenalty(Penalty.DNF)}
                            className={`px-3 text-xs rounded-l hover:bg-zinc-700 font-medium ${firstSelectedSolve?.penalty === Penalty.DNF ? 'text-red-400' : 'text-zinc-300'} disabled:opacity-50`}
                        >
                            DNF
                        </button>
                        <div className="w-px bg-zinc-700"></div>
                        <button 
                            disabled={sessionLocked}
                            onClick={(e) => toggleMenu(e, 'STATUS')}
                            className="px-1 text-zinc-400 hover:bg-zinc-700 rounded-r disabled:opacity-50"
                        >
                            <ChevronUp size={12} />
                        </button>
                        {activeMenu === 'STATUS' && (
                            <div 
                                className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[100px] flex flex-col z-50"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button 
                                    onClick={() => handleBulkPenalty(Penalty.DNS)}
                                    className="px-3 py-2 hover:bg-zinc-700 text-left text-xs text-zinc-200 flex justify-between items-center"
                                >
                                    <span>DNS</span>
                                    {firstSelectedSolve?.penalty === Penalty.DNS && <span className="text-blue-400">✓</span>}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                 </>
              )}
               
               {selectedIds.size === 1 && (
                   <button onClick={() => onDetails(Array.from(selectedIds)[0])} className="h-7 px-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700">{t('btn.details', language)}</button>
               )}
               
               {/* Move Button Group */}
               <div className="relative flex items-stretch rounded border border-zinc-700 bg-zinc-800 h-7">
                    <button 
                        disabled={sessionLocked}
                        onClick={() => onMove(Array.from(selectedIds))} 
                        className="px-3 text-xs rounded-l hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                    >
                        Move
                    </button>
                    <div className="w-px bg-zinc-700"></div>
                    <button 
                        disabled={sessionLocked}
                        onClick={(e) => toggleMenu(e, 'MOVE')}
                        className="px-1 text-zinc-400 hover:bg-zinc-700 rounded-r disabled:opacity-50"
                    >
                        <ChevronUp size={12} />
                    </button>
                    {activeMenu === 'MOVE' && (
                        <div 
                            className="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[120px] flex flex-col z-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => { onDuplicate(Array.from(selectedIds)); setActiveMenu(null); }}
                                className="px-3 py-2 hover:bg-zinc-700 text-left text-xs text-zinc-200 flex items-center gap-2"
                            >
                                <Copy size={12} /> Duplicate...
                            </button>
                        </div>
                    )}
               </div>

               {/* Delete Button Group */}
               <div className="relative flex items-stretch rounded border border-red-900/30 bg-red-900/20 h-7">
                    <button 
                        disabled={sessionLocked}
                        onClick={() => onDelete(Array.from(selectedIds))} 
                        className="px-3 text-xs rounded-l hover:bg-red-900/40 text-red-400 disabled:opacity-50"
                    >
                        {t('btn.delete', language)}
                    </button>
                    <div className="w-px bg-red-900/30"></div>
                    <button 
                        disabled={sessionLocked}
                        onClick={(e) => toggleMenu(e, 'DELETE')}
                        className="px-1 text-red-400 hover:bg-red-900/40 rounded-r disabled:opacity-50"
                    >
                        <ChevronUp size={12} />
                    </button>
                    {activeMenu === 'DELETE' && (
                        <div 
                            className="absolute bottom-full right-0 mb-1 bg-zinc-800 border border-zinc-700 rounded shadow-xl py-1 min-w-[140px] flex flex-col z-50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button 
                                onClick={() => { 
                                    if(confirm('Are you sure you want to delete this data from ALL sessions?')) {
                                        onDelete(Array.from(selectedIds), true); 
                                    }
                                    setActiveMenu(null); 
                                }}
                                className="px-3 py-2 hover:bg-red-900/30 text-left text-xs text-red-400 flex items-center gap-2"
                            >
                                <Trash2 size={12} /> Delete Everywhere
                            </button>
                        </div>
                    )}
               </div>
          </div>
      )}
    </div>
  );
});

TimeList.displayName = 'TimeList';

export default TimeList;