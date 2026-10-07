import { describe, expect, it } from 'vitest';
import { getPluginPuzzleMoveTable, PluginPuzzleKind } from '../../utils/puzzles/pluginMoveTables';
import { NxNPuzzle } from '../../utils/puzzles/nxn';
import { SkewbPuzzle } from '../../utils/puzzles/skewb';
import { PyraminxPuzzle } from '../../utils/puzzles/pyraminx';

const kinds: PluginPuzzleKind[] = ['222', 'skewb', 'pyram', '444', '555'];

describe('plugin puzzle move tables', () => {
	it.each(kinds)('%s permutations match the timer puzzle model', kind => {
		const table = getPluginPuzzleMoveTable(kind);
		const size = kind === '222' ? 2 : kind === '444' ? 4 : kind === '555' ? 5 : 0;
		for (let moveIndex = 0; moveIndex < table.moves.length; moveIndex++) {
			const permutation = table.permutations[moveIndex];
			expect(new Set(permutation).size).toBe(table.solved.length);
			const byTable = permutation.map(index => table.solved[index]);
			const state = size ? NxNPuzzle.getInitialState(size) : kind === 'skewb' ? SkewbPuzzle.getInitialState() : PyraminxPuzzle.getInitialState();
			if (size) NxNPuzzle.applyMove(state as ReturnType<typeof NxNPuzzle.getInitialState>, table.moves[moveIndex], size);
			else if (kind === 'skewb') SkewbPuzzle.applyMove(state as ReturnType<typeof SkewbPuzzle.getInitialState>, table.moves[moveIndex]);
			else PyraminxPuzzle.applyMove(state as ReturnType<typeof PyraminxPuzzle.getInitialState>, table.moves[moveIndex]);
			const actual = table.faces.flatMap(face => (state as Record<string, string[] | string[][]>)[face].flat());
			expect(byTable).toEqual(actual);
		}
	});
});
