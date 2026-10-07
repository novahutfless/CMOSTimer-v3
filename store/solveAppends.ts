import { Session, Solve, SolveMap } from '../types';
export type SolveAppend = { solve: Solve; sessionIds: string[] };
const solveAppends = new WeakMap<SolveMap, { previous: WeakRef<SolveMap>; append: SolveAppend }>();
const sessionAppends = new WeakMap<Session[], { previous: WeakRef<Session[]>; solveId: string }>();

export const appendSolveState = (previous: SolveMap, solve: Solve, sessionIds: string[]): SolveMap => {
    const next = { ...previous, [solve.id]: solve };
    if (!previous[solve.id]) solveAppends.set(next, { previous: new WeakRef(previous), append: { solve, sessionIds } });
    return next;
};
export const recordSessionAppend = (previous: Session[], next: Session[], solveId: string): void => {
    sessionAppends.set(next, { previous: new WeakRef(previous), solveId });
};
export const getSolveAppends = (previous: SolveMap, current: SolveMap): SolveAppend[] | null => {
    const result: SolveAppend[] = [];
    while (current !== previous) {
        const change = solveAppends.get(current);
        if (!change) return null;
        result.push(change.append);
        const prior = change.previous.deref();
        if (!prior) return null;
        current = prior;
    }
    return result.reverse();
};
export const getSolveEventAppends = (previous: SolveMap, current: SolveMap, oldSessions: Session[], sessions: Session[]): SolveAppend[] | null => {
    const appends = getSolveAppends(previous, current);
    if (!appends || !appends.length) return null;
    for (let index = appends.length - 1; index >= 0; index--) {
        const change = sessionAppends.get(sessions);
        if (!change || change.solveId !== appends[index].solve.id) return null;
        const prior = change.previous.deref();
        if (!prior) return null;
        sessions = prior;
    }
    return sessions === oldSessions ? appends : null;
};
