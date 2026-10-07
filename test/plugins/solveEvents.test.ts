import { appendSolveState } from '../../store/solveAppends';
import { addSolveToSessionMembership } from '../../store/solveMutations';
import { describe, expect, it, vi } from 'vitest';
import { diffPluginSolves } from '../../plugins/solveEvents';
import { Penalty, Session, Solve, SolveMap } from '../../types';
const solve = (id: string): Solve => ({ id, timestamp: 1, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE });
const session = (id: string, solveIds: string[]): Session => ({ id, name: id, solveIds, scramblerId: ['333'] });
describe('plugin solve change detection', () => {
    it('indexes additions and deletions including shared session membership', () => {
        const a = solve('a'), b = solve('b');
        const changes = diffPluginSolves({ a }, { b }, [session('old', ['a'])], [session('one', ['b']), session('two', ['b', 'b'])]);
        expect(changes.added).toEqual([{ ...b, sessionIds: ['one', 'two'] }]);
        expect(changes.deleted).toEqual([{ solveIds: ['a'], sessionIds: ['old'] }]);
        expect(changes.deletedSolveIds).toEqual(['a']);
        expect(new Set(changes.sessionIds)).toEqual(new Set(['old', 'one', 'two']));
    });
    it('reports edited solves and membership changes, but ignores equal remote copies and session metadata', () => {
        const a = solve('a'), b = solve('b');
        const previous = [session('one', ['a', 'b'])];
        const current = [session('one', ['a']), session('two', ['b'])];
        const changes = diffPluginSolves({ a, b }, { a: { ...a, time: 2000 }, b }, previous, current);
        expect(changes.updated).toEqual([{ ...a, time: 2000, sessionIds: ['one'] }, { ...b, sessionIds: ['two'] }]);
        expect(diffPluginSolves({ a }, { a: { ...a } }, [session('one', ['a'])], [session('one', ['a'])]).updated).toEqual([]);
        expect(diffPluginSolves({ a, b }, { a, b }, previous, [{ ...previous[0], name: 'Renamed' }]).updated).toEqual([]);
    });
    it('does no per-solve comparisons when deleting an empty session alongside 150,000 solves', () => {
        const solves: SolveMap = {};
        const ids = Array.from({ length: 150000 }, (_, index) => String(index));
        for (const id of ids) solves[id] = solve(id);
        const full = session('full', ids), empty = session('empty', []);
        const stringify = vi.spyOn(JSON, 'stringify');
        try {
            const changes = diffPluginSolves(solves, solves, [full, empty], [full]);
            expect(changes.added).toEqual([]);
            expect(changes.updated).toEqual([]);
            expect(changes.deletedSolveIds).toEqual([]);
            expect(stringify).not.toHaveBeenCalled();
        } finally { stringify.mockRestore(); }
    });
    it('emits only the recorded append without scanning historical solves or memberships', () => {
        const previous = { a: solve('a') };
        const sessions = [session('one', ['a']), { ...session('linked', ['a']), sourceSessionIds: ['one'] }];
        const added = solve('b');
        const membership = addSolveToSessionMembership(sessions, 'one', added, previous);
        const current = appendSolveState(previous, added, membership.sessionIds);
        const keys = vi.spyOn(Object, 'keys');
        const stringify = vi.spyOn(JSON, 'stringify');
        try {
            const changes = diffPluginSolves(previous, current, sessions, membership.sessions);
            expect(changes.added).toEqual([{ ...added, sessionIds: ['one', 'linked'] }]);
            expect(changes.updated).toEqual([]);
            expect(keys).not.toHaveBeenCalled();
            expect(stringify).not.toHaveBeenCalled();
        } finally { keys.mockRestore(); stringify.mockRestore(); }
    });

});
