import React, { useState, useMemo } from 'react';
import { Session, SessionSettingsOverride, InspectionDirection, Language, Settings, StatType } from '../types';
import { t } from '../translations';
import { X, Plus, Trash2, Layout, Lock, Unlock, Link, Search, CheckSquare, Square } from 'lucide-react';
import { formatTime } from '../utils';
import { LayoutEditor } from './LayoutEditor';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/layouts';

interface SessionSettingsModalProps {
  session: Session;
  sessions: Session[];
  settings: Settings;
  language: Language;
  onUpdate: (id: string, updates: Partial<Session>) => void;
  onClose: () => void;
}

const SessionSettingsModal: React.FC<SessionSettingsModalProps> = (dta: SessionSettingsModalProps) => {
	const { session, sessions, settings, language, onUpdate, onClose } = dta;
	const [overrides, setOverrides] = useState<SessionSettingsOverride>(session.settingsOverride || {});
	const [locked, setLocked] = useState(!!session.locked);
	const [sourceSessionIds, setSourceSessionIds] = useState<string[]>(session.sourceSessionIds || []);
  
	// Pre-PBs
	const [prePBType, setPrePBType] = useState<StatType>(StatType.AVERAGE);
	const [prePBSize, setPrePBSize] = useState(5);
	const [prePBVal, setPrePBVal] = useState('');

	// Linked Sessions
	const [linkSearch, setLinkSearch] = useState('');
	const [selectedSearchResults, setSelectedSearchResults] = useState<Set<string>>(new Set());
	const [lastSelectedIndex, setLastSelectedIndex] = useState(-1);

	const [showLayoutEditor, setShowLayoutEditor] = useState(false);

	const getStatLabel = (key: string): string => {
		// Try to map key back to readable format
		// key might be an ID or TYPE_SIZE
      
		// Check existing stats first
		const config = settings.timelistStats.find(s => s.id === key);
		if (config) {
			if (config.type === StatType.SINGLE) return 'Single';
			if (config.type === StatType.MEAN) return `Mo${config.size}`;
			if (config.type === StatType.AVERAGE) return `Ao${config.size}`;
			return key;
		}

		// Parse TYPE_SIZE
		const parts = key.split('_');
		if (parts.length >= 2) {
			const size = parts.pop();
			const type = parts.join('_');
			if (type === StatType.SINGLE) return 'Single';
			if (type === StatType.MEAN) return `Mean of ${size}`;
			if (type === StatType.AVERAGE) return `Average of ${size}`;
			if (type === StatType.SUCCESS_RATE) return `Success Rate`;
			return `${type} ${size}`;
		}
		return key;
	};

	const updateOverride = <K extends keyof SessionSettingsOverride>(key: K, val: SessionSettingsOverride[K] | undefined): void => {
		setOverrides(prev => {
			const next = { ...prev };
			if (val === undefined) delete next[key];
			else next[key] = val;
			return next;
		});
	};

	const handleAddPrePB = (): void => {
		if (!prePBVal) return;
		const ms = parseFloat(prePBVal) * 1000;
		if (isNaN(ms)) return;
      
		let key = '';
		if (prePBType === StatType.SINGLE) 
			key = `${StatType.SINGLE}_1`;
		// Check if a single column exists to use its ID instead? 
		// We prefer generic keys now for robustness, but if an exact match exists in settings, use ID?
		// Actually, `useAppStore` now checks both. So generic key is safer.
		else 
			key = `${prePBType}_${prePBSize}`;
      

		const current = overrides.prePBs || {};
		setOverrides(prev => ({
			...prev,
			prePBs: { ...current, [key]: ms }
		}));
		setPrePBVal('');
	};

	const handleRemovePrePB = (key: string): void => {
		const current = { ...overrides.prePBs };
		delete current[key];
		setOverrides(prev => ({ ...prev, prePBs: current }));
	};

	// Linked Sessions Logic
	const handleSearchResultClick = (id: string, index: number, shiftKey: boolean): void => {
		const newSelected = new Set(selectedSearchResults);
      
		if (shiftKey && lastSelectedIndex !== -1) {
			const start = Math.min(lastSelectedIndex, index);
			const end = Math.max(lastSelectedIndex, index);
			for(let i = start; i <= end; i++) {
				const s = searchResults[i];
				if (s) newSelected.add(s.id);
			}
		} else {
			if (newSelected.has(id)) newSelected.delete(id);
			else newSelected.add(id);
			setLastSelectedIndex(index);
		}
      
		setSelectedSearchResults(newSelected);
	};

	const addSelectedLinks = (): void => {
		const newIds = Array.from(selectedSearchResults);
		setSourceSessionIds(prev => [...prev, ...newIds]);
		setSelectedSearchResults(new Set());
		setLinkSearch('');
		setLastSelectedIndex(-1);
	};

	const removeLink = (id: string): void => {
		setSourceSessionIds(prev => prev.filter(sid => sid !== id));
	};

	const handleSave = (): void => {
		onUpdate(session.id, { 
			locked, 
			sourceSessionIds,
			settingsOverride: overrides 
		});
		onClose();
	};

	const searchResults = useMemo(() => {
		if (!linkSearch.trim()) return [];
		const lower = linkSearch.toLowerCase();
		return sessions.filter(s => 
			s.id !== session.id && 
          !sourceSessionIds.includes(s.id) && 
          s.name.toLowerCase().includes(lower)
		);
	}, [sessions, linkSearch, sourceSessionIds, session.id]);

	const renderToggle = (label: string, key: keyof SessionSettingsOverride): React.ReactNode => {
		const current = overrides ? overrides[key] : undefined;
		return (
			<div className="flex justify-between items-center">
				<span className="text-zinc-300 text-sm">{label}</span>
				<select 
					value={current === undefined ? 'global' : current.toString()}
					onChange={(e) => {
						if (e.target.value === 'global') updateOverride(key, undefined);
						else updateOverride(key, e.target.value === 'true');
					}}
					className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none"
				>
					<option value="global">{t('session.global', language)}</option>
					<option value="true">{t('session.enabled', language)}</option>
					<option value="false">{t('session.disabled', language)}</option>
				</select>
			</div>
		);
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl p-6 shadow-2xl flex flex-col max-h-[90vh] h-[80vh]" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-center mb-6 pb-2 border-b border-zinc-800 shrink-0">
					<h2 className="font-bold text-zinc-100 text-xl">{t('session.override', language)}</h2>
					<button onClick={onClose}><X size={24} className="text-zinc-500 hover:text-white"/></button>
				</div>

				<div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
              
					{/* Basic Toggles */}
					<div className="space-y-4">
						<div className={`flex items-center justify-between p-4 rounded border transition-colors ${locked ? 'bg-amber-900/20 border-amber-800/50' : 'bg-zinc-950 border-zinc-800'}`}>
							<div className="flex items-center gap-3">
								{locked ? <Lock size={20} className="text-amber-500" /> : <Unlock size={20} className="text-zinc-500" />}
								<div className="flex flex-col">
									<span className={`text-sm font-bold ${locked ? 'text-amber-100' : 'text-zinc-200'}`}>{t('session.locked', language)}</span>
									<span className="text-xs text-zinc-500">{t('session.lockedDesc', language)}</span>
								</div>
							</div>
							<label className="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" className="sr-only peer" checked={locked} onChange={e => setLocked(e.target.checked)} />
								<div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
							</label>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3">
								<h3 className="text-xs font-bold text-zinc-500 uppercase">{t('session.timerBehavior', language)}</h3>
								{renderToggle(t('timer.inspection', language), 'inspectionEnabled')}
								{renderToggle(t('timer.autoPenalty', language), 'autoPenalty')}
								{renderToggle(t('timer.holdToStart', language), 'holdToStart')}
								{renderToggle(t('ui.hideWhileTiming', language), 'hideWhileTiming')}
							</div>
                      
							<div className="bg-zinc-950 p-4 rounded border border-zinc-800 space-y-3">
								<h3 className="text-xs font-bold text-zinc-500 uppercase">{t('session.advanced', language)}</h3>
								<div className="flex justify-between items-center">
									<span className="text-zinc-300 text-sm">{t('session.virtualCube', language)}</span>
									<select 
										value={overrides?.virtualCube === undefined ? 'false' : overrides.virtualCube.toString()}
										onChange={(e) => updateOverride('virtualCube', e.target.value === 'true')}
										className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none"
									>
										<option value="false">{t('session.disabled', language)}</option>
										<option value="true">{t('session.enabled', language)}</option>
									</select>
								</div>
								<div className="flex justify-between items-center pt-1 border-t border-zinc-800/50">
									<span className="text-zinc-300 text-sm">{t('timer.direction', language)}</span>
									<select 
										value={overrides?.inspectionDirection || 'global'}
										onChange={(e) => {
											if (e.target.value === 'global') updateOverride('inspectionDirection', undefined);
											else updateOverride('inspectionDirection', e.target.value as InspectionDirection);
										}}
										className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none"
									>
										<option value="global">{t('session.global', language)}</option>
										<option value={InspectionDirection.UP}>Up</option>
										<option value={InspectionDirection.DOWN}>Down</option>
									</select>
								</div>
							</div>
						</div>
					</div>

					{/* PrePBs Section */}
					<div className="space-y-4">
						<h3 className="text-sm font-bold text-zinc-400">{t('session.prepbs', language)}</h3>
                   
						{/* Input Row */}
						<div className="flex gap-2 items-end bg-zinc-950 p-4 rounded border border-zinc-800">
							<div className="flex-1 space-y-1">
								<span className="text-[10px] text-zinc-500 uppercase font-bold">Type</span>
								<select 
									value={prePBType}
									onChange={e => setPrePBType(e.target.value as StatType)}
									className="w-full h-[38px] bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
								>
									<option value={StatType.SINGLE}>Single</option>
									<option value={StatType.MEAN}>Mean</option>
									<option value={StatType.AVERAGE}>Average</option>
								</select>
							</div>
                       
							{prePBType !== StatType.SINGLE && (
								<div className="w-24 space-y-1">
									<span className="text-[10px] text-zinc-500 uppercase font-bold">Size</span>
									<input 
										type="number" 
										min="1"
										value={prePBSize}
										onChange={e => setPrePBSize(parseInt(e.target.value) || 0)}
										className="w-full h-[38px] bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
									/>
								</div>
							)}

							<div className="w-32 space-y-1">
								<span className="text-[10px] text-zinc-500 uppercase font-bold">Time (s)</span>
								<input 
									type="number" 
									step="0.01"
									placeholder="0.00" 
									value={prePBVal}
									onChange={e => setPrePBVal(e.target.value)}
									className="w-full h-[38px] bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
								/>
							</div>
                       
							<button 
								onClick={handleAddPrePB} 
								disabled={!prePBVal}
								className="bg-zinc-800 hover:bg-zinc-700 p-2 rounded text-zinc-300 disabled:opacity-50 h-[38px]"
							>
								<Plus size={18}/>
							</button>
						</div>

						{/* List */}
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
							{overrides.prePBs && Object.entries(overrides.prePBs).map(([k, v]) => (
								<div key={k} className="flex justify-between items-center bg-zinc-950 px-3 py-2 rounded border border-zinc-800 hover:border-zinc-700">
									<span className="text-xs text-zinc-400 font-bold truncate mr-2" title={k}>{getStatLabel(k)}</span>
									<div className="flex items-center gap-3">
										<span className="text-sm font-mono text-zinc-200">{formatTime(v as number)}</span>
										<button onClick={() => handleRemovePrePB(k)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Linked Sessions */}
					<div className="space-y-4">
						<div className="flex flex-col gap-1">
							<h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2"><Link size={16} /> {t('session.linked', language)}</h3>
							<p className="text-xs text-zinc-500">{t('session.linkedDesc', language)}</p>
						</div>
                  
						{/* Active Links */}
						{sourceSessionIds.length > 0 && (
							<div className="flex flex-wrap gap-2 bg-zinc-950 p-4 rounded border border-zinc-800">
								{sourceSessionIds.map(sid => {
									const s = sessions.find(sess => sess.id === sid);
									return (
										<div key={sid} className="flex items-center gap-2 bg-blue-900/20 text-blue-200 border border-blue-500/20 px-3 py-1.5 rounded-full text-sm">
											<span className="truncate max-w-[150px]">{s?.name || 'Unknown'}</span>
											<button onClick={() => removeLink(sid)} className="hover:text-white bg-blue-900/40 rounded-full p-0.5"><X size={12}/></button>
										</div>
									);
								})}
							</div>
						)}

						{/* Search & Add */}
						<div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
							<div className="p-3 border-b border-zinc-800 flex gap-2">
								<div className="relative flex-1">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
									<input 
										type="text" 
										placeholder={t('session.searchLink', language)}
										value={linkSearch}
										onChange={e => setLinkSearch(e.target.value)}
										className="w-full bg-zinc-900 border border-zinc-700 rounded pl-9 pr-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500"
									/>
								</div>
							</div>
                      
							{linkSearch && (
								<div className="max-h-60 overflow-y-auto custom-scrollbar p-2">
									{searchResults.length === 0 ? (
										<div className="text-center text-zinc-500 text-sm py-4">{t('session.notFound', language)}</div>
									) : (
										<div className="space-y-1">
											<div className="flex justify-between px-2 mb-2">
												<span className="text-xs text-zinc-500">{searchResults.length} {t('session.results', language)}</span>
												<div className="flex gap-3 text-xs">
													<button 
														onClick={() => setSelectedSearchResults(new Set(searchResults.map(s => s.id)))}
														className="text-blue-400 hover:text-blue-300"
													>
														{t('session.selectAll', language)}
													</button>
													<button 
														onClick={() => setSelectedSearchResults(new Set())}
														className="text-zinc-500 hover:text-zinc-300"
													>
														{t('session.clear', language)}
													</button>
												</div>
											</div>
											{searchResults.map((s, idx) => {
												const isSelected = selectedSearchResults.has(s.id);
												return (
													<div 
														key={s.id} 
														onClick={(e) => handleSearchResultClick(s.id, idx, e.shiftKey)}
														className={`flex items-center gap-3 p-2 rounded cursor-pointer border select-none ${
															isSelected 
																? 'bg-blue-900/20 border-blue-500/30' 
																: 'hover:bg-zinc-900 border-transparent hover:border-zinc-800'
														}`}
													>
														{isSelected ? (
															<CheckSquare size={18} className="text-blue-500 shrink-0" /> 
														) : (
															<Square size={18} className="text-zinc-600 shrink-0" />
														)}
														<div className="min-w-0 flex-1">
															<div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{s.name}</div>
															<div className="text-xs text-zinc-500">{s.solveIds.length} solves • {s.tags?.join(', ')}</div>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							)}
                      
							{selectedSearchResults.size > 0 && (
								<div className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex justify-end">
									<button 
										onClick={addSelectedLinks}
										className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-6 rounded"
									>
										{t('session.linkBtn', language)} {selectedSearchResults.size} Session{selectedSearchResults.size > 1 ? 's' : ''}
									</button>
								</div>
							)}
						</div>
					</div>

					{/* Layout Override */}
					<div className="pt-4 border-t border-zinc-800">
						<div className="flex justify-between items-center mb-3">
							<h3 className="text-sm font-bold text-zinc-400">{t('session.layoutOverride', language)}</h3>
							{overrides.layout && (
								<button 
									onClick={() => updateOverride('layout', undefined)} 
									className="text-xs text-blue-400 hover:underline"
								>
									{t('session.resetGlobal', language)}
								</button>
							)}
						</div>
						<button 
							onClick={() => setShowLayoutEditor(true)}
							className={`w-full py-3 text-sm border border-dashed rounded flex items-center justify-center gap-2 ${overrides.layout ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
						>
							<Layout size={16} /> {overrides.layout ? t('session.editLayout', language) : t('session.overrideLayout', language)}
						</button>
					</div>
				</div>

				<div className="mt-6 pt-4 border-t border-zinc-800 flex justify-end shrink-0">
					<button 
						onClick={handleSave}
						className="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all"
					>
						{t('btn.save', language)}
					</button>
				</div>
			</div>

			{showLayoutEditor && (
				<LayoutEditor 
					initialConfig={overrides.layout || DEFAULT_LAYOUT_CONFIG}
					onSave={(newLayout) => {
						updateOverride('layout', newLayout); setShowLayoutEditor(false); 
					}}
					onClose={() => setShowLayoutEditor(false)}
				/>
			)}
		</div>
	);
};

export default SessionSettingsModal;
