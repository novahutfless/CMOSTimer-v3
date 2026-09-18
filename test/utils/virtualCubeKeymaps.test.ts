import { describe, expect, it } from 'vitest';
import {
	bindingFromKeyboardEvent,
	DEFAULT_VIRTUAL_PUZZLE_KEYMAPS,
	getVirtualPuzzleKeymap,
	resolveVirtualCommand
} from '../../utils/virtualCubeKeymaps';
import { PyraminxPuzzle, rotatePyraminxState } from '../../utils/puzzles/pyraminx';
import { rotateSkewbState, SkewbPuzzle } from '../../utils/puzzles/skewb';

const keyboard = (code: string, shiftKey = false): Pick<KeyboardEvent, 'code' | 'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey'> =>
	({ code, shiftKey, ctrlKey: false, altKey: false, metaKey: false });

describe('virtual puzzle keymaps', () => {
	it('keeps bindings separate for each puzzle', () => {
		const cube = getVirtualPuzzleKeymap({ cube: { U: 'KeyA' } }, 'cube');
		const skewb = getVirtualPuzzleKeymap({ cube: { U: 'KeyA' } }, 'skewb');

		expect(cube.U).toBe('KeyA');
		expect(skewb.U).toBe(DEFAULT_VIRTUAL_PUZZLE_KEYMAPS.skewb?.U);
	});

	it('resolves remapped turns and shifted variants', () => {
		const keymap = { U: 'KeyA', "U'": 'KeyB' };

		expect(resolveVirtualCommand(keyboard('KeyA'), keymap)).toEqual({ command: 'U', shifted: false });
		expect(resolveVirtualCommand(keyboard('KeyA', true), keymap)).toEqual({ command: 'U', shifted: true });
	});

	it('prefers an explicit shifted binding over the base-key modifier', () => {
		const keymap = { U: 'KeyA', R: 'Shift+KeyA' };

		expect(resolveVirtualCommand(keyboard('KeyA', true), keymap)).toEqual({ command: 'R', shifted: false });
	});

	it('serializes modifier bindings in a stable order', () => {
		expect(bindingFromKeyboardEvent({ code: 'KeyR', shiftKey: true, ctrlKey: true, altKey: false, metaKey: false }))
			.toBe('Ctrl+Shift+KeyR');
	});

	it('rotates Pyraminx orientation without changing solvedness', () => {
		const state = PyraminxPuzzle.getInitialState();
		rotatePyraminxState(state, 'U', false);

		expect(Object.values(state).every(face => face.every(sticker => sticker === face[0]))).toBe(true);
		rotatePyraminxState(state, 'U', false);
		rotatePyraminxState(state, 'U', false);
		expect(state).toEqual(PyraminxPuzzle.getInitialState());
	});

	it('supports reversible whole-Skewb rotations on every axis', () => {
		(['x', 'y', 'z'] as const).forEach(axis => {
			const state = SkewbPuzzle.getInitialState();
			rotateSkewbState(state, axis, false);
			rotateSkewbState(state, axis, true);
			expect(state).toEqual(SkewbPuzzle.getInitialState());
		});
	});
});
