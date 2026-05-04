import React, { useState, useEffect, useRef } from 'react';
import { Settings, Language, ComputedSolve, Solve } from '../types';

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

export const CommandPalette: React.FC<Props> = ({ onClose, onOpenSettings, settings, setSettings, computedSolves, selectedIds, lastClickedId, updateSolve, onRewind }) => {
	const [input, setInput] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (inputRef.current) inputRef.current.focus();
	}, []);

	const getTargetId = (): string | null => {
		// Priority 1: Last clicked ID if selected
		if (lastClickedId && selectedIds.has(lastClickedId)) return lastClickedId;
		// Priority 2: First selected ID found in the list (preserves visual order logic if needed, but random from Set is flaky)
		// Let's find the first solve in computedSolves (newest) that is selected.
		if (selectedIds.size > 0) {
			const match = computedSolves.find(s => selectedIds.has(s.id));
			if (match) return match.id;
		}
		// Priority 3: Last solve (newest)
		return computedSolves[0]?.id;
	};

	const execute = (): void => {
		const trimmed = input.trim();
		if (!trimmed) {
			onClose();
			return;
		}

		const spaceIdx = trimmed.indexOf(' ');
		const cmd = spaceIdx === -1 ? trimmed.toLowerCase() : trimmed.slice(0, spaceIdx).toLowerCase();
		const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();

		if (cmd === 'lang') {
			if (args === 'de') setSettings({ ...settings, language: Language.DE });
			else if (args === 'en') setSettings({ ...settings, language: Language.EN });
		} else if (cmd === 'c' || cmd === 'comment') {
			const id = getTargetId();
			if (id) updateSolve(id, { comment: args });
		} else if (cmd === 'tag' || cmd === 'tags') {
			const id = getTargetId();
			if (id) {
				const tags = args ? args.split(',').map(t => t.trim()).filter(t => t) : [];
				updateSolve(id, { tags });
			}
		} else if (cmd === 'rewind') {
			onRewind();
			return; // Don't close, let the modal switch happen
		} else if (cmd === 'settings') {
			onOpenSettings();
			return; // Don't close, let the modal switch happen
		}

		onClose();
	};

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
					placeholder="> Type command (lang, c, tag, rewind, settings)..."
					className="w-full bg-transparent p-4 text-lg text-zinc-200 outline-none placeholder:text-zinc-600 font-mono"
					autoComplete="off"
					spellCheck="false"
				/>
				{input && (
					<div className="px-4 pb-3 text-xs text-zinc-500 border-t border-zinc-800/50 pt-2 bg-zinc-900/50">
						{input.startsWith('lang') && <span>Set language: <b>de</b>, <b>en</b></span>}
						{(input.startsWith('c ') || input === 'c') && <span>Set comment: <b>text</b></span>}
						{(input.startsWith('tag') || input.startsWith('t ')) && <span>Set tags: <b>tag1, tag2</b></span>}
						{input.startsWith('rewind') && <span>Show Year in Review</span>}
						{input.startsWith('settings') && <span>Open Settings</span>}
						{!input.startsWith('lang') && !input.startsWith('c') && !input.startsWith('tag') && !input.startsWith('t') && !input.startsWith('rewind') && !input.startsWith('settings') && <span>Unknown command</span>}
					</div>
				)}
			</div>
		</div>
	);
};
