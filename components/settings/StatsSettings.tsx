
import React from 'react';
import { StatConfig, StatType, Language, TimeDistributionConfig } from '../../types';
import { t } from '../../translations';
import { ArrowUp, ArrowDown, Trash2, Plus, BarChart } from 'lucide-react';
import { generateId } from '../../utils';

interface Props { 
    stats: StatConfig[]; 
    updateStats: (stats: StatConfig[]) => void; 
    distSettings: TimeDistributionConfig;
    updateDistSettings: (config: TimeDistributionConfig) => void;
    language: Language;
}

export const StatsSettings: React.FC<Props> = ({ stats, updateStats, distSettings, updateDistSettings, language }) => {
  
  const handleAdd = () => updateStats([...stats, { id: generateId(), type: StatType.AVERAGE, size: 5 }]);

  const handleRemove = (index: number) => {
    const newStats = [...stats];
    newStats.splice(index, 1);
    updateStats(newStats);
  };

  const handleChange = (index: number, field: keyof StatConfig, value: any) => {
    const newStats = [...stats];
    if (field === 'size') newStats[index] = { ...newStats[index], size: parseInt(value) };
    else newStats[index] = { ...newStats[index], [field]: value };
    updateStats(newStats);
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= stats.length) return;
    const newStats = [...stats];
    const temp = newStats[index];
    newStats[index] = newStats[index + direction];
    newStats[index + direction] = temp;
    updateStats(newStats);
  };

  return (
      <div className="space-y-6">
            <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('stats.global', language)}</h3>
                <div className="space-y-2">
                    {stats.map((stat, index) => (
                        <div key={stat.id} className="flex items-center gap-2 bg-zinc-950 p-2 rounded border border-zinc-800">
                            <div className="flex flex-col gap-1">
                                <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ArrowUp size={14} /></button>
                                <button onClick={() => handleMove(index, 1)} disabled={index === stats.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ArrowDown size={14} /></button>
                            </div>
                            <select 
                                value={stat.type} 
                                onChange={(e) => handleChange(index, 'type', e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 flex-1"
                            >
                                <option value={StatType.SINGLE}>{t('stat.single', language)}</option>
                                <option value={StatType.MEAN}>{t('stat.mean', language)}</option>
                                <option value={StatType.AVERAGE}>{t('stat.avg', language)}</option>
                                <option value={StatType.STD_DEV}>{t('stat.stdDev', language)}</option>
                                <option value={StatType.SUCCESS_RATE}>{t('stat.success', language)}</option>
                                <option value={StatType.WEIGHTED_AVG}>{t('stat.weighted', language)}</option>
                            </select>
                            {stat.type !== StatType.SINGLE ? (
                                <input 
                                    type="number" 
                                    min={stat.type === StatType.SUCCESS_RATE ? 0 : 1}
                                    value={stat.size}
                                    onChange={(e) => handleChange(index, 'size', e.target.value)}
                                    className="w-20 bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 font-mono"
                                    placeholder="Size"
                                />
                            ) : <div className="w-20" />}
                            <button onClick={() => handleRemove(index)} className="ml-auto p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded transition"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    <button onClick={handleAdd} className="mt-4 w-full py-2 border border-dashed border-zinc-700 rounded hover:bg-zinc-900 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2">
                        <Plus size={16} /> Add
                    </button>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <BarChart size={16} /> {t('stats.dist.title', language)}
                </h3>
                <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-zinc-200 text-sm font-medium">{t('stats.dist.mode', language)}</span>
                        <select 
                            value={distSettings.mode}
                            onChange={e => updateDistSettings({ ...distSettings, mode: e.target.value as any })}
                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
                        >
                            <option value="ALL">{t('stats.dist.all', language)}</option>
                            <option value="LAST">{t('stats.dist.last', language)}</option>
                        </select>
                    </div>
                    {distSettings.mode === 'LAST' && (
                         <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                             <span className="text-zinc-400 text-sm">Count (X)</span>
                             <input 
                                type="number" 
                                min="1"
                                value={distSettings.size}
                                onChange={e => updateDistSettings({ ...distSettings, size: Math.max(1, parseInt(e.target.value)) })}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-24 text-right"
                             />
                         </div>
                    )}
                </div>
            </div>
      </div>
  );
};