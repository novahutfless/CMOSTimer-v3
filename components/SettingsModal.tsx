
import React, { useState } from 'react';
import { StatConfig, Settings, InspectionFlashConfig, Language, LayoutConfig } from '../types';
import { t } from '../translations';
import { X, Clock, Layout, BarChart, Palette, List, Keyboard } from 'lucide-react';
import { GeneralSettings } from './settings/GeneralSettings';
import { TimerSettings } from './settings/TimerSettings';
import { AppearanceSettings } from './settings/AppearanceSettings';
import { ListSettings } from './settings/ListSettings';
import { StatsSettings } from './settings/StatsSettings';
import { ShortcutSettings } from './settings/ShortcutSettings';
import { LayoutEditor } from './LayoutEditor';

interface SettingsModalProps {
  config: StatConfig[];
  settings: Settings;
  onSaveStats: (config: StatConfig[]) => void;
  onSaveSettings: (settings: Settings) => void;
  onClose: () => void;
}

type Tab = 'GENERAL' | 'TIMER' | 'APPEARANCE' | 'LAYOUT' | 'LISTS' | 'STATS' | 'SHORTCUTS';

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    config, 
    settings,
    onSaveStats, 
    onSaveSettings, 
    onClose 
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('GENERAL');
  const [stats, setStats] = useState<StatConfig[]>(config);
  const [appSettings, setAppSettings] = useState<Settings>(settings);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  
  const lang = appSettings.language || Language.EN;

  const updateSetting = (field: keyof Settings, value: any) => {
      setAppSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const updateFlash = (field: keyof InspectionFlashConfig, value: boolean) => {
      setAppSettings(prev => ({ 
          ...prev, 
          inspectionFlashes: { ...prev.inspectionFlashes, [field]: value } 
      }));
  };

  const handleSave = () => {
    onSaveStats(stats);
    onSaveSettings(appSettings);
    onClose();
  };

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

        <div className="flex flex-1 overflow-hidden">
             <div className="w-1/4 border-r border-zinc-800 bg-zinc-900/50 flex flex-col overflow-y-auto">
                 {[
                    { id: 'GENERAL', icon: Layout, label: t('general', lang) },
                    { id: 'TIMER', icon: Clock, label: t('timer', lang) },
                    { id: 'APPEARANCE', icon: Palette, label: t('appearance', lang) },
                    { id: 'LAYOUT', icon: Layout, label: 'Layout' },
                    { id: 'LISTS', icon: List, label: t('lists', lang) },
                    { id: 'STATS', icon: BarChart, label: t('stats', lang) },
                    { id: 'SHORTCUTS', icon: Keyboard, label: t('shortcuts', lang) },
                 ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left
                            ${activeTab === tab.id ? 'bg-blue-900/20 text-blue-400 border-r-2 border-blue-500' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border-r-2 border-transparent'}
                        `}
                     >
                         <tab.icon size={18} />
                         {tab.label}
                     </button>
                 ))}
             </div>

             <div className="flex-1 p-6 overflow-y-auto custom-scrollbar bg-zinc-900/30">
                {activeTab === 'GENERAL' && <GeneralSettings settings={appSettings} update={updateSetting} />}
                {activeTab === 'TIMER' && <TimerSettings settings={appSettings} update={updateSetting} updateFlash={updateFlash} />}
                {activeTab === 'APPEARANCE' && <AppearanceSettings settings={appSettings} update={updateSetting} />}
                {activeTab === 'LAYOUT' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase">Desktop Layout</h3>
                        <p className="text-sm text-zinc-500">Configure the arrangement of UI elements for desktop screens.</p>
                        <button 
                            onClick={() => setShowLayoutEditor(true)}
                            className="w-full py-3 border-2 border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:border-blue-500 hover:text-blue-400 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <Layout size={20} /> Open Layout Editor
                        </button>
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
                {activeTab === 'SHORTCUTS' && <ShortcutSettings settings={appSettings} update={updateSetting} />}
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
             onSave={(newLayout) => { updateSetting('layout', newLayout); setShowLayoutEditor(false); }}
             onClose={() => setShowLayoutEditor(false)}
          />
      )}
    </div>
  );
};

export default SettingsModal;