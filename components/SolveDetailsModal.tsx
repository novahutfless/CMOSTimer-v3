
import React, { useState } from 'react';
import { ComputedSolve, Language, Penalty, TimePrecision, ScrambleType } from '../types';
import { t } from '../translations';
import { formatTime } from '../utils';
import { X, Copy, Check } from 'lucide-react';
import { ScrambleDisplay } from './ScrambleDisplay';

interface SolveDetailsModalProps {
  solve: ComputedSolve;
  language: Language;
  precision: TimePrecision;
  onClose: () => void;
}

const SolveDetailsModal: React.FC<SolveDetailsModalProps> = ({ solve, language, precision, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Infer type
  let type = ScrambleType.THREE;
  if (solve.scramble.includes('w')) type = ScrambleType.FOUR; 
  if (!solve.scramble.includes('U') && !solve.scramble.includes('D')) type = ScrambleType.TWO;

  const handleCopyExport = () => {
      // Format: [TIME][PENALTY]: [SCRAMBLE]
      // Penalty format: original+2=new
      
      let timeStr = '';
      if (solve.penalty === Penalty.DNF) {
          timeStr = 'DNF';
      } else if (solve.penalty === Penalty.PLUS_TWO) {
          const original = formatTime(solve.time, Penalty.NONE, precision);
          const final = formatTime(solve.time, Penalty.PLUS_TWO, precision);
          timeStr = `${original}+2=${final.replace('+','')}`; // remove trailing + from formatTime output for readability in text? formatTime returns "xx.xx+" usually. 
          // Actually formatTime returns "12.34+" if PLUS_TWO.
          // We want "12.34+2=14.34"
          // Let's reconstruct manually for clean export
          const origStr = (solve.time / 1000).toFixed(2);
          const finalStr = ((solve.time + 2000) / 1000).toFixed(2);
          timeStr = `${origStr}+2=${finalStr}`;
      } else {
          timeStr = formatTime(solve.time, Penalty.NONE, precision);
      }
      
      const text = `---------- Export by CMOSTimer v3 ----------\n${timeStr}: ${solve.scramble}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <h2 className="text-xl font-bold text-zinc-100">{t('details.title', language)}</h2>
                <p className="text-zinc-500 text-xs font-mono">{solve.id}</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
        </div>

        <div className="space-y-4">
            {/* Main Time */}
            <div className="text-center py-4 bg-zinc-950/50 rounded border border-zinc-800 relative group">
                <div className="text-xs uppercase font-bold text-zinc-500">{t('details.time', language)}</div>
                <div className="text-4xl font-mono font-bold text-zinc-100">
                    {formatTime(solve.time, solve.penalty, precision)}
                </div>
                {solve.penalty !== Penalty.NONE && (
                    <div className="text-red-400 text-sm mt-1">
                        {solve.penalty === Penalty.PLUS_TWO ? '+2 (Included)' : 'DNF'}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="p-3 bg-zinc-950/30 rounded">
                     <div className="text-xs text-zinc-500">{t('details.date', language)}</div>
                     <div className="text-zinc-300">{new Date(solve.timestamp).toLocaleString()}</div>
                 </div>
                 <div className="p-3 bg-zinc-950/30 rounded">
                     <div className="text-xs text-zinc-500">Stats</div>
                     <div className="text-zinc-300 text-sm font-mono">
                        <div>mo3: {formatTime(solve.stats.mean3 ?? -1)}</div>
                        <div>ao5: {formatTime(solve.stats.avg5 ?? -1)}</div>
                     </div>
                 </div>
            </div>

            <div>
                <div className="flex justify-between items-end mb-1">
                     <div className="text-xs text-zinc-500">{t('details.scramble', language)}</div>
                     <button 
                        onClick={handleCopyExport} 
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 px-2 py-1 rounded transition-colors"
                     >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'Copied' : t('details.copy', language)}
                     </button>
                </div>
                <div className="p-3 bg-zinc-950/30 rounded font-mono text-sm text-zinc-300 break-words border border-zinc-800 mb-2">
                    {solve.scramble}
                </div>
                <div className="flex justify-center bg-zinc-950/30 p-2 rounded border border-zinc-800/50">
                    <ScrambleDisplay scramble={solve.scramble} type={type} className="h-32" />
                </div>
            </div>

            {solve.phases && solve.phases.length > 1 && (
                <div>
                    <div className="text-xs text-zinc-500 mb-1">{t('details.phases', language)}</div>
                    <div className="border border-zinc-800 rounded overflow-hidden text-sm">
                        <table className="w-full text-left">
                            <thead className="bg-zinc-950 text-zinc-500 text-xs uppercase">
                                <tr>
                                    <th className="px-3 py-2">#</th>
                                    <th className="px-3 py-2">Split</th>
                                    <th className="px-3 py-2">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {solve.phases.map((p, i) => (
                                    <tr key={i} className="bg-zinc-900/50">
                                        <td className="px-3 py-1.5 text-zinc-500 font-mono">{i + 1}</td>
                                        <td className="px-3 py-1.5 text-zinc-300 font-mono">{formatTime(p.duration, Penalty.NONE, precision)}</td>
                                        <td className="px-3 py-1.5 text-zinc-400 font-mono">{formatTime(p.cumulative, Penalty.NONE, precision)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SolveDetailsModal;
