
import React from 'react';
import { Settings, Language, StatType, StatConfig } from '../../types';
import { t } from '../../translations';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { generateId } from '../../utils';

interface Props { 
    settings: Settings; 
    update: (k: keyof Settings, v: any) => void; 
}

export const ListSettings: React.FC<Props> = ({ settings, update }) => {
  const lang = settings.language || Language.EN;

  const handleAdd = () => {
      if (settings.timelistStats.length >= 5) return;
      const newCols = [...settings.timelistStats, { id: generateId(), type: StatType.MEAN, size: 3 }];
      update('timelistStats', newCols);
  };
  const handleRemove = (idx: number) => {
      const newCols = [...settings.timelistStats];
      newCols.splice(idx, 1);
      update('timelistStats', newCols);
  };
  const handleChange = (index: number, field: keyof StatConfig, value: any) => {
      const newCols = [...settings.timelistStats];
      if (field === 'size') newCols[index] = { ...newCols[index], size: parseInt(value) || 0 };
      else newCols[index] = { ...newCols[index], [field]: value };
      update('timelistStats', newCols);
  };
  const handleMove = (index: number, direction: -1 | 1) => {
      if (index + direction < 0 || index + direction >= settings.timelistStats.length) return;
      const newCols = [...settings.timelistStats];
      const temp = newCols[index];
      newCols[index] = newCols[index + direction];
      newCols[index + direction] = temp;
      update('timelistStats', newCols);
  };

  return (
      <div className="space-y-2">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('list.columns', lang)}</h3>
          
          {settings.timelistStats.map((col, index) => (
              <div key={col.id} className="flex items-center gap-2 bg-zinc-950 p-2 rounded border border-zinc-800">
                  <div className="flex flex-col gap-1">
                        <button onClick={() => handleMove(index, -1)} disabled={index === 0} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ArrowUp size={14} /></button>
                        <button onClick={() => handleMove(index, 1)} disabled={index === settings.timelistStats.length - 1} className="text-zinc-600 hover:text-zinc-300 disabled:opacity-30"><ArrowDown size={14} /></button>
                  </div>
                   <select 
                        value={col.type} 
                        onChange={(e) => handleChange(index, 'type', e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 flex-1"
                    >
                        <option value={StatType.SINGLE}>{t('stat.single', lang)}</option>
                        <option value={StatType.MEAN}>{t('stat.mean', lang)}</option>
                        <option value={StatType.AVERAGE}>{t('stat.avg', lang)}</option>
                        <option value={StatType.STD_DEV}>{t('stat.stdDev', lang)}</option>
                    </select>
                    {col.type !== StatType.SINGLE && (
                         <input 
                            type="number" 
                            value={col.size}
                            onChange={(e) => handleChange(index, 'size', e.target.value)}
                            className="w-16 bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 outline-none focus:border-blue-500 font-mono"
                        />
                    )}
                    <button onClick={() => handleRemove(index)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded transition"><Trash2 size={16} /></button>
              </div>
          ))}
          {settings.timelistStats.length < 5 && (
             <button onClick={handleAdd} className="mt-4 w-full py-2 border border-dashed border-zinc-700 rounded hover:bg-zinc-900 hover:border-zinc-500 text-zinc-500 hover:text-zinc-300 text-sm flex items-center justify-center gap-2">
                <Plus size={16} /> Add
            </button>
          )}
      </div>
  );
};
