
import React from 'react';
import { ComputedSolve, StatConfig, StatType, Penalty, TimePrecision, PBVisualType, AppTheme } from '../types';
import { formatTime, formatPercent, DNF_VALUE, calculateMean, calculateAverage, calculateStandardDeviation, calculateSuccessRate, calculateWeightedAverage, getSolveTime } from '../utils';
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

export const TimeListRow: React.FC<Props> = ({ solve, solves, index, columns, selected, theme, pbVisuals, precision, onClick, height }) => {
    const displayIndex = solves.length - index;
    const getThemeBgSelect = () => {
        switch(theme) {
            case AppTheme.BLUE: return 'bg-blue-900/30 text-blue-100';
            case AppTheme.GREEN: return 'bg-emerald-900/30 text-emerald-100';
            case AppTheme.ORANGE: return 'bg-orange-900/30 text-orange-100';
            case AppTheme.PURPLE: return 'bg-purple-900/30 text-purple-100';
            case AppTheme.ROSE: return 'bg-rose-900/30 text-rose-100';
            default: return 'bg-zinc-700/50 text-zinc-100';
        }
    };
    const getThemeColor = () => {
        switch(theme) {
            case AppTheme.BLUE: return 'text-blue-400';
            case AppTheme.GREEN: return 'text-emerald-400';
            case AppTheme.ORANGE: return 'text-orange-400';
            case AppTheme.PURPLE: return 'text-purple-400';
            case AppTheme.ROSE: return 'text-rose-400';
            default: return 'text-zinc-200';
        }
    };

    const calculateRowStat = (config: StatConfig): number | null => {
         if (config.type === StatType.SINGLE) {
             // Use centralized helper to ensure all penalties (+4, +16) are counted
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

    const renderCell = (config: StatConfig) => {
        const isPB = solve.historicalPBs?.[config.id];
        let content: React.ReactNode = '-';
        let isError = false;

        if (config.type === StatType.SINGLE) {
            // SINGLE: Use base time + penalty for display
            if (solve.penalty === Penalty.DNF) { content = 'DNF'; isError = true; }
            else if (solve.penalty === Penalty.DNS) { content = 'DNS'; isError = true; }
            else {
                content = formatTime(solve.time, solve.penalty, precision);
            }
        } else {
            // STATS: Use calculated value
            const val = calculateRowStat(config);
            if (val === null) content = '-';
            else if (val === DNF_VALUE) { content = 'DNF'; isError = true; }
            else if (config.type === StatType.SUCCESS_RATE) content = formatPercent(val);
            else content = formatTime(val, Penalty.NONE, precision);
        }

        if (content === '-') return <span className="text-zinc-700">-</span>;
        if (isError) return <span className="text-red-400/70 font-bold">{content}</span>;
        
        if (isPB && pbVisuals !== PBVisualType.NONE) {
            if (pbVisuals === PBVisualType.BADGE) {
                return (
                    <div className="flex items-center gap-1">
                        <span className={`font-bold ${getThemeColor()}`}>{content}</span>
                        <Star size={10} className={getThemeColor()} fill="currentColor" />
                    </div>
                );
            } else {
               return <span className={`font-bold ${getThemeColor()}`}>{content}</span>;
            }
        }
        return <span className="text-zinc-500">{content}</span>;
    };

    const gridStyle = { gridTemplateColumns: `3rem ${columns.map(() => '1fr').join(' ')}` };

    return (
        <div
            onClick={onClick}
            style={{ height, ...gridStyle }}
            className={`grid gap-2 px-4 items-center text-sm border-b border-zinc-800/50 cursor-pointer select-none transition-colors ${selected ? getThemeBgSelect() : 'text-zinc-300 hover:bg-zinc-800'}`}
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
