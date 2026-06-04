import React, { useMemo } from 'react';
import { Session, SolveMap, Penalty, TimePrecision, Language, DateFormat } from '../types';
import { t } from '../translations';
import { X, Trophy, Calendar, Clock, Zap, History, TrendingUp, Layers, Award } from 'lucide-react';
import { formatDuration, formatTime, getSolveTime, DNF_VALUE, formatDate } from '../utils';

interface Props {
    sessions: Session[];
    solvesMap: SolveMap;
    language?: Language;
    dateFormat?: DateFormat;
    onClose: () => void;
    year?: number;
}

export const RewindModal: React.FC<Props> = ({ sessions, solvesMap, language = Language.EN, dateFormat = DateFormat.ISO, onClose, year }) => {
	const targetYear = year || new Date().getFullYear();

	const stats = useMemo(() => {
		let totalSolves = 0;
		let totalTimeSolving = 0;
		let totalInspection = 0;
		let penaltyCount = 0; // +2s
		let dnfCount = 0;
		let pbCount = 0;
        
		let fastestSolve = { time: Infinity, session: '', scramble: '', date: 0 };
		let slowestSolve = { time: -Infinity, session: '', scramble: '', date: 0 };
        
		const solvesByDay: Record<string, number> = {};
		const solvesBySession: Record<string, number> = {}; // Count in target year
        
		// Iterate sessions to calculate PBs and gather solves
		sessions.forEach(session => {
			// We need to process chronologically to detect PBs
			// We also need previous years' solves to establish the baseline PB entering the year
			const chronologicalIds = [...session.solveIds].sort((a, b) => {
				return (solvesMap[a]?.timestamp || 0) - (solvesMap[b]?.timestamp || 0);
			});

			let currentPB = Infinity;
			let sessionSolveCountInYear = 0;

			chronologicalIds.forEach(id => {
				const solve = solvesMap[id];
				if (!solve) return;

				const solveDate = new Date(solve.timestamp);
				const solveYear = solveDate.getFullYear();
				const time = getSolveTime(solve);

				// Check for PB (Global logic per session)
				if (time !== null && time !== DNF_VALUE) {
					if (time < currentPB) {
						currentPB = time;
						// Only count as "PB Broken" if it happened this year
						if (solveYear === targetYear) 
							pbCount++;
                        
					}
				}

				// If strictly within target year, accumulate stats
				if (solveYear === targetYear) {
					totalSolves++;
					sessionSolveCountInYear++;

					// Penalties
					if (solve.penalty === Penalty.PLUS_TWO) penaltyCount++;
					if (solve.penalty === Penalty.DNF) dnfCount++;

					// Times
					if (time !== null && time !== DNF_VALUE) {
						totalTimeSolving += time;
						if (time < fastestSolve.time) {
							fastestSolve = { time, session: session.name, scramble: solve.scramble.map(s => s.join(' ')).join(' | '), date: solve.timestamp };
						}
						if (time > slowestSolve.time) {
							slowestSolve = { time, session: session.name, scramble: solve.scramble.map(s => s.join(' ')).join(' | '), date: solve.timestamp };
						}
					}

					// Inspection
					if (solve.inspectionTime > 0) 
						totalInspection += solve.inspectionTime;
                    
					// Daily Activity
					const dayKey = solveDate.toISOString().split('T')[0]!;
					solvesByDay[dayKey] = (solvesByDay[dayKey] || 0) + 1;
				}
			});

			if (sessionSolveCountInYear > 0) 
				solvesBySession[session.name] = sessionSolveCountInYear;
            
		});

		// Find maxes
		let mostSolvesDay = { date: '', count: 0 };
		Object.entries(solvesByDay).forEach(([date, count]) => {
			if (count > mostSolvesDay.count) mostSolvesDay = { date, count };
		});

		let mostSolvesSession = { name: '-', count: 0 };
		Object.entries(solvesBySession).forEach(([name, count]) => {
			if (count > mostSolvesSession.count) mostSolvesSession = { name, count };
		});

		return {
			totalSolves,
			totalTimeSolving,
			totalInspection,
			penaltyCount,
			dnfCount,
			pbCount,
			fastestSolve: fastestSolve.time === Infinity ? null : fastestSolve,
			slowestSolve: slowestSolve.time === -Infinity ? null : slowestSolve,
			mostSolvesDay,
			mostSolvesSession
		};
	}, [sessions, solvesMap, targetYear]);

	if (stats.totalSolves === 0)
		return (
			<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100]" onClick={onClose}>
				<div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center max-w-md" onClick={e => e.stopPropagation()}>
					<h2 className="text-2xl font-black text-zinc-200 mb-2">CMOS Rewind {targetYear}</h2>
					<p className="text-zinc-500 mb-6">No solves recorded for this year. Start solving to see your stats!</p>
					<button onClick={onClose} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-6 py-2 rounded-full font-bold">Close</button>
				</div>
			</div>
		);
    
	return (
		<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] overflow-y-auto p-4" onClick={onClose}>
			<div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500" onClick={e => e.stopPropagation()}>
                
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 tracking-tighter mb-2">
                        REWIND {targetYear}
					</h1>
					<p className="text-zinc-400 font-medium">Your Year in Cubing</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
					{/* Main Hero Stat */}
					<div className="col-span-1 md:col-span-3 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
						<div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
						<Trophy size={48} className="text-yellow-500 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
						<div className="text-6xl md:text-8xl font-black text-white mb-2 tracking-tighter">
							{stats.totalSolves.toLocaleString()}
						</div>
						<div className="text-zinc-500 uppercase tracking-widest font-bold text-sm">Total Solves</div>
					</div>

					{/* Time Stats */}
					<div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-colors">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-blue-900/30 rounded-xl text-blue-400"><Clock size={24} /></div>
							<span className="text-zinc-400 font-bold text-sm uppercase">Time Solving</span>
						</div>
						<div>
							<div className="text-3xl font-bold text-zinc-100">{formatDuration(stats.totalTimeSolving)}</div>
							<div className="text-xs text-zinc-500 mt-1">Total time spend solving puzzles</div>
						</div>
					</div>

					<div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-colors">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-purple-900/30 rounded-xl text-purple-400"><Zap size={24} /></div>
							<span className="text-zinc-400 font-bold text-sm uppercase">Inspection</span>
						</div>
						<div>
							<div className="text-3xl font-bold text-zinc-100">{formatDuration(stats.totalInspection)}</div>
							<div className="text-xs text-zinc-500 mt-1">Time spent planning your moves</div>
						</div>
					</div>

					<div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col justify-between relative overflow-hidden group hover:border-zinc-700 transition-colors">
						<div className="flex items-center gap-3 mb-4">
							<div className="p-2 bg-green-900/30 rounded-xl text-green-400"><TrendingUp size={24} /></div>
							<span className="text-zinc-400 font-bold text-sm uppercase">PBs Broken</span>
						</div>
						<div>
							<div className="text-4xl font-bold text-zinc-100">{stats.pbCount}</div>
							<div className="text-xs text-zinc-500 mt-1">{t('rewind.pbsSurpassed', language)}</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
					{/* Best Solve */}
					<div className="bg-gradient-to-br from-emerald-950/30 to-zinc-950 border border-emerald-900/30 p-6 rounded-3xl relative">
						<div className="flex items-start justify-between mb-6">
							<div>
								<div className="text-emerald-500 font-bold text-sm uppercase tracking-wider mb-1">Fastest Solve</div>
								<div className="text-5xl font-mono font-black text-white">
									{stats.fastestSolve ? formatTime(stats.fastestSolve.time, Penalty.NONE, TimePrecision.CENTI) : '-'}
								</div>
							</div>
							<Award className="text-emerald-500" size={32} />
						</div>
						{stats.fastestSolve && (
							<div className="space-y-2 text-sm text-zinc-400">
								<div className="flex items-center gap-2">
									<Layers size={14} /> {stats.fastestSolve.session}
								</div>
								<div className="flex items-center gap-2">
									<Calendar size={14} /> {formatDate(stats.fastestSolve.date, dateFormat)}
								</div>
								<div className="mt-3 p-3 bg-black/20 rounded-lg font-mono text-xs text-zinc-500 break-words">
									{stats.fastestSolve.scramble}
								</div>
							</div>
						)}
					</div>

					{/* Worst Solve */}
					<div className="bg-gradient-to-br from-red-950/30 to-zinc-950 border border-red-900/30 p-6 rounded-3xl relative">
						<div className="flex items-start justify-between mb-6">
							<div>
								<div className="text-red-500 font-bold text-sm uppercase tracking-wider mb-1">Slowest Solve</div>
								<div className="text-5xl font-mono font-black text-white">
									{stats.slowestSolve ? formatTime(stats.slowestSolve.time, Penalty.NONE, TimePrecision.CENTI) : '-'}
								</div>
							</div>
							<History className="text-red-500" size={32} />
						</div>
						{stats.slowestSolve && (
							<div className="space-y-2 text-sm text-zinc-400">
								<div className="flex items-center gap-2">
									<Layers size={14} /> {stats.slowestSolve.session}
								</div>
								<div className="flex items-center gap-2">
									<Calendar size={14} /> {formatDate(stats.slowestSolve.date, dateFormat)}
								</div>
								<div className="mt-3 p-3 bg-black/20 rounded-lg font-mono text-xs text-zinc-500 break-words">
									{stats.slowestSolve.scramble}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Dense Stats */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
						<div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Most Active Day</div>
						<div className="text-zinc-200 font-bold text-lg">{stats.mostSolvesDay.date || '-'}</div>
						<div className="text-zinc-500 text-xs">{stats.mostSolvesDay.count} solves</div>
					</div>
					<div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
						<div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Favorite Session</div>
						<div className="text-zinc-200 font-bold text-lg truncate" title={stats.mostSolvesSession.name}>{stats.mostSolvesSession.name}</div>
						<div className="text-zinc-500 text-xs">{stats.mostSolvesSession.count} solves</div>
					</div>
					<div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
						<div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Penalties (+2)</div>
						<div className="text-zinc-200 font-bold text-lg">{stats.penaltyCount}</div>
						<div className="text-zinc-500 text-xs">
							{stats.totalSolves > 0 ? ((stats.penaltyCount/stats.totalSolves)*100).toFixed(1) : 0}% rate
						</div>
					</div>
					<div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
						<div className="text-zinc-500 text-[10px] uppercase font-bold mb-1">DNFs</div>
						<div className="text-zinc-200 font-bold text-lg">{stats.dnfCount}</div>
						<div className="text-zinc-500 text-xs">
							{stats.totalSolves > 0 ? ((stats.dnfCount/stats.totalSolves)*100).toFixed(1) : 0}% rate
						</div>
					</div>
				</div>

				<div className="mt-8 flex justify-center">
					<button 
						onClick={onClose}
						className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors"
					>
						<X size={24} /> Close
					</button>
				</div>
			</div>
		</div>
	);
};
