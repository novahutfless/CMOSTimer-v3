import React, { useMemo, useState } from 'react';
import { Solve, StatConfig, StatType, Penalty, PBVisualType, AppTheme, TimePrecision, Language } from '../../types';
import { 
	formatTime, 
	formatPercent,
	getStatLabel,
	getCurrentStatValue,
	getBestStatValue,
	calculateNextSolveTarget,
	getGeneratedByHeader,
	getThemeTextColorClass,
	DNF_VALUE,
} from '../../utils';
import { t } from '../../translations';

interface StatsPanelProps {
  config: StatConfig[];
  solves: Solve[]; // Sorted Oldest -> Newest
  theme: AppTheme;
  pbVisuals: PBVisualType;
  precision: TimePrecision;
  language?: Language;
}

type StatsPanelData = {
	config: StatConfig[];
	solves: Solve[];
	theme: AppTheme;
	pbVisuals: PBVisualType;
	precision: TimePrecision;
	language?: Language;
}

type StatValues = {
	current: number | null;
	best: number | null;
	bestWindow: Solve[] | null;
};

const getValues = (stat: StatConfig, history: Solve[]): StatValues => {
	const current = getCurrentStatValue(stat, history);
	const { best, bestWindow } = getBestStatValue(stat, history);
	return { current, best, bestWindow };
};

const StatsPanel: React.FC<StatsPanelProps> = (dta: StatsPanelData) => {
	const { config, solves, theme, pbVisuals, precision, language } = dta;
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

	const handleExport = (e: React.MouseEvent, stat: StatConfig, isBest: boolean): void => {
		if (stat.type === StatType.SUCCESS_RATE || stat.size === 0) return;
      
		const includeScrambles = !e.shiftKey;

		let window: Solve[] = [];
		let resultVal: number | null = null;
		const { current, best, bestWindow } = getValues(stat, solves);

		if (isBest) {
			if (!bestWindow) return;
			window = bestWindow;
			resultVal = best;
		} else {
			const history = [...solves]; // Chronological
			if (history.length < stat.size) return;
			window = history.slice(history.length - stat.size);
			resultVal = current;
		}
      
		const isFmc = [StatType.FMC_SINGLE, StatType.FMC_MEAN, StatType.FMC_AVERAGE].includes(stat.type);
		const formattedResult = resultVal === DNF_VALUE ? 'DNF' : isFmc ? `${resultVal} moves` : formatTime(resultVal!, Penalty.NONE, precision);
		const header = `${getGeneratedByHeader()}\n${getStatLabel(stat, language)}: ${formattedResult}`;
		const separator = '-'.repeat(16);
		const list = window.map((s, i) => {
			const timeStr = isFmc ? `${s.fmc?.moveCount ?? '-'} moves` : formatTime(s.time, s.penalty, precision);
			if (includeScrambles) {
				// Handle relay scrambles (array of arrays)
				const scrambleStr = s.scramble.map(part => part.join(' ')).join(' | ');
				return `${i + 1}. ${timeStr}   ${scrambleStr}`;
			}
			return `${i + 1}. ${timeStr}`;
		}).join('\n');

		const exportText = `${header}\n${separator}\n${list}`;
		navigator.clipboard.writeText(exportText);
		setCopyFeedback(stat.id + (isBest ? '_best' : '_curr'));
		setTimeout(() => setCopyFeedback(null), 1000);
	};

	const rows = useMemo(() => {
		return config.map(stat => {
			const { current, best } = getValues(stat, solves);
			const isPB = current !== null && best !== null && current === best && current !== DNF_VALUE;
			const fmt = (val: number | null): string => {
				if (val === null) return '-';
				if (val === DNF_VALUE) return 'DNF';
				if (stat.type === StatType.SUCCESS_RATE) return formatPercent(val);
				if ([StatType.FMC_SINGLE, StatType.FMC_MEAN, StatType.FMC_AVERAGE].includes(stat.type)) return Number.isInteger(val) ? `${val}` : val.toFixed(2);
				return formatTime(val, Penalty.NONE, precision);
			};

			let toBeat: number | null | 'IMPOSSIBLE' | 'ANY' = null;
			if (best && best !== DNF_VALUE && stat.type !== StatType.SUCCESS_RATE && ![StatType.FMC_SINGLE, StatType.FMC_MEAN, StatType.FMC_AVERAGE].includes(stat.type))
				toBeat = calculateNextSolveTarget(stat, solves, best);
          

			return {
				id: stat.id,
				config: stat,
				label: getStatLabel(stat, language),
				current: fmt(current),
				best: fmt(best),
				toBeat,
				isPB
			};
		});
	}, [config, solves, precision]);

	return (
		<div className="flex flex-col backdrop-blur-sm rounded-lg border p-2 shadow-lg min-w-[240px]" style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
			<div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-x-2 gap-y-1 text-xs mb-1 pb-1 border-b font-bold text-zinc-500 uppercase tracking-wider" style={{ borderColor: 'var(--widget-border)' }}>
				<div>Stat</div>
				<div className="text-right">Cur</div>
				<div className="text-right">Best</div>
				<div className="text-right" title="Time needed on next solve to beat PB">Next</div>
			</div>
			{rows.map(row => (
				<div 
					key={row.id} 
					className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-x-2 gap-y-1 text-sm rounded px-1 relative group"
				>
					<div className="font-bold text-zinc-400 text-xs pt-0.5 truncate">{row.label}</div>
                
					{/* Current Value Column */}
					<div 
						onClick={(e) => handleExport(e, row.config, false)}
						className={`text-right font-mono cursor-pointer hover:bg-[var(--widget-hover)] rounded px-1 relative truncate ${
							row.isPB && pbVisuals !== PBVisualType.NONE ? getThemeTextColorClass(theme) + ' font-bold' : 
								row.current === '-' ? 'text-zinc-600' : 
									row.current === 'DNF' ? 'text-red-400' : 'text-zinc-100'
						}`}
						title="Copy current details (Shift+Click for times only)"
					>
						{copyFeedback === row.id + '_curr' && <span className="absolute inset-0 bg-green-500 text-zinc-950 text-[10px] flex items-center justify-center rounded">{t('data.copied.short', language || Language.EN)}</span>}
						{row.current}
					</div>

					{/* Best Value Column */}
					<div 
						onClick={(e) => handleExport(e, row.config, true)}
						className={`text-right font-mono cursor-pointer hover:bg-[var(--widget-hover)] rounded px-1 relative truncate ${row.best === '-' ? 'text-zinc-700' : row.best === 'DNF' ? 'text-red-900' : 'text-zinc-400'}`}
						title="Copy best details (Shift+Click for times only)"
					>
						{copyFeedback === row.id + '_best' && <span className="absolute inset-0 bg-green-500 text-zinc-950 text-[10px] flex items-center justify-center rounded">{t('data.copied.short', language || Language.EN)}</span>}
						{row.best}
					</div>

					{/* To Beat Column */}
					<div className="text-right font-mono text-zinc-500 text-xs pt-0.5 truncate">
						{row.toBeat === 'IMPOSSIBLE' ? '-' : 
							row.toBeat === 'ANY' ? 'Any' :
								row.toBeat === null ? '' : 
									formatTime(row.toBeat as number, Penalty.NONE, precision)}
					</div>
				</div>
			))}
		</div>
	);
};

export default StatsPanel;


