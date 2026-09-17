import React, { useMemo, useState } from 'react';
import { Language, Penalty, Session, Settings, SolveInputSource, SolveMap } from '../../types';
import { t } from '../../translations';
import { analyticsEvent, AnalyticsFilter, compareAnalyticsWeeks, filterAnalyticsSolves, summarizeAnalytics } from '../../utils/analytics';
import { formatTime } from '../../utils/formatting';
import { getScrambler } from '../../utils/scramblerRegistry';

interface Props { sessions: Session[]; solvesMap: SolveMap; initialSessionId: string; settings: Settings }

export const AnalyticsView: React.FC<Props> = ({ sessions, solvesMap, initialSessionId, settings }) => {
	const lang = settings.language || Language.EN;
	const [filter, setFilter] = useState<AnalyticsFilter>({ sessionId: initialSessionId, event: '', tag: '', penalty: '', inputSource: '', from: '', to: '' });
	const [now] = useState(Date.now);
	const options = useMemo(() => {
		const solves = Object.values(solvesMap);
		return { events: [...new Set(solves.map(analyticsEvent))].sort(), tags: [...new Set(solves.flatMap(s => s.tags ?? []))].sort() };
	}, [solvesMap]);
	const solves = useMemo(() => filterAnalyticsSolves(solvesMap, sessions, filter), [solvesMap, sessions, filter]);
	const summary = useMemo(() => summarizeAnalytics(solves), [solves]);
	const comparison = useMemo(() => compareAnalyticsWeeks(solves, now), [solves, now]);
	const mixed = new Set(solves.map(analyticsEvent)).size > 1;
	const mixedSource = new Set(solves.map(solve => solve.inputSource ?? 'UNKNOWN')).size > 1;
	const time = (value: number | null): string => value === null ? '—' : formatTime(value, Penalty.NONE, settings.timePrecision);
	const update = (key: keyof AnalyticsFilter, value: string): void => setFilter(previous => ({ ...previous, [key]: value }));
	const control = 'w-full min-w-0 bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:border-blue-500';
	const select = (key: keyof AnalyticsFilter, label: string, choices: { value: string; label: string }[]): React.ReactNode => (
		<label className="text-sm text-zinc-400 space-y-1">{label}
			<select className={control} value={filter[key]} onChange={e => update(key, e.target.value)}>
				<option value="">{t('analytics.all', lang)}</option>
				{choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
			</select>
		</label>
	);
	const metrics = [
		['stats.totalSolves', String(summary.count)], ['analytics.valid', String(summary.valid)],
		['stats.avgTime', time(summary.mean)], ['analytics.median', time(summary.median)],
		['analytics.p10', time(summary.p10)], ['analytics.p90', time(summary.p90)],
		['analytics.deviation', time(summary.deviation)], ['analytics.consistency', summary.consistency === null ? '—' : `${summary.consistency.toFixed(1)}%`],
	];
	return <div className="space-y-5">
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			{select('sessionId', t('stats.selectSession', lang), sessions.map(s => ({ value: s.id, label: s.name })))}
			{select('event', t('analytics.event', lang), options.events.map(value => ({ value, label: (JSON.parse(value) as string[]).map(id => getScrambler(id).name).join(' / ') || t('common.unknown', lang) })))}
			{select('tag', t('analytics.tag', lang), options.tags.map(value => ({ value, label: value })))}
			{select('penalty', t('analytics.penalty', lang), Object.values(Penalty).map((value, index) => ({ value, label: value === Penalty.NONE ? t('common.none', lang) : value.startsWith('PLUS_') ? `+${index * 2}` : value })))}
			{select('inputSource', t('analytics.inputSource', lang), [...Object.values(SolveInputSource), 'UNKNOWN'].map(value => ({ value, label: t(`analytics.inputSource.${value.toLowerCase()}`, lang) })))}
			{(['from', 'to'] as const).map(key => <label key={key} className="text-sm text-zinc-400 space-y-1">{t(`analytics.${key}`, lang)}<input type="date" className={control} value={filter[key]} onChange={e => update(key, e.target.value)} /></label>)}
		</div>
		<p className="text-xs text-zinc-400">{t('analytics.explanation', lang)}</p>
		{mixed && <p role="status" className="text-sm text-amber-400">{t('analytics.mixed', lang)}</p>}
		{mixedSource && <p role="status" className="text-sm text-amber-400">{t('analytics.mixedSource', lang)}</p>}
		{filter.from && filter.to && filter.from > filter.to && <p role="alert" className="text-sm text-amber-400">{t('analytics.dateError', lang)}</p>}
		{!solves.length ? <p className="text-zinc-400 py-8 text-center">{t('stats.detailed.noData', lang)}</p> : <>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([key, value]) => <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-3"><div className="text-xs text-zinc-400">{t(key, lang)}</div><div className="text-xl text-zinc-100 font-mono mt-1">{value}</div></div>)}</div>
			<p className="text-sm text-zinc-400">DNF: {summary.dnf} · DNS: {summary.dns}</p>
			<section className="space-y-2"><h3 className="font-bold text-zinc-200">{t('analytics.rolling', lang)}</h3><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{summary.averages.map(({ size, value }) => <div key={size} className="rounded-lg bg-zinc-950/50 border border-zinc-800 p-3"><div className="text-xs text-zinc-400">Ao{size}</div><div className="font-mono text-zinc-100">{time(value)}</div></div>)}</div></section>
			<section className="space-y-2"><h3 className="font-bold text-zinc-200">{t('analytics.comparison', lang)}</h3><p className="text-xs text-zinc-400">{t('analytics.comparisonNote', lang)}</p><div className="overflow-x-auto"><table className="w-full text-sm text-left text-zinc-300"><thead><tr><th className="p-2">{t('analytics.period', lang)}</th><th className="p-2">{t('stats.totalSolves', lang)}</th><th className="p-2">{t('stats.avgTime', lang)}</th><th className="p-2">{t('analytics.median', lang)}</th></tr></thead><tbody>{(['recent', 'previous'] as const).map(key => <tr key={key} className="border-t border-zinc-800"><th className="p-2 font-normal">{t(`analytics.${key}`, lang)}</th><td className="p-2">{comparison[key].count}</td><td className="p-2 font-mono">{time(comparison[key].mean)}</td><td className="p-2 font-mono">{time(comparison[key].median)}</td></tr>)}</tbody></table></div></section>
		</>}
	</div>;
};
