

import React, { useState, useMemo } from 'react';
import { Session, Solve, Settings, Language, Penalty, SolveMap } from '../types';
import { t } from '../translations';
import { X, Search, ChevronLeft, ChevronRight, Calendar, Star } from 'lucide-react';
import { getISOWeek, formatTime, formatDuration, getSolveTime, DNF_VALUE } from '../utils';

interface Props {
    sessions: Session[];
    solvesMap: SolveMap;
    settings: Settings;
    onClose: () => void;
}

type Interval = 'day' | 'week' | 'month' | 'year';

interface SessionIntervalStats {
    name: string;
    count: number;
    validCount: number;
    sum: number;
    best: number;
}

export const DetailedStatsModal: React.FC<Props> = ({ sessions, solvesMap, settings, onClose }) => {
    const [selectedSessionId, setSelectedSessionId] = useState<string>('all');
    const [interval, setInterval] = useState<Interval>('day');
    const [sessionSearch, setSessionSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    const lang = settings.language || Language.EN;

    // 1. Calculate Global PBs for each session (to highlight bests in interval)
    const sessionPBs = useMemo(() => {
        const pbs: Record<string, number> = {};
        sessions.forEach(s => {
            let best = Infinity;
            s.solveIds.forEach(id => {
                const solve = solvesMap[id];
                if (solve) {
                    const t = getSolveTime(solve);
                    if (t !== null && t !== DNF_VALUE && t < best) best = t;
                }
            });
            if (best !== Infinity) pbs[s.id] = best;
        });
        return pbs;
    }, [sessions, solvesMap]);

    // 2. Filter Solves based on session selection
    const filteredSolves = useMemo(() => {
        let targetSolves: Solve[] = [];
        if (selectedSessionId === 'all') {
            targetSolves = Object.values(solvesMap);
        } else {
            const sess = sessions.find(s => s.id === selectedSessionId);
            if (sess) targetSolves = sess.solveIds.map(id => solvesMap[id]).filter(Boolean);
        }
        return targetSolves.sort((a, b) => a.timestamp - b.timestamp);
    }, [selectedSessionId, solvesMap, sessions]);

    // 3. Group Solves by Interval
    const groupedData = useMemo(() => {
        const groups: Record<string, Solve[]> = {};
        
        filteredSolves.forEach(s => {
            const d = new Date(s.timestamp);
            let key = '';
            
            if (interval === 'day') {
                key = d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
            } else if (interval === 'week') {
                const year = d.getFullYear();
                const week = getISOWeek(d);
                key = `Week ${week}, ${year}`;
            } else if (interval === 'month') {
                key = d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' });
            } else {
                key = d.getFullYear().toString();
            }

            if (!groups[key]) groups[key] = [];
            groups[key].push(s);
        });

        // Process each group into stats
        const rows = Object.entries(groups).map(([label, groupSolves]) => {
            let best = Infinity;
            let sum = 0;
            let count = 0;
            
            // Breakdown by session
            const sessionStats: Record<string, SessionIntervalStats> = {};

            // Pre-calc map for faster lookup inside loop
            const solveToSessionId = new Map<string, string>();
            
            sessions.forEach(sess => {
                sess.solveIds.forEach(sid => solveToSessionId.set(sid, sess.id));
            });

            groupSolves.forEach(s => {
                // Stats
                const t = getSolveTime(s);
                
                if (t !== null && t !== DNF_VALUE) {
                    if (t < best) best = t;
                    sum += t;
                    count++;
                }

                // Breakdown calculation
                const sessId = solveToSessionId.get(s.id);
                if (sessId) {
                    if (!sessionStats[sessId]) {
                        const sessName = sessions.find(sess => sess.id === sessId)?.name || 'Unknown';
                        sessionStats[sessId] = { name: sessName, count: 0, validCount: 0, sum: 0, best: Infinity };
                    }
                    
                    sessionStats[sessId].count++; // Increment Total Count

                    if (t !== null && t !== DNF_VALUE) {
                        sessionStats[sessId].validCount++; // Increment Valid Count
                        sessionStats[sessId].sum += t;
                        if (t < sessionStats[sessId].best) sessionStats[sessId].best = t;
                    }
                }
            });

            return {
                label,
                // Use last timestamp in group for sorting
                timestamp: groupSolves[groupSolves.length-1].timestamp,
                totalSolves: groupSolves.length,
                best: best === Infinity ? null : best,
                avg: count > 0 ? sum / count : null,
                totalTime: sum,
                sessionStats
            };
        });

        return rows.sort((a, b) => b.timestamp - a.timestamp); // Newest first
    }, [filteredSolves, interval, selectedSessionId, sessions, lang]);

    const filteredSessions = sessions.filter(s => s.name.toLowerCase().includes(sessionSearch.toLowerCase()));
    const currentSessionName = selectedSessionId === 'all' ? 'All Sessions' : sessions.find(s => s.id === selectedSessionId)?.name || 'Unknown';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center shrink-0">
                    <h2 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
                        <Calendar size={20} /> {t('stats.detailed.title', lang)}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20}/></button>
                </div>

                {/* Controls */}
                <div className="p-4 border-b border-zinc-800 bg-zinc-950/30 flex flex-wrap gap-4 items-center justify-between shrink-0">
                    
                    {/* Interval Tabs */}
                    <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        {(['day', 'week', 'month', 'year'] as Interval[]).map(int => (
                            <button
                                key={int}
                                onClick={() => setInterval(int)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${interval === int ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                {t(`stats.detailed.${int}`, lang)}
                            </button>
                        ))}
                    </div>

                    {/* Session Filter */}
                    <div className="relative w-64">
                        <div 
                            className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded px-3 py-2 cursor-pointer hover:border-zinc-500"
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            <span className="text-sm text-zinc-200 truncate">{currentSessionName}</span>
                            <Search size={14} className="text-zinc-500" />
                        </div>
                        
                        {showSearch && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                                <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900">
                                    <input 
                                        autoFocus
                                        type="text" 
                                        placeholder={t('session.search', lang)}
                                        value={sessionSearch}
                                        onChange={e => setSessionSearch(e.target.value)}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-200 outline-none"
                                    />
                                </div>
                                <div 
                                    onClick={() => { setSelectedSessionId('all'); setShowSearch(false); }}
                                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-zinc-800 ${selectedSessionId === 'all' ? 'text-blue-400' : 'text-zinc-300'}`}
                                >
                                    All Sessions
                                </div>
                                {filteredSessions.map(s => (
                                    <div 
                                        key={s.id}
                                        onClick={() => { setSelectedSessionId(s.id); setShowSearch(false); }}
                                        className={`px-4 py-2 text-sm cursor-pointer hover:bg-zinc-800 flex justify-between ${s.id === selectedSessionId ? 'text-blue-400' : 'text-zinc-300'}`}
                                    >
                                        <span className="truncate">{s.name}</span>
                                        <span className="text-xs text-zinc-500 font-mono">{s.solveIds.length}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Data Table */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    <div className="w-full text-left border-collapse">
                        <div className="grid grid-cols-[1.2fr_0.5fr_1fr_3fr] gap-4 text-xs font-bold text-zinc-500 uppercase mb-2 px-4 sticky top-0 bg-zinc-900 z-10 py-2">
                            <div>{t('details.date', lang)}</div>
                            <div className="text-right">{t('stats.detailed.count', lang)}</div>
                            <div className="text-right">{t('stats.detailed.totalTime', lang)}</div>
                            <div>{t('stats.detailed.breakdown', lang)}</div>
                        </div>
                        
                        <div className="space-y-2">
                            {groupedData.map((row, i) => {
                                return (
                                    <div key={i} className="grid grid-cols-[1.2fr_0.5fr_1fr_3fr] gap-4 items-start bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-4 hover:border-zinc-700 transition-colors">
                                        <div className="font-medium text-zinc-300 pt-1">{row.label}</div>
                                        
                                        <div className="text-right font-mono text-zinc-400 pt-1">{row.totalSolves}</div>
                                        
                                        <div className="text-right font-mono text-zinc-400 pt-1">
                                            {formatDuration(row.totalTime)}
                                        </div>

                                        <div className="text-xs text-zinc-500">
                                            <div className="flex flex-col gap-1">
                                                {Object.entries(row.sessionStats)
                                                    .sort((a,b) => b[1].count - a[1].count)
                                                    .map(([id, stats]: [string, SessionIntervalStats]) => {
                                                        // Calculate Mean of VALID solves
                                                        const avg = stats.validCount > 0 ? stats.sum / stats.validCount : null;
                                                        const isSessionPB = sessionPBs[id] && stats.best === sessionPBs[id];
                                                        
                                                        return (
                                                            <div key={id} className="bg-zinc-900 px-2 py-1.5 rounded border border-zinc-800 flex justify-between items-center group">
                                                                <span className="font-bold text-zinc-400 truncate max-w-[150px]" title={stats.name}>{stats.name}</span>
                                                                <div className="flex items-center gap-3 font-mono text-[10px]">
                                                                    <span className="bg-zinc-800 px-1 rounded text-zinc-500" title="Total Count">{stats.count}</span>
                                                                    <div className="flex items-center gap-0.5" title="Best">
                                                                        <span className={isSessionPB ? 'text-yellow-500 font-bold' : 'text-zinc-300'}>
                                                                            {stats.best !== Infinity ? formatTime(stats.best, Penalty.NONE, settings.timePrecision) : '-'}
                                                                        </span>
                                                                        {isSessionPB && <Star size={8} className="fill-yellow-500 text-yellow-500"/>}
                                                                    </div>
                                                                    <span className="text-zinc-500" title="Arithmetic Mean (Successful Solves)">
                                                                        {avg ? formatTime(avg, Penalty.NONE, settings.timePrecision) : '-'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                }
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {groupedData.length === 0 && (
                                <div className="text-center text-zinc-600 py-10 italic">No data for this range.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};