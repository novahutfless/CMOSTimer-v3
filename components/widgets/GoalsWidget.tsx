import React, { useMemo } from 'react';
import { Goal, ComputedSolve, GoalType, GoalsWidgetConfig, Language, Session, SolveMap, DateFormat, GoalFrequency, GoalScope } from '../../types';
import { calculateGoalProgress } from '../../utils/goals';
import { Plus, CheckCircle, Circle, Eye, EyeOff } from 'lucide-react';
import { formatTime, formatDuration } from '../../utils';
import { t } from '../../translations';
import { formatDate } from '../../utils/date';
import { recalculateSessionStats } from '../../utils/math';

interface Props {
    goals: Goal[];
    solves: ComputedSolve[];
    solvesMap: SolveMap;
    sessions: Session[];
    currentSessionId: string;
    onAdd: () => void;
    onEdit: (goal: Goal) => void;
    config: GoalsWidgetConfig;
    onUpdate: (config: GoalsWidgetConfig) => void;
    language: Language;
    dateFormat: DateFormat;
    className?: string;
}

type GoalView = {
	goal: Goal;
	progress: ReturnType<typeof calculateGoalProgress>;
	title: string;
	descriptor: string;
	frequencyLabel: string;
};

export const GoalsWidget: React.FC<Props> = (dta: Props) => {
	const { goals, solves, solvesMap, sessions, currentSessionId, onAdd, onEdit, config, onUpdate, language, dateFormat, className } = dta;
	const { showCompleted } = config;

	const formatValue = (val: number, type: GoalType): string => {
		if (type === GoalType.SOLVE_COUNT) return Math.round(val).toString();
		if (type === GoalType.TIME_SPENT) return formatDuration(val);
		if (type === GoalType.STAT_TARGET) return formatTime(val);
		return val.toString();
	};

	const getFrequencyLabel = (frequency: GoalFrequency): string => {
		switch (frequency) {
		case GoalFrequency.DAILY: return t('goals.frequency.daily', language);
		case GoalFrequency.WEEKLY: return t('goals.frequency.weekly', language);
		case GoalFrequency.MONTHLY: return t('goals.frequency.monthly', language);
		case GoalFrequency.YEARLY: return t('goals.frequency.yearly', language);
		case GoalFrequency.BY_DATE: return t('goals.frequency.byDate', language);
		case GoalFrequency.INFINITE: return t('goals.frequency.infinite', language);
		default: return '';
		}
	};

	const buildDescriptor = (goal: Goal): { title: string; descriptor: string } => {
		const parts: string[] = [];
		const sessionName = sessions.find(s => s.id === (goal.scope === GoalScope.SESSION ? goal.sessionId : currentSessionId))?.name;

		if (goal.scope === GoalScope.SESSION && sessionName) {
			parts.push(`${t('goals.scope.session', language)}: ${sessionName}`);
		}
		if (goal.frequency === GoalFrequency.BY_DATE && goal.deadline) {
			parts.push(`${t('goals.deadline', language)}: ${formatDate(goal.deadline, dateFormat)}`);
		}
		if (goal.maxSolveTimeMs && goal.maxSolveTimeMs > 0) {
			parts.push(`${t('goals.filter.below', language)} ${formatTime(goal.maxSolveTimeMs)}`);
		}

		if (goal.type === GoalType.SOLVE_COUNT) {
			return { title: t('goals.type.solveCount', language), descriptor: parts.join(' - ') };
		}
		if (goal.type === GoalType.TIME_SPENT) {
			return { title: t('goals.type.timeSpent', language), descriptor: parts.join(' - ') };
		}
		return {
			title: `${t('goals.type.statTargetShort', language)}${formatValue(goal.targetValue, goal.type)}`,
			descriptor: parts.join(' - ')
		};
	};

	const progressData = useMemo<GoalView[]>(() => {
		return goals.map(goal => {
			const goalSolves = goal.scope === GoalScope.SESSION
				? (() => {
					const session = goal.sessionId ? sessions.find(item => item.id === goal.sessionId) : undefined;
					if (!session) return [];
					const sessionSolves = session.solveIds
						.map(id => solvesMap[id])
						.filter((solve): solve is NonNullable<typeof solve> => Boolean(solve));
					return recalculateSessionStats(sessionSolves);
				})()
				: solves;
			const progress = calculateGoalProgress(goal, goalSolves);
			const desc = buildDescriptor(goal);
			return {
				goal,
				progress,
				title: desc.title,
				descriptor: desc.descriptor,
				frequencyLabel: getFrequencyLabel(goal.frequency)
			};
		});
	}, [goals, solves, solvesMap, sessions, currentSessionId, language, dateFormat]);

	const filteredData = useMemo(() => {
		return progressData.filter(item => showCompleted || !item.progress.isCompleted);
	}, [progressData, showCompleted]);

	return (
		<div className={`w-full h-full flex flex-col rounded-lg border ${className}`} style={{ backgroundColor: 'var(--widget-surface)', borderColor: 'var(--widget-border)' }}>
			<div className="p-2 border-b flex justify-between items-center rounded-t-lg" style={{ backgroundColor: 'var(--widget-surface-muted)', borderColor: 'var(--widget-border)' }}>
				<h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('goals.title', language)}</h3>
				<div className="flex gap-2">
					<button
						onClick={() => onUpdate({ ...config, showCompleted: !showCompleted })}
						className="text-zinc-500 hover:text-zinc-300 transition-colors"
						title={showCompleted ? t('goals.hideCompleted', language) : t('goals.showCompleted', language)}
					>
						{showCompleted ? <Eye size={14} /> : <EyeOff size={14} />}
					</button>
					<button onClick={onAdd} className="text-zinc-500 hover:text-blue-400 transition-colors">
						<Plus size={14} />
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
				{filteredData.length === 0 && (
					<div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs italic">
						{goals.length === 0 ? <p>{t('goals.none', language)}</p> : <p>{t('goals.allCompleted', language)}</p>}
						{goals.length === 0 && <button onClick={onAdd} className="text-blue-500 hover:underline mt-1">{t('goals.createOne', language)}</button>}
					</div>
				)}
				{filteredData.map(({ goal, progress, title, descriptor, frequencyLabel }) => (
					<div
						key={goal.id}
						onClick={() => onEdit(goal)}
						className="border rounded p-2 cursor-pointer hover:bg-[var(--widget-hover)] transition-colors group"
						style={{ backgroundColor: 'var(--widget-surface-muted)', borderColor: 'var(--widget-border)' }}
					>
						<div className="flex justify-between items-center mb-1">
							<div className="flex items-center gap-1.5">
								{progress.isCompleted ? (
									<CheckCircle size={12} className="text-green-500" />
								) : (
									<Circle size={12} className="text-zinc-600" />
								)}
								<span className="text-xs font-medium text-zinc-200">
									{title}
									<span className="text-zinc-500 ml-1 text-[10px] font-normal">
										({frequencyLabel.toLowerCase()})
									</span>
								</span>
							</div>
							<span className="text-[10px] font-mono text-zinc-400">
								{formatValue(progress.current, goal.type)} / {formatValue(progress.target, goal.type)}
							</span>
						</div>

						{descriptor && (
							<div className="mb-1 text-[10px] text-zinc-500 truncate" title={descriptor}>
								{descriptor}
							</div>
						)}

						<div className="w-full h-1.5 rounded-full overflow-hidden relative" style={{ backgroundColor: 'var(--widget-surface-strong)' }}>
							<div
								className={`h-full rounded-full transition-all duration-500 ${progress.isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
								style={{ width: `${progress.percent}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};
