import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
	Activity,
	BarChart2,
	Maximize2,
	Minimize2,
	Search,
	ZoomOut
} from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ReferenceArea,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis
} from 'recharts';
import { Language, Penalty, Session, Settings, SolveMap, StatConfig, StatType } from '../../types';
import { t } from '../../translations';
import { formatDate, formatDuration, formatTime, getThemeHex } from '../../utils';
import {
	buildAvailableStats,
	buildPbHistory,
	buildPenaltyData,
	buildSolveChartData,
	buildSolveFrequencyData,
	buildTotals,
	Interval
} from '../../utils/statistics';

interface SessionStatsViewProps {
  sessions: Session[];
  solvesMap: SolveMap;
  initialSessionId: string;
  settings: Settings;
  statsConfig: StatConfig[];
}

export const SessionStatsView: React.FC<SessionStatsViewProps> = ({ sessions, solvesMap, initialSessionId, settings, statsConfig }) => {
	const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId);
	const [pbStatType, setPbStatType] = useState<StatType>(StatType.SINGLE);
	const [pbStatSize, setPbStatSize] = useState<number>(1);
	const [sessionSearch, setSessionSearch] = useState('');
	const [showSearch, setShowSearch] = useState(false);
	const [graphStatId, setGraphStatId] = useState<string>('time_single');

	const [fullscreenChart, setFullscreenChart] = useState<'times' | 'frequency' | null>(null);
	const [freqInterval, setFreqInterval] = useState<Interval>('day');

	const [left, setLeft] = useState<string | number>('dataMin');
	const [right, setRight] = useState<string | number>('dataMax');
	const [refAreaLeft, setRefAreaLeft] = useState<string | number>('');
	const [refAreaRight, setRefAreaRight] = useState<string | number>('');
	const [yDomain, setYDomain] = useState<[number | 'auto', number | 'auto']>(['auto', 'auto']);

	const searchContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent): void => {
			if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node))
				setShowSearch(false);
		};
		document.addEventListener('mousedown', handleClickOutside);
		return (): void => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		setLeft('dataMin');
		setRight('dataMax');
		setYDomain(['auto', 'auto']);
		setRefAreaLeft('');
		setRefAreaRight('');
	}, [selectedSessionId, graphStatId]);

	const lang = settings.language || Language.EN;
	const themeColor = getThemeHex(settings.theme);

	const session = sessions.find(s => s.id === selectedSessionId);
	const timePrecision = session?.settingsOverride?.timePrecision ?? settings.timePrecision;

	const solves = useMemo(() => {
		if (!session) return [];
		return session.solveIds
			.map(id => solvesMap[id])
			.filter(Boolean)
			.sort((a, b) => a.timestamp - b.timestamp);
	}, [session, solvesMap]);

	const totals = useMemo(() => buildTotals(solves), [solves]);

	const filteredSessions = useMemo(() => {
		return sessions.filter(s => s.name.toLowerCase().includes(sessionSearch.toLowerCase()));
	}, [sessions, sessionSearch]);

	const getResolvableSolveCount = (s: Session): number =>
		s.solveIds.reduce((acc, id) => acc + (solvesMap[id] ? 1 : 0), 0);

	const availableStats = useMemo(() => buildAvailableStats(statsConfig, lang), [statsConfig, lang]);

	const selectedStat = useMemo(() => {
		return availableStats.find(s => s.id === graphStatId) || availableStats[0] || null;
	}, [availableStats, graphStatId]);

	const chartData = useMemo(() => buildSolveChartData(solves, selectedStat), [solves, selectedStat]);

	const zoom = (): void => {
		const l = refAreaLeft;
		const r = refAreaRight;

		if (l === r || r === '') {
			setRefAreaLeft('');
			setRefAreaRight('');
			return;
		}

		let lNum = Number(l);
		let rNum = Number(r);

		if (lNum > rNum) [lNum, rNum] = [rNum, lNum];

		const visibleData = chartData.filter(d => d.idx >= lNum && d.idx <= rNum && d.val !== null);

		if (visibleData.length > 0) {
			const values = visibleData.map(d => d.val as number);
			const min = Math.min(...values);
			const max = Math.max(...values);

			const range = max - min;
			const padding = range === 0 ? (min === 0 ? 1 : min * 0.1) : range * 0.05;

			setYDomain([Math.max(0, min - padding), max + padding]);
		}

		setRefAreaLeft('');
		setRefAreaRight('');
		setLeft(lNum);
		setRight(rNum);
	};

	const zoomOut = (): void => {
		setLeft('dataMin');
		setRight('dataMax');
		setYDomain(['auto', 'auto']);
	};

	const solveFrequencyData = useMemo(() => buildSolveFrequencyData(solves, freqInterval), [solves, freqInterval]);

	if (!session) return <div className="text-zinc-500 p-4">{t('stats.sessionNotFound', lang)}</div>;

	const penaltyData = useMemo(() => buildPenaltyData(solves, themeColor), [solves, themeColor]);

	const pbHistory = useMemo(() => buildPbHistory(solves, pbStatType, pbStatSize), [solves, pbStatType, pbStatSize]);

	const toggleFullscreen = (chart: 'times' | 'frequency'): void => {
		setFullscreenChart(prev => prev === chart ? null : chart);
	};

	const renderChartContainer = (type: 'times' | 'frequency', content: React.ReactNode): React.ReactNode => {
		const isFull = fullscreenChart === type;
		if (isFull)
			return (
				<div className="fixed inset-0 z-[100] bg-zinc-900 p-6 flex flex-col">
					{content}
				</div>
			);

		return content;
	};

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
							<ZoomOut size={12} /> {t('stats.resetZoom', lang)}
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
						{fullscreenChart === 'times' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
					</button>
				</div>
			</div>
			<div className="flex-1 w-full min-h-0">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart
						data={chartData}
						onMouseDown={(e) => !fullscreenChart && e && typeof e.activeLabel !== 'undefined' && setRefAreaLeft(e.activeLabel)}
						onMouseMove={(e) => !fullscreenChart && e && refAreaLeft && typeof e.activeLabel !== 'undefined' && setRefAreaRight(e.activeLabel)}
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
						<YAxis
							stroke="#52525b"
							fontSize={12}
							domain={yDomain}
							allowDataOverflow={true}
						/>
						<Tooltip
							contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#e4e4e7' }}
							labelStyle={{ color: '#a1a1aa' }}
							formatter={(val: number | string) => {
								const numeric = typeof val === 'number' ? val : Number(val);
								if (!Number.isFinite(numeric)) return ['-', t('details.time', lang)];
								if (selectedStat?.type === StatType.SUCCESS_RATE)
									return [`${numeric.toFixed(2)}%`, t('stat.success', lang)];
								return [formatTime(Math.round(numeric * 1000), Penalty.NONE, timePrecision), t('details.time', lang)];
							}}
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
						{fullscreenChart === 'frequency' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
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
			{fullscreenChart === 'times' && renderChartContainer('times', SolveTimesChart)}
			{fullscreenChart === 'frequency' && renderChartContainer('frequency', FrequencyChart)}

			<div className="flex gap-4 items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800 relative" ref={searchContainerRef}>
				<span className="text-zinc-400 font-bold text-sm uppercase whitespace-nowrap">{t('stats.selectSession', lang)}:</span>
				<div className="relative flex-1">
					<div
						className="flex items-center gap-2 cursor-text w-full"
						onClick={() => {
							setShowSearch(true);
						}}
					>
						<Search size={16} className="text-zinc-500" />
						<input
							type="text"
							value={sessionSearch}
							onChange={(e) => {
								setSessionSearch(e.target.value); setShowSearch(true);
							}}
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
										onClick={() => {
											setSelectedSessionId(s.id); setShowSearch(false); setSessionSearch('');
										}}
										className={`px-4 py-2 text-sm cursor-pointer hover:bg-zinc-800 flex justify-between items-center ${s.id === selectedSessionId ? 'bg-zinc-800/50 text-blue-400' : 'text-zinc-300'}`}
									>
										<span className="truncate">{s.name}</span>
										<span className="text-xs text-zinc-500 font-mono ml-2">{getResolvableSolveCount(s)} {t(getResolvableSolveCount(s) === 1 ? 'stats.solve' : 'stats.solves', lang)}</span>
									</div>
								))
							)}
						</div>
					)}
				</div>
				{!showSearch && <div className="text-xs text-zinc-500 font-mono">{solves.length} {t(solves.length === 1 ? 'stats.solve' : 'stats.solves', lang)}</div>}
			</div>

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

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="space-y-6">
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

				<div className="lg:col-span-2 space-y-6">
					{SolveTimesChart}
				</div>
			</div>

			<div>
				{FrequencyChart}
			</div>

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
								const diff = prev !== null ? (prev - pb.val) : 0;
								return (
									<tr key={pb.solve.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
										<td className="px-4 py-2 font-mono text-zinc-400">
											{formatDate(pb.solve.timestamp, settings.dateFormat)}
										</td>
										<td className="px-4 py-2 font-bold font-mono" style={{ color: themeColor }}>
											{formatTime(pb.val, Penalty.NONE, timePrecision)}
										</td>
										<td className="px-4 py-2 font-mono text-green-400 text-xs">
											{prev !== null ? `-${formatTime(diff, Penalty.NONE, timePrecision)}` : '-'}
										</td>
									</tr>
								);
							})}
							{pbHistory.length === 0 && (
								<tr><td colSpan={3} className="p-4 text-center text-zinc-500">{t('stats.noPbs', lang)}</td></tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};
