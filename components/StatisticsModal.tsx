

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { 
    Session, 
    Solve, 
    Settings, 
    Language, 
    AppTheme, 
    StatType, 
    Penalty,
    SolveMap,
    DateFormat,
    StatConfig
} from '../types';
import { t } from '../translations';
import { 
    X, 
    Database, 
    Calendar, 
    Clock, 
    ChevronLeft, 
    ChevronRight,
    Search,
    List,
    Activity,
    ZoomOut,
    Maximize2,
    Minimize2,
    BarChart2
} from 'lucide-react';
import { 
    formatDuration, 
    formatTime, 
    getHeatmapData, 
    getDayName,
    isSameDay,
    calculateMean,
    calculateAverage,
    calculateStandardDeviation,
    calculateSuccessRate,
    calculateWeightedAverage,
    DNF_VALUE,
    formatDate,
    getSolveTime,
    getISOWeek
} from '../utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceArea,
  BarChart,
  Bar
} from 'recharts';
import { DetailedStatsModal } from './DetailedStatsModal';

interface StatisticsModalProps {
  sessions: Session[];
  solvesMap: SolveMap;
  currentSessionId: string;
  settings: Settings;
  statsConfig: StatConfig[];
  onClose: () => void;
}

type Tab = 'GLOBAL' | 'SESSION';
type HeatmapFilter = 'all' | 'year' | 'month';
type Interval = 'day' | 'week' | 'month' | 'year';

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

const getStatLabel = (stat: StatConfig | { type: string, size: number, name?: string }) => {
    if ('name' in stat && stat.name) return stat.name;
    switch(stat.type) {
        case StatType.SINGLE: return 'Single';
        case StatType.MEAN: return `Mo${stat.size}`;
        case StatType.AVERAGE: return `Ao${stat.size}`;
        case StatType.STD_DEV: return `σ${stat.size}`;
        case StatType.SUCCESS_RATE: return stat.size === 0 ? 'Success %' : `Success ${stat.size}`;
        case StatType.WEIGHTED_AVG: return `Wa${stat.size}`;
        default: return '';
    }
};

// --- Sub-Component: Global Stats ---

