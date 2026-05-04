import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Language, StatConfig } from '../../types';
import { getStatLabel } from '../../utils';

interface TimeListColumnsProps {
  columns: StatConfig[];
  sortColId: string | null;
  sortDesc: boolean;
  onSort: (colId: string) => void;
  language: Language;
}

export const TimeListColumns: React.FC<TimeListColumnsProps> = ({
	columns,
	sortColId,
	sortDesc,
	onSort,
	language
}) => {
	const gridStyleHeader = { gridTemplateColumns: `3rem ${columns.map(() => '1fr').join(' ')}` };

	return (
		<div style={{ ...gridStyleHeader, backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }} className="grid gap-2 px-4 py-2 text-[10px] font-bold text-zinc-500 border-b shrink-0 select-none">
			<div
				className="cursor-pointer hover:text-zinc-300 flex items-center gap-1"
				onClick={() => onSort('index')}
			>
				# {sortColId === 'index' && (sortDesc ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
			</div>
			{columns.map(c => (
				<div
					key={c.id}
					className="cursor-pointer hover:text-zinc-300 flex items-center gap-1 truncate"
					onClick={() => onSort(c.id)}
				>
					{getStatLabel(c, language)} {sortColId === c.id && (sortDesc ? <ArrowDown size={10} /> : <ArrowUp size={10} />)}
				</div>
			))}
		</div>
	);
};
