import React from 'react';
import { CommandDefinition } from '../commands/commandRegistry';
import { Modal, ModalCloseButton } from './Modal';

export const CommandHelpModal: React.FC<{ commands: CommandDefinition[]; onClose: () => void }> = ({ commands, onClose }) => (
	<Modal ariaLabel="Command help" onClose={onClose} className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
		<div className="flex items-center justify-between border-b border-zinc-800 p-4">
			<div><h2 className="text-lg font-bold text-zinc-100">Command help</h2><p className="text-xs text-zinc-500">Type a command after pressing 5. Arguments work with both the long name and aliases.</p></div>
			<ModalCloseButton onClick={onClose} />
		</div>
		<div className="overflow-y-auto p-3">
			{commands.map(command => <div key={command.name} className="grid grid-cols-[minmax(9rem,auto)_1fr] gap-4 border-b border-zinc-800/70 px-2 py-3 last:border-0">
				<code className="text-sm text-blue-300">{command.name}{command.usage ? ` ${command.usage}` : ''}<span className="block text-xs text-zinc-600">{command.aliases.join(', ')}</span></code>
				<p className="text-sm text-zinc-300">{command.description}</p>
			</div>)}
		</div>
	</Modal>
);
