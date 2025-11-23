
import React, { useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { PluginScript } from '../../types';
import { Plus, Trash2, Play, Pause, AlertTriangle, Code } from 'lucide-react';
import { generateId } from '../../utils';

export const PluginSettings: React.FC = () => {
    const { plugins, actions } = useAppStore();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editCode, setEditCode] = useState('');

    const handleAddNew = () => {
        const newScript: PluginScript = {
            id: generateId(),
            name: 'New Plugin',
            code: '// cmos.toast("Hello World");\n// cmos.registerWidget("my-widget", "My Widget", (el) => el.innerText = "Hi!");',
            enabled: true // Default to true for better UX
        };
        actions.addPlugin(newScript);
        startEditing(newScript);
    };

    const startEditing = (script: PluginScript) => {
        setEditingId(script.id);
        setEditName(script.name);
        setEditCode(script.code);
    };

    const handleSave = () => {
        if (editingId) {
            actions.updatePlugin(editingId, { name: editName, code: editCode });
            setEditingId(null);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Delete this plugin?')) {
            actions.deletePlugin(id);
            if (editingId === id) setEditingId(null);
        }
    };

    const toggleEnabled = (script: PluginScript) => {
        actions.updatePlugin(script.id, { enabled: !script.enabled });
    };

    return (
        <div className="h-full flex flex-col">
            {editingId ? (
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200"
                            placeholder="Plugin Name"
                        />
                        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold">
                            Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded text-sm">
                            Cancel
                        </button>
                    </div>
                    <div className="flex-1 relative border border-zinc-700 rounded overflow-hidden">
                        <textarea 
                            value={editCode}
                            onChange={e => setEditCode(e.target.value)}
                            className="w-full h-full bg-zinc-950 p-4 text-xs font-mono text-zinc-300 outline-none resize-none"
                            spellCheck={false}
                        />
                    </div>
                    <div className="text-[10px] text-zinc-500">
                        Available API: <code>cmos.addSolve(time)</code>, <code>cmos.alert(msg)</code>, <code>cmos.prompt(msg)</code>, <code>cmos.registerScrambler(...)</code>, <code>cmos.onCleanup(fn)</code>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded flex gap-3 items-start">
                        <AlertTriangle className="text-yellow-500 shrink-0" size={16} />
                        <div className="text-xs text-yellow-200/80">
                            <strong>Warning:</strong> Plugins can execute arbitrary code. Only add scripts from trusted sources. 
                            Malicious scripts can delete your data or compromise your account.
                        </div>
                    </div>

                    <div className="space-y-2">
                        {plugins.map(script => (
                            <div key={script.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => toggleEnabled(script)}
                                        className={`p-2 rounded-full ${script.enabled ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}
                                        title={script.enabled ? "Enabled" : "Disabled"}
                                    >
                                        {script.enabled ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                    </button>
                                    <div>
                                        <div className="font-bold text-sm text-zinc-200">{script.name}</div>
                                        <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                                            <Code size={10} /> {script.code.length} bytes
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => startEditing(script)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded text-xs text-zinc-300">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(script.id)} className="p-1.5 text-zinc-600 hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {plugins.length === 0 && (
                            <div className="text-center text-zinc-600 text-sm py-8 italic">
                                No plugins installed.
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleAddNew}
                        className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-zinc-900"
                    >
                        <Plus size={16} /> Add New Plugin
                    </button>
                </div>
            )}
        </div>
    );
};
