import React, { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Language, Penalty, Session, Settings, SolveInputSource, SolveMap } from '../../types';
import { t } from '../../translations';
import { analyticsEvent, AnalyticsFilter, compareAnalyticsWeeks, filterAnalyticsSolves, summarizeAnalytics } from '../../utils/analytics';
import { formatTime } from '../../utils/formatting';
import { getScrambler } from '../../utils/scramblerRegistry';

interface Props { sessions: Session[]; solvesMap: SolveMap; initialSessionId: string; settings: Settings }
type Choice = { value: string; label: string };

const MultiSelect: React.FC<{
	label: string; choices: Choice[]; values: string[]; allLabel: string; selectedLabel: string;
	onChange: (values: string[]) => void; search?: { value: string; placeholder: string; onChange: (value: string) => void };
}> = ({ label, choices, values, allLabel, selectedLabel, onChange, search }) => {
	const selected = new Set(values);
	const visibleChoices = search ? choices.filter(choice => choice.label.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())) : choices;
	const summary = values.length === 0 ? allLabel : values.length === 1 ? choices.find(choice => choice.value === values[0])?.label ?? values[0] : `${values.length} ${selectedLabel}`;
	return <div className="text-sm text-zinc-400 space-y-1 min-w-0"><div>{label}</div>
		<details className="relative group">
			<summary className="list-none w-full min-w-0 bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:border-blue-500 cursor-pointer flex items-center justify-between gap-2">
				<span className="truncate">{summary}</span><ChevronDown size={14} className="shrink-0 group-open:rotate-180" />
			</summary>
			<div className="absolute z-50 mt-1 w-full min-w-56 max-h-64 overflow-y-auto rounded border border-zinc-700 bg-zinc-900 shadow-xl custom-scrollbar">
				{search && <div className="sticky top-0 flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 p-2">
					<Search size={14} className="text-zinc-500" /><input type="search" value={search.value} onChange={event => search.onChange(event.target.value)} placeholder={search.placeholder} className="min-w-0 flex-1 bg-transparent text-zinc-100 outline-none" />
				</div>}
				<button type="button" onClick={() => onChange([])} className={`w-full px-3 py-2 text-left hover:bg-zinc-800 ${values.length === 0 ? 'text-blue-400' : 'text-zinc-300'}`}>{allLabel}</button>
				{visibleChoices.map(choice => <label key={choice.value} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-zinc-300 hover:bg-zinc-800">
					<input type="checkbox" checked={selected.has(choice.value)} onChange={() => onChange(selected.has(choice.value) ? values.filter(value => value !== choice.value) : [...values, choice.value])} />
					<span className="truncate">{choice.label}</span>
				</label>)}
			</div>
		</details>
	</div>;
};

export const AnalyticsView: React.FC<Props> = ({ sessions, solvesMap, initialSessionId, settings }) => {
	const lang = settings.language || Language.EN;
	const [filter, setFilter] = useState<AnalyticsFilter>({ sessionIds: [initialSessionId], events: [], tags: [], penalties: [], inputSources: [], from: '', to: '' });
	const [sessionSearch, setSessionSearch] = useState('');
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
	const update = (key: 'from' | 'to', value: string): void => setFilter(previous => ({ ...previous, [key]: value }));
	const updateMany = (key: 'sessionIds' | 'events' | 'tags' | 'penalties' | 'inputSources', values: string[]): void => setFilter(previous => ({ ...previous, [key]: values }));
	const control = 'w-full min-w-0 bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:border-blue-500';
	const selectedLabel = t('analytics.selected', lang);
	const sessionChoices = sessions.map(session => ({ value: session.id, label: session.name }));
	const metrics = [
		['stats.totalSolves', String(summary.count)], ['analytics.valid', String(summary.valid)],
		['stats.avgTime', time(summary.mean)], ['analytics.median', time(summary.median)],
		['analytics.p10', time(summary.p10)], ['analytics.p90', time(summary.p90)],
		['analytics.deviation', time(summary.deviation)], ['analytics.consistency', summary.consistency === null ? '—' : `${summary.consistency.toFixed(1)}%`],
	];
	return <div className="space-y-5">
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
			<MultiSelect label={t('stats.selectSession', lang)} choices={sessionChoices} values={filter.sessionIds} allLabel={t('analytics.all', lang)} selectedLabel={selectedLabel} onChange={values => updateMany('sessionIds', values)} search={{ value: sessionSearch, placeholder: t('session.search', lang), onChange: setSessionSearch }} />
			<MultiSelect label={t('analytics.event', lang)} choices={options.events.map(value => ({ value, label: (JSON.parse(value) as string[]).map(id => getScrambler(id).name).join(' / ') || t('common.unknown', lang) }))} values={filter.events} allLabel={t('analytics.all', lang)} selectedLabel={selectedLabel} onChange={values => updateMany('events', values)} />
			<MultiSelect label={t('analytics.tag', lang)} choices={options.tags.map(value => ({ value, label: value }))} values={filter.tags} allLabel={t('analytics.all', lang)} selectedLabel={selectedLabel} onChange={values => updateMany('tags', values)} />
			<MultiSelect label={t('analytics.penalty', lang)} choices={Object.values(Penalty).map((value, index) => ({ value, label: value === Penalty.NONE ? t('common.none', lang) : value.startsWith('PLUS_') ? `+${index * 2}` : value }))} values={filter.penalties} allLabel={t('analytics.all', lang)} selectedLabel={selectedLabel} onChange={values => updateMany('penalties', values)} />
			<MultiSelect label={t('analytics.inputSource', lang)} choices={[...Object.values(SolveInputSource), 'UNKNOWN'].map(value => ({ value, label: t(`analytics.inputSource.${value.toLowerCase()}`, lang) }))} values={filter.inputSources} allLabel={t('analytics.all', lang)} selectedLabel={selectedLabel} onChange={values => updateMany('inputSources', values)} />
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
