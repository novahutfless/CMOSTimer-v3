import React, { useState } from 'react';
import { Database } from 'lucide-react';
import { Language, Session, Settings, SolveMap, StatConfig } from '../types';
import { t } from '../translations';
import { AnalyticsView } from './statistics/AnalyticsView';
import { GlobalStatsView } from './statistics/GlobalStatsView';
import { SessionStatsView } from './statistics/SessionStatsView';
import { Modal, ModalCloseButton } from './Modal';

interface StatisticsModalProps {
  sessions: Session[];
  solvesMap: SolveMap;
  currentSessionId: string;
  settings: Settings;
  statsConfig: StatConfig[];
  onClose: () => void;
}

type Tab = 'GLOBAL' | 'SESSION' | 'ANALYTICS';

const StatisticsModal: React.FC<StatisticsModalProps> = ({
	sessions,
	solvesMap,
	currentSessionId,
	settings,
	statsConfig,
	onClose
}) => {
	const [activeTab, setActiveTab] = useState<Tab>('GLOBAL');
	const lang = settings.language || Language.EN;

	return (
		<Modal ariaLabel={t('stats.modal.title', lang)} onClose={onClose} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[90vh]">
			<div className="p-4 border-b border-zinc-800 flex justify-between items-center">
				<h2 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
					<Database size={20} /> {t('stats.modal.title', lang)}
				</h2>
				<ModalCloseButton onClick={onClose} />
			</div>

			<div className="flex border-b border-zinc-800 bg-zinc-950/30">
				{(['GLOBAL', 'SESSION', 'ANALYTICS'] as Tab[]).map(tab => (
					<button
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${
							activeTab === tab ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
						}`}
					>
						{t(`stats.tab.${tab.toLowerCase()}`, lang)}
					</button>
				))}
			</div>

			<div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-900/50">
				{activeTab === 'ANALYTICS' && <AnalyticsView sessions={sessions} solvesMap={solvesMap} initialSessionId={currentSessionId} settings={settings} />}
				{activeTab === 'GLOBAL' && (
					<GlobalStatsView sessions={sessions} solvesMap={solvesMap} settings={settings} />
				)}
				{activeTab === 'SESSION' && (
					<SessionStatsView sessions={sessions} solvesMap={solvesMap} initialSessionId={currentSessionId} settings={settings} statsConfig={statsConfig} />
				)}
			</div>
		</Modal>
	);
};

export default StatisticsModal;
