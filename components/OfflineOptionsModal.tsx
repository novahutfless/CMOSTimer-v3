import React from 'react';
import { Download, ExternalLink, MonitorDown, Package, Smartphone, X } from 'lucide-react';
import { t } from '../translations';
import { Language } from '../types';

interface Props {
	onClose: () => void;
	language: Language;
}

const BUILDS_URL = 'https://speed-cmos.com/v3/builds/';

const BuildOption: React.FC<{
	icon: React.ReactNode;
	title: string;
	description: string;
}> = ({ icon, title, description }) => (
	<a
		href={BUILDS_URL}
		target="_blank"
		rel="noreferrer"
		className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3 transition-colors hover:border-blue-500/60 hover:bg-zinc-800/70"
	>
		<div className="text-blue-400">{icon}</div>
		<div className="min-w-0 flex-1">
			<h3 className="font-bold text-zinc-100">{title}</h3>
			<p className="text-xs leading-relaxed text-zinc-400">{description}</p>
		</div>
		<ExternalLink size={16} className="shrink-0 text-zinc-500" />
	</a>
);

export const OfflineOptionsModal: React.FC<Props> = ({ onClose, language }) => (
	<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
		<div className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
			<div className="mb-5 flex items-center justify-between">
				<h2 className="flex items-center gap-2 text-xl font-bold text-zinc-100">
					<Download size={24} className="text-blue-400" /> {t('offline.title', language)}
				</h2>
				<button onClick={onClose} className="text-zinc-500 transition-colors hover:text-zinc-100" aria-label={t('offline.close', language)}>
					<X size={24} />
				</button>
			</div>

			<div className="space-y-3">
				<div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
					<div className="mb-1 flex items-center gap-2 font-bold text-zinc-100"><MonitorDown size={20} className="text-blue-400" /> {t('offline.pwa.title', language)}</div>
					<p className="text-sm leading-relaxed text-zinc-300">{t('offline.pwa.description', language)}</p>
				</div>
				<BuildOption icon={<Smartphone size={20} />} title={t('offline.android.title', language)} description={t('offline.android.description', language)} />
				<BuildOption icon={<MonitorDown size={20} />} title={t('offline.windows.title', language)} description={t('offline.windows.description', language)} />
				<BuildOption icon={<Package size={20} />} title={t('offline.linux.title', language)} description={t('offline.linux.description', language)} />
			</div>
			<p className="mt-4 text-center text-xs text-zinc-500">{t('offline.buildsHint', language)}</p>
		</div>
	</div>
);
