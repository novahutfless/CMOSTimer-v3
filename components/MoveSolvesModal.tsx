

import React, { useState } from 'react';
import { Session, Language } from '../types';
import { X, ArrowRightLeft, Copy } from 'lucide-react';
import { t } from '../translations';

interface Props {
    sessions: Session[];
    currentSessionId: string;
    solveCount: number;
    onMove: (targetId: string) => void;
    onClose: () => void;
    mode?: 'MOVE' | 'DUPLICATE';
    language?: Language;
}

export const MoveSolvesModal: React.FC<Props> = ({ sessions, currentSessionId, solveCount, onMove, onClose, mode = 'MOVE', language = Language.EN }) => {
    const targets = sessions.filter(s => (mode === 'DUPLICATE' || s.id !== currentSessionId)); // Allow duplicate to same session technically, but usually distinct
    const [targetId, setTargetId] = useState(targets[0]?.id || '');

    const title = mode === 'MOVE' ? t('move.titleMove', language) : t('move.titleDup', language);
    const icon = mode === 'MOVE' ? <ArrowRightLeft size={16} /> : <Copy size={16} />;
    const actionText = mode === 'MOVE' ? t('move.actionMove', language) : t('move.actionDup', language);
    const labelText = mode === 'MOVE' ? t('move.labelMove', language) : t('move.labelDup', language);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
             <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-zinc-100">{title}</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20}/></button>
                </div>
                
                {targets.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-4">{t('move.noSessions', language)}</p>
                ) : (
                    <div className="space-y-4">
                        <p className="text-zinc-400 text-sm">
                            {labelText} <span className="font-bold text-white">{solveCount}</span> solves to:
                        </p>
                        <select 
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 outline-none"
                        >
                            {targets.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.id !== currentSessionId && `(${s.solveIds.length})`}</option>
                            ))}
                        </select>
                        <button 
                            onClick={() => onMove(targetId)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded flex items-center justify-center gap-2"
                        >
                            {icon} {actionText}
                        </button>
                    </div>
                )}
             </div>
        </div>
    );
};
