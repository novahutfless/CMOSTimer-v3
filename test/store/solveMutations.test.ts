import { describe, expect, it } from 'vitest';
import { Penalty, Session, SolveMap } from '../../types';
import { addSolveToSessionMembership, duplicateSolveMembership, moveSolveMembership, removeSolvesFromSessions } from '../../store/solveMutations';

const solves: SolveMap = {
	a: { id: 'a', timestamp: 1, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE },
	b: { id: 'b', timestamp: 2, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE }
};
const sessions: Session[] = [
	{ id: 'main', name: 'Main', scramblerId: ['333'], solveIds: ['a'], sourceSessionIds: [] },
	{ id: 'subscriber', name: 'Subscriber', scramblerId: ['333'], solveIds: ['a'], sourceSessionIds: ['main'] },
	{ id: 'other', name: 'Other', scramblerId: ['333'], solveIds: [], sourceSessionIds: [] }
];

describe('solve mutations', () => {
	it('adds a solve to the active session and subscribers in chronological order', () => {
		const result = addSolveToSessionMembership(sessions, 'main', solves.b, solves);
		expect(result.sessionIds).toEqual(['main', 'subscriber']);
		expect(result.sessions.slice(0, 2).map(session => session.solveIds)).toEqual([['a', 'b'], ['a', 'b']]);
	});

	it('removes solves globally or from one session while reporting patches', () => {
		const global = removeSolvesFromSessions(sessions, ['a']);
		expect(global.affectedSessionIds).toEqual(['main', 'subscriber']);
		expect(global.sessions.slice(0, 2).map(session => session.solveIds)).toEqual([[], []]);
		const local = removeSolvesFromSessions(sessions, ['a'], 'main');
		expect(local.sessions[0].solveIds).toEqual([]);
		expect(local.sessions[1].solveIds).toEqual(['a']);
	});

	it('moves and duplicates memberships without mutating the input', () => {
		const moved = moveSolveMembership(sessions, solves, 'main', 'other', ['a'])!;
		expect(moved.find(session => session.id === 'main')?.solveIds).toEqual([]);
		expect(moved.find(session => session.id === 'other')?.solveIds).toEqual(['a']);
		expect(duplicateSolveMembership(sessions, solves, 'other', ['a'])?.find(session => session.id === 'other')?.solveIds).toEqual(['a']);
		expect(sessions[0].solveIds).toEqual(['a']);
	});
});
