import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { getPluginPuzzleMoveTable, PluginPuzzleKind } from '../../utils/puzzles/pluginMoveTables';

type Active = { index: number; moves: string[]; scramblerId: string; visualizerType: string };
const source = readFileSync(new URL('../../../official-plugins/scramble-analysis/plugin.js', import.meta.url), 'utf8');

describe('official scramble analysis puzzle targets', () => {
	it('uses the active relay puzzle and verifies solutions with timer move tables', async () => {
		let active: Active = { index: 0, moves: ['R', 'U'], scramblerId: '222', visualizerType: '2x2' };
		let widget: { render: () => { children: Array<Record<string, unknown>> }; action: (action: string, payload?: unknown) => Promise<void> } | undefined;
		const listeners = new Map<string, (value: Active) => void>();
		const cmos = {
			registerWidget: (_id: string, _name: string, render: () => { children: Array<Record<string, unknown>> }, action: (action: string, payload?: unknown) => Promise<void>) => { widget = { render, action }; },
			on: (name: string, listener: (value: Active) => void) => { listeners.set(name, listener); },
			refreshWidget: async () => undefined,
			getActiveScramble: async () => active,
			getPuzzleMoveTable: async (kind: PluginPuzzleKind) => getPluginPuzzleMoveTable(kind),
			storage: { get: async () => undefined, set: async () => undefined }
		};
		const context = vm.createContext({ cmos, setTimeout, Uint8Array, Int8Array, Set, Map, Math, Promise });
		const inspect = vm.runInContext(`${source}\n({ getResults: () => results, reduceModel, puzzleState, targetMismatch })`, context) as {
			getResults: () => Array<{ target: string; moves: string }>;
			reduceModel: (model: ReturnType<typeof getPluginPuzzleMoveTable>) => unknown;
			puzzleState: (model: unknown, moves: string[]) => Uint8Array;
			targetMismatch: (state: Uint8Array, model: unknown, target: string) => number;
		};
		const pyraminxModel = inspect.reduceModel(getPluginPuzzleMoveTable('pyram'));
		const pyraminxSolved = inspect.puzzleState(pyraminxModel, []);
		for (const index of [9 + 5, 18 + 7]) {
			const edgeStickerChanged = pyraminxSolved.slice();
			edgeStickerChanged[index] = edgeStickerChanged[27];
			expect(inspect.targetMismatch(edgeStickerChanged, pyraminxModel, 'v')).toBeGreaterThan(0);
		}
		const cases: Array<[Active, PluginPuzzleKind, string]> = [
			[{ index: 0, moves: ['R', 'U'], scramblerId: '222', visualizerType: '2x2' }, '222', 'face'],
			[{ index: 1, moves: ['R', 'U'], scramblerId: 'skewb', visualizerType: 'Skewb' }, 'skewb', 'layer'],
			[{ index: 2, moves: ['U', 'L'], scramblerId: 'pyram', visualizerType: 'Pyraminx' }, 'pyram', 'v'],
			[{ index: 3, moves: ['Rw', 'U'], scramblerId: '444', visualizerType: '4x4' }, '444', 'center'],
			[{ index: 4, moves: ['Rw', 'U'], scramblerId: '555', visualizerType: '5x5' }, '555', 'center']
		];
		for (const [selection, kind, target] of cases) {
			active = selection;
			listeners.get('activeScrambleChanged')?.(active);
			await widget!.action('analyze');
			const matches = inspect.getResults().filter(item => item.target.toLowerCase().includes(target.toLowerCase()));
			expect(matches.length, `${kind} ${target}`).toBeGreaterThan(0);
			const model = inspect.reduceModel(getPluginPuzzleMoveTable(kind));
			const moves = matches[0].moves === '(already solved)' ? [] : matches[0].moves.split(' ');
			const finalState = inspect.puzzleState(model, selection.moves.concat(moves));
			expect(inspect.targetMismatch(finalState, model, target), `${kind} ${target}`).toBe(0);
			if (kind === '222') {
				active = { ...selection, index: 1 };
				listeners.get('activeScrambleChanged')?.(active);
				expect(inspect.getResults()).toHaveLength(0);
				await widget!.action('puzzle-target:222:layer', false);
				await widget!.action('analyze');
				expect(inspect.getResults().every(item => item.target === '2×2 face')).toBe(true);
			}
		}
		for (const [kind, visualizerType, scramble] of [
			['444', '4x4', "Rw U Fw' R D2 Uw B Lw' F2 Rw U' Bw D L2 Fw U2 Rw' B Uw2 F"],
			['555', '5x5', "Rw U Fw' R D2 Uw B Lw' F2 Rw U' Bw D L2 Fw U2 Rw' B Uw2 F"]
		] as const) {
			active = { index: 5, moves: scramble.split(' '), scramblerId: kind, visualizerType };
			listeners.get('activeScrambleChanged')?.(active);
			await widget!.action('analyze');
			const targets = kind === '444' ? ['center', 'twoCenters'] : ['center'];
			const model = inspect.reduceModel(getPluginPuzzleMoveTable(kind));
			for (const target of targets) {
				const label = target === 'twoCenters' ? 'two centers' : 'center';
				const matches = inspect.getResults().filter(item => item.target.toLowerCase().includes(label) && (target === 'twoCenters' || !item.target.toLowerCase().includes('two centers')));
				expect(matches.length, `${kind} ${target}`).toBeGreaterThan(0);
				const solution = matches[0].moves === '(already solved)' ? [] : matches[0].moves.split(' ');
				expect(inspect.targetMismatch(inspect.puzzleState(model, active.moves.concat(solution)), model, target), `${kind} ${target}`).toBe(0);
				expect(solution.length, `${kind} ${target} should improve on inverse`).toBeLessThan(active.moves.length);
			}
		}
	}, 60_000);
});
