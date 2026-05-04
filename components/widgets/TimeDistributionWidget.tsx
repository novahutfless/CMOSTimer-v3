import React, { useMemo, useState } from 'react';
import { ComputedSolve, TimeDistributionConfig, AppTheme, Penalty, Language } from '../../types';
import { getSolveTime, getThemeHex } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Timer, Search } from 'lucide-react';
import { t } from '../../translations';

interface Props {
    solves: ComputedSolve[];
    config: TimeDistributionConfig;
    theme: AppTheme;
    className?: string;
    onApplyFilter?: (filter: string) => void;
    language: Language;
}

type TimeDistributionWidgetData = {
	solves: ComputedSolve[];
	config: TimeDistributionConfig;
	theme: AppTheme;
	className?: string;
	onApplyFilter?: (filter: string) => void;
	language: Language;
}

type DistributionMode = 'solve' | 'inspection';

type DistributionPoint = {
	name: string;
	fullLabel: string;
	count: number;
	percentage: number;
	rangeStart: number;
	rangeEnd: number;
	solveIds: string[];
};
export const TimeDistributionWidget: React.FC<Props> = (dta: TimeDistributionWidgetData) => {
	const { solves, config, theme, className, onApplyFilter, language } = dta;
	const [distributionMode, setDistributionMode] = useState<DistributionMode>('solve');
	const data = useMemo(() => {
		// Filter solves to use
		let window: ComputedSolve[];
		if (config.mode === 'LAST') 
			window = solves.slice(0, config.size);
		else //config.mode === 'ALL'
			window = solves;

		const bucketInputs = window
			.map(solve => {
				if (distributionMode === 'inspection') {
					if (solve.inspectionTime < 0) return null;
					return { valueSeconds: solve.inspectionTime / 1000, solveId: solve.id };
				}

				if (solve.penalty === Penalty.DNF) return null;
				const t = getSolveTime(solve);
				if (!t || t <= 0) return null;
				return { valueSeconds: t / 1000, solveId: solve.id };
			})
			.filter((x): x is { valueSeconds: number; solveId: string } => x !== null);

		if (bucketInputs.length === 0)
			return [];

		const values = bucketInputs.map(x => x.valueSeconds);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const range = max - min;

		// Determine Bucket Size
		let bucketSize = 1; // 1 second
		if (range > 600) // > 10 mins range
			bucketSize = 60; // 1 minute
		else if (range > 60) // > 1 min range
			bucketSize = 10; // 10 seconds
        
		// Bin Data
		const bins: Record<string, { count: number; solveIds: string[] }> = {};
		const startBin = Math.floor(min / bucketSize) * bucketSize;
		const endBin = Math.floor(max / bucketSize) * bucketSize;

		for (let b = startBin; b <= endBin; b += bucketSize)
			bins[b] = { count: 0, solveIds: [] };
        
		bucketInputs.forEach(({ valueSeconds, solveId }) => {
			const b = Math.floor(valueSeconds / bucketSize) * bucketSize;
			if (bins[b] !== undefined) {
				bins[b].count++;
				bins[b].solveIds.push(solveId);
			}
		});

		const totalCount = bucketInputs.length;

		return Object.entries(bins)
			.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
			.map(([timeStr, value]): DistributionPoint => {
				const time = parseFloat(timeStr);
				let label = `${time}`;
				let fullLabel = `${time}-${time+bucketSize}s`;
                
				if (bucketSize >= 60) {
					label = `${Math.floor(time/60)}m`;
					fullLabel = `${Math.floor(time/60)}m`;
				} else if (bucketSize > 1) {
					label = `${time}s`;
				}

				return {
					name: label,
					fullLabel,
					count: value.count,
					percentage: totalCount > 0 ? (value.count / totalCount) * 100 : 0,
					rangeStart: time,
					rangeEnd: time + bucketSize,
					solveIds: value.solveIds
				};
			});
	}, [solves, config, distributionMode]);

	if (data.length === 0) {
		return (
			<div className={`flex items-center justify-center w-full h-full text-zinc-500 text-xs ${className}`}>
				{t('timeDist.noData', language)}
			</div>
		);
	}

	const handleBarClick = (point: DistributionPoint): void => {
		if (!onApplyFilter) return;

		if (distributionMode === 'inspection') {
			onApplyFilter(`ID[${point.solveIds.join(',')}]`);
			return;
		}

		onApplyFilter(`>=${point.rangeStart}&<${point.rangeEnd}`);
	};

	return (
		<div className={`group relative w-full h-full p-2 ${className}`}>
			<button
				type="button"
				onClick={() => setDistributionMode(prev => prev === 'solve' ? 'inspection' : 'solve')}
				className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded border px-2 py-1 text-[10px] text-zinc-300 opacity-0 transition-opacity hover:border-zinc-500 group-hover:opacity-100"
				style={{ backgroundColor: 'var(--widget-surface-strong)', borderColor: 'var(--widget-border)' }}
				title={distributionMode === 'solve' ? t('timeDist.switchInspection', language) : t('timeDist.switchSolve', language)}
			>
				{distributionMode === 'solve' ? <Search size={11} /> : <Timer size={11} />}
				{distributionMode === 'solve' ? t('timeDist.solve', language) : t('timeDist.inspection', language)}
			</button>
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
					<XAxis 
						dataKey="name" 
						stroke="#52525b" 
						fontSize={10} 
						tickLine={false}
						axisLine={false}
						interval="preserveStartEnd"
					/>
					<YAxis 
						stroke="#52525b" 
						fontSize={10} 
						tickLine={false}
						axisLine={false}
						allowDecimals={false}
					/>
					<Tooltip 
						cursor={{ fill: '#27272a' }}
						contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7', fontSize: '12px' }}
						labelFormatter={(label, payload) => {
							if (payload && payload.length > 0) 
								return payload[0].payload.fullLabel;
                            
							return label;
						}}
						formatter={(value, _name, item) => {
							const point = item?.payload as DistributionPoint | undefined;
							const pct = point ? point.percentage.toFixed(1) : '0.0';
							return [`${value} (${pct}%)`, t('timeDist.count', language)];
						}}
					/>
					<Bar
						dataKey="count"
						fill={getThemeHex(theme)}
						radius={[2, 2, 0, 0]}
						animationDuration={500}
						onClick={(entry) => {
							const point = (entry as { payload?: DistributionPoint })?.payload;
							if (point) handleBarClick(point);
						}}
						cursor="pointer"
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};
