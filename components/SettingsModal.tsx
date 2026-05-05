import React, { useEffect, useState } from 'react';
import { StatConfig, Settings, InspectionFlashConfig, Language, Session, WidgetId } from '../types';
import { t } from '../translations';
import { X, Clock, Layout, BarChart, Palette, List, Keyboard, Zap, FileSpreadsheet } from 'lucide-react';
import { GeneralSettings } from './settings/GeneralSettings';
import { TimerSettings } from './settings/TimerSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { ListSettings } from './settings/ListSettings';
import { StatsSettings } from './settings/StatsSettings';
import { ShortcutSettings } from './settings/ShortcutSettings';
import { PluginSettings } from './settings/PluginSettings';
import { PBSheetSettings } from './settings/PBSheetSettings';
import { LayoutEditor } from './LayoutEditor';
import { WIDGET_DEFINITIONS } from '../utils/layouts';
import { storage } from '../utils/platformStorage';

interface SettingsModalProps {
  config: StatConfig[];
  settings: Settings;
  sessions: Session[];
  onSaveStats: (config: StatConfig[]) => void;
  onSaveSettings: (settings: Settings) => void;
  onClose: () => void;
}

type Tab = 'GENERAL' | 'TIMER' | 'APPEARANCE' | 'LAYOUT' | 'LISTS' | 'STATS' | 'PBSHEET' | 'SHORTCUTS' | 'PLUGINS';
const SETTINGS_TAB_KEY = 'cmostimer_settings_active_tab';
const isTab = (value: string | null): value is Tab =>
	['GENERAL', 'TIMER', 'APPEARANCE', 'LAYOUT', 'LISTS', 'STATS', 'PBSHEET', 'SHORTCUTS', 'PLUGINS'].includes(value || '');

