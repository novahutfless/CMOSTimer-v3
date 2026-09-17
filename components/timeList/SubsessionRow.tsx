import React from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { Language, Penalty, TimePrecision } from '../../types';
import { Subsession, formatDate, formatTime } from '../../utils';
import { t } from '../../translations';

interface Props {
	group: Subsession;
	expanded: boolean;
	precision: TimePrecision;
	language: Language;
	onClick: () => void;
	height: number;
}

export const SubsessionRow: React.FC<Props> = ({ group, expanded, precision, language, onClick, height }) => (
	<button
		type="button"
		onClick={onClick}
		className="w-full border-b bg-blue-950/20 px-4 text-left text-xs text-zinc-300 hover:bg-blue-900/30 transition-colors"
		style={{ height, borderColor: 'var(--widget-border)' }}
	>
		<div className="grid h-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
			<span className="flex min-w-0 items-center gap-2 font-medium">
				{expanded ? <ChevronDown size={14} className="shrink-0 text-blue-400" /> : <ChevronRight size={14} className="shrink-0 text-blue-400" />}
				<Layers size={13} className="shrink-0 text-blue-400" />
				<span className="truncate">{formatDate(group.startedAt)}</span>
			</span>
			<span className="font-mono text-zinc-400">{group.solves.length} {t('list.subsession.solveCount', language)}</span>
			<span className="font-mono text-zinc-300">{t('list.subsession.average', language)}: {group.averageTime === null ? 'DNF' : formatTime(group.averageTime, Penalty.NONE, precision)}</span>
		</div>
	</button>
);
