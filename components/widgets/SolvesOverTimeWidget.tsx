import React, { useMemo } from 'react';
import { ComputedSolve, AppTheme, SolvesOverTimeConfig, SolvesOverTimeMode, DateFormat, Language } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDate, getLocale } from '../../utils/date';
import { getThemeHex } from '../../utils';
import { t } from '../../translations';

interface Props {
    solves: ComputedSolve[];
    theme: AppTheme;
    config: SolvesOverTimeConfig;
    onUpdate: (config: SolvesOverTimeConfig) => void;
    className?: string;
    dateFormat?: DateFormat;
    language: Language;
}

export const SolvesOverTimeWidget: React.FC<Props> = ({ solves, theme, config, onUpdate, className, dateFormat = DateFormat.ISO, language }) => {
	const { mode, customDate, customCount } = config;

	const data = useMemo(() => {
		if (solves.length === 0) return [];

		// 1. Filter Solves
		const now = Date.now();
		let filtered = solves; // Solves are usually newest first in App
		let startTime = 0;
        
		switch(mode) {
		case 'SESSION': 
			// Finding min timestamp of current set
			startTime = Math.min(...solves.map(s => s.timestamp));
			break;
		case '1H': startTime = now - 3600 * 1000; break;
		case '24H': startTime = now - 24 * 3600 * 1000; break;
		case '7D': startTime = now - 7 * 24 * 3600 * 1000; break;
		case '30D': startTime = now - 30 * 24 * 3600 * 1000; break;
		case '1Y': startTime = now - 365 * 24 * 3600 * 1000; break;
		case 'SINCE': startTime = new Date(customDate).getTime(); break;
		case 'LAST_X': 
			if (solves.length > 0) {
				const subset = solves.slice(0, customCount); // newest first
				startTime = subset[subset.length - 1].timestamp;
				filtered = subset;
			}
			break;
		}

		if (mode !== 'SESSION' && mode !== 'LAST_X') 
			filtered = solves.filter(s => s.timestamp >= startTime);
        

		if (filtered.length === 0) return [];

		// Determine data range
		// For 'SESSION' and 'LAST_X', use the max timestamp in data as end
		// For fixed ranges (24H, etc), use 'now' as end
		const maxTs = Math.max(...filtered.map(s => s.timestamp));
		const endTime = (mode === 'SESSION' || mode === 'LAST_X') ? maxTs : now;
        
		// 2. Determine Bucket Size
		const duration = endTime - startTime;
		if (duration <= 0) return [];

		let bucketSize = 0;
		let timeFormat = '';

		if (duration <= 3600 * 1000) { // < 1h
			bucketSize = 60 * 1000; // 1 min
			timeFormat = 'HH:mm';
		} else if (duration <= 24 * 3600 * 1000) { // < 24h
			bucketSize = 15 * 60 * 1000; // 15 min
			if (duration > 6 * 3600 * 1000) bucketSize = 60 * 60 * 1000; // 1h
			timeFormat = 'HH:mm';
		} else if (duration <= 30 * 24 * 3600 * 1000) { // < 30d
			bucketSize = 24 * 3600 * 1000; // 1 day
			timeFormat = 'MMM dd';
		} else {
			// > 30d
			bucketSize = 7 * 24 * 3600 * 1000; // 1 week
			if (duration > 365 * 24 * 3600 * 1000) {
				bucketSize = 30 * 24 * 3600 * 1000; // ~1 month
				timeFormat = 'MMM yyyy';
			} else {
				timeFormat = 'MMM dd';
			}
		}

		// 3. Generate Buckets
		const buckets: Record<number, number> = {};
		// Limit bucket count to prevent performance issues
		const approxBuckets = Math.ceil(duration / bucketSize);
		if (approxBuckets > 100) 
			bucketSize = duration / 50; // fallback
        

		const snapStart = Math.floor(startTime / bucketSize) * bucketSize;
		const snapEnd = Math.ceil(endTime / bucketSize) * bucketSize;

		for (let t = snapStart; t < snapEnd; t += bucketSize) 
			buckets[t] = 0;
        

		filtered.forEach(s => {
			const b = Math.floor(s.timestamp / bucketSize) * bucketSize;
			if (buckets[b] !== undefined) 
				buckets[b]++;
			else if (b >= snapStart && b <= snapEnd) 
				buckets[b] = (buckets[b] || 0) + 1;
            
		});

		// 4. Format
		return Object.entries(buckets)
			.sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
			.map(([ts, count]) => {
				const t = parseInt(ts);
				const date = new Date(t);
				let name = '';
				if (timeFormat.includes('HH:mm')) name = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
				else if (timeFormat === 'MMM dd') name = `${date.toLocaleString(getLocale(language), { month: 'short' })} ${date.getDate()}`;
				else if (timeFormat === 'MMM yyyy') name = `${date.toLocaleString(getLocale(language), { month: 'short' })} ${date.getFullYear()}`;
                
				return {
					timestamp: t,
					name,
					count,
					fullLabel: `${formatDate(t, dateFormat)} ${date.toLocaleTimeString(getLocale(language))}`
				};
			});

	}, [solves, mode, customDate, customCount, dateFormat, language]);

	return (
		<div className={`w-full h-full flex flex-col rounded-lg border ${className}`} style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
			{/* Header */}
			<div className="p-2 border-b flex justify-between items-center rounded-t-lg" style={{ backgroundColor: 'var(--widget-surface-muted)', borderColor: 'var(--widget-border)' }}>
				<div className="flex items-center gap-2 flex-1 min-w-0">
					<h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
						{t('activity.title', language)}
					</h3>
					<select 
						value={mode} 
						onChange={(e) => onUpdate({ ...config, mode: e.target.value as SolvesOverTimeMode })}
						className="border text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none truncate max-w-[100px]"
						style={{ backgroundColor: 'var(--widget-surface-strong)', borderColor: 'var(--widget-border)' }}
					>
						<option value="SESSION">{t('activity.mode.session', language)}</option>
						<option value="1H">{t('activity.mode.lastHour', language)}</option>
						<option value="24H">{t('activity.mode.last24h', language)}</option>
						<option value="7D">{t('activity.mode.last7d', language)}</option>
						<option value="30D">{t('activity.mode.last30d', language)}</option>
						<option value="1Y">{t('activity.mode.lastYear', language)}</option>
						<option value="SINCE">{t('activity.mode.since', language)}</option>
						<option value="LAST_X">{t('activity.mode.lastX', language)}</option>
					</select>
				</div>
                
				{mode === 'SINCE' && (
					<input 
						type="date" 
						value={customDate} 
						onChange={e => onUpdate({ ...config, customDate: e.target.value })}
						className="border text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none w-20"
						style={{ backgroundColor: 'var(--widget-surface-strong)', borderColor: 'var(--widget-border)' }}
					/>
				)}
				{mode === 'LAST_X' && (
					<div className="flex items-center gap-1">
						<input 
							type="number" 
							value={customCount} 
							onChange={e => onUpdate({ ...config, customCount: parseInt(e.target.value) || 10 })}
							className="border text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none w-10 text-center"
							style={{ backgroundColor: 'var(--widget-surface-strong)', borderColor: 'var(--widget-border)' }}
						/>
					</div>
				)}
			</div>

			<div className="flex-1 w-full min-h-0 p-2">
				{data.length === 0 ? (
					<div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
						{t('activity.noData', language)}
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={data}>
							<CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
							<XAxis 
								dataKey="name" 
								stroke="#52525b" 
								fontSize={10} 
								tickLine={false}
								axisLine={false}
								minTickGap={30}
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
				)}
			</div>
		</div>
	);
};
