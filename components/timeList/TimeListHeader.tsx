import React from 'react';
import { Filter, Lock, Tag, X } from 'lucide-react';
import { Language } from '../../types';
import { t } from '../../translations';

interface TimeListHeaderProps {
  processedCount: number;
  totalCount: number;
  sessionLocked?: boolean;
  filterText: string;
  onFilterTextChange: (value: string) => void;
  showTagFilter: boolean;
  onToggleTagFilter: () => void;
  allTags: string[];
  filterTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  language: Language;
}

export const TimeListHeader: React.FC<TimeListHeaderProps> = ({
	processedCount,
	totalCount,
	sessionLocked,
	filterText,
	onFilterTextChange,
	showTagFilter,
	onToggleTagFilter,
	allTags,
	filterTags,
	onToggleTag,
	onClearTags,
	language
}) => (
	<div className="p-2 border-b border-zinc-800 bg-zinc-900 z-10 shrink-0 flex flex-col gap-2">
		<div className="flex justify-between items-center">
			<div className="flex items-baseline gap-2">
				<h2 className="font-bold text-zinc-100 text-md flex items-center gap-1">
					Solves
					{sessionLocked && <Lock size={12} className="text-amber-500" />}
				</h2>
				<span className="text-xs text-zinc-500 font-mono">
					{processedCount !== totalCount ? `${processedCount}/${totalCount}` : totalCount}
				</span>
			</div>
		</div>

		<div className="flex gap-2">
			<div className="relative flex-1">
				<Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
				<input
					type="text"
					value={filterText}
					onChange={e => onFilterTextChange(e.target.value)}
					placeholder={t('list.filter.time', language)}
					className="w-full bg-zinc-950 border border-zinc-800 rounded pl-7 pr-2 py-1 text-xs text-zinc-300 outline-none focus:border-blue-500"
				/>
			</div>
			<button
				onClick={onToggleTagFilter}
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
						onClick={() => onToggleTag(tag)}
						className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
							filterTags.has(tag) ? 'bg-blue-600 text-white border-blue-600' : 'bg-zinc-900 text-zinc-500 border-zinc-700 hover:border-zinc-500'
						}`}
					>
						{tag}
					</button>
				))}
				{filterTags.size > 0 && (
					<button onClick={onClearTags} className="text-[10px] text-red-400 ml-auto px-1">
						<X size={10} />
					</button>
				)}
			</div>
		)}
	</div>
);
