

import React, { useState } from 'react';
import { Session, SessionSettingsOverride, InspectionDirection, InspectionVoice, TimePrecision, Language } from '../types';
import { t } from '../translations';
import { X, Plus, Trash2, Layout } from 'lucide-react';
import { formatTime, DNF_VALUE } from '../utils';
import { LayoutEditor } from './LayoutEditor';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/layouts';

interface SessionSettingsModalProps {
  session: Session;
  language: Language;
  onSave: (id: string, overrides: Session['settingsOverride']) => void;
  onClose: () => void;
}

const SessionSettingsModal: React.FC<SessionSettingsModalProps> = ({ session, language, onSave, onClose }) => {
  const [overrides, setOverrides] = useState<SessionSettingsOverride>(session.settingsOverride || {});
  const [prePBKey, setPrePBKey] = useState('');
  const [prePBVal, setPrePBVal] = useState('');
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);

  const update = (key: keyof SessionSettingsOverride, val: any) => {
      setOverrides(prev => {
          const next = { ...prev };
          if (val === undefined) delete next[key];
          else (next as any)[key] = val;
          return next;
      });
  };

  const handleAddPrePB = () => {
      if (!prePBKey || !prePBVal) return;
      const ms = parseFloat(prePBVal) * 1000;
      if (isNaN(ms)) return;
      
      const current = overrides.prePBs || {};
      setOverrides(prev => ({
          ...prev,
          prePBs: { ...current, [prePBKey]: ms }
      }));
      setPrePBVal('');
  };

  const handleRemovePrePB = (key: string) => {
      const current = { ...overrides.prePBs };
      delete current[key];
      setOverrides(prev => ({ ...prev, prePBs: current }));
  };

  const renderToggle = (label: string, key: keyof SessionSettingsOverride) => {
      const current = overrides ? overrides[key] : undefined;
      return (
          <div className="flex justify-between items-center">
              <span className="text-zinc-300 text-sm">{label}</span>
              <select 
                  value={current === undefined ? 'global' : current.toString()}
                  onChange={(e) => {
                      if (e.target.value === 'global') update(key, undefined);
                      else update(key, e.target.value === 'true');
                  }}
                  className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none"
              >
                  <option value="global">Global</option>
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
              </select>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-4 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-zinc-100">{t('session.override', language)}</h2>
              <button onClick={onClose}><X size={20} className="text-zinc-500 hover:text-white"/></button>
          </div>

          <div className="space-y-3 overflow-y-auto custom-scrollbar pr-2">
              {renderToggle(t('timer.inspection', language), 'inspectionEnabled')}
              
              <div className="flex justify-between items-center">
                  <span className="text-zinc-300 text-sm">{t('timer.direction', language)}</span>
                  <select 
                      value={overrides?.inspectionDirection || 'global'}
                      onChange={(e) => {
                          if (e.target.value === 'global') update('inspectionDirection', undefined);
                          else update('inspectionDirection', e.target.value);
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none"
                  >
                      <option value="global">Global</option>
                      <option value={InspectionDirection.UP}>Up</option>
                      <option value={InspectionDirection.DOWN}>Down</option>
                  </select>
              </div>

              <div className="flex justify-between items-center">
                  <span className="text-zinc-300 text-sm">{t('timer.voice', language)}</span>
                  <select 
                      value={overrides?.inspectionVoice || 'global'}
                      onChange={(e) => {
                          if (e.target.value === 'global') update('inspectionVoice', undefined);
                          else update('inspectionVoice', e.target.value);
                      }}
                      className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none"
                  >
                      <option value="global">Global</option>
                      <option value={InspectionVoice.NONE}>{t('voice.none', language)}</option>
                      <option value={InspectionVoice.MALE}>{t('voice.male', language)}</option>
                      <option value={InspectionVoice.FEMALE}>{t('voice.female', language)}</option>
                  </select>
              </div>

              {renderToggle(t('timer.autoPenalty', language), 'autoPenalty')}
              {renderToggle(t('timer.holdToStart', language), 'holdToStart')}
              {renderToggle(t('ui.hideWhileTiming', language), 'hideWhileTiming')}
              
              <div className="flex justify-between items-center">
                   <span className="text-zinc-300 text-sm">{t('session.phases', language)}</span>
                   <input 
                       type="number" 
                       min="1" 
                       max="10"
                       value={overrides.numberOfPhases || ''}
                       placeholder="Global (1)"
                       onChange={e => {
                           const val = parseInt(e.target.value);
                           if (isNaN(val)) update('numberOfPhases', undefined);
                           else update('numberOfPhases', val);
                       }}
                       className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs outline-none text-right"
                   />
              </div>

              <div className="border-t border-zinc-800 my-2 pt-2 space-y-3">
                 {renderToggle(t('timer.restartDelay', language), 'restartDelayEnabled')}
              </div>

              {/* Layout Override */}
              <div className="border-t border-zinc-800 my-2 pt-2 space-y-2">
                  <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-zinc-400">Layout</h3>
                      {overrides.layout && (
                          <button 
                            onClick={() => update('layout', undefined)} 
                            className="text-[10px] text-blue-400 hover:underline"
                          >
                              Reset to Global
                          </button>
                      )}
                  </div>
                  <button 
                    onClick={() => setShowLayoutEditor(true)}
                    className={`w-full py-2 text-xs border border-dashed rounded flex items-center justify-center gap-2 ${overrides.layout ? 'border-blue-500 text-blue-400 bg-blue-900/10' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                  >
                      <Layout size={14} /> {overrides.layout ? 'Edit Session Layout' : 'Override Global Layout'}
                  </button>
              </div>

              {/* PrePBs Section */}
              <div className="border-t border-zinc-800 my-2 pt-2">
                   <h3 className="text-sm font-bold text-zinc-400 mb-2">{t('session.prepbs', language)}</h3>
                   <div className="space-y-2 mb-2">
                       {overrides.prePBs && Object.entries(overrides.prePBs).map(([k, v]) => (
                           <div key={k} className="flex justify-between items-center bg-zinc-950 p-2 rounded">
                               <span className="text-xs text-zinc-400">{k}</span>
                               <div className="flex items-center gap-2">
                                   <span className="text-sm font-mono text-zinc-200">{formatTime(v as number)}</span>
                                   <button onClick={() => handleRemovePrePB(k)} className="text-zinc-600 hover:text-red-400"><Trash2 size={14}/></button>
                               </div>
                           </div>
                       ))}
                   </div>
                   <div className="flex gap-2">
                       <input 
                           placeholder="Stat ID (e.g. 1, ml0)" 
                           value={prePBKey} 
                           onChange={e => setPrePBKey(e.target.value)}
                           className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                       />
                       <input 
                           type="number" 
                           placeholder="Seconds" 
                           value={prePBVal}
                           onChange={e => setPrePBVal(e.target.value)}
                           className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs"
                       />
                       <button onClick={handleAddPrePB} className="bg-zinc-800 hover:bg-zinc-700 p-1 rounded"><Plus size={16}/></button>
                   </div>
              </div>
          </div>

          <div className="mt-6 flex justify-end">
              <button 
                onClick={() => { onSave(session.id, overrides); onClose(); }}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-500"
              >
                  {t('btn.save', language)}
              </button>
          </div>
      </div>

      {showLayoutEditor && (
          <LayoutEditor 
             initialConfig={overrides.layout || DEFAULT_LAYOUT_CONFIG}
             onSave={(newLayout) => { update('layout', newLayout); setShowLayoutEditor(false); }}
             onClose={() => setShowLayoutEditor(false)}
          />
      )}
    </div>
  );
};

export default SessionSettingsModal;