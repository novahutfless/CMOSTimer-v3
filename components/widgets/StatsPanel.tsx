
import React, { useMemo, useState } from 'react';
import { Solve, StatConfig, StatType, Penalty, PBVisualType, AppTheme, TimePrecision } from '../../types';
import { 
	calculateMean, 
	calculateAverage, 
	calculateStandardDeviation, 
	calculateSuccessRate, 
	calculateWeightedAverage, 
	formatTime, 
	formatPercent,
	getSolveTime,
	DNF_VALUE
} from '../../utils';

interface StatsPanelProps {
  config: StatConfig[];
  solves: Solve[]; // Sorted newest first (actually Oldest -> Newest from App state logic)
  theme: AppTheme;
  pbVisuals: PBVisualType;
  precision: TimePrecision;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ config, solves, theme, pbVisuals, precision }) => {
	const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

	const getLabel = (stat: StatConfig) => {
		switch(stat.type) {
		case StatType.SINGLE: return 'Single';
		case StatType.MEAN: return `mo${stat.size}`;
		case StatType.AVERAGE: return `ao${stat.size}`;
		case StatType.STD_DEV: return `σ${stat.size}`;
		case StatType.SUCCESS_RATE: return stat.size === 0 ? 'Success %' : `Success ${stat.size}`;
		case StatType.WEIGHTED_AVG: return `wa${stat.size}`;
		default: return '';
		}
	};

	const calc = (window: Solve[], stat: StatConfig): number | null => {
		switch(stat.type) {
		case StatType.SINGLE: 
			if (window.length === 0) return null;
			const t = getSolveTime(window[0]);
			return t === null ? DNF_VALUE : t;
		case StatType.MEAN: return calculateMean(window, stat.size);
		case StatType.AVERAGE: return calculateAverage(window, stat.size);
		case StatType.STD_DEV: return calculateStandardDeviation(window, stat.size);
		case StatType.SUCCESS_RATE: return calculateSuccessRate(window, stat.size);
		case StatType.WEIGHTED_AVG: return calculateWeightedAverage(window, stat.size);
		default: return null;
		}
	};

	const getValues = (stat: StatConfig, history: Solve[]): { current: number | null, best: number | null, bestWindow: Solve[] | null } => {
		// history is passed as Chronological (Oldest -> Newest) from App.tsx

		// Current Value
		let currentVal: number | null = null;
		if (history.length > 0) 
			if (stat.type === StatType.SINGLE) {
				const newest = history[history.length - 1];
				if (newest) currentVal = calc([newest], stat);
			} else if (stat.type === StatType.SUCCESS_RATE && stat.size === 0) {
				currentVal = calculateSuccessRate(history, 0);
			} else {
				currentVal = calc(history, stat); 
			}
    

		// Best Value
		let bestVal: number | null = null;
		let bestWindow: Solve[] | null = null;
		const reqSize = stat.size || 1;
    
		if (history.length >= reqSize && stat.size !== 0) {
			let best = Infinity;
			let bestMax = -Infinity; // For Success Rate
			let found = false;
			const isHigherBetter = stat.type === StatType.SUCCESS_RATE;

			if (stat.type === StatType.SINGLE) 
				for(const s of history) {
					const t = getSolveTime(s) ?? DNF_VALUE;
					if (t !== DNF_VALUE) 
						if (t < best) { best = t; found = true; bestWindow = [s]; }
                 
				}
			else 
				for(let i = 0; i <= history.length - stat.size; i++) {
					const window = history.slice(i, i + stat.size); 
					const val = calc(window, stat);
					if (val !== null && val !== DNF_VALUE) 
						if (isHigherBetter) {
							if (val > bestMax) { bestMax = val; found = true; bestWindow = window; }
						} else {
							if (val < best) { best = val; found = true; bestWindow = window; }
						}
                 
				}
        
			if (found) bestVal = isHigherBetter ? bestMax : best;
		}

		return { current: currentVal, best: bestVal, bestWindow };
	};

	// Calculates the worst time needed on the next solve to beat the current PB
	const getRequiredTime = (stat: StatConfig, history: Solve[], currentPB: number | null): number | null | 'IMPOSSIBLE' | 'ANY' => {
		if (!currentPB || currentPB === DNF_VALUE) return null;
		const N = stat.size;
      
		// Need at least N-1 prior solves to calculate next average
		if (history.length < N - 1) return null; 

		// Get last N-1 solves (Recent history, since input is Chronological)
		const context = history.slice(history.length - (N - 1));
		const times = context.map(s => getSolveTime(s));

		// SINGLE
		if (stat.type === StatType.SINGLE) 
			return currentPB; 
      

		// MEAN
		if (stat.type === StatType.MEAN) {
			if (times.some(t => t === null)) return null; // If recent history has DNF, can't calculate mean
			const sum = (times as number[]).reduce((a, b) => a + b, 0);
			// (Sum + X) / N < PB  => X < PB*N - Sum
			const req = (currentPB * N) - sum;
			return req > 0 ? req : 'IMPOSSIBLE'; 
		}

		// AVERAGE (AoN)
		if (stat.type === StatType.AVERAGE) {
			// Treat DNF as Infinity for sorting
			const numTimes = times.map(t => t === null ? Infinity : t).sort((a, b) => a - b);
          
			// Only support standard 5% trim (1 for 5, 1 for 12)
			const numDiscard = Math.ceil(N * 0.05);
			if (numDiscard !== 1) return null; 

			// Check max DNF count in history. If > 1, next solve (worst case) will result in DNF.
			const dnfCount = numTimes.filter(t => t === Infinity).length;
			if (dnfCount > 1) return 'IMPOSSIBLE';

			// 1. Check if ANY (Worst case works)
			// Worst case: Next solve is Infinity (DNF).
			// If 0 DNFs in history, adding 1 DNF is fine (it gets trimmed).
			// Sum becomes sum of all current excluding min.
			if (dnfCount === 0) {
				const sumWorstCase = numTimes.slice(1).reduce((a, b) => a + b, 0);
				const avgWorstCase = sumWorstCase / (N - 2);
				if (avgWorstCase < currentPB) return 'ANY';
			}

			// 2. Check IMPOSSIBLE (Best case fails)
			// Best case: Next solve is 0.
			// If history has any DNF, 0 and DNF are trimmed.
			// If history has NO DNF, 0 and max(History) are trimmed.
          
			// If history has a DNF, max is Infinity.
			const sumBestCase = numTimes.slice(0, N - 2).reduce((a, b) => a + (b === Infinity ? 0 : b), 0);
          
			// If after dropping max(H) [or x=0 effectively pushes max out], we still have a DNF?
			// We checked dnfCount > 1 above.
			// If dnfCount == 1. Sorted: [..., Inf]. x=0. Set: [0, ..., Inf]. Trim 0, Inf.
			// Result valid.
          
			// Double check logic: numTimes is sorted H.
			// If x=0. Set is {0} + H. Sorted: 0, s_1, ..., s_{N-1}.
			// Trim 0 and s_{N-1}. Sum s_1...s_{N-2}.
			// If s_{N-1} is Infinity, it is trimmed.
			// So we just sum the first N-2 of numTimes.
          
			// If remaining sum has Infinity?
			if (numTimes.slice(0, N - 2).includes(Infinity)) return 'IMPOSSIBLE';
          
			const avgBestCase = sumBestCase / (N - 2);
			if (avgBestCase >= currentPB) return 'IMPOSSIBLE';

			// 3. Calculate Target
			// We need X such that it is a counting solve (not min, not max).
			// Sum = Sum(middle of H) + X.
			// Middle of H = H excluding min and max.
			const sumInnerHistory = numTimes.slice(1, N - 2).reduce((a, b) => a + b, 0);
          
			const targetTotal = currentPB * (N - 2);
			const result = targetTotal - sumInnerHistory;
          
			return result;
		}

		return null;
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

	const handleExport = (e: React.MouseEvent, stat: StatConfig, isBest: boolean) => {
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
      
		const header = `Generated by CMOSTimer v3\n${getLabel(stat)}: ${resultVal === DNF_VALUE ? 'DNF' : formatTime(resultVal!, Penalty.NONE, precision)}`;
		const separator = '-'.repeat(16);
		const list = window.map((s, i) => {
			const timeStr = formatTime(s.time, s.penalty, precision);
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
			const fmt = (val: number | null) => {
				if (val === null) return '-';
				if (val === DNF_VALUE) return 'DNF';
				if (stat.type === StatType.SUCCESS_RATE) return formatPercent(val);
				return formatTime(val, Penalty.NONE, precision);
			};

			let toBeat: number | null | 'IMPOSSIBLE' | 'ANY' = null;
			if (best && best !== DNF_VALUE && stat.type !== StatType.SUCCESS_RATE) 
				toBeat = getRequiredTime(stat, solves, best);
          

			return {
				id: stat.id,
				config: stat,
				label: getLabel(stat),
				current: fmt(current),
				best: fmt(best),
				toBeat,
				isPB
			};
		});
	}, [config, solves, precision]);

	return (
		<div className="flex flex-col bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-800 p-2 shadow-lg min-w-[240px]">
			<div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-x-2 gap-y-1 text-xs mb-1 pb-1 border-b border-zinc-800 font-bold text-zinc-500 uppercase tracking-wider">
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
						className={`text-right font-mono cursor-pointer hover:bg-zinc-800 rounded px-1 relative truncate ${
							row.isPB && pbVisuals !== PBVisualType.NONE ? getThemeColor() + ' font-bold' : 
								row.current === '-' ? 'text-zinc-600' : 
									row.current === 'DNF' ? 'text-red-400' : 'text-zinc-100'
						}`}
						title="Copy current details (Shift+Click for times only)"
					>
						{copyFeedback === row.id + '_curr' && <span className="absolute inset-0 bg-green-500 text-zinc-950 text-[10px] flex items-center justify-center rounded">Copied</span>}
						{row.current}
					</div>

					{/* Best Value Column */}
					<div 
						onClick={(e) => handleExport(e, row.config, true)}
						className={`text-right font-mono cursor-pointer hover:bg-zinc-800 rounded px-1 relative truncate ${row.best === '-' ? 'text-zinc-700' : row.best === 'DNF' ? 'text-red-900' : 'text-zinc-400'}`}
						title="Copy best details (Shift+Click for times only)"
					>
						{copyFeedback === row.id + '_best' && <span className="absolute inset-0 bg-green-500 text-zinc-950 text-[10px] flex items-center justify-center rounded">Copied</span>}
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
