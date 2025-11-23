
import React, { useMemo } from 'react';
import { ComputedSolve, AppTheme, SolvesOverTimeConfig, SolvesOverTimeMode, DateFormat } from '../../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatDate } from '../../utils/date';

interface Props {
    solves: ComputedSolve[];
    theme: AppTheme;
    config: SolvesOverTimeConfig;
    onUpdate: (config: SolvesOverTimeConfig) => void;
    className?: string;
    dateFormat?: DateFormat;
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

export const SolvesOverTimeWidget: React.FC<Props> = ({ solves, theme, config, onUpdate, className, dateFormat = DateFormat.ISO }) => {
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

        if (mode !== 'SESSION' && mode !== 'LAST_X') {
            filtered = solves.filter(s => s.timestamp >= startTime);
        }

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
        if (approxBuckets > 100) {
             bucketSize = duration / 50; // fallback
        }

        const snapStart = Math.floor(startTime / bucketSize) * bucketSize;
        const snapEnd = Math.ceil(endTime / bucketSize) * bucketSize;

        for (let t = snapStart; t < snapEnd; t += bucketSize) {
            buckets[t] = 0;
        }

        filtered.forEach(s => {
            const b = Math.floor(s.timestamp / bucketSize) * bucketSize;
            if (buckets[b] !== undefined) {
                buckets[b]++;
            } else if (b >= snapStart && b <= snapEnd) {
                buckets[b] = (buckets[b] || 0) + 1;
            }
        });

        // 4. Format
        return Object.entries(buckets)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([ts, count]) => {
                const t = parseInt(ts);
                const date = new Date(t);
                let name = '';
                if (timeFormat.includes('HH:mm')) name = `${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`;
                else if (timeFormat === 'MMM dd') name = `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
                else if (timeFormat === 'MMM yyyy') name = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
                
                return {
                    timestamp: t,
                    name,
                    count,
                    fullLabel: `${formatDate(t, dateFormat)} ${date.toLocaleTimeString()}`
                };
            });

    }, [solves, mode, customDate, customCount, dateFormat]);

    return (
        <div className={`w-full h-full flex flex-col bg-zinc-900/80 rounded-lg border border-zinc-800 ${className}`}>
            {/* Header */}
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-t-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 whitespace-nowrap">
                       Activity
                    </h3>
                    <select 
                        value={mode} 
                        onChange={(e) => onUpdate({ ...config, mode: e.target.value as SolvesOverTimeMode })}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none truncate max-w-[100px]"
                    >
                        <option value="SESSION">Session</option>
                        <option value="1H">Last Hour</option>
                        <option value="24H">Last 24H</option>
                        <option value="7D">Last 7 Days</option>
                        <option value="30D">Last 30 Days</option>
                        <option value="1Y">Last Year</option>
                        <option value="SINCE">Since...</option>
                        <option value="LAST_X">Last X...</option>
                    </select>
                </div>
                
                {mode === 'SINCE' && (
                    <input 
                        type="date" 
                        value={customDate} 
                        onChange={e => onUpdate({ ...config, customDate: e.target.value })}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none w-20"
                    />
                )}
                {mode === 'LAST_X' && (
                    <div className="flex items-center gap-1">
                        <input 
                            type="number" 
                            value={customCount} 
                            onChange={e => onUpdate({ ...config, customCount: parseInt(e.target.value) || 10 })}
                            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] rounded px-1 py-0.5 outline-none w-10 text-center"
                        />
                    </div>
                )}
            </div>

            <div className="flex-1 w-full min-h-0 p-2">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                        No activity
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
                                    if (payload && payload.length > 0) {
                                        return payload[0].payload.fullLabel;
                                    }
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