const SettingsModal: React.FC<SettingsModalProps> = ({ 
	config, 
	settings,
	sessions,
	onSaveStats, 
	onSaveSettings, 
	onClose 
}) => {
	const [activeTab, setActiveTab] = useState<Tab>(() => {
		const saved = storage.getItem(SETTINGS_TAB_KEY);
		return isTab(saved) ? saved : 'GENERAL';
	});
	const [stats, setStats] = useState<StatConfig[]>(config);
	const [appSettings, setAppSettings] = useState<Settings>(settings);
	const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  
	const lang = appSettings.language || Language.EN;
	const mobileWidgetOptions = [
		{ id: WidgetId.EMPTY, name: '-' },
		...WIDGET_DEFINITIONS.filter(w => ![
			WidgetId.TIMER,
			WidgetId.SCRAMBLE,
			WidgetId.SESSION,
			WidgetId.LOGO,
			WidgetId.TOOLS,
			WidgetId.TIMELIST
		].includes(w.id))
	];

	const updateSetting = <K extends keyof Settings>(field: K, value: Settings[K]): void => {
		setAppSettings(prev => ({ ...prev, [field]: value }));
	};
  
	const updateFlash = (field: keyof InspectionFlashConfig, value: boolean): void => {
		setAppSettings(prev => ({ 
			...prev, 
			inspectionFlashes: { ...prev.inspectionFlashes, [field]: value } 
		}));
	};

	const handleSave = (): void => {
		onSaveStats(stats);
		onSaveSettings(appSettings);
		onClose();
	};

	useEffect(() => {
		storage.setItem(SETTINGS_TAB_KEY, activeTab);
	}, [activeTab]);

	return (
		<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div 
				className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh]"
				onClick={e => e.stopPropagation()}
			>
				<div className="p-4 border-b border-zinc-800 flex justify-between items-center">
					<h2 className="font-bold text-lg text-zinc-100">{t('settings.title', lang)}</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20} /></button>
				</div>

				<div className="flex flex-1 overflow-hidden flex-col md:flex-row min-h-0">
					<div className="w-full md:w-1/4 h-14 md:h-auto shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/50 overflow-x-auto md:overflow-y-auto">
						<div className="flex md:flex-col min-w-max md:min-w-0">
							{[
								{ id: 'GENERAL', icon: Layout, label: t('general', lang) },
								{ id: 'TIMER', icon: Clock, label: t('timer', lang) },
								{ id: 'APPEARANCE', icon: Palette, label: t('appearance', lang) },
								{ id: 'LAYOUT', icon: Layout, label: t('layout', lang) },
								{ id: 'LISTS', icon: List, label: t('lists', lang) },
								{ id: 'STATS', icon: BarChart, label: t('stats', lang) },
								{ id: 'PBSHEET', icon: FileSpreadsheet, label: t('settings.pbsheet', lang) },
								{ id: 'SHORTCUTS', icon: Keyboard, label: t('shortcuts', lang) },
								{ id: 'PLUGINS', icon: Zap, label: t('plugins', lang) },
							].map(tab => (
								<button
									key={tab.id}
									onClick={() => setActiveTab(tab.id as Tab)}
									className={`h-14 md:h-auto shrink-0 flex items-center gap-2 md:gap-3 px-4 py-3 text-sm font-medium transition-colors text-left whitespace-nowrap
                            ${activeTab === tab.id
									? 'bg-blue-900/20 text-blue-400 border-b-2 md:border-b-0 md:border-r-2 border-blue-500'
									: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-b-2 md:border-b-0 md:border-r-2 border-transparent'}
									`}
								>
									<tab.icon size={16} />
									{tab.label}
								</button>
							))}
						</div>
					</div>

					<div className="flex-1 min-h-0 p-6 overflow-y-auto custom-scrollbar bg-zinc-900/30">
						{activeTab === 'GENERAL' && <GeneralSettings settings={appSettings} update={updateSetting} />}
						{activeTab === 'TIMER' && <TimerSettings settings={appSettings} update={updateSetting} updateFlash={updateFlash} />}
						{activeTab === 'APPEARANCE' && <AppearanceSettings settings={appSettings} update={updateSetting} />}
						{activeTab === 'LAYOUT' && (
							<div className="space-y-4">
								<h3 className="text-sm font-bold text-zinc-400 uppercase">{t('settings.desktopLayout', lang)}</h3>
								<p className="text-sm text-zinc-500">{t('settings.desktopLayoutDesc', lang)}</p>
								<button 
									onClick={() => setShowLayoutEditor(true)}
									className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
								>
									<Layout size={20} /> {t('settings.openLayoutEditor', lang)}
								</button>

								<div className="pt-3 border-t border-zinc-800 space-y-3">
									<h3 className="text-sm font-bold text-zinc-400 uppercase">{t('settings.mobileLayout', lang)}</h3>
									<label className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded p-3">
										<span className="text-sm text-zinc-300">{t('settings.mobileBottomWidgets', lang)}</span>
										<input
											type="checkbox"
											checked={appSettings.mobileLayout?.enabled ?? false}
											onChange={(e) => updateSetting('mobileLayout', {
												...(appSettings.mobileLayout || { slot1: WidgetId.EMPTY, slot2: WidgetId.EMPTY }),
												enabled: e.target.checked
											})}
											className="w-5 h-5 accent-blue-600"
										/>
									</label>
									<div className="grid grid-cols-2 gap-2">
										<select
											value={appSettings.mobileLayout?.slot1 || WidgetId.EMPTY}
											onChange={(e) => updateSetting('mobileLayout', {
												...(appSettings.mobileLayout || { enabled: false, slot2: WidgetId.EMPTY }),
												slot1: e.target.value as WidgetId
											})}
											className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none"
										>
											{mobileWidgetOptions.map(opt => (
												<option key={opt.id} value={opt.id}>{opt.name}</option>
											))}
										</select>
										<select
											value={appSettings.mobileLayout?.slot2 || WidgetId.EMPTY}
											onChange={(e) => updateSetting('mobileLayout', {
												...(appSettings.mobileLayout || { enabled: false, slot1: WidgetId.EMPTY }),
												slot2: e.target.value as WidgetId
											})}
											className="bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200 outline-none"
										>
											{mobileWidgetOptions.map(opt => (
												<option key={opt.id} value={opt.id}>{opt.name}</option>
											))}
										</select>
									</div>
								</div>
							</div>
						)}
						{activeTab === 'LISTS' && <ListSettings settings={appSettings} update={updateSetting} />}
						{activeTab === 'STATS' && (
							<StatsSettings 
								stats={stats} 
								updateStats={setStats} 
								distSettings={appSettings.timeDistribution}
								updateDistSettings={(cfg) => updateSetting('timeDistribution', cfg)}
								language={lang} 
							/>
						)}
						{activeTab === 'PBSHEET' && (
							<PBSheetSettings settings={appSettings} sessions={sessions} update={updateSetting} />
						)}
						{activeTab === 'SHORTCUTS' && <ShortcutSettings settings={appSettings} update={updateSetting} />}
						{activeTab === 'PLUGINS' && <PluginSettings />}
					</div>
				</div>

				<div className="p-4 border-t border-zinc-800 flex justify-end bg-zinc-900">
					<button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded text-sm font-bold">
						{t('btn.save', lang)}
					</button>
				</div>
			</div>

			{showLayoutEditor && (
				<LayoutEditor 
					initialConfig={appSettings.layout}
					onSave={(newLayout) => {
						updateSetting('layout', newLayout); setShowLayoutEditor(false); 
					}}
					onClose={() => setShowLayoutEditor(false)}
				/>
			)}
		</div>
	);
};

export default SettingsModal;

