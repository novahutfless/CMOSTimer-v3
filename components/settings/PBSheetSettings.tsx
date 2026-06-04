import React, { useState, useMemo } from 'react';
import { Settings, Session, StatType, StatConfig } from '../../types';
import { t } from '../../translations';
import { FileSpreadsheet, Plus, Trash2, ArrowUp, ArrowDown, Search } from 'lucide-react';
import { generateId } from '../../utils';
import { SettingsSection } from './SettingsSection';
import { getLang, moveIndex, removeIndex } from './settingsUtils';

interface Props {
    settings: Settings;
    sessions: Session[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update: (k: keyof Settings, v: any) => void;
}

export const PBSheetSettings: React.FC<Props> = ({ settings, sessions, update }) => {
	const lang = getLang(settings);
	const config = settings.pbSheet;

	// Session Management State
	const [sessionSearch, setSessionSearch] = useState('');

	// Stat Management State
	const [newStatType, setNewStatType] = useState<StatType>(StatType.AVERAGE);
	const [newStatSize, setNewStatSize] = useState<number>(5);

	const updateConfig = (updates: Partial<typeof config>): void => {
		update('pbSheet', { ...config, ...updates });
	};

	// --- Session Handlers ---
	const addSession = (id: string): void => {
		if (!id) return;
		if (config.sessionIds.includes(id)) return;
		updateConfig({ sessionIds: [...config.sessionIds, id] });
		setSessionSearch('');
	};

	const removeSession = (id: string): void => {
		updateConfig({ sessionIds: config.sessionIds.filter(sid => sid !== id) });
	};

	const moveSession = (index: number, direction: -1 | 1): void => {
		const next = moveIndex(config.sessionIds, index, direction);
		if (next !== config.sessionIds) updateConfig({ sessionIds: next });
	};

	const searchResults = useMemo(() => {
		const lower = sessionSearch.toLowerCase();
		return sessions.filter(s => 
			!config.sessionIds.includes(s.id) && 
            (sessionSearch.trim() === '' || s.name.toLowerCase().includes(lower))
		);
	}, [sessions, sessionSearch, config.sessionIds]);

	// --- Stat Handlers ---
	const addStat = (): void => {
		const newStat: StatConfig = { 
			id: generateId(), 
			type: newStatType, 
			size: newStatType === StatType.SINGLE ? 1 : newStatSize 
		};
		updateConfig({ stats: [...config.stats, newStat] });
	};

	const removeStat = (index: number): void => {
		updateConfig({ stats: removeIndex(config.stats, index) });
	};

	const moveStat = (index: number, direction: -1 | 1): void => {
		const next = moveIndex(config.stats, index, direction);
		if (next !== config.stats) updateConfig({ stats: next });
	};

	const getStatLabel = (s: StatConfig): string => {
		if (s.type === StatType.SINGLE) return t('stat.single', lang);
		if (s.type === StatType.MEAN) return `${t('stat.mean', lang)} ${s.size}`;
		if (s.type === StatType.AVERAGE) return `${t('stat.avg', lang)} ${s.size}`;
		return s.type;
	};

	return (
		<div className="space-y-6">
			{/* Header / Toggle */}
			<div className="bg-zinc-900 p-3 rounded border border-zinc-800 space-y-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 font-bold text-zinc-200">
						<FileSpreadsheet size={18} className="text-blue-400"/>
						{t('pbsheet.enabled', lang)}
					</div>
					<input 
						type="checkbox" 
						checked={config.enabled} 
						onChange={e => updateConfig({ enabled: e.target.checked })}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>

				{config.enabled && (
					<div className="flex flex-col gap-1 pt-2 border-t border-zinc-800">
						<span className="text-xs text-zinc-500 uppercase font-bold">{t('pbsheet.title', lang)}</span>
						<input 
							type="text" 
							value={config.title} 
							onChange={e => updateConfig({ title: e.target.value })}
							className="bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200"
							placeholder="My PBs"
						/>
					</div>
				)}
			</div>

			{config.enabled && (
				<>
					{/* Sessions */}
					<div>
						<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('pbsheet.sessions', lang)}</h3>
						<div className="space-y-2">
							{config.sessionIds.map((sid, idx) => {
								const session = sessions.find(s => s.id === sid);
								return (
									<div key={sid} className="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
										<div className="flex items-center gap-2">
											<div className="flex flex-col gap-0.5">
												<button onClick={() => moveSession(idx, -1)} disabled={idx === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowUp size={14} /></button>
												<button onClick={() => moveSession(idx, 1)} disabled={idx === config.sessionIds.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowDown size={14} /></button>
											</div>
											<span className="text-sm text-zinc-200 font-medium truncate max-w-[200px]">{session ? session.name : 'Unknown Session'}</span>
										</div>
										<button onClick={() => removeSession(sid)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded"><Trash2 size={14} /></button>
									</div>
								);
							})}
                            
							{/* Search & Add */}
							<div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden mt-3">
								<div className="p-2 border-b border-zinc-800 flex gap-2 items-center">
									<Search size={14} className="text-zinc-500"/>
									<input 
										type="text"
										placeholder="Search sessions to add..."
										value={sessionSearch}
										onChange={e => setSessionSearch(e.target.value)}
										onFocus={() => setSessionSearch(sessionSearch)} // Just to trigger rerender/search if needed
										className="bg-transparent outline-none text-sm text-zinc-200 flex-1 placeholder-zinc-600"
									/>
								</div>
								{/* Always show results if array has items, filtering handles empty search case */}
								{searchResults.length > 0 ? (
									<div className="max-h-40 overflow-y-auto p-1 bg-zinc-900/50">
										{searchResults.map(s => (
											<button 
												key={s.id} 
												onClick={() => addSession(s.id)} 
												className="w-full text-left px-3 py-2 hover:bg-zinc-800 text-sm text-zinc-300 rounded flex justify-between group items-center"
											>
												{s.name}
												<Plus size={14} className="opacity-0 group-hover:opacity-100 text-blue-400" />
											</button>
										))}
									</div>
								) : (
									<div className="p-2 text-xs text-zinc-500 text-center">{t('pbsheet.noMatch', lang)}</div>
								)}
							</div>
						</div>
					</div>

					{/* Stats */}
					<div>
						<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('pbsheet.stats', lang)}</h3>
						<div className="space-y-2">
							{config.stats.map((stat, idx) => (
								<div key={idx} className="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
									<div className="flex items-center gap-2">
										<div className="flex flex-col gap-0.5">
											<button onClick={() => moveStat(idx, -1)} disabled={idx === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowUp size={14} /></button>
											<button onClick={() => moveStat(idx, 1)} disabled={idx === config.stats.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowDown size={14} /></button>
										</div>
										<span className="text-sm text-zinc-200 font-medium">{getStatLabel(stat)}</span>
									</div>
									<button onClick={() => removeStat(idx)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded"><Trash2 size={14} /></button>
								</div>
							))}

							<div className="flex gap-2 mt-2 bg-zinc-950 p-2 rounded border border-zinc-800">
								<select 
									value={newStatType}
									onChange={e => setNewStatType(e.target.value as StatType)}
									className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none"
								>
									<option value={StatType.SINGLE}>{t('stat.single', lang)}</option>
									<option value={StatType.MEAN}>{t('stat.mean', lang)}</option>
									<option value={StatType.AVERAGE}>{t('stat.avg', lang)}</option>
								</select>
								{newStatType !== StatType.SINGLE && (
									<input 
										type="number" 
										value={newStatSize}
										onChange={e => setNewStatSize(parseInt(e.target.value) || 3)}
										className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 font-mono"
									/>
								)}
								<button 
									onClick={addStat}
									className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold flex items-center gap-1"
								>
									<Plus size={12} /> {t('pbsheet.addStat', lang)}
								</button>
							</div>
						</div>
					</div>

					{/* Options */}
					<div>
						<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('pbsheet.options', lang)}</h3>
						<SettingsSection className="space-y-3">
							<div className="flex items-center justify-between">
								<span className="text-sm text-zinc-300">{t('pbsheet.showDate', lang)}</span>
								<input 
									type="checkbox" 
									checked={config.showDate} 
									onChange={e => updateConfig({ showDate: e.target.checked })}
									className="w-4 h-4 accent-blue-600"
								/>
							</div>
							<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
								<span className="text-sm text-zinc-300">{t('pbsheet.showCount', lang)}</span>
								<input 
									type="checkbox" 
									checked={config.showSolveCount} 
									onChange={e => updateConfig({ showSolveCount: e.target.checked })}
									className="w-4 h-4 accent-blue-600"
								/>
							</div>
						</SettingsSection>
					</div>
				</>
			)}
		</div>
	);
};
