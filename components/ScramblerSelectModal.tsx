
import React, { useState, useEffect } from 'react';
import { ScramblerCategory, CustomScramblerConfig, Language } from '../types';
import { SCRAMBLERS, getScramblersByCategory, getScrambler } from '../utils/scramble';
import { X, Dices, Plus, Trash2, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { t } from '../translations';

interface Props {
  selectedId: string; // Kept for prop signature compatibility but effectively deprecated in logic if we pass initialIds
  customConfig?: CustomScramblerConfig;
  onSelect: (id: string | string[], customConfig?: CustomScramblerConfig) => void; // Updated signature
  onClose: () => void;
  // Optional initial state for editing relay
  initialIds?: string[];
  language?: Language;
}

export const ScramblerSelectModal: React.FC<Props> = ({ selectedId, customConfig, onSelect, onClose, initialIds, language = Language.EN }) => {
	const grouped = getScramblersByCategory();
	const categories = Object.values(ScramblerCategory);
	const [activeTab, setActiveTab] = useState<ScramblerCategory>(ScramblerCategory.WCA);

	// Relay State
	const [relayList, setRelayList] = useState<string[]>(initialIds || [selectedId]);
  
	// Custom Config State
	const [customMoves, setCustomMoves] = useState(customConfig?.moves || 'U D R L F B');
	const [customOpposites, setCustomOpposites] = useState(customConfig?.opposites || 'U-D R-L F-B');
	const [customLength, setCustomLength] = useState(customConfig?.length || 20);

	const handleAdd = (id: string) => {
		if (id === 'custom') 
		// If adding custom, just add the ID. Config is saved globally for session for now.
			setRelayList(prev => [...prev, id]);
		else 
			setRelayList(prev => [...prev, id]);
      
	};

	const handleRemove = (index: number) => {
		setRelayList(prev => prev.filter((_, i) => i !== index));
	};

	const moveItem = (index: number, direction: -1 | 1) => {
		if (index + direction < 0 || index + direction >= relayList.length) return;
		const newList = [...relayList];
		const temp = newList[index];
		newList[index] = newList[index + direction];
		newList[index + direction] = temp;
		setRelayList(newList);
	};

	const handleSave = () => {
		if (relayList.length === 0) 
		// Prevent saving empty, default to 3x3
			onSelect(['333']);
		else 
			onSelect(relayList, { moves: customMoves, opposites: customOpposites, length: customLength });
      
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] h-[600px]" onClick={e => e.stopPropagation()}>
				<div className="p-4 border-b border-zinc-800 flex justify-between items-center">
					<h2 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
						<Dices size={20} /> {t('scrambler.title', language)}
					</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20} /></button>
				</div>

				<div className="flex flex-1 overflow-hidden">
					{/* Left Panel: Picker */}
					<div className="w-2/3 flex flex-col border-r border-zinc-800">
						<div className="flex border-b border-zinc-800 bg-zinc-950/50 overflow-x-auto shrink-0">
							{categories.map(cat => (
								<button
									key={cat}
									onClick={() => setActiveTab(cat)}
									className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
										activeTab === cat ? 'text-blue-400 border-b-2 border-blue-500 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
									}`}
								>
									{cat}
								</button>
							))}
						</div>

						<div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-zinc-900">
							{activeTab === ScramblerCategory.CUSTOM ? (
								<div className="space-y-4">
									<div className="flex justify-between items-start">
										<p className="text-zinc-400 text-sm mb-4">{t('scrambler.custom.info', language)}</p>
										<button 
											onClick={() => handleAdd('custom')}
											className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1"
										>
											<Plus size={14} /> {t('scrambler.add', language)}
										</button>
									</div>
                            
									<div>
										<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('scrambler.moves', language)}</label>
										<input 
											type="text" 
											value={customMoves}
											onChange={e => setCustomMoves(e.target.value)}
											className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 font-mono text-sm"
										/>
									</div>
                            
									<div>
										<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('scrambler.opposites', language)}</label>
										<input 
											type="text" 
											value={customOpposites}
											onChange={e => setCustomOpposites(e.target.value)}
											className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 font-mono text-sm"
										/>
										<p className="text-[10px] text-zinc-600 mt-1">Pairs defined here will not appear consecutively.</p>
									</div>

									<div>
										<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('scrambler.length', language)}</label>
										<input 
											type="number" 
											value={customLength}
											onChange={e => setCustomLength(parseInt(e.target.value))}
											className="w-24 bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 font-mono text-sm"
										/>
									</div>
								</div>
							) : (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{grouped[activeTab]?.map(scrambler => (
										<button
											key={scrambler.id}
											onClick={() => handleAdd(scrambler.id)}
											className="flex items-center justify-between p-3 rounded border bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-all text-left group"
										>
											<div>
												<span className="font-bold text-zinc-200 block">{scrambler.name}</span>
												<span className="text-xs text-zinc-500 font-mono">{scrambler.id}</span>
											</div>
											<Plus size={16} className="text-zinc-600 group-hover:text-blue-400" />
										</button>
									))}
									{grouped[activeTab]?.length === 0 && (
										<div className="col-span-full text-zinc-500 italic text-center py-8">No scramblers in this category yet.</div>
									)}
								</div>
							)}
						</div>
					</div>

					{/* Right Panel: Relay List */}
					<div className="w-1/3 flex flex-col bg-zinc-950/30">
						<div className="p-3 border-b border-zinc-800 bg-zinc-950/50">
							<h3 className="font-bold text-sm text-zinc-300 uppercase tracking-wider">{t('scrambler.selected', language)}</h3>
							<p className="text-[10px] text-zinc-500">{t('scrambler.sequence', language)}</p>
						</div>
                
						<div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
							{relayList.length === 0 && (
								<div className="text-center text-zinc-600 text-sm py-10 italic">
									{t('scrambler.empty', language)}
								</div>
							)}
							{relayList.map((id, idx) => {
								const def = getScrambler(id);
								return (
									<div key={idx} className="flex items-center gap-3 p-2 bg-zinc-900 rounded border border-zinc-800 group">
										<div className="flex flex-col gap-0.5">
											<button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowUp size={12} /></button>
											<button onClick={() => moveItem(idx, 1)} disabled={idx === relayList.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-20"><ArrowDown size={12} /></button>
										</div>
										<span className="text-zinc-600 font-mono text-xs w-4 text-center">{idx + 1}</span>
										<div className="flex-1">
											<div className="font-bold text-zinc-200 text-sm">{def.name}</div>
										</div>
										<button onClick={() => handleRemove(idx)} className="text-zinc-600 hover:text-red-400 p-1">
											<Trash2 size={14} />
										</button>
									</div>
								);
							})}
						</div>

						<div className="p-4 border-t border-zinc-800 bg-zinc-950">
							<button 
								onClick={handleSave}
								disabled={relayList.length === 0}
								className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
							>
								{t('scrambler.confirm', language)} {relayList.length > 1 ? `Relay (${relayList.length})` : ''} <ArrowRight size={16} />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
