
import React, { useMemo, useState } from 'react';
import { 
    Session, 
    Solve, 
    Settings, 
    Language, 
    AppTheme, 
    StatType, 
    Penalty,
    SolveMap,
    DateFormat
} from '../types';
import { t } from '../translations';
import { 
    X, 
    Database, 
    Calendar, 
    Clock, 
    ChevronLeft, 
    ChevronRight 
} from 'lucide-react';
import { 
    formatDuration, 
    formatTime, 
    getHeatmapData, 
    getDayName,
    isSameDay,
    calculateMean,
    calculateAverage,
    DNF_VALUE,
    formatDate
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
  Cell
} from 'recharts';

interface StatisticsModalProps {
  sessions: Session[];
  solvesMap: SolveMap;
  currentSessionId: string;
  settings: Settings;
  onClose: () => void;
}

type Tab = 'GLOBAL' | 'SESSION';
type HeatmapFilter = 'all' | 'year' | 'month';

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

// --- Sub-Component: Global Stats ---

const GlobalStatsView: React.FC<{ sessions: Session[], solvesMap: SolveMap, settings: Settings }> = ({ sessions, solvesMap, settings }) => {
    const [heatmapFilter, setHeatmapFilter] = useState<HeatmapFilter>('all');
    const [dailyMonthOffset, setDailyMonthOffset] = useState(0);
    
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
            if (s.penalty !== Penalty.DNF) {
                totalTime += s.time + (s.penalty === Penalty.PLUS_TWO ? 2000 : 0);
                validSolvesCount++;
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
                    <div className="text-zinc-500 text-xs uppercase font-bold mb-1">Total Sessions</div>
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
                    <div className="flex items-center gap-4">
                        <button onClick={() => setDailyMonthOffset(d => d - 1)} className="p-1 hover:bg-zinc-800 rounded"><ChevronLeft size={20} /></button>
                        <span className="font-mono w-32 text-center">
                            {viewDate.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={() => setDailyMonthOffset(d => d + 1)} className="p-1 hover:bg-zinc-800 rounded"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    {dailyData.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-zinc-600 italic">No solves this month</div>
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

const SessionStatsView: React.FC<{ sessions: Session[], solvesMap: SolveMap, initialSessionId: string, settings: Settings }> = ({ sessions, solvesMap, initialSessionId, settings }) => {
    const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
    const [subXThreshold, setSubXThreshold] = useState<number>(10);
    const [pbStatType, setPbStatType] = useState<StatType>(StatType.SINGLE);
    const [pbStatSize, setPbStatSize] = useState<number>(1);

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

    if (!session) return <div className="text-zinc-500 p-4">Session not found.</div>;

    // Sub-X
    const subXCount = solves.filter(s => s.penalty !== Penalty.DNF && (s.time + (s.penalty === Penalty.PLUS_TWO ? 2000 : 0)) < subXThreshold * 1000).length;
    const subXPercent = solves.length > 0 ? (subXCount / solves.length) * 100 : 0;

    // Penalty Stats
    const penaltyData = [
        { name: 'Clean', value: solves.filter(s => s.penalty === Penalty.NONE).length, color: themeColor },
        { name: '+2', value: solves.filter(s => s.penalty === Penalty.PLUS_TWO).length, color: '#fbbf24' },
        { name: 'DNF', value: solves.filter(s => s.penalty === Penalty.DNF).length, color: '#ef4444' }
    ].filter(d => d.value > 0);

    // Chart Data
    const chartData = solves.map((s, idx) => ({
        idx: idx + 1,
        time: s.penalty === Penalty.DNF ? null : (s.time + (s.penalty === Penalty.PLUS_TWO ? 2000 : 0)) / 1000,
    }));

    // PB History
    const pbHistory = useMemo(() => {
        const history: { solve: Solve, val: number }[] = [];
        let best = Infinity;
        
        for(let i = 0; i < solves.length; i++) {
            let val: number | null = null;
            
            if (pbStatType === StatType.SINGLE) {
                const s = solves[i];
                if (s.penalty !== Penalty.DNF) {
                    val = s.time + (s.penalty === Penalty.PLUS_TWO ? 2000 : 0);
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

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Session Selector */}
            <div className="flex gap-4 items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-400 font-bold text-sm uppercase">Select Session:</span>
                <select 
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-200 rounded px-3 py-1 outline-none"
                >
                    {sessions.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.solveIds.length})</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    {/* Sub X */}
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                        <h3 className="font-bold text-zinc-300 mb-3">{t('stats.subx.title', lang)}</h3>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-sm text-zinc-500">{t('stats.subx.label', lang)}:</span>
                            <input 
                                type="number" 
                                value={subXThreshold} 
                                onChange={e => setSubXThreshold(parseFloat(e.target.value))}
                                className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm font-mono"
                            />
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono text-zinc-100 font-bold">{subXCount}</span>
                            <span className="text-sm text-zinc-500">({subXPercent.toFixed(1)}%)</span>
                        </div>
                    </div>

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
                        <div className="flex justify-center gap-4 text-xs">
                            {penaltyData.map(d => (
                                <div key={d.name} className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                    <span className="text-zinc-400">{d.name} ({d.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Chart */}
                <div className="lg:col-span-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-96 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-zinc-300">{t('stats.chart.times', lang)}</h3>
                    </div>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                                <XAxis dataKey="idx" stroke="#52525b" fontSize={12} />
                                <YAxis stroke="#52525b" fontSize={12} domain={['dataMin', 'dataMax']} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
                                    labelStyle={{ color: '#a1a1aa' }}
                                    formatter={(val: number) => [val.toFixed(2), 'Time']}
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="time" 
                                    stroke={themeColor} 
                                    strokeWidth={2} 
                                    dot={false} 
                                    activeDot={{ r: 4 }} 
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
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
                            <option value={StatType.SINGLE}>Single</option>
                            <option value={StatType.MEAN}>Mean</option>
                            <option value={StatType.AVERAGE}>Average</option>
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
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Time</th>
                                <th className="px-4 py-2">Improvement</th>
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
                <SessionStatsView sessions={sessions} solvesMap={solvesMap} initialSessionId={currentSessionId} settings={settings} />
            )}
        </div>
      </div>
    </div>
  );
};

export default StatisticsModal;
