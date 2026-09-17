import React, { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { api } from '../../utils/api';
import { PluginRegistrySubmission, RegistryPlugin } from '../../types';
import { parsePluginPackage } from '../../plugins/pluginPackage';

export const PluginRegistry: React.FC = () => {
	const { plugins, actions, auth } = useAppStore();
	const [catalog, setCatalog] = useState<RegistryPlugin[]>([]);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [installing, setInstalling] = useState<string | null>(null);
	const [submissions, setSubmissions] = useState<PluginRegistrySubmission[]>([]);

	const load = async (): Promise<void> => {
		setLoading(true);
		try {
			setCatalog((await api.listRegistryPlugins()).plugins);
			setError(null);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		void load();
	}, []);
	useEffect(() => {
		if (!auth.token) return;
		void api.getMyRegistrySubmissions(auth.token).then(result => setSubmissions(result.submissions)).catch(() => { /* Catalog remains usable. */ });
	}, [auth.token]);
	const shown = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return needle ? catalog.filter(item => `${item.name} ${item.description} ${item.capabilities.join(' ')}`.toLowerCase().includes(needle)) : catalog;
	}, [catalog, query]);

	const install = async (item: RegistryPlugin): Promise<void> => {
		setInstalling(item.id);
		try {
			const response = await api.getRegistryPlugin(item.id);
			const imported = parsePluginPackage(JSON.stringify(response.package));
			const existing = plugins.find(plugin => plugin.id === imported.id);
			if (existing) actions.updatePlugin(existing.id, { ...imported, enabled: false });
			else actions.addPlugin(imported);
			setError(null);
		} catch (reason) {
			setError(reason instanceof Error ? reason.message : String(reason));
		} finally {
			setInstalling(null);
		}
	};

	return <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
		<div className="flex items-center gap-2">
			<div className="relative flex-1"><Search size={14} className="absolute left-2.5 top-2.5 text-zinc-600" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search plugin registry" className="w-full rounded border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-3 text-xs text-zinc-200" /></div>
			<button onClick={() => void load()} disabled={loading} className="rounded border border-zinc-700 p-2 text-zinc-400 hover:text-white" title="Refresh registry"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
		</div>
		{error && <div className="text-xs text-yellow-400">Registry unavailable: {error}. Installed plugins continue to work offline.</div>}
		<div className="max-h-64 space-y-2 overflow-y-auto">
			{shown.map(item => {
				const installed = plugins.find(plugin => plugin.id === item.id);
				return <div key={item.id} className="flex items-start justify-between gap-3 rounded border border-zinc-800 bg-zinc-900/70 p-3">
					<div className="min-w-0"><div className="text-sm font-bold text-zinc-200">{item.name} <span className="font-normal text-zinc-600">v{item.version}</span></div><div className="text-xs text-zinc-400">{item.description}</div><div className="mt-1 text-[10px] text-zinc-600">{item.author || 'CMOSTimer registry'} · {item.permissions.length ? item.permissions.join(', ') : 'No permissions requested'}</div></div>
					<button onClick={() => void install(item)} disabled={installing === item.id} className="flex shrink-0 items-center gap-1 rounded bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"><Download size={13} /> {installed ? 'Update' : 'Install'}</button>
				</div>;
			})}
			{!loading && !error && shown.length === 0 && <div className="py-4 text-center text-xs italic text-zinc-600">No registry plugins found.</div>}
		</div>
		{submissions.length > 0 && <div className="border-t border-zinc-800 pt-2"><div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Your submissions</div>{submissions.slice(0, 5).map(item => <div key={item.id} className="flex justify-between gap-2 py-1 text-xs text-zinc-400"><span>{item.plugin_id} v{item.version}</span><span className={item.status === 'approved' ? 'text-green-400' : item.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'} title={item.review_note}>{item.status}</span></div>)}</div>}
	</div>;
};
