
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ComputedSolve, Penalty, TimePrecision, StatConfig, StatType, PBVisualType, AppTheme, Language } from '../types';
import { Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { t } from '../translations';
import { TimeListRow } from './TimeListRow';
import { DNF_VALUE } from '../utils';

interface TimeListProps {
  solves: ComputedSolve[];
  selectedIds: Set<string>;
  precision: TimePrecision;
  paginationEnabled: boolean;
  pageSize: number;
  columns: StatConfig[];
  pbVisuals: PBVisualType;
  theme: AppTheme;
  language: Language;
  onSelect: (id: string, multi: boolean, range: boolean) => void;
  onDelete: (ids: string[]) => void;
  onPenalty: (id: string, penalty: Penalty) => void;
  onDetails: (id: string) => void;
  className?: string;
}

const ROW_HEIGHT = 40; 
const OVERSCAN = 10;

const TimeList: React.FC<TimeListProps> = ({ 
  solves, selectedIds, precision, paginationEnabled, pageSize, columns, pbVisuals, theme, language,
  onSelect, onDelete, onPenalty, onDetails, className 
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!listRef.current) return;
    const observer = new ResizeObserver(entries => { if (entries[0]) setContainerHeight(entries[0].contentRect.height); });
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

  // Scroll to selection if controlled by keyboard
  useEffect(() => {
      if (selectedIds.size === 1) {
          const id = Array.from(selectedIds)[0];
          const index = solves.findIndex(s => s.id === id);
          if (index !== -1 && listRef.current) {
               const top = index * ROW_HEIGHT;
               if (top < scrollTop || top > scrollTop + containerHeight - ROW_HEIGHT) {
                   listRef.current.scrollTo({ top: top - containerHeight / 2, behavior: 'smooth' });
               }
          }
      }
  }, [selectedIds, solves, containerHeight]);

  useEffect(() => {
      if (!paginationEnabled && listRef.current && solves.length > 0 && scrollTop < 100) listRef.current.scrollTop = 0;
  }, [solves.length, paginationEnabled]);

  const paginatedItems = useMemo(() => {
      if (!paginationEnabled) return [];
      const start = (currentPage - 1) * pageSize;
      return solves.slice(start, start + pageSize).map((solve, index) => ({ solve, absoluteIndex: start + index }));
  }, [solves, paginationEnabled, currentPage, pageSize]);

  const totalPages = Math.ceil(solves.length / pageSize);

  const { virtualItems, totalHeight, offsetY } = useMemo(() => {
      if (paginationEnabled) return { virtualItems: [], totalHeight: 0, offsetY: 0 };
      const totalHeight = solves.length * ROW_HEIGHT;
      const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
      const endIndex = Math.min(solves.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT));
      const renderStart = Math.max(0, startIndex - OVERSCAN);
      const renderEnd = Math.min(solves.length, endIndex + OVERSCAN);
      
      const virtualItems = solves.slice(renderStart, renderEnd).map((solve, index) => ({ solve, absoluteIndex: renderStart + index }));
      const offsetY = renderStart * ROW_HEIGHT;
      return { virtualItems, totalHeight, offsetY };
  }, [solves, scrollTop, containerHeight, paginationEnabled]);

  const itemsToRender = paginationEnabled ? paginatedItems : virtualItems;
  const gridStyleHeader = { gridTemplateColumns: `3rem ${columns.map(() => '1fr').join(' ')}` };
  
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

  return (
    <div className={`flex flex-col bg-zinc-900 border-l border-zinc-800 ${className}`}>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900 z-10 shrink-0">
        <h2 className="font-bold text-zinc-100">Solves ({solves.length})</h2>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button onClick={() => onDelete(Array.from(selectedIds))} className="p-1.5 hover:bg-red-900/30 text-red-400 rounded transition"><Trash2 size={16} /></button>
          </div>
        )}
      </div>

      <div style={gridStyleHeader} className="grid gap-2 px-4 py-2 text-xs font-bold text-zinc-500 border-b border-zinc-800 shrink-0 bg-zinc-900">
        <div>#</div>
        {columns.map(c => <div key={c.id}>{getLabel(c)}</div>)}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative" ref={listRef} onScroll={paginationEnabled ? undefined : handleScroll}>
        {paginationEnabled ? (
            <div className="w-full">
                {itemsToRender.map(({ solve, absoluteIndex }) => (
                    <TimeListRow key={solve.id} solve={solve} solves={solves} index={absoluteIndex} columns={columns} selected={selectedIds.has(solve.id)} theme={theme} pbVisuals={pbVisuals} precision={precision} onClick={(e) => onSelect(solve.id, e.ctrlKey || e.metaKey, e.shiftKey)} height={ROW_HEIGHT} />
                ))}
            </div>
        ) : (
            <div style={{ height: totalHeight }} className="w-full">
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {itemsToRender.map(({ solve, absoluteIndex }) => (
                        <TimeListRow key={solve.id} solve={solve} solves={solves} index={absoluteIndex} columns={columns} selected={selectedIds.has(solve.id)} theme={theme} pbVisuals={pbVisuals} precision={precision} onClick={(e) => onSelect(solve.id, e.ctrlKey || e.metaKey, e.shiftKey)} height={ROW_HEIGHT} />
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

      {/* Action Bars */}
      {selectedIds.size === 1 && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 flex gap-2 justify-center items-center">
             <button onClick={() => { const id = Array.from(selectedIds)[0]; const s = solves.find(x => x.id === id); if(s) onPenalty(id, s.penalty === Penalty.PLUS_TWO ? Penalty.NONE : Penalty.PLUS_TWO); }} className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700">+2</button>
             <button onClick={() => { const id = Array.from(selectedIds)[0]; const s = solves.find(x => x.id === id); if(s) onPenalty(id, s.penalty === Penalty.DNF ? Penalty.NONE : Penalty.DNF); }} className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700 text-red-400">DNF</button>
             <div className="h-4 w-px bg-zinc-700 mx-2"></div>
             <button onClick={() => onDetails(Array.from(selectedIds)[0])} className="px-3 py-1.5 text-xs bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 rounded border border-blue-900/50 flex items-center gap-1"><FileText size={12}/> {t('btn.details', language)}</button>
             <button onClick={() => onDelete(Array.from(selectedIds))} className="px-3 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded border border-red-900/30 flex items-center gap-1"><Trash2 size={12}/> {t('btn.delete', language)}</button>
        </div>
      )}
      {selectedIds.size > 1 && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/90 backdrop-blur shrink-0 flex gap-2 justify-center items-center">
              <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>
               <button onClick={() => onDelete(Array.from(selectedIds))} className="px-3 py-1.5 text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded border border-red-900/30 flex items-center gap-1"><Trash2 size={12}/> {t('btn.delete', language)}</button>
          </div>
      )}
    </div>
  );
};

export default TimeList;
