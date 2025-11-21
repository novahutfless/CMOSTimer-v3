
import React from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const AboutModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-100">About CMOSTimer v3</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
        </div>
        
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
            <p>
                Welcome to CMOSTimer v3, a modern, feature-rich speedcubing timer designed for enthusiasts and professionals alike.
            </p>
            <p>
                Built with performance and aesthetics in mind, it offers advanced statistics, session management, and real-time visualization of your solving progress.
            </p>
            
            <div className="bg-zinc-950 p-4 rounded border border-zinc-800 mt-4">
                <h3 className="font-bold text-zinc-200 mb-2">Key Features</h3>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                    <li>Precise timing with inspection support</li>
                    <li>Multi-phase solve tracking</li>
                    <li>Comprehensive statistical analysis</li>
                    <li>Customizable themes and layouts</li>
                    <li>Scramble visualization for all WCA events</li>
                </ul>
            </div>

            <div className="text-center pt-4 text-zinc-500 text-xs">
                Version 3.0.0 &bull; Developed with React & TypeScript
            </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
