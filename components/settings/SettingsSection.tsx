import React from 'react';

interface Props {
	children: React.ReactNode;
	className?: string;
}

export const SettingsSection: React.FC<Props> = ({ children, className }) => (
	<div className={`bg-zinc-950 p-3 rounded border border-zinc-800${className ? ` ${className}` : ''}`}>
		{children}
	</div>
);
