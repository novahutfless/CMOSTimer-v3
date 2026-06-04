import React, { useRef, useState } from 'react';
import { X, Download, Upload, Save, Check, AlertCircle } from 'lucide-react';
import { t } from '../translations';
import { Language, Session, Settings, StatConfig, SolveMap } from '../types';
import { parseImportData, ParsedImport } from '../utils/import';
import { ImportSession } from '../utils/importers/types';
import { AppStoreActions } from '../hooks/useAppStore';
import { APP_VERSION } from '../utils/constants';

interface Props {
    onClose: () => void;
    language: Language;
    sessions: Session[];
    solvesMap: SolveMap;
    settings: Settings;
    statsConfig: StatConfig[];
    currentSessionId: string;
    actions: AppStoreActions;
}

export const DataManagementModal: React.FC<Props> = (dta: Props) => {
	const { onClose, language, sessions, solvesMap, settings, statsConfig, currentSessionId, actions } = dta;
	type ImportMapping = Record<string, { type: 'NEW' | 'MERGE' | 'SKIP'; targetId?: string | undefined }>;
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [parsedData, setParsedData] = useState<ParsedImport | null>(null);
	const [importMapping, setImportMapping] = useState<ImportMapping>({});
	const [importSettings, setImportSettings] = useState(false);
	const [deduplicate, setDeduplicate] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const handleExport = (): void => {
		// Export the full normalized state
		const data = {
			sessions,
			solves: solvesMap,
			settings,
			statsConfig,
			currentSessionId,
			version: APP_VERSION,
			exportDate: new Date().toISOString()
		};
		const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `cmostimer_backup_${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleImportClick = (): void => fileInputRef.current?.click();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev): void => {
			if (ev.target?.result) 
				try {
					const parsed = parseImportData(ev.target.result as string, file.name);
					setParsedData(parsed);
                    
					const initialMapping: ImportMapping = {};
					parsed.sessions.forEach((s: ImportSession) => {
						// Check if it's legacy format with `solves` array or new format with `solveIds`
						// For preview, we treat it abstractly as "has solves"
						const count = s.solves ? s.solves.length : s.solveIds.length;
						initialMapping[s.id] = { type: count > 0 ? 'NEW' : 'SKIP' };
					});
					setImportMapping(initialMapping);
					setError(null);
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : 'Failed to parse file';
					setError(message);
				}
            
		};
		reader.readAsText(file);
	};

	const handleConfirmImport = async (): Promise<void> => {
		if (!parsedData) return;

		const sessionsToImport = parsedData.sessions
			.filter(s => importMapping[s.id]?.type !== 'SKIP')
			.map(s => ({
				session: s,
				targetId: importMapping[s.id]?.type === 'NEW'
					? 'NEW'
					: (importMapping[s.id]?.targetId ?? sessions[0]?.id ?? 'NEW')
			}));
        
		try {
			const importPayload = {
				sessions: sessionsToImport,
				deduplicate
			} as const;
			await actions.processImport({
				...importPayload,
				...((parsedData.type === 'CMOSTimer' && importSettings && parsedData.settings !== undefined) ? { settings: parsedData.settings } : {}),
				...((parsedData.type === 'CMOSTimer' && importSettings && parsedData.statsConfig !== undefined) ? { statsConfig: parsedData.statsConfig } : {})
			});
			
			onClose();
			alert(t('import.success', language));
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Import failed';
			setError(message);
		}
	};

	const toggleSkip = (id: string): void => {
		setImportMapping(prev => ({
			...prev,
			[id]: { ...prev[id], type: prev[id].type === 'SKIP' ? 'NEW' : 'SKIP' }
		}));
	};

	const changeMappingType = (id: string, type: 'NEW' | 'MERGE'): void => {
		setImportMapping(prev => ({
			...prev,
			[id]: type === 'MERGE' && sessions[0]?.id
				? { type, targetId: sessions[0].id }
				: { type }
		}));
	};

	const changeMergeTarget = (id: string, targetId: string): void => {
		setImportMapping(prev => ({
			...prev,
			[id]: { ...prev[id], targetId }
		}));
	};

	if (parsedData) 
		return (
			<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
				<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
							<Upload size={24} className="text-green-400" /> {t('import.preview', language)}
						</h2>
						<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
					</div>

					<div className="bg-zinc-950 p-3 rounded border border-zinc-800 mb-4 flex flex-col gap-2">
						<div className="flex justify-between items-center">
							<span className="text-sm text-zinc-400 font-mono">
                                Format: {parsedData.type}
							</span>
							{parsedData.type === 'CMOSTimer' && (
								<label className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
									<input 
										type="checkbox" 
										checked={importSettings} 
										onChange={e => setImportSettings(e.target.checked)}
										className="accent-blue-500"
									/>
									{t('import.settings', language)}
								</label>
							)}
						</div>
						<label className="flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
							<input 
								type="checkbox" 
								checked={deduplicate} 
								onChange={e => setDeduplicate(e.target.checked)}
								className="accent-blue-500"
							/>
                            Deduplicate (Skip existing matches)
						</label>
					</div>
					{error && (
						<div className="mb-4 bg-red-900/20 border border-red-900/50 p-3 rounded text-red-400 text-xs flex gap-2 items-start">
							<AlertCircle size={16} className="shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					<div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 mb-4">
						{parsedData.sessions.map(s => {
							const count = s.solves ? s.solves.length : s.solveIds.length;
							return (
								<div key={s.id} className={`p-3 rounded border flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${importMapping[s.id]?.type === 'SKIP' ? 'bg-zinc-900 border-zinc-800 opacity-50' : 'bg-zinc-900 border-zinc-700'}`}>
									<div className="flex items-center gap-3 flex-1">
										<input 
											type="checkbox" 
											checked={importMapping[s.id]?.type !== 'SKIP'}
											onChange={() => toggleSkip(s.id)}
											className="w-4 h-4 accent-blue-500 shrink-0"
										/>
										<div className="min-w-0">
											<div className="font-bold text-zinc-200 truncate">{s.name}</div>
											<div className="text-xs text-zinc-500">{count} solves • {s.scramblerId}</div>
										</div>
									</div>

									{importMapping[s.id]?.type !== 'SKIP' && (
										<div className="flex items-center gap-2">
											<select 
												value={importMapping[s.id].type}
												onChange={e => changeMappingType(s.id, e.target.value as 'NEW' | 'MERGE')}
												className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none"
											>
												<option value="NEW">{t('import.asNew', language)}</option>
												<option value="MERGE">{t('import.merge', language)}</option>
											</select>
                                        
											{importMapping[s.id].type === 'MERGE' && (
												<select 
													value={importMapping[s.id].targetId}
													onChange={e => changeMergeTarget(s.id, e.target.value)}
													className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-300 outline-none max-w-[150px]"
												>
													{sessions.map(existing => (
														<option key={existing.id} value={existing.id}>{existing.name}</option>
													))}
												</select>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>

					<div className="flex justify-end gap-3">
						<button onClick={() => setParsedData(null)} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">{t('btn.cancel', language)}</button>
						<button 
							onClick={handleConfirmImport}
							className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold flex items-center gap-2"
						>
							<Check size={16} /> {t('btn.confirmImport', language)}
						</button>
					</div>
				</div>
			</div>
		);
    

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
						<Save size={24} /> {t('data.manage', language)}
					</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
				</div>

				<div className="space-y-4">
					<button 
						onClick={handleExport}
						className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center justify-center gap-3 transition-colors"
					>
						<Download size={20} className="text-blue-400" />
						<span className="font-medium text-zinc-200">{t('data.export', language)}</span>
					</button>

					<button 
						onClick={handleImportClick}
						className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center justify-center gap-3 transition-colors"
					>
						<Upload size={20} className="text-green-400" />
						<span className="font-medium text-zinc-200">{t('data.import', language)}</span>
					</button>
					<input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json,.txt" className="hidden" />
				</div>
                
				{error && (
					<div className="mt-4 bg-red-900/20 border border-red-900/50 p-3 rounded text-red-400 text-xs flex gap-2 items-start">
						<AlertCircle size={16} className="shrink-0 mt-0.5" />
						<span>{error}</span>
					</div>
				)}

				<p className="mt-6 text-xs text-zinc-500 text-center">
					{t('import.supportInfo', language)}
				</p>
			</div>
		</div>
	);
};
