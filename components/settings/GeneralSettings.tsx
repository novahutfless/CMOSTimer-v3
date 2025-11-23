
import React from 'react';
import { Settings, Language, DateFormat } from '../../types';
import { t } from '../../translations';
import { Globe, EyeOff, Calendar } from 'lucide-react';

interface Props { settings: Settings; update: (k: keyof Settings, v: any) => void; }

export const GeneralSettings: React.FC<Props> = ({ settings, update }) => {
    const lang = settings.language || Language.EN;
    return (
      <div className="space-y-4">
           <div className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
              <div className="flex items-center gap-2">
                  <Globe size={16} className="text-zinc-400"/>
                  <div className="font-medium text-zinc-200">{t('lang.select', lang)}</div>
              </div>
              <select 
                  value={settings.language}
                  onChange={e => update('language', e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
              >
                  <option value={Language.EN}>English</option>
                  <option value={Language.DE}>Deutsch</option>
              </select>
          </div>

          <div className="flex items-center justify-between bg-zinc-950 p-3 rounded border border-zinc-800">
              <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-zinc-400"/>
                  <div className="font-medium text-zinc-200">{t('settings.dateFormat', lang)}</div>
              </div>
              <select 
                  value={settings.dateFormat}
                  onChange={e => update('dateFormat', e.target.value)}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
              >
                  <option value={DateFormat.ISO}>{t('date.fmt.iso', lang)}</option>
                  <option value={DateFormat.US}>{t('date.fmt.us', lang)}</option>
                  <option value={DateFormat.EU}>{t('date.fmt.eu', lang)}</option>
              </select>
          </div>

          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <EyeOff size={16} /> UI & Behavior
          </h3>
          
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                  <div className="font-medium text-zinc-200">{t('ui.hideWhileTiming', lang)}</div>
                  <input 
                      type="checkbox" 
                      checked={settings.hideWhileTiming} 
                      onChange={e => update('hideWhileTiming', e.target.checked)}
                      className="w-5 h-5 accent-blue-600"
                  />
              </div>
              {settings.hideWhileTiming && (
                  <div className="border-t border-zinc-800 pt-2">
                      <span className="text-xs text-zinc-500 block mb-1">{t('ui.hideText', lang)}</span>
                      <input 
                          type="text" 
                          value={settings.hideWhileTimingText || ''} 
                          onChange={e => update('hideWhileTimingText', e.target.value)}
                          placeholder="Solving..."
                          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
                      />
                  </div>
              )}
          </div>

          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                  <div>
                      <div className="font-medium text-zinc-200">{t('ui.pagination', lang)}</div>
                  </div>
                  <input 
                      type="checkbox" 
                      checked={settings.paginationEnabled} 
                      onChange={e => update('paginationEnabled', e.target.checked)}
                      className="w-5 h-5 accent-blue-600"
                  />
              </div>
              {settings.paginationEnabled && (
                  <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                      <span className="text-sm text-zinc-400">{t('ui.pageSize', lang)}</span>
                      <input 
                          type="number"
                          value={settings.pageSize}
                          onChange={e => update('pageSize', Math.max(10, parseInt(e.target.value)))}
                          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-20 text-right"
                      />
                  </div>
              )}
          </div>
      </div>
    );
};
