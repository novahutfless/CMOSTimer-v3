import React from 'react';
import { ComputedSolve, StatConfig, StatType, Penalty, TimePrecision, PBVisualType, AppTheme } from '../types';
import { formatTime, formatPercent, DNF_VALUE, calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage, getSolveTime, getThemeSelectedSurfaceClass, getThemeTextColorClass } from '../utils';
import { Star } from 'lucide-react';

interface Props {
    solve: ComputedSolve;
    solves: ComputedSolve[]; 
    index: number; // absolute index in solves array
    columns: StatConfig[];
    selected: boolean;
    theme: AppTheme;
    pbVisuals: PBVisualType;
    precision: TimePrecision;
    onClick: (e: React.MouseEvent) => void;
    height: number;
}

export const TimeListRow: React.FC<Props> = (dta: Props) => {
	const { solve, solves, index, columns, selected, theme, pbVisuals, precision, onClick, height } = dta;
	const displayIndex = solves.length - index;
	const calculateRowStat = (config: StatConfig): number | null => {
		if (config.type === StatType.SINGLE) {
			// getSolveTime returns null for DNF/DNS
			const t = getSolveTime(solve);
			if (t === null) return DNF_VALUE;
			return t;
		}
		if (config.type === StatType.MEAN && config.size === 3) return solve.stats.mean3;
		if (config.type === StatType.AVERAGE && config.size === 5) return solve.stats.avg5;
		if (config.type === StatType.AVERAGE && config.size === 12) return solve.stats.avg12;

		const endIndex = index + config.size;
		if (endIndex > solves.length) return null;
		const window = solves.slice(index, endIndex).reverse(); 
         
		switch(config.type) {
		case StatType.MEAN: return calculateMean(window, config.size);
		case StatType.AVERAGE: return calculateAverage(window, config.size);
		case StatType.STD_DEV: return calculateStandardDeviation(window, config.size);
		case StatType.SUCCESS_RATE: return calculateSuccessRate(window, config.size);
		case StatType.WEIGHTED_AVG: return calculateWeightedAverage(window, config.size);
		default: return null;
		}
	};

	const renderCell = (config: StatConfig): React.ReactElement => {
		const isPB = solve.historicalPBs?.[config.id];
		let content: React.ReactNode = '-';
		let isError = false;

		if (config.type === StatType.SINGLE) {
			// SINGLE: Use base time + penalty for display
			if (solve.penalty === Penalty.DNF) {
				content = 'DNF'; isError = true; 
			} else if (solve.penalty === Penalty.DNS) {
				content = 'DNS'; isError = true; 
			} else {
				content = formatTime(solve.time, solve.penalty, precision);
			}
		} else {
			// STATS: Use calculated value
			const val = calculateRowStat(config);
			if (val === null) {
				content = '-';
			} else if (val === DNF_VALUE) {
				content = 'DNF'; isError = true; 
			} else if (config.type === StatType.SUCCESS_RATE) {
				content = formatPercent(val);
			} else {
				content = formatTime(val, Penalty.NONE, precision);
			}
		}

		if (content === '-') return <span className="text-zinc-700">-</span>;
		if (isError) return <span className="text-red-400/70 font-bold">{content}</span>;
        
		if (isPB && pbVisuals !== PBVisualType.NONE) 
			if (pbVisuals === PBVisualType.BADGE) 
				return (
					<div className="flex items-center gap-1">
						<span className={`font-bold ${getThemeTextColorClass(theme)}`}>{content}</span>
						<Star size={10} className={getThemeTextColorClass(theme)} fill="currentColor" />
					</div>
				);
			else 
				return <span className={`font-bold ${getThemeTextColorClass(theme)}`}>{content}</span>;
            
        
		return <span className="text-zinc-500">{content}</span>;
	};

	const gridStyle = { gridTemplateColumns: `3rem ${columns.map(() => '1fr').join(' ')}` };

	return (
		<div
			onClick={onClick}
			className={`grid gap-2 px-4 items-center text-sm border-b cursor-pointer select-none transition-colors ${selected ? getThemeSelectedSurfaceClass(theme) : 'text-zinc-300 hover:bg-[var(--widget-hover)]'}`}
			style={{ height, ...gridStyle, borderColor: 'var(--widget-border)' }}
		>
			<div className="opacity-50 font-mono">{displayIndex}</div>
			{columns.map((col) => (
				<div key={col.id} className="font-mono truncate">
					{renderCell(col)}
				</div>
			))}
		</div>
	);
};
