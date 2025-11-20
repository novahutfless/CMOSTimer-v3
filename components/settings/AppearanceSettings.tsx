
import React from 'react';
import { Settings, Language, AppTheme, PBVisualType } from '../../types';
import { t } from '../../translations';

interface Props { settings: Settings; update: (k: keyof Settings, v: any) => void; }

export const AppearanceSettings: React.FC<Props> = ({ settings, update }) => {
  const lang = settings.language || Language.EN;
  return (
      <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('theme.title', lang)}</h3>
          <div className="grid grid-cols-3 gap-2">
              {[AppTheme.ZINC, AppTheme.BLUE, AppTheme.GREEN, AppTheme.ORANGE, AppTheme.PURPLE, AppTheme.ROSE].map(theme => (
                  <button
                    key={theme}
                    onClick={() => update('theme', theme)}
                    className={`p-3 rounded border text-sm capitalize font-medium ${settings.theme === theme ? 'border-white bg-zinc-800' : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-800'}`}
                  >
                      {theme}
                  </button>
              ))}
          </div>

          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">{t('theme.customColors', lang)}</h3>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                   <span className="text-xs text-zinc-500">{t('color.bg', lang)}</span>
                   <div className="flex gap-2">
                       <input type="color" value={settings.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="bg-transparent w-8 h-8 cursor-pointer"/>
                       <input type="text" value={settings.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 text-xs font-mono"/>
                   </div>
              </div>
              <div className="flex flex-col gap-1">
                   <span className="text-xs text-zinc-500">{t('color.text', lang)}</span>
                   <div className="flex gap-2">
                       <input type="color" value={settings.textColor} onChange={e => update('textColor', e.target.value)} className="bg-transparent w-8 h-8 cursor-pointer"/>
                       <input type="text" value={settings.textColor} onChange={e => update('textColor', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 text-xs font-mono"/>
                   </div>
              </div>
          </div>

          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">Personal Bests</h3>
          <div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-3">
               <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">{t('pb.visuals', lang)}</span>
                  <select 
                      value={settings.pbVisuals}
                      onChange={e => update('pbVisuals', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
                  >
                      <option value={PBVisualType.NONE}>None</option>
                      <option value={PBVisualType.HIGHLIGHT}>Highlight</option>
                      <option value={PBVisualType.BADGE}>Badge</option>
                  </select>
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                  <div className="font-medium text-zinc-200">{t('pb.fireworks', lang)}</div>
                  <input 
                      type="checkbox" 
                      checked={settings.pbFireworks} 
                      onChange={e => update('pbFireworks', e.target.checked)}
                      className="w-5 h-5 accent-blue-600"
                  />
              </div>
          </div>
      </div>
  );
};
