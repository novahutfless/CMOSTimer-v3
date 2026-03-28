import React, { useState, useEffect } from 'react';
import { Goal, GoalType, GoalFrequency, GoalScope, Session, StatType, Language } from '../types';
import { X, Trash2, Save } from 'lucide-react';
import { generateId } from '../utils';
import { t } from '../translations';

interface Props {
    initialGoal?: Goal;
    sessions: Session[];
    currentSessionId: string;
    language: Language;
    onSave: (goal: Goal) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

const DEFAULT_GOAL: Goal = {
	id: '',
	type: GoalType.SOLVE_COUNT,
	frequency: GoalFrequency.DAILY,
	scope: GoalScope.GLOBAL,
	targetValue: 100,
	createdAt: Date.now()
};

export const GoalManagerModal: React.FC<Props> = ({ initialGoal, sessions, currentSessionId, language, onSave, onDelete, onClose }) => {
	const [form, setForm] = useState<Goal>(initialGoal || { ...DEFAULT_GOAL, id: generateId() });
    
	// Helper state for Stat Target specific inputs
	const [statType, setStatType] = useState<StatType>(StatType.AVERAGE);
	const [statSize, setStatSize] = useState<number>(5);
	const [targetTimeSec, setTargetTimeSec] = useState<number>(10);
	const [useTimeFilter, setUseTimeFilter] = useState<boolean>((initialGoal?.maxSolveTimeMs ?? 0) > 0);
	const [maxSolveTimeSec, setMaxSolveTimeSec] = useState<number>((initialGoal?.maxSolveTimeMs ?? 0) > 0 ? (initialGoal!.maxSolveTimeMs! / 1000) : 10);

	useEffect(() => {
		if (initialGoal && initialGoal.type === GoalType.STAT_TARGET && initialGoal.statConfig) {
			setStatType(initialGoal.statConfig.type);
			setStatSize(initialGoal.statConfig.size);
			setTargetTimeSec(initialGoal.targetValue / 1000);
		}
	}, [initialGoal]);

	const handleSubmit = (e: React.FormEvent): void => {
		e.preventDefault();
		const finalGoal = { ...form };
        
		if (finalGoal.type === GoalType.TIME_SPENT) {
			// Convert minutes input to ms? Or assumes UI handles it.
			// Let's assume UI input for time spent is minutes for UX.
			// But here `form.targetValue` is raw.
		}

		if (finalGoal.type === GoalType.STAT_TARGET) {
			finalGoal.statConfig = {
				id: generateId(),
				type: statType,
				size: statSize
			};
			finalGoal.targetValue = targetTimeSec * 1000;
		}

		if (finalGoal.scope === GoalScope.SESSION && !finalGoal.sessionId) {
			finalGoal.sessionId = currentSessionId;
		}

		if (useTimeFilter && maxSolveTimeSec > 0) finalGoal.maxSolveTimeMs = maxSolveTimeSec * 1000;
		else delete finalGoal.maxSolveTimeMs;
        
		onSave(finalGoal);
		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-bold text-zinc-100">{initialGoal ? t('goals.editGoal', language) : t('goals.newGoal', language)}</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20}/></button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.type', language)}</label>
						<select 
							value={form.type}
							onChange={e => setForm({...form, type: e.target.value as GoalType})}
							className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
						>
							<option value={GoalType.SOLVE_COUNT}>{t('goals.type.solveCount', language)}</option>
							<option value={GoalType.TIME_SPENT}>{t('goals.type.timeSpent', language)}</option>
							<option value={GoalType.STAT_TARGET}>{t('goals.type.statTarget', language)}</option>
						</select>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.frequency', language)}</label>
							<select 
								value={form.frequency}
								onChange={e => setForm({...form, frequency: e.target.value as GoalFrequency})}
								className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
							>
								<option value={GoalFrequency.DAILY}>{t('goals.frequency.daily', language)}</option>
								<option value={GoalFrequency.WEEKLY}>{t('goals.frequency.weekly', language)}</option>
								<option value={GoalFrequency.MONTHLY}>{t('goals.frequency.monthly', language)}</option>
								<option value={GoalFrequency.YEARLY}>{t('goals.frequency.yearly', language)}</option>
								{form.type !== GoalType.STAT_TARGET && <option value={GoalFrequency.BY_DATE}>{t('goals.frequency.byDate', language)}</option>}
								{form.type === GoalType.STAT_TARGET && <option value={GoalFrequency.INFINITE}>{t('goals.frequency.infinite', language)}</option>}
							</select>
						</div>
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.scope', language)}</label>
							<select 
								value={form.scope}
								onChange={e => {
									const nextScope = e.target.value as GoalScope;
									setForm(prev => ({
										...prev,
										scope: nextScope,
										sessionId: nextScope === GoalScope.SESSION ? (prev.sessionId || currentSessionId) : prev.sessionId
									}));
								}}
								className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
							>
								<option value={GoalScope.GLOBAL}>{t('goals.scope.global', language)}</option>
								<option value={GoalScope.SESSION}>{t('goals.scope.session', language)}</option>
							</select>
						</div>
					</div>

					{form.scope === GoalScope.SESSION && (
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('session.type', language)}</label>
							<select 
								value={form.sessionId || currentSessionId}
								onChange={e => setForm({...form, sessionId: e.target.value})}
								required
								className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
							>
								<option value="" disabled>{t('goals.selectSession', language)}</option>
								{sessions.map(s => (
									<option key={s.id} value={s.id}>{s.name}</option>
								))}
							</select>
						</div>
					)}

					{form.type === GoalType.SOLVE_COUNT && (
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.targetCount', language)}</label>
							<input 
								type="number" 
								min="1"
								value={form.targetValue}
								onChange={e => setForm({...form, targetValue: parseInt(e.target.value)})}
								className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
							/>
						</div>
					)}

					{form.type === GoalType.TIME_SPENT && (
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.targetDuration', language)}</label>
							<input 
								type="number" 
								min="1"
								value={Math.round(form.targetValue / 60000) || 10} // Display as minutes, store as ms
								onChange={e => setForm({...form, targetValue: parseInt(e.target.value) * 60000})}
								className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
							/>
						</div>
					)}

					{form.type === GoalType.STAT_TARGET && (
						<div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded space-y-3">
							<div className="flex gap-2">
								<select 
									value={statType}
									onChange={e => setStatType(e.target.value as StatType)}
									className="flex-1 bg-zinc-900 border border-zinc-700 rounded p-2 text-sm"
								>
									<option value={StatType.SINGLE}>Single</option>
									<option value={StatType.MEAN}>Mean</option>
									<option value={StatType.AVERAGE}>Average</option>
								</select>
								{statType !== StatType.SINGLE && (
									<input 
										type="number" 
										value={statSize}
										onChange={e => setStatSize(parseInt(e.target.value))}
										placeholder="Size"
										className="w-20 bg-zinc-900 border border-zinc-700 rounded p-2 text-sm"
									/>
								)}
							</div>
							<div>
								<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.targetTimeSec', language)}</label>
								<input 
									type="number" 
									step="0.01"
									value={targetTimeSec}
									onChange={e => setTargetTimeSec(parseFloat(e.target.value))}
									className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 text-sm font-mono"
								/>
							</div>
						</div>
					)}

					<div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded space-y-2">
						<label className="flex items-center gap-2 text-xs text-zinc-300">
							<input
								type="checkbox"
								checked={useTimeFilter}
								onChange={e => setUseTimeFilter(e.target.checked)}
							/>
							<span>{t('goals.filter.enable', language)}</span>
						</label>
						{useTimeFilter && (
							<div>
								<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.filter.belowSec', language)}</label>
								<input
									type="number"
									min="0.01"
									step="0.01"
									value={maxSolveTimeSec}
									onChange={e => setMaxSolveTimeSec(parseFloat(e.target.value) || 0)}
									className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 text-sm font-mono"
								/>
							</div>
						)}
					</div>

					{form.frequency === GoalFrequency.BY_DATE && (
						<div>
							<label className="block text-xs font-bold text-zinc-500 uppercase mb-1">{t('goals.deadline', language)}</label>
							<input 
								type="date" 
								required
								value={form.deadline ? new Date(form.deadline).toISOString().split('T')[0] : ''}
								onChange={e => setForm({...form, deadline: new Date(e.target.value).getTime()})}
								className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
							/>
						</div>
					)}

					<div className="flex gap-3 pt-4">
						{initialGoal && (
							<button 
								type="button" 
								onClick={() => onDelete(initialGoal.id)}
								className="p-2 text-red-400 hover:bg-red-900/20 rounded"
							>
								<Trash2 size={20} />
							</button>
						)}
						<div className="flex-1" />
						<button type="button" onClick={onClose} className="px-4 text-zinc-400 hover:text-zinc-200 text-sm">{t('btn.cancel', language)}</button>
						<button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold flex items-center gap-2">
							<Save size={16} /> {t('btn.save', language)}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
