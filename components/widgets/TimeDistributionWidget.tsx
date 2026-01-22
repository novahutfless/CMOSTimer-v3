import React, { useMemo } from 'react';
import { ComputedSolve, TimeDistributionConfig, AppTheme, Penalty } from '../../types';
import { getSolveTime } from '../../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
    solves: ComputedSolve[];
    config: TimeDistributionConfig;
    theme: AppTheme;
    className?: string;
}

const getThemeHex = (theme: AppTheme) => {
	switch(theme) {
	case AppTheme.BLUE: return '#60a5fa';
	case AppTheme.GREEN: return '#34d399';
	case AppTheme.ORANGE: return '#fb923c';
	case AppTheme.PURPLE: return '#c084fc';
	case AppTheme.ROSE: return '#fb7185';
	default: return '#e4e4e7';
	}
};

export const TimeDistributionWidget: React.FC<Props> = ({ solves, config, theme, className }) => {
	const data = useMemo(() => {
		// 1. Select Window
		let window = solves;
		// Solves are passed in reverse chronological order (newest first)
		if (config.mode === 'LAST') 
			window = solves.slice(0, config.size);
        

		// 2. Filter Valid Times
		const times = window
			.filter(s => s.penalty !== Penalty.DNF)
			.map(s => {
				const t = getSolveTime(s);
				return t ? t / 1000 : 0;
			})
			.filter(t => t > 0);

		if (times.length === 0) return [];

		const min = Math.min(...times);
		const max = Math.max(...times);
		const range = max - min;

		// 3. Determine Bucket Size
		let bucketSize = 1; // 1 second
		if (range > 600)  // > 10 mins range
			bucketSize = 60; // 1 minute
		else if (range > 60)  // > 1 min range
			bucketSize = 10; // 10 seconds
        

		// 4. Bin Data
		const bins: Record<string, number> = {};
        
		const startBin = Math.floor(min / bucketSize) * bucketSize;
		const endBin = Math.floor(max / bucketSize) * bucketSize;

		for (let b = startBin; b <= endBin; b += bucketSize) 
			bins[b] = 0;
        

		times.forEach(t => {
			const b = Math.floor(t / bucketSize) * bucketSize;
			if (bins[b] !== undefined) bins[b]++;
		});

		return Object.entries(bins)
			.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
			.map(([timeStr, count]) => {
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
					count
				};
			});
	}, [solves, config]);

	if (data.length === 0) 
		return (
			<div className={`flex items-center justify-center w-full h-full text-zinc-500 text-xs ${className}`}>
                No Data
			</div>
		);
    

	return (
		<div className={`w-full h-full p-2 ${className}`}>
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
					/>
					<Bar dataKey="count" fill={getThemeHex(theme)} radius={[2, 2, 0, 0]} animationDuration={500} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
};