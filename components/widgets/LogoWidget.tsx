import React from 'react';
import { Language } from '../../types';
import { t } from '../../translations';
import { APP_VERSION } from '../../utils/constants';

type LogoWidgetProps = {
	onClick: () => void;
	hasUnsyncedData: boolean;
	isPulling: boolean;
	language: Language;
};

const LogoWidget: React.FC<LogoWidgetProps> = ({ onClick, hasUnsyncedData, isPulling, language }) => {
	return (
		<div onClick={onClick} className="flex items-center justify-center h-full">
			<span className="font-black text-xl tracking-tighter text-zinc-500 select-none hover:text-zinc-200 transition-colors flex items-center">
				CMOSTimer v{APP_VERSION}
				{(hasUnsyncedData || isPulling) && (
					<span
						className="ml-2 inline-flex"
						title={t(hasUnsyncedData ? 'sync.upload.title' : 'sync.pull.title', language)}
					>
						<span
							className={`h-2 w-2 rounded-full ${hasUnsyncedData ? "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.75)]" : "bg-sky-400 opacity-70"}`}
							aria-label={t(hasUnsyncedData ? 'sync.upload.label' : 'sync.pull.label', language)}
							role="img"
						/>
					</span>
				)}
			</span>
		</div>
	);
};

export default LogoWidget;
