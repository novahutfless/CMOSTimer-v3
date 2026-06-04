import React, { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, List } from 'lucide-react';
import { Language, Session, Settings, SolveMap } from '../../types';
import { t } from '../../translations';
import { formatDuration, formatTime, getDayName, getHeatmapData, getThemeHex, getLocale } from '../../utils';
import { buildDailySummaryData, buildGlobalStats, HeatmapFilter } from '../../utils/statistics';
import { DetailedStatsModal } from '../DetailedStatsModal';

interface GlobalStatsViewProps {
  sessions: Session[];
  solvesMap: SolveMap;
  settings: Settings;
}

export const GlobalStatsView: React.FC<GlobalStatsViewProps> = ({ sessions, solvesMap, settings }) => {
	const [heatmapFilter, setHeatmapFilter] = useState<HeatmapFilter>('all');
	const [dailyMonthOffset, setDailyMonthOffset] = useState(0);
	const [showDetailed, setShowDetailed] = useState(false);

	const lang = settings.language || Language.EN;
	const themeColor = getThemeHex(settings.theme);

	const allSolves = useMemo(() => Object.values(solvesMap), [solvesMap]);

	const globalStats = useMemo(() => buildGlobalStats(allSolves), [allSolves]);

	const { grid, max } = useMemo(() => getHeatmapData(allSolves, heatmapFilter), [allSolves, heatmapFilter]);

	const viewDate = new Date();
	viewDate.setMonth(viewDate.getMonth() + dailyMonthOffset);

	const dailyData = useMemo(() => buildDailySummaryData(allSolves, sessions, viewDate), [allSolves, sessions, viewDate]);

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
												{val} {t('stats.solves', lang)}
											</div>
										</div>
									);
								})}
							</React.Fragment>
						))}
					</div>
				</div>
			</div>

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
							{viewDate.toLocaleDateString(getLocale(lang), { month: 'long', year: 'numeric' })}
						</span>
						<button onClick={() => setDailyMonthOffset(d => d + 1)} className="p-1 hover:bg-zinc-800 rounded"><ChevronRight size={20} /></button>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
					{dailyData.length === 0 ? (
						<div className="h-full flex items-center justify-center text-zinc-600 italic">{t('stats.noSolvesMonth', lang)}</div>
					) : (
						<div className="space-y-2">
							{dailyData.slice().reverse().map(d => (
								<div key={d.day} className="flex gap-4 p-3 bg-zinc-900/50 rounded border border-zinc-800/50">
									<div className="flex flex-col items-center justify-center min-w-[3rem] border-r border-zinc-800 pr-3">
										<span className="text-xl font-bold text-zinc-300">{d.day}</span>
										<span className="text-[10px] text-zinc-500 uppercase">
											{d.date.toLocaleDateString(getLocale(lang), { weekday: 'short' })}
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
