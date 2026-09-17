import React from 'react';
import { Settings, SettingsUpdater, StatType, StatConfig } from '../../types';
import { t } from '../../translations';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { generateId } from '../../utils';
import { DEFAULT_FMC_TIMELIST_CONFIG, DEFAULT_MULTI_BLIND_TIMELIST_CONFIG } from '../../store/defaults';
import { getLang, moveIndex, removeIndex, replaceIndex } from './settingsUtils';

interface Props { settings: Settings; update: SettingsUpdater }
type ColumnKey = 'timelistStats' | 'fmcTimelistStats' | 'multiBlindTimelistStats';
type Option = { type: StatType; label: string };

export const ListSettings: React.FC<Props> = ({ settings, update }) => {
	const lang = getLang(settings);
	const regularOptions: Option[] = [
		{ type: StatType.SINGLE, label: t('stat.single', lang) }, { type: StatType.MEAN, label: t('stat.mean', lang) },
		{ type: StatType.AVERAGE, label: t('stat.avg', lang) }, { type: StatType.STD_DEV, label: t('stat.stdDev', lang) }
	];
	const fmcOptions: Option[] = [
		{ type: StatType.FMC_SINGLE, label: 'FMC Single' }, { type: StatType.FMC_MEAN, label: 'FMC Mean' }, { type: StatType.FMC_AVERAGE, label: 'FMC Average' },
		{ type: StatType.SINGLE, label: 'Time Single' }, { type: StatType.MEAN, label: 'Time Mean' }, { type: StatType.AVERAGE, label: 'Time Average' },
		{ type: StatType.SUCCESS_RATE, label: t('stat.success', lang) }
	];
	const multiBlindOptions: Option[] = [
		{ type: StatType.MULTI_BLIND_RESULT, label: 'Result' }, { type: StatType.MULTI_BLIND_MEMO, label: 'Memo time' },
		{ type: StatType.MULTI_BLIND_EXEC, label: 'Execution time' }, { type: StatType.SINGLE, label: 'Total time' }
	];

	const renderEditor = (title: string, key: ColumnKey, columns: StatConfig[], options: Option[], defaultType: StatType): React.ReactNode => {
		const setColumns = (next: StatConfig[]): void => update(key, next);
		const isSized = (type: StatType): boolean => ![StatType.SINGLE, StatType.FMC_SINGLE, StatType.MULTI_BLIND_RESULT, StatType.MULTI_BLIND_MEMO, StatType.MULTI_BLIND_EXEC].includes(type);
		return <div className="space-y-2">
			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{title}</h3>
			{columns.map((column, index) => <div key={column.id} className="flex items-center gap-2 bg-zinc-950 p-2 rounded border border-zinc-800">
				<div className="flex flex-col gap-1">
					<button onClick={() => setColumns(moveIndex(columns, index, -1))} disabled={index === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ArrowUp size={14} /></button>
					<button onClick={() => setColumns(moveIndex(columns, index, 1))} disabled={index === columns.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ArrowDown size={14} /></button>
				</div>
				<select value={column.type} onChange={event => setColumns(replaceIndex(columns, index, { ...column, type: event.target.value as StatType }))} className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 flex-1">
					{options.map(option => <option key={option.type} value={option.type}>{option.label}</option>)}
				</select>
				{isSized(column.type) && <input type="number" min={column.type === StatType.SUCCESS_RATE ? 0 : 1} value={column.size} onChange={event => {
					const size = Number.parseInt(event.target.value, 10);
					if (Number.isFinite(size) && size >= 0) setColumns(replaceIndex(columns, index, { ...column, size }));
				}} className="w-16 bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 font-mono" />}
				<button onClick={() => setColumns(removeIndex(columns, index))} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded transition"><Trash2 size={16} /></button>
			</div>)}
			{columns.length < 5 && <button onClick={() => setColumns([...columns, { id: generateId(), type: defaultType, size: 3 }])} className="mt-4 w-full py-2 border border-dashed border-zinc-700 rounded hover:bg-zinc-900 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2"><Plus size={16} /> {t('btn.add', lang)}</button>}
		</div>;
	};

	return <div className="space-y-6">
		<label className="flex items-center gap-2 rounded border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300 cursor-pointer">
			<input type="checkbox" checked={settings.groupTimeListBySubsession} onChange={event => update('groupTimeListBySubsession', event.target.checked)} className="accent-blue-500" />
			{t('list.groupSubsession', lang)}
		</label>
		{renderEditor(t('list.columns', lang), 'timelistStats', settings.timelistStats, regularOptions, StatType.MEAN)}
		{renderEditor('FMC columns', 'fmcTimelistStats', settings.fmcTimelistStats || DEFAULT_FMC_TIMELIST_CONFIG, fmcOptions, StatType.FMC_MEAN)}
		{renderEditor('Multi-blind columns', 'multiBlindTimelistStats', settings.multiBlindTimelistStats || DEFAULT_MULTI_BLIND_TIMELIST_CONFIG, multiBlindOptions, StatType.MULTI_BLIND_RESULT)}
	</div>;
};
