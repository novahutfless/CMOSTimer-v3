import { VirtualPuzzleKey, VirtualPuzzleKeymap, VirtualPuzzleKeymaps } from '../types';

export type VirtualControl = {
	command: string;
	label: string;
	binding: string;
	group: 'turns' | 'wide' | 'slices' | 'rotations';
};

const cubeControls: VirtualControl[] = [
	{ command: 'U', label: 'U', binding: 'KeyJ', group: 'turns' },
	{ command: "U'", label: "U′", binding: 'KeyF', group: 'turns' },
	{ command: 'R', label: 'R', binding: 'KeyI', group: 'turns' },
	{ command: "R'", label: "R′", binding: 'KeyK', group: 'turns' },
	{ command: 'L', label: 'L', binding: 'KeyD', group: 'turns' },
	{ command: "L'", label: "L′", binding: 'KeyE', group: 'turns' },
	{ command: 'F', label: 'F', binding: 'KeyH', group: 'turns' },
	{ command: "F'", label: "F′", binding: 'KeyG', group: 'turns' },
	{ command: 'D', label: 'D', binding: 'KeyS', group: 'turns' },
	{ command: "D'", label: "D′", binding: 'KeyL', group: 'turns' },
	{ command: 'B', label: 'B', binding: 'KeyW', group: 'turns' },
	{ command: "B'", label: "B′", binding: 'KeyO', group: 'turns' },
	{ command: 'Rw', label: 'Rw', binding: 'KeyU', group: 'wide' },
	{ command: "Rw'", label: "Rw′", binding: 'KeyM', group: 'wide' },
	{ command: "Lw'", label: "Lw′", binding: 'KeyR', group: 'wide' },
	{ command: 'Lw', label: 'Lw', binding: 'KeyV', group: 'wide' },
	{ command: "Uw'", label: "Uw′", binding: 'KeyC', group: 'wide' },
	{ command: 'Uw', label: 'Uw', binding: 'Comma', group: 'wide' },
	{ command: "Dw'", label: "Dw′", binding: 'Slash', group: 'wide' },
	{ command: 'M', label: 'M', binding: 'Digit5', group: 'slices' },
	{ command: "M'", label: "M′", binding: 'Period', group: 'slices' },
	{ command: "S'", label: "S′", binding: 'Digit1', group: 'slices' },
	{ command: 'S', label: 'S', binding: 'Digit0', group: 'slices' },
	{ command: 'E', label: 'E', binding: 'Digit2', group: 'slices' },
	{ command: "E'", label: "E′", binding: 'Digit9', group: 'slices' },
	{ command: 'x', label: 'x', binding: 'ArrowUp', group: 'rotations' },
	{ command: "x'", label: "x′", binding: 'ArrowDown', group: 'rotations' },
	{ command: 'y', label: 'y', binding: 'ArrowRight', group: 'rotations' },
	{ command: "y'", label: "y′", binding: 'ArrowLeft', group: 'rotations' },
	{ command: 'z', label: 'z', binding: 'KeyP', group: 'rotations' },
	{ command: "z'", label: "z′", binding: 'KeyQ', group: 'rotations' },
];

const simpleTurns: VirtualControl[] = [
	{ command: 'U', label: 'U', binding: 'KeyJ', group: 'turns' },
	{ command: "U'", label: "U′", binding: 'KeyF', group: 'turns' },
	{ command: 'R', label: 'R', binding: 'KeyI', group: 'turns' },
	{ command: "R'", label: "R′", binding: 'KeyK', group: 'turns' },
	{ command: 'L', label: 'L', binding: 'KeyD', group: 'turns' },
	{ command: "L'", label: "L′", binding: 'KeyE', group: 'turns' },
	{ command: 'B', label: 'B', binding: 'KeyW', group: 'turns' },
	{ command: "B'", label: "B′", binding: 'KeyO', group: 'turns' },
];

const inspectionRotations: VirtualControl[] = [
	{ command: '@x', label: 'x', binding: 'ArrowUp', group: 'rotations' },
	{ command: "@x'", label: "x′", binding: 'ArrowDown', group: 'rotations' },
	{ command: '@y', label: 'y', binding: 'ArrowRight', group: 'rotations' },
	{ command: "@y'", label: "y′", binding: 'ArrowLeft', group: 'rotations' },
	{ command: '@z', label: 'z', binding: 'KeyP', group: 'rotations' },
	{ command: "@z'", label: "z′", binding: 'KeyQ', group: 'rotations' },
];

export const VIRTUAL_CONTROLS: Record<VirtualPuzzleKey, VirtualControl[]> = {
	cube: cubeControls,
	pyraminx: [...simpleTurns, ...inspectionRotations],
	skewb: [...simpleTurns, ...inspectionRotations],
};

export const DEFAULT_VIRTUAL_PUZZLE_KEYMAPS: VirtualPuzzleKeymaps = Object.fromEntries(
	(Object.keys(VIRTUAL_CONTROLS) as VirtualPuzzleKey[]).map(puzzle => [
		puzzle,
		Object.fromEntries(VIRTUAL_CONTROLS[puzzle].map(control => [control.command, control.binding]))
	])
) as VirtualPuzzleKeymaps;

export const getVirtualPuzzleKeymap = (keymaps: VirtualPuzzleKeymaps | undefined, puzzle: VirtualPuzzleKey): VirtualPuzzleKeymap => ({
	...DEFAULT_VIRTUAL_PUZZLE_KEYMAPS[puzzle],
	...(keymaps?.[puzzle] || {})
});

export const bindingFromKeyboardEvent = (event: Pick<KeyboardEvent, 'code' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>): string => {
	const modifiers = [event.ctrlKey && 'Ctrl', event.altKey && 'Alt', event.shiftKey && 'Shift', event.metaKey && 'Meta'].filter(Boolean);
	return [...modifiers, event.code].join('+');
};

export const resolveVirtualCommand = (
	event: Pick<KeyboardEvent, 'code' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'>,
	keymap: VirtualPuzzleKeymap
): { command: string; shifted: boolean } | null => {
	const exact = bindingFromKeyboardEvent(event);
	const exactCommand = Object.entries(keymap).find(([, binding]) => binding === exact)?.[0];
	if (exactCommand) return { command: exactCommand, shifted: false };
	if (event.ctrlKey || event.altKey || event.metaKey) return null;

	const baseCommand = Object.entries(keymap).find(([, binding]) => binding === event.code)?.[0];
	return baseCommand ? { command: baseCommand, shifted: event.shiftKey } : null;
};

export const formatVirtualBinding = (binding: string | null | undefined): string => {
	if (!binding) return '—';
	return binding
		.replace('Key', '')
		.replace('Digit', '')
		.replace('Arrow', '←↑→↓ ')
		.replace('←↑→↓ Left', '←')
		.replace('←↑→↓ Right', '→')
		.replace('←↑→↓ Up', '↑')
		.replace('←↑→↓ Down', '↓')
		.replace('Comma', ',')
		.replace('Period', '.')
		.replace('Slash', '/');
};
