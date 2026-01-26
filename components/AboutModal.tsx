import React from 'react';
import { X } from 'lucide-react';
import { t } from '../translations';
import { Language } from '../types';
import { APP_VERSION, COMMIT_HASH } from '../utils';

interface Props {
  onClose: () => void;
  language?: Language;
}

const AboutModal: React.FC<Props> = ({ onClose, language = Language.EN }) => {
	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-xl font-bold text-zinc-100">{t('about.title', language)}</h2>
					<button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={24}/></button>
				</div>
        
				<div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
					<p>{t('about.p1', language)}</p>
					<p>{t('about.p2', language)}</p>
            
					<div className="bg-zinc-950 p-4 rounded border border-zinc-800 mt-4">
						<h3 className="font-bold text-zinc-200 mb-2">{t('about.features', language)}</h3>
						<ul className="list-disc list-inside space-y-1 text-zinc-400">
							<li>{t('about.feat1', language)}</li>
							<li>{t('about.feat2', language)}</li>
							<li>{t('about.feat3', language)}</li>
							<li>{t('about.feat4', language)}</li>
							<li>{t('about.feat5', language)}</li>
						</ul>
					</div>

					<div className="text-center pt-6 border-t border-zinc-800/50 mt-6">
						<div className="flex items-center justify-center gap-2 text-zinc-400 font-mono text-xs mb-1">
							<span>v{APP_VERSION}</span>
							{COMMIT_HASH && (
								<span className="bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] text-zinc-500" title="Commit Hash">
									{COMMIT_HASH.substring(0, 7)}
								</span>
							)}
						</div>
						<div className="text-zinc-500 text-[10px]">
							{t('about.footer', language)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default AboutModal;