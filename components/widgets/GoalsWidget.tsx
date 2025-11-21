

import React, { useMemo } from 'react';
import { Goal, ComputedSolve, GoalType, GoalsWidgetConfig } from '../../types';
import { calculateGoalProgress } from '../../utils/goals';
import { Plus, CheckCircle, Circle, Eye, EyeOff } from 'lucide-react';
import { formatTime, formatDuration } from '../../utils';

interface Props {
    goals: Goal[];
    solves: ComputedSolve[]; 
    onAdd: () => void;
    onEdit: (goal: Goal) => void;
    config: GoalsWidgetConfig;
    onUpdate: (config: GoalsWidgetConfig) => void;
    className?: string;
}

export const GoalsWidget: React.FC<Props> = ({ goals, solves, onAdd, onEdit, config, onUpdate, className }) => {
    const { showCompleted } = config;

    const progressData = useMemo(() => {
        return goals.map(goal => {
            const progress = calculateGoalProgress(goal, solves);
            return { goal, progress };
        });
    }, [goals, solves]);

    const filteredData = useMemo(() => {
        return progressData.filter(item => showCompleted || !item.progress.isCompleted);
    }, [progressData, showCompleted]);

    const formatValue = (val: number, type: GoalType) => {
        if (type === GoalType.SOLVE_COUNT) return Math.round(val);
        if (type === GoalType.TIME_SPENT) return formatDuration(val);
        if (type === GoalType.STAT_TARGET) return formatTime(val);
        return val;
    };

    return (
        <div className={`w-full h-full flex flex-col bg-zinc-900/80 rounded-lg border border-zinc-800 ${className}`}>
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50 rounded-t-lg">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Goals</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={() => onUpdate({ ...config, showCompleted: !showCompleted })} 
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        title={showCompleted ? "Hide Completed" : "Show Completed"}
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
                        {goals.length === 0 ? <p>No goals set.</p> : <p>All goals completed!</p>}
                        {goals.length === 0 && <button onClick={onAdd} className="text-blue-500 hover:underline mt-1">Create one</button>}
                    </div>
                )}
                {filteredData.map(({ goal, progress }) => (
                    <div 
                        key={goal.id} 
                        onClick={() => onEdit(goal)}
                        className="bg-zinc-900/50 border border-zinc-800 rounded p-2 cursor-pointer hover:bg-zinc-800/50 transition-colors group"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-1.5">
                                {progress.isCompleted ? (
                                    <CheckCircle size={12} className="text-green-500" />
                                ) : (
                                    <Circle size={12} className="text-zinc-600" />
                                )}
                                <span className="text-xs font-medium text-zinc-200">
                                    {goal.type === GoalType.SOLVE_COUNT && "Solves"}
                                    {goal.type === GoalType.TIME_SPENT && "Time Spent"}
                                    {goal.type === GoalType.STAT_TARGET && `Sub-${formatValue(goal.targetValue, goal.type)}`}
                                    <span className="text-zinc-500 ml-1 text-[10px] font-normal">
                                        ({goal.frequency.toLowerCase().replace('_', ' ')})
                                    </span>
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-zinc-400">
                                {formatValue(progress.current, goal.type)} / {formatValue(progress.target, goal.type)}
                            </span>
                        </div>
                        
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden relative">
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