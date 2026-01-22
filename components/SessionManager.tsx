

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Session, SolveMap, Settings } from '../types';
import { getScrambler } from '../utils/scramble';
import { Plus, Edit2, Trash2, Check, X, Settings as SettingsIcon, Dices, Search, Tag, Calendar, Clock, Layers } from 'lucide-react';
import { ScramblerSelectModal } from './ScramblerSelectModal';
import { t } from '../translations';
import { formatDate } from '../utils/date';

interface SessionManagerProps {
  sessions: Session[];
  solvesMap: SolveMap;
  currentSessionId: string;
  settings: Settings;
  onSwitch: (id: string) => void;
  onCreate: (name: string, scramblerId: string | string[], tags?: string[]) => void;
  onUpdate: (id: string, updates: Partial<Session>) => void;
  onDelete: (id: string) => void;
  onConfigure: (id: string) => void;
  onClose: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
	sessions,
	solvesMap,
	currentSessionId,
	settings,
	onSwitch,
	onCreate,
	onUpdate,
	onDelete,
	onConfigure,
	onClose,
}) => {
	// UI State
	const [isCreating, setIsCreating] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  
	// Editing State
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState<{ name: string, tags: string[] }>({ name: '', tags: [] });
	const [tagInput, setTagInput] = useState('');

	// Creation State
	const [newName, setNewName] = useState('');
	const [newScramblerIds, setNewScramblerIds] = useState<string[]>(['333']);
	const [newTags, setNewTags] = useState<string[]>([]);
	const [newTagInput, setNewTagInput] = useState('');

	// If creating, we might use modal to pick relay
	const [showScramblerSelect, setShowScramblerSelect] = useState<{ sessionId: string | 'NEW', currentIds: string[], config?: any } | null>(null);
  
	const searchInputRef = useRef<HTMLInputElement>(null);
	const lang = settings.language;

	useEffect(() => {
		if (searchInputRef.current) 
			searchInputRef.current.focus();
      
	}, []);

	// --- Helpers ---
	const allTags = useMemo(() => {
		const tags = new Set<string>();
		sessions.forEach(s => s.tags?.forEach(t => tags.add(t)));
		return Array.from(tags).sort();
	}, [sessions]);

	const getLastSolveTimestamp = (session: Session): number => {
		if (session.solveIds.length === 0) return 0;
		const lastId = session.solveIds[session.solveIds.length - 1];
		return solvesMap[lastId]?.timestamp || 0;
	};

	const filteredSessions = useMemo(() => {
		return sessions.filter(s => {
			const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesTags = activeTags.size === 0 || (s.tags && Array.from(activeTags).every(t => s.tags?.includes(t)));
			return matchesSearch && matchesTags;
		}).sort((a, b) => {
			const lastA = getLastSolveTimestamp(a);
			const lastB = getLastSolveTimestamp(b);
			return lastB - lastA; // Newest first
		});
	}, [sessions, searchQuery, activeTags, solvesMap]);

	// --- Handlers ---
	const handleCreate = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim()) {
			onCreate(newName.trim(), newScramblerIds, newTags);
			setNewName('');
			setNewTags([]);
			setNewScramblerIds(['333']);
			setIsCreating(false);
		}
	};

	const startEditing = (session: Session) => {
		setEditingId(session.id);
		setEditForm({ name: session.name, tags: session.tags || [] });
		setTagInput('');
	};

	const saveEditing = (id: string) => {
		onUpdate(id, { name: editForm.name, tags: editForm.tags });
		setEditingId(null);
	};

	const handleKeyDownSearch = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && filteredSessions.length > 0) 
			onSwitch(filteredSessions[0].id);
      
	};

	const addTag = (tag: string, isNew: boolean) => {
		const clean = tag.trim();
		if (!clean) return;
		if (isNew) {
			if (!newTags.includes(clean)) setNewTags([...newTags, clean]);
			setNewTagInput('');
		} else {
			if (!editForm.tags.includes(clean)) setEditForm({ ...editForm, tags: [...editForm.tags, clean] });
			setTagInput('');
		}
	};

	const removeTag = (tag: string, isNew: boolean) => {
		if (isNew) 
			setNewTags(newTags.filter(t => t !== tag));
		else 
			setEditForm({ ...editForm, tags: editForm.tags.filter(t => t !== tag) });
      
	};

	const toggleFilterTag = (tag: string) => {
		const next = new Set(activeTags);
		if (next.has(tag)) next.delete(tag);
		else next.add(tag);
		setActiveTags(next);
	};

	const getScramblerLabel = (ids: string[]) => {
		if (!ids || ids.length === 0) return 'Unknown';
		if (ids.length === 1) return getScrambler(ids[0]).name;
		return `${ids.length} Puzzle Relay`;
	};

	const handleScramblerUpdate = (newIds: string | string[], config?: any) => {
		const arr = Array.isArray(newIds) ? newIds : [newIds];
		if (showScramblerSelect?.sessionId === 'NEW') 
			setNewScramblerIds(arr);
		// Should we save custom config? Not implemented in createSession flow fully yet, but in store it is.
		else if (showScramblerSelect?.sessionId) 
			onUpdate(showScramblerSelect.sessionId, { scramblerId: arr, customScramblerConfig: config });
      
		setShowScramblerSelect(null);
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div 
				className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh]"
				onClick={e => e.stopPropagation()}
			>
				{/* Header */}
				<div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 rounded-t-xl">
					<h2 className="font-bold text-lg text-zinc-100">{t('session.manage', lang)}</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100">
						<X size={20} />
					</button>
				</div>

				{/* Search & Filter */}
				<div className="p-4 border-b border-zinc-800 bg-zinc-900">
					<div className="relative mb-3">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
						<input 
							ref={searchInputRef}
							type="text" 
							placeholder={t('session.search', lang)}
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							onKeyDown={handleKeyDownSearch}
							className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-zinc-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
						/>
					</div>
					{allTags.length > 0 && (
						<div className="flex flex-wrap gap-2">
							{allTags.map(tag => (
								<button
									key={tag}
									onClick={() => toggleFilterTag(tag)}
									className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 transition-colors ${
										activeTags.has(tag) 
											? 'bg-blue-900/30 border-blue-500 text-blue-300' 
											: 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600'
									}`}
								>
									<Tag size={10} /> {tag}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Session List */}
				<div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-zinc-900/50">
					{filteredSessions.map(session => {
						const lastSolveTs = getLastSolveTimestamp(session);
						const lastSolveDate = lastSolveTs > 0 ? formatDate(lastSolveTs, settings.dateFormat) : null;
						const sIds = session.scramblerId || ['333'];

						return (
							<div 
								key={session.id} 
								className={`flex flex-col p-4 rounded-xl border transition-all ${
									session.id === currentSessionId 
										? 'bg-blue-900/10 border-blue-900/50 shadow-sm' 
										: 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
								}`}
							>
								{editingId === session.id ? (
									<div className="space-y-3">
										{/* Edit Mode */}
										<div className="flex gap-2">
											<input 
												autoFocus
												type="text" 
												value={editForm.name}
												onChange={(e) => setEditForm({...editForm, name: e.target.value})}
												className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
												placeholder={t('session.namePlaceholder', lang)}
											/>
											<button onClick={() => saveEditing(session.id)} className="bg-green-600 hover:bg-green-500 text-white px-4 rounded"><Check size={18}/></button>
											<button onClick={() => setEditingId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 px-4 rounded"><X size={18}/></button>
										</div>
                        
										<div className="flex flex-wrap gap-2 items-center bg-zinc-900 p-2 rounded border border-zinc-800">
											<Tag size={14} className="text-zinc-500 ml-1" />
											{editForm.tags.map(tag => (
												<span key={tag} className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded flex items-center gap-1">
													{tag} <button onClick={() => removeTag(tag, false)} className="hover:text-red-400"><X size={12}/></button>
												</span>
											))}
											<input 
												type="text"
												value={tagInput}
												onChange={e => setTagInput(e.target.value)}
												onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addTag(tagInput, false); } }}
												placeholder={t('session.addTag', lang)}
												className="bg-transparent outline-none text-xs text-zinc-300 placeholder-zinc-600 w-24"
											/>
										</div>
									</div>
								) : (
									<div className="flex items-center justify-between gap-4">
										{/* Display Mode */}
										<div 
											onClick={() => onSwitch(session.id)}
											className="flex-1 cursor-pointer"
										>
											<div className="flex items-baseline gap-3 mb-1">
												<h3 className={`font-bold text-lg ${session.id === currentSessionId ? 'text-blue-400' : 'text-zinc-200'}`}>
													{session.name}
												</h3>
												<span className="text-xs text-zinc-500 font-mono flex items-center gap-1" title={sIds.map(id => getScrambler(id).name).join(' + ')}>
													{sIds.length > 1 ? <Layers size={12}/> : <Dices size={12}/>} {getScramblerLabel(sIds)}
												</span>
												<span className="text-xs text-zinc-500 font-mono flex items-center gap-1">
													<Check size={12}/> {session.solveIds.length}
												</span>
											</div>
                            
											<div className="flex flex-wrap gap-2">
												{session.tags?.map(tag => (
													<span key={tag} className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
														{tag}
													</span>
												))}
												{lastSolveDate && (
													<span className="text-[10px] text-zinc-600 flex items-center gap-1 ml-auto">
														<Clock size={10} /> 
														{lastSolveDate}
													</span>
												)}
											</div>
										</div>

										<div className="flex items-center gap-1">
											<button
												onClick={() => setShowScramblerSelect({ sessionId: session.id, currentIds: session.scramblerId, config: session.customScramblerConfig })}
												className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
												title="Change Scrambler"
											>
												<Dices size={16} />
											</button>
											<button 
												onClick={() => onConfigure(session.id)}
												className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
												title="Settings"
											>
												<SettingsIcon size={16} />
											</button>
											<button 
												onClick={() => startEditing(session)}
												className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 rounded transition-colors"
												title="Edit"
											>
												<Edit2 size={16} />
											</button>
											{sessions.length > 1 && (
												<button 
													onClick={() => onDelete(session.id)}
													className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
													title="Delete"
												>
													<Trash2 size={16} />
												</button>
											)}
										</div>
									</div>
								)}
							</div>
						)})}
          
					{filteredSessions.length === 0 && (
						<div className="text-center py-10 text-zinc-600 italic">
							{t('session.notFound', lang)}
						</div>
					)}
				</div>

				{/* Footer / Create New */}
				<div className="p-4 border-t border-zinc-800 bg-zinc-950 rounded-b-xl">
					{isCreating ? (
						<form onSubmit={handleCreate} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3">
							<h3 className="text-sm font-bold text-zinc-400 uppercase">{t('session.new', lang)}</h3>
							<input 
								autoFocus
								type="text" 
								value={newName} 
								onChange={(e) => setNewName(e.target.value)}
								placeholder={t('session.namePlaceholder', lang)}
								className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 text-zinc-200"
							/>
                    
							<div className="flex flex-wrap gap-2 items-center bg-zinc-950 border border-zinc-700 rounded px-3 py-2">
								<Tag size={14} className="text-zinc-500" />
								{newTags.map(tag => (
									<span key={tag} className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded flex items-center gap-1">
										{tag} <button type="button" onClick={() => removeTag(tag, true)} className="hover:text-red-400"><X size={12}/></button>
									</span>
								))}
								<input 
									type="text"
									value={newTagInput}
									onChange={e => setNewTagInput(e.target.value)}
									onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addTag(newTagInput, true); } }}
									placeholder={t('session.addTag', lang)}
									className="bg-transparent outline-none text-xs text-zinc-300 placeholder-zinc-600 flex-1 min-w-[80px]"
								/>
							</div>

							<div className="flex gap-2">
								<button 
									type="button"
									onClick={() => setShowScramblerSelect({ sessionId: 'NEW', currentIds: newScramblerIds })}
									className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 text-left flex items-center justify-between"
								>
									<span className="truncate">{getScramblerLabel(newScramblerIds)}</span>
									<Dices size={14} className="text-zinc-500"/>
								</button>
								<button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium">
									{t('session.create', lang)}
								</button>
								<button type="button" onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-zinc-200 px-3 text-sm">
									{t('session.cancel', lang)}
								</button>
							</div>
						</form>
					) : (
						<button 
							onClick={() => setIsCreating(true)}
							className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-zinc-900"
						>
							<Plus size={16} /> {t('session.new', lang)}
						</button>
					)}
				</div>
			</div>

			{showScramblerSelect && (
				<ScramblerSelectModal 
					selectedId={showScramblerSelect.currentIds[0]} // Backwards compat
					initialIds={showScramblerSelect.currentIds}
					customConfig={showScramblerSelect.config}
					onSelect={handleScramblerUpdate}
					onClose={() => setShowScramblerSelect(null)}
					language={settings.language}
				/>
			)}
		</div>
	);
};

export default SessionManager;