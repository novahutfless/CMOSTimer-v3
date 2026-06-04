import React, { useState, useEffect, useRef } from 'react';
import { Settings, Language, ComputedSolve, Solve } from '../types';
import { getAvailableLanguages, isKnownLanguage, t } from '../translations';

interface Props {
    onClose: () => void;
    onOpenSettings: () => void;
    settings: Settings;
    setSettings: (s: Settings) => void;
    computedSolves: ComputedSolve[];
    selectedIds: Set<string>;
    lastClickedId: string | null;
    updateSolve: (id: string, updates: Partial<Solve>) => void;
    onRewind: () => void;
}

type CommandExecutionResult = 'close' | 'stay-open';

type CommandContext = {
	settings: Settings;
	setSettings: (s: Settings) => void;
	computedSolves: ComputedSolve[];
	selectedIds: Set<string>;
	lastClickedId: string | null;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	onOpenSettings: () => void;
	onRewind: () => void;
};

type CommandDefinition = {
	names: string[];
	getHelp: (lang: Language, languageCodes: string) => React.ReactNode;
	execute: (args: string, context: CommandContext) => CommandExecutionResult;
};

export const CommandPalette: React.FC<Props> = ({ onClose, onOpenSettings, settings, setSettings, computedSolves, selectedIds, lastClickedId, updateSolve, onRewind }) => {
	const [input, setInput] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);
	const lang = settings.language || Language.EN;
	const languageCodes = getAvailableLanguages(lang).map(option => option.code).join(', ');

	useEffect(() => {
		if (inputRef.current) inputRef.current.focus();
	}, []);

	const getTargetId = (): string | null => {
		// Priority 1: Last clicked ID if selected
		if (lastClickedId && selectedIds.has(lastClickedId)) return lastClickedId;
		// Priority 2: First solve in computedSolves (newest) that is selected.
		if (selectedIds.size > 0) {
			const match = computedSolves.find(s => selectedIds.has(s.id));
			if (match) return match.id;
		}
		// Priority 3: Last solve (newest)
		return computedSolves[0]?.id || null;
	};

	const commandContext: CommandContext = {
		settings,
		setSettings,
		computedSolves,
		selectedIds,
		lastClickedId,
		updateSolve,
		onOpenSettings,
		onRewind
	};

	const commands: CommandDefinition[] = [
		{
			names: ['lang'],
			getHelp: (language, availableLanguageCodes): React.ReactNode => <span>{t('command.help.language', language)} <b>{availableLanguageCodes}</b></span>,
			execute: (args, context): CommandExecutionResult => {
				if (isKnownLanguage(args)) {
					context.setSettings({ ...context.settings, language: args });
				}
				return 'close';
			}
		},
		{
			names: ['c', 'comment'],
			getHelp: (language): React.ReactNode => <span>{t('command.help.comment', language)} <b>text</b></span>,
			execute: (args, context): CommandExecutionResult => {
				const id = getTargetId();
				if (id) context.updateSolve(id, { comment: args });
				return 'close';
			}
		},
		{
			names: ['tag', 'tags', 't'],
			getHelp: (language): React.ReactNode => <span>{t('command.help.tags', language)} <b>tag1, tag2</b></span>,
			execute: (args, context): CommandExecutionResult => {
				const id = getTargetId();
				if (id) {
					const tags = args ? args.split(',').map(tag => tag.trim()).filter(Boolean) : [];
					context.updateSolve(id, { tags });
				}
				return 'close';
			}
		},
		{
			names: ['rewind'],
			getHelp: (language): React.ReactNode => <span>{t('command.help.rewind', language)}</span>,
			execute: (_args, context): CommandExecutionResult => {
				context.onRewind();
				return 'stay-open';
			}
		},
		{
			names: ['settings'],
			getHelp: (language): React.ReactNode => <span>{t('command.help.settings', language)}</span>,
			execute: (_args, context): CommandExecutionResult => {
				context.onOpenSettings();
				return 'stay-open';
			}
		}
	];

	const getParsedCommand = (): { command: string; args: string } => {
		const trimmed = input.trim();
		const spaceIdx = trimmed.indexOf(' ');
		const command = spaceIdx === -1 ? trimmed.toLowerCase() : trimmed.slice(0, spaceIdx).toLowerCase();
		const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
		return { command, args };
	};

	const findCommandDefinition = (command: string): CommandDefinition | undefined =>
		commands.find(definition => definition.names.includes(command));

	const execute = (): void => {
		const trimmed = input.trim();
		if (!trimmed) {
			onClose();
			return;
		}

		const { command, args } = getParsedCommand();
		const definition = findCommandDefinition(command);
		const result = definition?.execute(args, commandContext) ?? 'close';

		if (result === 'close') {
			onClose();
		}
	};

	const activeCommand = input ? findCommandDefinition(getParsedCommand().command) : undefined;

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[100] pt-[15vh]" onClick={onClose}>
			<div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={e => e.stopPropagation()}>
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={e => setInput(e.target.value)}
					onKeyDown={e => {
						if (e.key === 'Enter') {
							e.preventDefault(); execute(); 
						}
						if (e.key === 'Escape') {
							e.preventDefault(); onClose(); 
						}
					}}
					placeholder={t('command.placeholder', lang)}
					className="w-full bg-transparent p-4 text-lg text-zinc-200 outline-none placeholder:text-zinc-600 font-mono"
					autoComplete="off"
					spellCheck="false"
				/>
				{input && (
					<div className="px-4 pb-3 text-xs text-zinc-500 border-t border-zinc-800/50 pt-2 bg-zinc-900/50">
						{activeCommand ? activeCommand.getHelp(lang, languageCodes) : <span>{t('command.help.unknown', lang)}</span>}
					</div>
				)}
			</div>
		</div>
	);
};
