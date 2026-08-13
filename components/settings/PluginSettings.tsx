import React, { useRef, useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { CMOS_PLUGIN_API_VERSION, PluginScript } from '../../types';
import { AlertTriangle, BookOpen, Code, Download, Pause, Play, Plus, Trash2, Upload } from 'lucide-react';
import { generateId } from '../../utils';
import { t } from '../../translations';
import { SettingsSection } from './SettingsSection';
import { getLang } from './settingsUtils';
import { pluginManager } from '../../plugins/PluginManager';
import { usePluginManagerRevision } from '../../plugins/usePluginManagerRevision';
import { parsePluginPackage, PLUGIN_DOCS_URL, serializePluginPackage } from '../../plugins/pluginPackage';

const statusColor: Record<string, string> = {
	active: 'text-green-400',
	loading: 'text-blue-400',
	fallback: 'text-yellow-400',
	error: 'text-red-400',
	incompatible: 'text-red-400',
	disabled: 'text-zinc-500'
};

export const PluginSettings: React.FC = () => {
	const { plugins, actions, settings } = useAppStore();
	const lang = getLang(settings);
	const importRef = useRef<HTMLInputElement>(null);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editName, setEditName] = useState('');
	const [editVersion, setEditVersion] = useState('');
	const [editDescription, setEditDescription] = useState('');
	const [editApiVersion, setEditApiVersion] = useState(CMOS_PLUGIN_API_VERSION);
	const [editCode, setEditCode] = useState('');
	const [importError, setImportError] = useState<string | null>(null);
	usePluginManagerRevision();

	const handleAddNew = (): void => {
		const newScript: PluginScript = {
			id: generateId(),
			name: t('plugin.new', lang),
			version: '1.0.0',
			description: '',
			apiVersion: CMOS_PLUGIN_API_VERSION,
			code: `// API docs: ${PLUGIN_DOCS_URL}\n// cmos.toast("Hello World");\n// Return cleanup from each widget render:\n// cmos.registerWidget("my-widget", "My Widget", (el) => {\n//   el.innerText = "Hi!";\n//   return () => { el.innerText = ""; };\n// });`,
			enabled: true
		};
		actions.addPlugin(newScript);
		startEditing(newScript);
	};

	const startEditing = (script: PluginScript): void => {
		setEditingId(script.id);
		setEditName(script.name);
		setEditVersion(script.version || '1.0.0');
		setEditDescription(script.description || '');
		setEditApiVersion(script.apiVersion || CMOS_PLUGIN_API_VERSION);
		setEditCode(script.code);
	};

	const handleSave = (): void => {
		if (!editingId) return;
		const existing = plugins.find(plugin => plugin.id === editingId);
		if (!existing) return;
		const status = pluginManager.getStatus(editingId);
		actions.updatePlugin(editingId, {
			name: editName.trim() || existing.name,
			version: editVersion.trim() || '1.0.0',
			description: editDescription.trim(),
			apiVersion: editApiVersion.trim() || CMOS_PLUGIN_API_VERSION,
			code: editCode,
			...(status?.state === 'active' && editCode !== existing.code ? { lastKnownGoodCode: existing.code } : {})
		});
		setEditingId(null);
	};

	const handleDelete = (id: string): void => {
		if (confirm(t('plugin.deleteConfirm', lang))) {
			actions.deletePlugin(id);
			if (editingId === id) setEditingId(null);
		}
	};

	const exportPlugin = (script: PluginScript): void => {
		const blob = new Blob([serializePluginPackage(script)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = `${script.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'plugin'}.cmos-plugin.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	const importPlugin = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;
		try {
			const imported = parsePluginPackage(await file.text());
			if (plugins.some(plugin => plugin.id === imported.id)) imported.id = generateId();
			actions.addPlugin(imported);
			setImportError(null);
		} catch (error) {
			setImportError(error instanceof Error ? error.message : String(error));
		}
	};

	if (editingId) {
		return (
			<div className="h-full flex flex-col gap-3">
				<div className="grid grid-cols-1 sm:grid-cols-[1fr_8rem_8rem_auto_auto] gap-2">
					<input value={editName} onChange={event => setEditName(event.target.value)} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200" placeholder={t('plugin.namePlaceholder', lang)} />
					<input value={editVersion} onChange={event => setEditVersion(event.target.value)} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200" placeholder="Version" />
					<input value={editApiVersion} onChange={event => setEditApiVersion(event.target.value)} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-xs text-zinc-200" title="Required CMOSTimer plugin API" />
					<button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold">{t('btn.save', lang)}</button>
					<button onClick={() => setEditingId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded text-sm">{t('btn.cancel', lang)}</button>
				</div>
				<input value={editDescription} onChange={event => setEditDescription(event.target.value)} className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200" placeholder="Plugin description" />
				<div className="flex-1 relative border border-zinc-700 rounded overflow-hidden">
					<textarea value={editCode} onChange={event => setEditCode(event.target.value)} className="w-full h-full bg-zinc-950 p-4 text-xs font-mono text-zinc-300 outline-none resize-none" spellCheck={false} />
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col gap-4">
			<div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded flex gap-3 items-start">
				<AlertTriangle className="text-yellow-500 shrink-0" size={16} />
				<div className="text-xs text-yellow-200/80">{t('plugin.warning', lang)}</div>
			</div>
			<div className="flex flex-wrap gap-2">
				<a href={PLUGIN_DOCS_URL} target="_blank" rel="noreferrer" className="px-3 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded text-xs text-zinc-300 flex items-center gap-2"><BookOpen size={14} /> Documentation</a>
				<button onClick={() => importRef.current?.click()} className="px-3 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded text-xs text-zinc-300 flex items-center gap-2"><Upload size={14} /> Import package</button>
				<input ref={importRef} type="file" accept=".json,.cmos-plugin.json,application/json" className="hidden" onChange={event => void importPlugin(event)} />
			</div>
			{importError && <div className="text-xs text-red-400">Import failed: {importError}</div>}
			<div className="space-y-2 overflow-y-auto">
				{plugins.map(script => {
					const status = pluginManager.getStatus(script.id);
					return (
						<SettingsSection key={script.id} className="flex items-center justify-between gap-3">
							<div className="flex items-center gap-3 min-w-0">
								<button onClick={() => actions.updatePlugin(script.id, { enabled: !script.enabled })} className={`p-2 rounded-full ${script.enabled ? 'bg-green-900/30 text-green-400' : 'bg-zinc-800 text-zinc-500'}`} title={script.enabled ? 'Enabled' : 'Disabled'}>{script.enabled ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}</button>
								<div className="min-w-0">
									<div className="font-bold text-sm text-zinc-200 truncate">{script.name} <span className="font-normal text-zinc-600">v{script.version || '1.0.0'}</span></div>
									<div className="text-[10px] text-zinc-600 font-mono flex items-center gap-2"><span className="flex items-center gap-1"><Code size={10} /> {script.code.length} bytes</span>{status && <span className={statusColor[status.state]} title={status.message}>{status.state}</span>}</div>
									{status?.message && <div className="text-[10px] text-yellow-500/80 truncate max-w-xl" title={status.message}>{status.message}</div>}
								</div>
							</div>
							<div className="flex gap-2 shrink-0">
								<button onClick={() => exportPlugin(script)} className="p-1.5 text-zinc-500 hover:text-zinc-200" title="Export package"><Download size={16} /></button>
								<button onClick={() => startEditing(script)} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 rounded text-xs text-zinc-300">{t('plugin.edit', lang)}</button>
								<button onClick={() => handleDelete(script.id)} className="p-1.5 text-zinc-600 hover:text-red-400"><Trash2 size={16} /></button>
							</div>
						</SettingsSection>
					);
				})}
				{plugins.length === 0 && <div className="text-center text-zinc-600 text-sm py-8 italic">{t('plugin.empty', lang)}</div>}
			</div>
			<button onClick={handleAddNew} className="w-full py-3 border-2 border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center gap-2 text-sm font-medium transition-all hover:bg-zinc-900"><Plus size={16} /> {t('plugin.add', lang)}</button>
		</div>
	);
};
