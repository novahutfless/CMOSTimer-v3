import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ComputedSolve, Penalty, Session, Settings, Solve } from '../types';
import { BUILT_IN_COMMANDS, CommandContext, CommandDefinition, findCommand, parseCommand, splitCommandChain } from '../commands/commandRegistry';
import { pluginManager } from '../plugins/PluginManager';
import { usePluginManagerRevision } from '../plugins/usePluginManagerRevision';
import { Modal } from './Modal';

interface Props {
	onClose: () => void;
	settings: Settings;
	setSettings: (settings: Settings) => void;
	sessions: Session[];
	computedSolves: ComputedSolve[];
	selectedIds: Set<string>;
	lastClickedId: string | null;
	selectSolves: (ids: string[]) => void;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	updatePenalty: (id: string, penalty: Penalty) => void;
	switchSession: (id: string) => void;
	setGroupBySubsession: (enabled: boolean) => void;
	groupBySubsession: boolean;
	setOption: (name: string, value: string) => void;
	setSessionOption: (name: string, value: string | undefined) => void;
	copyStatExport: (selector: string, best: boolean) => Promise<void>;
	installPlugin: (name: string) => Promise<void>;
	open: CommandContext['open'];
}

export const getAvailableCommands = (): CommandDefinition[] => [
	...BUILT_IN_COMMANDS,
	...pluginManager.getCommands().map(command => ({
		name: command.id,
		aliases: [],
		description: command.description || command.name,
		execute: async (): Promise<'close'> => {
			await pluginManager.runCommand(command.id);
			return 'close';
		}
	} satisfies CommandDefinition)),
];

export const CommandPalette: React.FC<Props> = props => {
	const pluginRevision = usePluginManagerRevision();
	const [input, setInput] = useState('');
	const [feedback, setFeedback] = useState<string | null>(null);
	const [running, setRunning] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const commands = useMemo(getAvailableCommands, [pluginRevision]);

	useEffect(() => inputRef.current?.focus(), []);

	const context: CommandContext = {
		settings: props.settings, setSettings: props.setSettings, sessions: props.sessions,
		computedSolves: props.computedSolves, selectedIds: props.selectedIds, lastClickedId: props.lastClickedId,
		selectSolves: props.selectSolves,
		updateSolve: props.updateSolve, updatePenalty: props.updatePenalty, switchSession: props.switchSession,
		setGroupBySubsession: props.setGroupBySubsession, groupBySubsession: props.groupBySubsession, copyStatExport: props.copyStatExport,
		setOption: props.setOption, setSessionOption: props.setSessionOption,
		installPlugin: props.installPlugin, open: props.open,
	};

	const execute = async (): Promise<void> => {
		const chain = splitCommandChain(input);
		if (chain.length === 0) {
			props.onClose(); return;
		}
		setRunning(true);
		setFeedback(null);
		try {
			let keepOpen = false;
			for (const entry of chain) {
				const parsed = parseCommand(entry);
				const command = findCommand(commands, parsed.command);
				if (!command) throw new Error(`Unknown command "${parsed.command}". Type ? for help.`);
				if (await command.execute(parsed.args, context) === 'stay-open') keepOpen = true;
			}
			if (!keepOpen) props.onClose();
		} catch (reason) {
			setFeedback(reason instanceof Error ? reason.message : String(reason));
		} finally {
			setRunning(false);
		}
	};

	return <Modal ariaLabel="Command input" onClose={props.onClose} overlayClassName="bg-black/60 backdrop-blur-sm flex items-start justify-center z-[100] pt-[15vh]" className="w-full max-w-lg overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
		<input data-testid="command-input" ref={inputRef} type="text" value={input} disabled={running}
			onChange={event => {
				setInput(event.target.value); setFeedback(null);
			}}
			onKeyDown={event => {
				if (event.key === 'Enter') {
					event.preventDefault(); void execute();
				} if (event.key === 'Escape') {
					event.preventDefault(); props.onClose();
				}
			}}
			placeholder="? for commands" aria-describedby={feedback ? 'command-feedback' : undefined}
			className="w-full bg-transparent p-4 font-mono text-lg text-zinc-200 outline-none placeholder:text-zinc-600 disabled:opacity-50" autoComplete="off" spellCheck="false" />
		{feedback && <div id="command-feedback" role="alert" className="border-t border-zinc-800 px-4 py-2 text-xs text-amber-400">{feedback}</div>}
	</Modal>;
};
