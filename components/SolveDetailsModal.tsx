import React, { useState, useEffect } from 'react';
import { ComputedSolve, Language, Penalty, TimePrecision, PuzzleType, DateFormat } from '../types';
import { t } from '../translations';
import { formatTime, formatDate } from '../utils';
import { X, Copy, Check, Tag, Plus, MessageSquare, Lock } from 'lucide-react';
import { ScrambleDisplay } from './widgets/ScrambleDisplay';
import { getScrambler } from '../utils/scramblerRegistry';
import { APP_VERSION } from '../utils/constants';

interface SolveDetailsModalProps {
  solve: ComputedSolve;
  language: Language;
  precision: TimePrecision;
  onUpdatePenalty: (id: string, penalty: Penalty) => void;
  onUpdateSolve?: (id: string, updates: Partial<ComputedSolve>) => void;
  onClose: () => void;
  sessionLocked?: boolean;
  dateFormat?: DateFormat;
}

const SolveDetailsModal: React.FC<SolveDetailsModalProps> = ({ solve, language, precision, onUpdatePenalty, onUpdateSolve, onClose, sessionLocked, dateFormat = DateFormat.ISO }) => {
	const [copied, setCopied] = useState(false);
	const [tagInput, setTagInput] = useState('');
	const [comment, setComment] = useState(solve.comment || '');

	useEffect(() => {
		setComment(solve.comment || '');
	}, [solve.id, solve.comment]);

	const handleCopyExport = (): void => {
		const finalTime = formatTime(solve.time, solve.penalty, precision);
		// Flatten scrambles for simple text export
		const scrambleText = solve.scramble.map(s => s.join(' ')).join(' | ');
		const text = `---------- Export by CMOSTimer v${APP_VERSION} ----------\n${finalTime}: ${scrambleText}`;
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const addTag = (): void => {
		if (sessionLocked) return;
		if (!tagInput.trim() || !onUpdateSolve) return;
		const newTags = [...(solve.tags || [])];
		if (!newTags.includes(tagInput.trim())) {
			newTags.push(tagInput.trim());
			onUpdateSolve(solve.id, { tags: newTags });
		}
		setTagInput('');
	};

	const removeTag = (tag: string): void => {
		if (sessionLocked) return;
		if (!onUpdateSolve) return;
		const newTags = (solve.tags || []).filter(t => t !== tag);
		onUpdateSolve(solve.id, { tags: newTags });
	};

	const handleCommentBlur = (): void => {
		if (sessionLocked) return;
		if (onUpdateSolve && comment !== (solve.comment || '')) 
			onUpdateSolve(solve.id, { comment });
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-start mb-4">
					<div className="flex items-center gap-2">
						<div>
							<h2 className="text-xl font-bold text-zinc-100">{t('details.title', language)}</h2>
							<p className="text-zinc-500 text-xs font-mono">{solve.id}</p>
						</div>
						{sessionLocked && (
							<div className="flex items-center gap-1 bg-amber-900/30 text-amber-500 px-2 py-1 rounded border border-amber-900/50">
								<Lock size={12} />
								<span className="text-[10px] font-bold uppercase tracking-wide">{t('details.readOnly', language)}</span>
							</div>
						)}
					</div>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
				</div>

				<div className="space-y-4">
					{/* Main Time */}
					<div className="text-center py-4 bg-zinc-950/50 rounded border border-zinc-800 relative group">
						<div className="text-xs uppercase font-bold text-zinc-500">{t('details.time', language)}</div>
						<div className="text-4xl font-mono font-bold text-zinc-100">
							{formatTime(solve.time, solve.penalty, precision)}
						</div>
						<div className="text-zinc-500 text-xs mt-1">
							{t('details.base', language)}: {formatTime(solve.time, Penalty.NONE, precision)} | {t('timer.inspectionState', language)}: {solve.inspectionTime >= 0 ? formatTime(solve.inspectionTime, Penalty.NONE, precision) : t('session.disabled', language)}
						</div>
					</div>
            
					<div className="flex items-center justify-between bg-zinc-950/30 p-3 rounded border border-zinc-800/50">
						<span className="text-sm text-zinc-400">{t('details.penalty', language)}</span>
						<select 
							value={solve.penalty} 
							disabled={sessionLocked}
							onChange={(e) => onUpdatePenalty(solve.id, e.target.value as Penalty)}
							className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<option value={Penalty.NONE}>None</option>
							<option value={Penalty.PLUS_TWO}>+2</option>
							<option value={Penalty.PLUS_FOUR}>+4</option>
							<option value={Penalty.PLUS_SIX}>+6</option>
							<option value={Penalty.PLUS_EIGHT}>+8</option>
							<option value={Penalty.PLUS_TEN}>+10</option>
							<option value={Penalty.PLUS_TWELVE}>+12</option>
							<option value={Penalty.PLUS_FOURTEEN}>+14</option>
							<option value={Penalty.PLUS_SIXTEEN}>+16</option>
							<option value={Penalty.DNF}>DNF</option>
							<option value={Penalty.DNS}>DNS</option>
						</select>
					</div>

					{/* Tags */}
					<div className="bg-zinc-950/30 p-3 rounded border border-zinc-800/50">
						<div className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><Tag size={12} /> Tags</div>
						<div className="flex flex-wrap gap-2 mb-2">
							{(solve.tags || []).map(tag => (
								<span key={tag} className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs border border-blue-900/50 flex items-center gap-1">
									{tag} 
									{!sessionLocked && <button onClick={() => removeTag(tag)} className="hover:text-white"><X size={10}/></button>}
								</span>
							))}
						</div>
						<div className="flex gap-2">
							<input 
								type="text" 
								disabled={sessionLocked}
								value={tagInput}
								onChange={e => setTagInput(e.target.value)}
								onKeyDown={e => e.key === 'Enter' && addTag()}
								placeholder={sessionLocked ? t('details.locked', language) : t('session.addTag', language)}
								className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none text-zinc-200 disabled:opacity-50"
							/>
							<button 
								onClick={addTag} 
								disabled={sessionLocked}
								className="bg-zinc-800 hover:bg-zinc-700 p-1 rounded text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
							>
								<Plus size={16}/>
							</button>
						</div>
					</div>

					{/* Date */}
					<div className="p-3 bg-zinc-950/30 rounded border border-zinc-800/50">
						<div className="text-xs text-zinc-500 mb-1">{t('details.date', language)}</div>
						<div className="text-zinc-300 text-sm">
							{formatDate(solve.timestamp, dateFormat)} <span className="text-zinc-500 text-xs">{new Date(solve.timestamp).toLocaleTimeString()}</span>
						</div>
					</div>

					{/* Comment */}
					<div className="bg-zinc-950/30 p-3 rounded border border-zinc-800/50">
						<div className="text-xs text-zinc-500 mb-2 flex items-center gap-1"><MessageSquare size={12} /> {t('details.comment', language)}</div>
						<textarea 
							value={comment}
							disabled={sessionLocked}
							onChange={(e) => setComment(e.target.value)}
							onBlur={handleCommentBlur}
							maxLength={4000}
							placeholder={sessionLocked ? t('details.noComment', language) : t('details.addComment', language)}
							className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-sm text-zinc-300 outline-none focus:border-blue-500 min-h-[80px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<div className="text-[10px] text-zinc-600 text-right mt-1">{comment.length} / 4000</div>
					</div>

					<div>
						<div className="flex justify-between items-end mb-1">
							<div className="text-xs text-zinc-500">{t('details.scramble', language)}</div>
							<button 
								onClick={handleCopyExport} 
								className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1 rounded transition-colors"
							>
								{copied ? <Check size={12} /> : <Copy size={12} />}
								{copied ? t('data.copied', language) : t('details.copy', language)}
							</button>
						</div>
                
						{solve.scramble.map((moves, idx) => {
							const sid = solve.scramblerId[idx] || '333';
							const scramblerDef = getScrambler(sid);
							const visualType = scramblerDef ? scramblerDef.visualizer : PuzzleType.THREE;
                    
							return (
								<div key={idx} className="mb-4 last:mb-0">
									{solve.scramble.length > 1 && <div className="text-xs text-zinc-600 mb-1 uppercase font-bold">{scramblerDef.name}</div>}
									<div className="p-3 bg-zinc-950/30 rounded font-mono text-sm text-zinc-300 break-words border border-zinc-800 mb-2">
										{moves.join(' ')}
									</div>
									<div className="flex justify-center bg-zinc-950/30 p-2 rounded border border-zinc-800/50">
										<ScrambleDisplay scramble={moves} type={visualType} className="h-32" />
									</div>
								</div>
							);
						})}
					</div>

					{solve.phases && solve.phases.length > 1 && (
						<div>
							<div className="text-xs text-zinc-500 mb-1">{t('details.phases', language)}</div>
							<div className="border border-zinc-800 rounded overflow-hidden text-sm">
								<table className="w-full text-left">
									<thead className="bg-zinc-950 text-zinc-500 text-xs uppercase">
										<tr>
											<th className="px-3 py-2">#</th>
											<th className="px-3 py-2">Split</th>
											<th className="px-3 py-2">Total</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-zinc-800">
										{solve.phases.map((p, i) => (
											<tr key={i} className="bg-zinc-900/50">
												<td className="px-3 py-1.5 text-zinc-500 font-mono">{i + 1}</td>
												<td className="px-3 py-1.5 text-zinc-300 font-mono">{formatTime(p.duration, Penalty.NONE, precision)}</td>
												<td className="px-3 py-1.5 text-zinc-400 font-mono">{formatTime(p.cumulative, Penalty.NONE, precision)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default SolveDetailsModal;
