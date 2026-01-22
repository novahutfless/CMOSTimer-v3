

import React from 'react';
import { Settings, ShortcutAction, Language } from '../../types';
import { t } from '../../translations';
import { Keyboard } from 'lucide-react';

interface Props { 
    settings: Settings; 
    update: (k: keyof Settings, v: any) => void; 
}

export const ShortcutSettings: React.FC<Props> = ({ settings, update }) => {
	const lang = settings.language || Language.EN;
	const shortcuts = settings.shortcuts || {};

	const handleKeyDown = (e: React.KeyboardEvent, action: ShortcutAction) => {
		e.preventDefault();
		e.stopPropagation();
        
		const code = e.code;
		if (code === 'Escape') return; // Don't bind escape via this input usually

		let binding = code;
		if (e.ctrlKey) binding = `Ctrl+${code}`;
		if (e.shiftKey) binding = `Shift+${code}`;
        
		// Check conflicts
		const existing = Object.entries(shortcuts).find(([act, bind]) => bind === binding && act !== action);
		if (existing) {
			alert(t('shortcut.conflict', lang) + ` (${t(`shortcut.${existing[0]}`, lang)})`);
			return;
		}

		const newShortcuts = { ...shortcuts, [action]: binding };
		update('shortcuts', newShortcuts);
	};

	const clear = (action: ShortcutAction) => {
		const newShortcuts = { ...shortcuts, [action]: null };
		update('shortcuts', newShortcuts);
	};

	const actions = [
		ShortcutAction.NEXT_SCRAMBLE,
		ShortcutAction.PREV_SCRAMBLE,
		ShortcutAction.PREV_PUZZLE,
		ShortcutAction.NEXT_PUZZLE,
		ShortcutAction.PENALTY_PLUS_TWO,
		ShortcutAction.PENALTY_DNF,
		ShortcutAction.DELETE_LAST,
		ShortcutAction.SELECT_FIRST,
		ShortcutAction.OPEN_DETAILS,
		ShortcutAction.ESCAPE,
		ShortcutAction.MOVE_SELECTION_UP,
		ShortcutAction.MOVE_SELECTION_DOWN,
		ShortcutAction.OPEN_SESSION_MANAGER,
		ShortcutAction.MANUAL_ENTRY,
		ShortcutAction.OPEN_COMMAND_PALETTE
	];

	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-zinc-400 mb-4">
				<Keyboard size={16} />
				<span className="text-sm font-bold uppercase">{t('shortcut.title', lang)}</span>
			</div>

			<div className="grid grid-cols-1 gap-2">
				{actions.map(action => (
					<div key={action} className="flex items-center justify-between bg-zinc-950 p-2 rounded border border-zinc-800">
						<span className="text-sm text-zinc-300">{t(`shortcut.${action}`, lang)}</span>
						<div className="flex items-center gap-2">
							<div className="relative">
								<input 
									type="text"
									value={shortcuts[action] || t('shortcut.none', lang)}
									readOnly
									onKeyDown={(e) => handleKeyDown(e, action)}
									className="w-32 bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded px-2 py-1 text-center cursor-pointer focus:border-blue-500 outline-none"
								/>
							</div>
							<button onClick={() => clear(action)} className="text-zinc-600 hover:text-red-400 text-xs">{t('shortcut.clear', lang)}</button>
						</div>
					</div>
				))}
			</div>
			<p className="text-xs text-zinc-500 mt-4">{t('shortcut.instruction', lang)}</p>
		</div>
	);
};
