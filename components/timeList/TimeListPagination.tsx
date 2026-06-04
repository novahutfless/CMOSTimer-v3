import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

export const TimeListPagination: React.FC<TimeListPaginationProps> = ({
	currentPage,
	totalPages,
	onPrev,
	onNext
}) => {
	if (totalPages <= 1) return null;

	return (
		<div className="p-2 border-t flex items-center justify-center gap-4 text-sm" style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
			<button onClick={onPrev} disabled={currentPage === 1} className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"><ChevronLeft size={20} /></button>
			<span className="text-zinc-400 font-mono">{currentPage} / {totalPages}</span>
			<button onClick={onNext} disabled={currentPage === totalPages} className="p-1 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"><ChevronRight size={20} /></button>
		</div>
	);
};
