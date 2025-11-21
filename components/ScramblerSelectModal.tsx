
import React, { useState } from 'react';
import { ScramblerCategory, CustomScramblerConfig } from '../types';
import { SCRAMBLERS, getScramblersByCategory } from '../utils/scramble';
import { X, Dices } from 'lucide-react';

interface Props {
  selectedId: string;
  customConfig?: CustomScramblerConfig;
  onSelect: (id: string, customConfig?: CustomScramblerConfig) => void;
  onClose: () => void;
}

export const ScramblerSelectModal: React.FC<Props> = ({ selectedId, customConfig, onSelect, onClose }) => {
  const grouped = getScramblersByCategory();
  const categories = Object.values(ScramblerCategory);
  const [activeTab, setActiveTab] = useState<ScramblerCategory>(
      SCRAMBLERS.find(s => s.id === selectedId)?.category || ScramblerCategory.WCA
  );

  // Custom Config State
  const [customMoves, setCustomMoves] = useState(customConfig?.moves || 'U D R L F B');
  const [customOpposites, setCustomOpposites] = useState(customConfig?.opposites || 'U-D R-L F-B');
  const [customLength, setCustomLength] = useState(customConfig?.length || 20);

  const handleSelect = (id: string) => {
      if (id === 'custom') {
          onSelect(id, { moves: customMoves, opposites: customOpposites, length: customLength });
      } else {
          onSelect(id);
      }
      onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
              <Dices size={20} /> Select Scrambler
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20} /></button>
        </div>

        <div className="flex border-b border-zinc-800 bg-zinc-950/50 overflow-x-auto">
            {categories.map(cat => (
                <button
                    key={cat}
                    onClick={() => setActiveTab(cat)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeTab === cat ? 'text-blue-400 border-b-2 border-blue-500 bg-zinc-800/50' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
             {activeTab === ScramblerCategory.CUSTOM ? (
                 <div className="space-y-4">
                     <p className="text-zinc-400 text-sm mb-4">Define your own scrambling logic.</p>
                     
                     <div>
                         <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Allowed Moves (Space separated)</label>
                         <input 
                            type="text" 
                            value={customMoves}
                            onChange={e => setCustomMoves(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 font-mono text-sm"
                         />
                     </div>
                     
                     <div>
                         <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Opposite Groups (e.g. "U-D R-L")</label>
                         <input 
                            type="text" 
                            value={customOpposites}
                            onChange={e => setCustomOpposites(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 font-mono text-sm"
                         />
                         <p className="text-[10px] text-zinc-600 mt-1">Pairs defined here will not appear consecutively.</p>
                     </div>

                     <div>
                         <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Scramble Length</label>
                         <input 
                            type="number" 
                            value={customLength}
                            onChange={e => setCustomLength(parseInt(e.target.value))}
                            className="w-24 bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-200 font-mono text-sm"
                         />
                     </div>

                     <button 
                        onClick={() => handleSelect('custom')}
                        className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded text-sm font-bold"
                     >
                         Use Custom Scrambler
                     </button>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                     {grouped[activeTab]?.map(scrambler => (
                         <button
                             key={scrambler.id}
                             onClick={() => handleSelect(scrambler.id)}
                             className={`flex flex-col items-start p-3 rounded border transition-all ${
                                 selectedId === scrambler.id 
                                 ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/50' 
                                 : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'
                             }`}
                         >
                             <span className={`font-bold ${selectedId === scrambler.id ? 'text-blue-400' : 'text-zinc-200'}`}>
                                 {scrambler.name}
                             </span>
                             <span className="text-xs text-zinc-500 mt-1 font-mono">{scrambler.id}</span>
                         </button>
                     ))}
                     {grouped[activeTab]?.length === 0 && (
                         <div className="col-span-full text-zinc-500 italic text-center py-8">No scramblers in this category yet.</div>
                     )}
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};
