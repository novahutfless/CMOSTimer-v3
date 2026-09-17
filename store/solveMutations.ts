import { Session, Solve, SolveMap } from '../types';
import { insertSolveIdChronologically, sortSolveIdsChronologically } from './solveOrder';

export const addSolveToSessionMembership = (sessions: Session[], currentSessionId: string, solve: Solve, solves: SolveMap): { sessions: Session[]; sessionIds: string[] } => {
	const sessionIds = sessions.filter(session => session.id === currentSessionId || session.sourceSessionIds?.includes(currentSessionId)).map(session => session.id);
	return {
		sessionIds,
		sessions: sessions.map(session => sessionIds.includes(session.id)
			? { ...session, solveIds: insertSolveIdChronologically(session.solveIds, solve.id, { ...solves, [solve.id]: solve }) }
			: session)
	};
};

export const removeSolvesFromSessions = (sessions: Session[], ids: string[], sessionId?: string): { sessions: Session[]; affectedSessionIds: string[] } => {
	const idSet = new Set(ids);
	const affectedSessionIds: string[] = [];
	const next = sessions.map(session => {
		if (sessionId && session.id !== sessionId) return session;
		if (!session.solveIds.some(id => idSet.has(id))) return session;
		affectedSessionIds.push(session.id);
		return { ...session, solveIds: session.solveIds.filter(id => !idSet.has(id)) };
	});
	return { sessions: next, affectedSessionIds };
};

export const moveSolveMembership = (sessions: Session[], solves: SolveMap, sourceId: string, targetId: string, solveIds: string[]): Session[] | null => {
	if (sourceId === targetId || solveIds.length === 0) return null;
	const source = sessions.find(session => session.id === sourceId);
	const target = sessions.find(session => session.id === targetId);
	if (!source || !target) return null;
	const idSet = new Set(solveIds);
	return sessions.map(session => {
		if (session.id === sourceId) return { ...source, solveIds: source.solveIds.filter(id => !idSet.has(id)) };
		if (session.id === targetId) return { ...target, solveIds: sortSolveIdsChronologically([...target.solveIds, ...solveIds], solves) };
		return session;
	});
};

export const duplicateSolveMembership = (sessions: Session[], solves: SolveMap, targetId: string, solveIds: string[]): Session[] | null => {
	if (solveIds.length === 0) return null;
	const target = sessions.find(session => session.id === targetId);
	if (!target) return null;
	return sessions.map(session => session.id === targetId
		? { ...target, solveIds: sortSolveIdsChronologically([...target.solveIds, ...solveIds], solves) }
		: session);
};
