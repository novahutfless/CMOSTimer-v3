
import React, { useState } from 'react';
import { Session, ScrambleType } from '../types';
import { Plus, Edit2, Trash2, Check, X, Settings as SettingsIcon } from 'lucide-react';

interface SessionManagerProps {
  sessions: Session[];
  currentSessionId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string, type: ScrambleType) => void;
  onRename: (id: string, name: string) => void;
  onUpdateType: (id: string, type: ScrambleType) => void;
  onDelete: (id: string) => void;
  onConfigure: (id: string) => void;
  onClose: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  currentSessionId,
  onSwitch,
  onCreate,
  onRename,
  onUpdateType,
  onDelete,
  onConfigure,
  onClose,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ScrambleType>(ScrambleType.THREE);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreate(newName.trim(), newType);
      setNewName('');
      setIsCreating(false);
    }
  };

  const handleRename = (e: React.FormEvent, id: string) => {
      e.preventDefault();
      if (editName.trim()) {
          onRename(id, editName.trim());
          setEditingId(null);
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold text-lg text-zinc-100">Manage Sessions</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {sessions.map(session => (
            <div 
                key={session.id} 
                className={`flex flex-col p-3 rounded-lg mb-2 group ${session.id === currentSessionId ? 'bg-blue-900/20 border border-blue-900/50' : 'hover:bg-zinc-800 border border-transparent'}`}
            >
                <div className="flex items-center justify-between">
                    {editingId === session.id ? (
                        <form onSubmit={(e) => handleRename(e, session.id)} className="flex-1 flex gap-2">
                            <input 
                                autoFocus
                                type="text" 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                            />
                            <button type="submit" className="text-green-500 hover:bg-zinc-700 p-1 rounded"><Check size={16}/></button>
                        </form>
                    ) : (
                        <>
                            <div 
                                onClick={() => onSwitch(session.id)}
                                className="flex-1 cursor-pointer font-medium flex items-center gap-2"
                            >
                                <span className={session.id === currentSessionId ? 'text-blue-400' : 'text-zinc-300'}>
                                    {session.name}
                                </span>
                                <span className="text-xs text-zinc-600">({session.solves.length})</span>
                            </div>
                            
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onConfigure(session.id)}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                                    title="Settings"
                                >
                                    <SettingsIcon size={14} />
                                </button>
                                <button 
                                    onClick={() => { setEditingId(session.id); setEditName(session.name); }}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded"
                                    title="Rename"
                                >
                                    <Edit2 size={14} />
                                </button>
                                {sessions.length > 1 && (
                                    <button 
                                        onClick={() => onDelete(session.id)}
                                        className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-700 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                     <span className="text-[10px] text-zinc-500 uppercase font-bold">Type</span>
                     <select 
                        value={session.scrambleType || ScrambleType.THREE}
                        onChange={(e) => onUpdateType(session.id, e.target.value as ScrambleType)}
                        className="bg-transparent text-xs text-zinc-400 border border-zinc-800 rounded px-1 py-0.5 outline-none focus:border-zinc-600"
                        onClick={e => e.stopPropagation()}
                     >
                        <option value={ScrambleType.THREE}>3x3</option>
                        <option value={ScrambleType.TWO}>2x2</option>
                        <option value={ScrambleType.FOUR}>4x4</option>
                        <option value={ScrambleType.FIVE}>5x5</option>
                     </select>
                </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            {isCreating ? (
                <form onSubmit={handleCreate} className="flex flex-col gap-2">
                    <input 
                        autoFocus
                        type="text" 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Session Name..."
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 text-zinc-200"
                    />
                    <div className="flex gap-2">
                        <select
                            value={newType}
                            onChange={e => setNewType(e.target.value as ScrambleType)}
                            className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm outline-none text-zinc-200"
                        >
                            <option value={ScrambleType.THREE}>3x3</option>
                            <option value={ScrambleType.TWO}>2x2</option>
                            <option value={ScrambleType.FOUR}>4x4</option>
                            <option value={ScrambleType.FIVE}>5x5</option>
                        </select>
                        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium">
                            Save
                        </button>
                        <button type="button" onClick={() => setIsCreating(false)} className="text-zinc-400 hover:text-zinc-200 px-3 text-sm">
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full py-2 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-500 hover:border-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                >
                    <Plus size={16} /> New Session
                </button>
            )}
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