const GlobalStatsView: React.FC<{ sessions: Session[], solvesMap: SolveMap, settings: Settings }> = ({ sessions, solvesMap, settings }) => {
    const [heatmapFilter, setHeatmapFilter] = useState<HeatmapFilter>('all');
    const [dailyMonthOffset, setDailyMonthOffset] = useState(0);
    const [showDetailed, setShowDetailed] = useState(false);
    
    const lang = settings.language || Language.EN;
    const themeColor = getThemeHex(settings.theme);

    // Collect all solves via ID maps
    const allSolves = useMemo(() => {
        return Object.values(solvesMap);
    }, [solvesMap]);

    const globalStats = useMemo(() => {
        const totalCount = allSolves.length;
        let totalTime = 0;
        let validSolvesCount = 0;
        
        allSolves.forEach(s => {
            if (s.penalty !== Penalty.DNF && s.penalty !== Penalty.DNS) {
                const t = getSolveTime(s);
                if (t !== null) {
                    totalTime += t;
                    validSolvesCount++;
                }
            }
        });

        return {
            count: totalCount,
            time: totalTime,
            avg: validSolvesCount > 0 ? totalTime / validSolvesCount : 0
        };
    }, [allSolves]);

    // Heatmap Data
    const { grid, max } = useMemo(() => getHeatmapData(allSolves, heatmapFilter), [allSolves, heatmapFilter]);

    // Daily Summary Data
    const viewDate = new Date();
    viewDate.setMonth(viewDate.getMonth() + dailyMonthOffset);
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    
    const dailyData = useMemo(() => {
        const data: { day: number, date: Date, sessions: Record<string, number>, total: number }[] = [];
        // Helper to map solve to session name
        const solveToSessionName = new Map<string, string>();
        sessions.forEach(s => {
            s.solveIds.forEach(id => solveToSessionName.set(id, s.name));
        });

        for(let i = 1; i <= daysInMonth; i++) {
            const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
            const daySessions: Record<string, number> = {};
            let total = 0;
            
            allSolves.forEach(s => {
                if (isSameDay(new Date(s.timestamp), d)) {
                    const sessName = solveToSessionName.get(s.id) || 'Unknown';
                    daySessions[sessName] = (daySessions[sessName] || 0) + 1;
                    total++;
                }
            });
            
            if (total > 0) {
                data.push({ day: i, date: d, sessions: daySessions, total });
            }
        }
        return data;
    }, [allSolves, dailyMonthOffset, sessions, daysInMonth, viewDate]);

    return (
        <div className="animate-in fade-in duration-300">
            {showDetailed && (
                <DetailedStatsModal 
                    sessions={sessions}
                    solvesMap={solvesMap}
                    settings={settings}
                    onClose={() => setShowDetailed(false)}
                />
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-zinc-500 text-xs uppercase font-bold mb-1">{t('stats.totalSolves', lang)}</div>
                    <div className="text-2xl md:text-3xl font-mono text-zinc-100">{globalStats.count.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-zinc-500 text-xs uppercase font-bold mb-1">{t('stats.totalTime', lang)}</div>
                    <div className="text-xl md:text-2xl font-mono text-zinc-100">{formatDuration(globalStats.time)}</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <div className="text-zinc-500 text-xs uppercase font-bold mb-1">{t('stats.avgTime', lang)}</div>
                    <div className="text-2xl md:text-3xl font-mono text-zinc-100">{formatTime(globalStats.avg)}</div>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 opacity-50">
                    <div className="text-zinc-500 text-xs uppercase font-bold mb-1">{t('stats.totalSessions', lang)}</div>
                    <div className="text-2xl md:text-3xl font-mono text-zinc-100">{sessions.length}</div>
                </div>
            </div>

            {/* Heatmap */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mb-6 overflow-x-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                        <Clock size={16} /> {t('stats.heatmap.title', lang)}
                    </h3>
                    <div className="flex bg-zinc-900 rounded p-1 gap-1">
                        {(['all', 'year', 'month'] as HeatmapFilter[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setHeatmapFilter(f)}
                                className={`px-3 py-1 text-xs rounded ${heatmapFilter === f ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {t(`stats.heatmap.${f}`, lang)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="min-w-[600px]">
                    <div className="grid grid-cols-[30px_repeat(24,1fr)] gap-1">
                        <div />
                        {Array.from({ length: 24 }).map((_, i) => (
                            <div key={i} className="text-[10px] text-zinc-600 text-center">{i}</div>
                        ))}
                        {grid.map((row, dayIdx) => (
                            <React.Fragment key={dayIdx}>
                                <div className="text-[10px] text-zinc-500 flex items-center">{getDayName(dayIdx, lang)}</div>
                                {row.map((val, hourIdx) => {
                                    const opacity = max > 0 ? (val / max) : 0;
                                    return (
                                        <div 
                                            key={hourIdx}
                                            className="aspect-square rounded-sm transition-all hover:scale-125 relative group"
                                            style={{
                                                backgroundColor: themeColor,
                                                opacity: Math.max(0.1, opacity),
                                                filter: val === 0 ? 'grayscale(100%) opacity(0.05)' : 'none'
                                            }}
                                        >
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-zinc-800 text-zinc-200 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none z-10 whitespace-nowrap border border-zinc-700">
                                                {val} solves
                                            </div>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* Daily Summary */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-96 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                        <Calendar size={16} /> {t('stats.daily.title', lang)}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowDetailed(true)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-zinc-300 transition-colors mr-2"
                        >
                            <List size={12} /> {t('stats.detailed.title', lang)}
                        </button>
                        <div className="h-4 w-px bg-zinc-800 mr-2"></div>
                        <button onClick={() => setDailyMonthOffset(d => d - 1)} className="p-1 hover:bg-zinc-800 rounded"><ChevronLeft size={20} /></button>
                        <span className="font-mono w-32 text-center text-sm">
                            {viewDate.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setDailyMonthOffset(d => d + 1)} className="p-1 hover:bg-zinc-800 rounded"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {dailyData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-zinc-600 italic">{t('stats.noSolvesMonth', lang)}</div>
                    ) : (
                        <div className="space-y-2">
                            {dailyData.reverse().map(d => (
                                <div key={d.day} className="flex gap-4 p-3 bg-zinc-900/50 rounded border border-zinc-800/50">
                                    <div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-zinc-800 pr-3">
                                        <span className="text-xl font-bold text-zinc-300">{d.day}</span>
                                        <span className="text-[10px] text-zinc-500 uppercase">
                                            {d.date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short' })}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(d.sessions).map(([name, count]) => (
                                                <div key={name} className="text-xs bg-zinc-800 px-2 py-1 rounded flex items-center gap-2 border border-zinc-700">
                                                    <span className="text-zinc-400">{name}</span>
                                                    <span className="font-bold text-zinc-200">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center">
                                        <span className="text-lg font-bold" style={{ color: themeColor }}>{d.total}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Sub-Component: Session Stats ---

const SessionStatsView: React.FC<{ sessions: Session[], solvesMap: SolveMap, initialSessionId: string, settings: Settings, statsConfig: StatConfig[] }> = ({ sessions, solvesMap, initialSessionId, settings, statsConfig }) => {
    const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
    const [pbStatType, setPbStatType] = useState<StatType>(StatType.SINGLE);
    const [pbStatSize, setPbStatSize] = useState<number>(1);
    const [sessionSearch, setSessionSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [graphStatId, setGraphStatId] = useState<string>('time_single');
    
    // New Charts State
    const [fullscreenChart, setFullscreenChart] = useState<'times' | 'frequency' | null>(null);
    const [freqInterval, setFreqInterval] = useState<Interval>('day');

    // Zoom State
    const [left, setLeft] = useState<string | number>('dataMin');
    const [right, setRight] = useState<string | number>('dataMax');
    const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
    const [refAreaRight, setRefAreaRight] = useState<string | number>('');

    const searchContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
                setShowSearch(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Reset zoom on session or stat change
    useEffect(() => {
        setLeft('dataMin');
        setRight('dataMax');
        setRefAreaLeft('');
        setRefAreaRight('');
    }, [selectedSessionId, graphStatId]);

    const zoom = () => {
        let l = refAreaLeft;
        let r = refAreaRight;

        if (l === r || r === '') {
            setRefAreaLeft('');
            setRefAreaRight('');
            return;
        }

        if (typeof l === 'number' && typeof r === 'number' && l > r) {
            [l, r] = [r, l];
        }

        setRefAreaLeft('');
        setRefAreaRight('');
        setLeft(l);
        setRight(r);
    };

    const zoomOut = () => {
        setLeft('dataMin');
        setRight('dataMax');
    };

    const lang = settings.language || Language.EN;
    const themeColor = getThemeHex(settings.theme);

    const session = sessions.find(s => s.id === selectedSessionId);

    const solves = useMemo(() => {
        if (!session) return [];
        return session.solveIds
            .map(id => solvesMap[id])
            .filter(Boolean)
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [session, solvesMap]);

    const totals = useMemo(() => {
        return solves.reduce((acc, s) => {
             const t = getSolveTime(s);
             if (t !== null && t !== DNF_VALUE) acc.time += t;
             if (s.inspectionTime > 0) acc.inspection += s.inspectionTime;
             return acc;
        }, { time: 0, inspection: 0 });
    }, [solves]);

    const filteredSessions = useMemo(() => {
        return sessions.filter(s => s.name.toLowerCase().includes(sessionSearch.toLowerCase()));
    }, [sessions, sessionSearch]);

    // Fix: Only include default "Single" if not present in statsConfig
    const availableStats = useMemo(() => {
        const hasSingle = statsConfig.some(s => s.type === StatType.SINGLE);
        const base = hasSingle ? [] : [{ id: 'time_single', type: StatType.SINGLE, size: 1, name: 'Single' }];
        return [...base, ...statsConfig.map(s => ({...s, name: getStatLabel(s)}))];
    }, [statsConfig]);

    // Chart Data Logic
    const chartData = useMemo(() => {
        const selectedStat = availableStats.find(s => s.id === graphStatId) || availableStats[0];
        if (!selectedStat) return [];
        const isPercent = selectedStat.type === StatType.SUCCESS_RATE;

        return solves.map((s, idx) => {
            let val: number | null = null;
            
            if (selectedStat.type === StatType.SINGLE) {
                 val = getSolveTime(s);
                 if (val === null && s.penalty === Penalty.DNF) val = null; 
            } else {
                if (idx >= selectedStat.size - 1) {
                    const window = solves.slice(idx - selectedStat.size + 1, idx + 1);
                    if (selectedStat.type === StatType.MEAN) val = calculateMean(window, selectedStat.size);
                    else if (selectedStat.type === StatType.AVERAGE) val = calculateAverage(window, selectedStat.size);
                    else if (selectedStat.type === StatType.STD_DEV) val = calculateStandardDeviation(window, selectedStat.size);
                    else if (selectedStat.type === StatType.SUCCESS_RATE) val = calculateSuccessRate(window, selectedStat.size);
                    else if (selectedStat.type === StatType.WEIGHTED_AVG) val = calculateWeightedAverage(window, selectedStat.size);
                }
            }
            
            if (val === DNF_VALUE) val = null;

            return {
                idx: idx + 1,
                val: (val !== null) ? (isPercent ? val * 100 : val / 1000) : null
            };
        });
    }, [solves, graphStatId, availableStats]);

    // Frequency Chart Data
    const solveFrequencyData = useMemo(() => {
        if (solves.length === 0) return [];
        
        const buckets: Record<number, number> = {};
        const getBucketTime = (ts: number) => {
            const d = new Date(ts);
            d.setHours(0,0,0,0); // Reset time part for Day granularity base
            if (freqInterval === 'week') {
                const day = d.getDay() || 7; // ISO week start (Mon=1, Sun=7)
                if (day !== 1) d.setHours(-24 * (day - 1));
            } else if (freqInterval === 'month') {
                d.setDate(1);
            } else if (freqInterval === 'year') {
                d.setMonth(0, 1);
            }
            return d.getTime();
        };

        const startTime = getBucketTime(solves[0].timestamp);
        const endTime = getBucketTime(solves[solves.length-1].timestamp);
        
        // Determine step
        let step = 24 * 3600 * 1000; // day
        if (freqInterval === 'week') step *= 7;
        // Month/Year steps vary, need logical loop

        let current = new Date(startTime);
        const end = new Date(endTime);
        
        // Fill buckets with 0
        while (current <= end) {
            buckets[current.getTime()] = 0;
            // Increment
            if (freqInterval === 'day') current.setDate(current.getDate() + 1);
            else if (freqInterval === 'week') current.setDate(current.getDate() + 7);
            else if (freqInterval === 'month') current.setMonth(current.getMonth() + 1);
            else if (freqInterval === 'year') current.setFullYear(current.getFullYear() + 1);
        }

        solves.forEach(s => {
            const b = getBucketTime(s.timestamp);
            if (buckets[b] !== undefined) buckets[b]++;
        });

        return Object.entries(buckets)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
            .map(([ts, count]) => {
                const t = parseInt(ts);
                const date = new Date(t);
                let label = '';
                if (freqInterval === 'day') label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                else if (freqInterval === 'week') label = `W${getISOWeek(date)}`;
                else if (freqInterval === 'month') label = date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
                else label = date.getFullYear().toString();

                return { time: t, count, label };
            });
    }, [solves, freqInterval]);

    if (!session) return <div className="text-zinc-500 p-4">{t('stats.sessionNotFound', lang)}</div>;

    // Penalty Stats
    const penaltyData = useMemo(() => {
        const cleanCount = solves.filter(s => s.penalty === Penalty.NONE).length;
        const plusTwoCount = solves.filter(s => s.penalty === Penalty.PLUS_TWO).length;
        const dnfCount = solves.filter(s => s.penalty === Penalty.DNF).length;
        const dnsCount = solves.filter(s => s.penalty === Penalty.DNS).length;
        const otherPlusCount = solves.filter(s => s.penalty.startsWith('PLUS_') && s.penalty !== Penalty.PLUS_TWO).length;

        return [
            { name: 'Clean', value: cleanCount, color: themeColor },
            { name: '+2', value: plusTwoCount, color: '#fbbf24' },
            { name: '+Misc', value: otherPlusCount, color: '#d97706' }, 
            { name: 'DNF', value: dnfCount, color: '#ef4444' },
            { name: 'DNS', value: dnsCount, color: '#9ca3af' }
        ].filter(d => d.value > 0);
    }, [solves, themeColor]);

    // PB History
    const pbHistory = useMemo(() => {
        const history: { solve: Solve, val: number }[] = [];
        let best = Infinity;
        
        for(let i = 0; i < solves.length; i++) {
            let val: number | null = null;
            
            if (pbStatType === StatType.SINGLE) {
                const s = solves[i];
                const t = getSolveTime(s);
                if (t !== null && t !== DNF_VALUE) {
                    val = t;
                }
            } else {
                if (i >= pbStatSize - 1) {
                    const subset = solves.slice(0, i + 1);
                    if (pbStatType === StatType.MEAN) val = calculateMean(subset, pbStatSize);
                    if (pbStatType === StatType.AVERAGE) val = calculateAverage(subset, pbStatSize);
                }
            }

            if (val !== null && val !== DNF_VALUE && val < best) {
                best = val;
                history.push({ solve: solves[i], val });
            }
        }
        return history.reverse();
    }, [solves, pbStatType, pbStatSize]);

    const toggleFullscreen = (chart: 'times' | 'frequency') => {
        setFullscreenChart(prev => prev === chart ? null : chart);
    };

    const renderChartContainer = (type: 'times' | 'frequency', content: React.ReactNode) => {
        const isFull = fullscreenChart === type;
        if (isFull) {
            return (
                <div className="fixed inset-0 z-[100] bg-zinc-900 p-6 flex flex-col">
                    {content}
                </div>
            );
        }
        return content;
    };

    // --- Render Fragments ---

    const SolveTimesChart = (
        <div className={`bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col select-none transition-all ${fullscreenChart === 'times' ? 'h-full w-full' : 'h-96'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                    <Activity size={16} />
                    {t('stats.chart.times', lang)}
                </h3>
                <div className="flex items-center gap-2">
                    {left !== 'dataMin' && (
                        <button 
                            onClick={zoomOut}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                        >
                            <ZoomOut size={12} /> Reset Zoom
                        </button>
                    )}
                    <select 
                        value={graphStatId}
                        onChange={e => setGraphStatId(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none max-w-[120px]"
                    >
                        {availableStats.map(stat => (
                            <option key={stat.id} value={stat.id}>{stat.name}</option>
                        ))}
                    </select>
                    <button onClick={() => toggleFullscreen('times')} className="p-1 hover:text-white text-zinc-500">
                        {fullscreenChart === 'times' ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                        data={chartData}
                        onMouseDown={(e) => !fullscreenChart && e && setRefAreaLeft(e.activeLabel)}
                        onMouseMove={(e) => !fullscreenChart && e && refAreaLeft && setRefAreaRight(e.activeLabel)}
                        onMouseUp={zoom}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis 
                            dataKey="idx" 
                            stroke="#52525b" 
                            fontSize={12} 
                            domain={[left, right]} 
                            type="number"
                            allowDataOverflow
                        />
                        <YAxis stroke="#52525b" fontSize={12} domain={['auto', 'auto']} allowDataOverflow={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                            labelStyle={{ color: '#a1a1aa' }}
                            formatter={(val: number) => [val.toFixed(2), 'Time']}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="val" 
                            stroke={themeColor} 
                            strokeWidth={2} 
                            dot={false} 
                            activeDot={{ r: 4 }} 
                            isAnimationActive={left === 'dataMin'}
                        />
                        {refAreaLeft && refAreaRight ? (
                            <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#60a5fa" fillOpacity={0.1} />
                        ) : null}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const FrequencyChart = (
        <div className={`bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col select-none transition-all ${fullscreenChart === 'frequency' ? 'h-full w-full' : 'h-80'}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-zinc-300 flex items-center gap-2">
                    <BarChart2 size={16} />
                    {t('stats.freq.title', lang)}
                </h3>
                <div className="flex items-center gap-2">
                    <div className="flex bg-zinc-950 rounded p-0.5 border border-zinc-800">
                        {(['day', 'week', 'month', 'year'] as Interval[]).map(int => (
                            <button
                                key={int}
                                onClick={() => setFreqInterval(int)}
                                className={`px-2 py-0.5 text-[10px] uppercase rounded font-bold transition-colors ${freqInterval === int ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {t(`stats.freq.${int}`, lang)}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => toggleFullscreen('frequency')} className="p-1 hover:text-white text-zinc-500 ml-2">
                        {fullscreenChart === 'frequency' ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}
                    </button>
                </div>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={solveFrequencyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                            dataKey="label" 
                            stroke="#52525b" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            minTickGap={20}
                        />
                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                            cursor={{ fill: '#27272a' }}
                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                        />
                        <Bar dataKey="count" fill={themeColor} radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Fullscreen Overlays */}
            {fullscreenChart === 'times' && renderChartContainer('times', SolveTimesChart)}
            {fullscreenChart === 'frequency' && renderChartContainer('frequency', FrequencyChart)}

            {/* Session Selector with Search */}
            <div className="flex gap-4 items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800 relative" ref={searchContainerRef}>
                <span className="text-zinc-400 font-bold text-sm uppercase whitespace-nowrap">{t('stats.selectSession', lang)}:</span>
                <div className="relative flex-1">
                    <div 
                        className="flex items-center gap-2 cursor-text w-full"
                        onClick={() => { setShowSearch(true); }}
                    >
                        <Search size={16} className="text-zinc-500"/>
                        <input 
                            type="text"
                            value={sessionSearch}
                            onChange={(e) => { setSessionSearch(e.target.value); setShowSearch(true); }}
                            placeholder={session.name}
                            className="bg-transparent outline-none text-sm text-zinc-200 w-full placeholder-zinc-500"
                            onFocus={() => setShowSearch(true)}
                        />
                    </div>
                    {showSearch && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredSessions.length === 0 ? (
                                <div className="p-3 text-xs text-zinc-500 text-center">{t('stats.noSessions', lang)}</div>
                            ) : (
                                filteredSessions.map(s => (
                                    <div 
                                        key={s.id}
                                        onClick={() => { setSelectedSessionId(s.id); setShowSearch(false); setSessionSearch(''); }}
                                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-zinc-800 flex justify-between items-center ${s.id === selectedSessionId ? 'bg-zinc-800/50 text-blue-400' : 'text-zinc-300'}`}
                                    >
                                        <span className="truncate">{s.name}</span>
                                        <span className="text-xs text-zinc-500 font-mono ml-2">{s.solveIds.length}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                {!showSearch && <div className="text-xs text-zinc-500 font-mono">{session.solveIds.length} solves</div>}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                     <span className="text-zinc-500 text-xs uppercase font-bold">{t('stats.totalTime', lang)}</span>
                     <span className="text-xl font-mono text-zinc-200">{formatDuration(totals.time)}</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                     <span className="text-zinc-500 text-xs uppercase font-bold">{t('stats.totalInspection', lang)}</span>
                     <span className="text-xl font-mono text-zinc-200">{formatDuration(totals.inspection)}</span>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Penalty & small stats */}
                <div className="space-y-6">
                    {/* Penalty Pie */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-64 flex flex-col">
                        <h3 className="font-bold text-zinc-300 mb-2">{t('stats.chart.penalty', lang)}</h3>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={penaltyData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {penaltyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                                        itemStyle={{ color: '#e4e4e7' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center flex-wrap gap-4 text-xs">
                            {penaltyData.map(d => (
                                <div key={d.name} className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-zinc-400">{d.name} ({d.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chart Column */}
                <div className="lg:col-span-2 space-y-6">
                    {SolveTimesChart}
                </div>
            </div>

            {/* Frequency Chart */}
            <div>
                {FrequencyChart}
            </div>

            {/* PB History */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                    <h3 className="font-bold text-zinc-300">{t('stats.pb.title', lang)}</h3>
                    <div className="flex gap-2">
                        <select 
                            value={pbStatType} 
                            onChange={e => setPbStatType(e.target.value as StatType)}
                            className="bg-zinc-900 border border-zinc-700 text-xs rounded px-2 py-1 outline-none"
                        >
                            <option value={StatType.SINGLE}>{t('stat.single', lang)}</option>
                            <option value={StatType.MEAN}>{t('stat.mean', lang)}</option>
                            <option value={StatType.AVERAGE}>{t('stat.avg', lang)}</option>
                        </select>
                        {pbStatType !== StatType.SINGLE && (
                            <input 
                                type="number" 
                                value={pbStatSize} 
                                onChange={e => setPbStatSize(parseInt(e.target.value))}
                                className="w-12 bg-zinc-900 border border-zinc-700 text-xs rounded px-2 py-1" 
                            />
                        )}
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2">{t('details.date', lang)}</th>
                                <th className="px-4 py-2">{t('details.time', lang)}</th>
                                <th className="px-4 py-2">{t('stats.improvement', lang)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pbHistory.map((pb, idx) => {
                                const prev = idx < pbHistory.length - 1 ? pbHistory[idx + 1].val : null;
                                const diff = prev ? (prev - pb.val) : 0;
                                return (
                                    <tr key={pb.solve.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                                        <td className="px-4 py-2 font-mono text-zinc-400">
                                            {formatDate(pb.solve.timestamp, settings.dateFormat)}
                                        </td>
                                        <td className="px-4 py-2 font-bold font-mono" style={{ color: themeColor }}>
                                            {formatTime(pb.val)}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-green-400 text-xs">
                                            {prev ? `-${(diff / 1000).toFixed(3)}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                            {pbHistory.length === 0 && (
                                <tr><td colSpan={3} className="p-4 text-center text-zinc-500">No PBs found for this statistic</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

const StatisticsModal: React.FC<StatisticsModalProps> = ({ 
    sessions, 
    solvesMap,
    currentSessionId, 
    settings, 
    statsConfig,
    onClose 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('GLOBAL');
  const lang = settings.language || Language.EN;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
              <Database size={20} /> {t('stats.modal.title', lang)}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/30">
            {(['GLOBAL', 'SESSION'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
                      activeTab === tab ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                    {t(`stats.tab.${tab.toLowerCase()}`, lang)}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-900/50">
            {activeTab === 'GLOBAL' && (
                <GlobalStatsView sessions={sessions} solvesMap={solvesMap} settings={settings} />
            )}
            {activeTab === 'SESSION' && (
                <SessionStatsView sessions={sessions} solvesMap={solvesMap} initialSessionId={currentSessionId} settings={settings} statsConfig={statsConfig} />
            )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;