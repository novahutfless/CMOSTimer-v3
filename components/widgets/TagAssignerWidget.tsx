

import React, { useState } from 'react';
import { Session, ComputedSolve, Language } from '../../types';
import { Settings as SettingsIcon, Plus, X, Check } from 'lucide-react';
import { TAG_PRESETS } from '../../utils/constants';
import { t } from '../../translations';
import { useAppStore } from '../../hooks/useAppStore';

interface Props {
    session: Session;
    latestSolve?: ComputedSolve;
    onUpdateSession: (id: string, updates: Partial<Session>) => void;
    onUpdateSolve: (id: string, updates: any) => void;
    className?: string;
}

export const TagAssignerWidget: React.FC<Props> = ({ session, latestSolve, onUpdateSession, onUpdateSolve, className }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [newTagInput, setNewTagInput] = useState('');
    const { settings } = useAppStore();
    const lang = settings.language || Language.EN;

    const tags = session.solveTagPool || [];

    const toggleTag = (tag: string) => {
        if (!latestSolve) return;
        const currentTags = latestSolve.tags || [];
        const newTags = currentTags.includes(tag) 
            ? currentTags.filter(t => t !== tag) 
            : [...currentTags, tag];
        onUpdateSolve(latestSolve.id, { tags: newTags });
    };

    const addPoolTag = () => {
        const clean = newTagInput.trim();
        if (!clean) return;
        if (!tags.includes(clean)) {
            onUpdateSession(session.id, { solveTagPool: [...tags, clean] });
        }
        setNewTagInput('');
    };

    const removePoolTag = (tag: string) => {
        onUpdateSession(session.id, { solveTagPool: tags.filter(t => t !== tag) });
    };

    const addPreset = (presetTags: string[]) => {
        const combined = new Set([...tags, ...presetTags]);
        onUpdateSession(session.id, { solveTagPool: Array.from(combined) });
    };

    return (
        <div className={`w-full h-full flex flex-col bg-zinc-900/80 rounded-lg border border-zinc-800 overflow-hidden ${className}`}>
            <div className="p-2 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('tag.title', lang)}</h3>
                <button 
                    onClick={() => setIsEditing(!isEditing)} 
                    className={`p-1 rounded transition-colors ${isEditing ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'}`}
                >
                    {isEditing ? <Check size={12} /> : <SettingsIcon size={12} />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {isEditing ? (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newTagInput}
                                onChange={e => setNewTagInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addPoolTag()}
                                placeholder={t('tag.new', lang)}
                                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                            />
                            <button onClick={addPoolTag} className="bg-zinc-800 hover:bg-zinc-700 px-2 rounded text-zinc-400 hover:text-white"><Plus size={14}/></button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => (
                                <span key={tag} className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-xs text-zinc-300">
                                    {tag}
                                    <button onClick={() => removePoolTag(tag)} className="hover:text-red-400 text-zinc-500 ml-1"><X size={10}/></button>
                                </span>
                            ))}
                            {tags.length === 0 && <span className="text-zinc-600 text-xs italic">{t('tag.noneConfig', lang)}</span>}
                        </div>

                        <div className="border-t border-zinc-800 pt-2 mt-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">{t('tag.presets', lang)}</span>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => addPreset(TAG_PRESETS.CROSS)} className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] hover:border-blue-500 hover:text-blue-400">Cross Colors</button>
                                <button onClick={() => addPreset(TAG_PRESETS.SKIPS)} className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] hover:border-blue-500 hover:text-blue-400">Skips</button>
                                <button onClick={() => addPreset(TAG_PRESETS.PLL)} className="px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] hover:border-blue-500 hover:text-blue-400">PLL Cases</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full">
                        {tags.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-xs italic cursor-pointer" onClick={() => setIsEditing(true)}>
                                <p>{t('tag.noneSet', lang)}</p>
                                <span className="text-blue-500 hover:underline">{t('tag.configure', lang)}</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
                                {tags.map(tag => {
                                    const isActive = latestSolve?.tags?.includes(tag);
                                    return (
                                        <button
                                            key={tag}
                                            onClick={() => toggleTag(tag)}
                                            disabled={!latestSolve}
                                            className={`px-2 py-1.5 rounded text-xs font-medium transition-all border truncate ${
                                                isActive 
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)]' 
                                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
                                            } ${!latestSolve ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title={tag}
                                        >
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
