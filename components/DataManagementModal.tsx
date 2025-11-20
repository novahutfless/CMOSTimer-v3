
import React, { useRef } from 'react';
import { useAppStore } from '../hooks/useAppStore';
import { X, Download, Upload, Save } from 'lucide-react';
import { t } from '../translations';
import { Language } from '../types';

interface Props {
    onClose: () => void;
    language: Language;
}

export const DataManagementModal: React.FC<Props> = ({ onClose, language }) => {
    const { sessions, settings, statsConfig, currentSessionId, actions } = useAppStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        const data = {
            sessions,
            settings,
            statsConfig,
            currentSessionId,
            version: 3,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cmostimer_backup_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => fileInputRef.current?.click();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                actions.importState(ev.target.result as string);
                onClose();
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <Save size={24} /> {t('data.manage', language)}
                    </h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={handleExport}
                        className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center justify-center gap-3 transition-colors"
                    >
                        <Download size={20} className="text-blue-400" />
                        <span className="font-medium text-zinc-200">{t('data.export', language)}</span>
                    </button>

                    <button 
                        onClick={handleImportClick}
                        className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center justify-center gap-3 transition-colors"
                    >
                        <Upload size={20} className="text-green-400" />
                        <span className="font-medium text-zinc-200">{t('data.import', language)}</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                </div>
                
                <p className="mt-6 text-xs text-zinc-500 text-center">
                    Exporting creates a full backup of all sessions, solves, and settings.
                    Importing will overwrite current data.
                </p>
            </div>
        </div>
    );
};
