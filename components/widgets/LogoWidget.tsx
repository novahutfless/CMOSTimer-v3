import React from 'react';
import { APP_VERSION } from '../../utils/constants';

type LogoWidgetProps = {
	onClick: () => void;
	hasUnsyncedData: boolean;
};

const LogoWidget: React.FC<LogoWidgetProps> = ({ onClick, hasUnsyncedData }) => {
	return (
		<div onClick={onClick} className="flex items-center justify-center h-full">
			<span className="font-black text-xl tracking-tighter text-zinc-500 select-none hover:text-zinc-200 transition-colors flex items-center">
				CMOSTimer v{APP_VERSION}
				{hasUnsyncedData && (
					<span
						className="ml-2 inline-flex"
						title="Unsynced changes are waiting to sync."
					>
						<span
							className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.75)]"
							aria-label="Unsynced changes indicator"
							role="img"
						/>
					</span>
				)}
			</span>
		</div>
	);
};

export default LogoWidget;
