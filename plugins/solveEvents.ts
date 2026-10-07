import { getSolveEventAppends } from '../store/solveAppends';
import { Session, Solve, SolveMap } from '../types';

type EventSolve = Solve & { sessionIds: string[] };
export type SolveChanges = { added: EventSolve[]; updated: EventSolve[]; deletedSolveIds: string[]; deleted: { solveIds: string[]; sessionIds: string[] }[]; sessionIds: string[] };

const membershipIndex = (sessions: Session[]): Map<string, string[]> => {
    const index = new Map<string, string[]>();
    for (const session of sessions) {
        for (const id of new Set(session.solveIds)) {
            const memberships = index.get(id);
            if (memberships) memberships.push(session.id);
            else index.set(id, [session.id]);
        }
    }
    return index;
};

// Ignore empty sessions and metadata when checking whether solve membership changed.
const sameMembership = (previous: Session[], current: Session[]): boolean => {
    const before = previous.filter(session => session.solveIds.length);
    const after = current.filter(session => session.solveIds.length);
    return before.length === after.length && before.every((session, index) =>
        session.id === after[index].id && session.solveIds === after[index].solveIds);
};

export const diffPluginSolves = (previous: SolveMap, current: SolveMap, previousSessions: Session[], sessions: Session[]): SolveChanges => {
    const changes: SolveChanges = { added: [], updated: [], deletedSolveIds: [], deleted: [], sessionIds: [] };
    const appends = getSolveEventAppends(previous, current, previousSessions, sessions);
    if (appends) {
        changes.added = appends.map(({ solve, sessionIds }) => ({ ...solve, sessionIds }));
        changes.sessionIds = [...new Set(appends.flatMap(append => append.sessionIds))];
        return changes;
    }
    const unchangedMembership = sameMembership(previousSessions, sessions);
    if (previous === current && unchangedMembership) return changes;
    const before = membershipIndex(previousSessions);
    const after = unchangedMembership ? before : membershipIndex(sessions);
    const affectedSessions = new Set<string>();
    const ids = new Set([...Object.keys(previous), ...Object.keys(current)]);
    for (const id of ids) {
        const oldSolve = previous[id];
        const solve = current[id];
        const oldMembership = before.get(id) || [];
        const membership = after.get(id) || [];
        if (!oldSolve && solve) {
            changes.added.push({ ...solve, sessionIds: membership });
        } else if (oldSolve && !solve) {
            changes.deletedSolveIds.push(id);
            changes.deleted.push({ solveIds: [id], sessionIds: [...new Set([...oldMembership, ...membership])] });
        } else if (solve && (
            (oldSolve !== solve && JSON.stringify(oldSolve) !== JSON.stringify(solve)) ||
            (!unchangedMembership && (oldMembership.length !== membership.length || oldMembership.some((sessionId, index) => sessionId !== membership[index])))
        )) {
            changes.updated.push({ ...solve, sessionIds: membership });
        } else continue;
        // Removed memberships matter to consumers as well as current ones.
        for (const sessionId of [...oldMembership, ...membership]) affectedSessions.add(sessionId);
    }
    changes.sessionIds = [...affectedSessions];
    return changes;
};
