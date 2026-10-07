import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Penalty } from '../../types';
const hooks = vi.hoisted(() => ({ cursor: 0, refCursor: 0, refs: [] as { current: unknown }[], deps: [] as unknown[][] }));
vi.mock('react', () => ({
    useRef: (value: unknown): { current: unknown } => {
        const slot = hooks.refCursor++;
        return hooks.refs[slot] ||= { current: value };
    },
    useEffect: (effect: () => void, deps: unknown[]): void => {
        const slot = hooks.cursor++;
        const previous = hooks.deps[slot];
        hooks.deps[slot] = deps;
        if (!previous || deps.some((value, index) => !Object.is(value, previous[index]))) effect();
    }
}));
vi.mock('../../utils/platformStorage', () => ({ storage: { setItem: vi.fn(() => true) } }));
vi.mock('../../utils/solvesPersistence', () => ({ writePersistedSolves: vi.fn(async () => undefined), appendPersistedSolves: vi.fn(async () => undefined) }));
import { useAppStorePersistence } from '../../store/appStoreEffects';
import { DEFAULT_SETTINGS, DEFAULT_STATS_CONFIG } from '../../store/defaults';
import { appendSolveState } from '../../store/solveAppends';
import { appendPersistedSolves, writePersistedSolves } from '../../utils/solvesPersistence';
import { storage } from '../../utils/platformStorage';

beforeEach(() => { hooks.cursor = 0; hooks.refCursor = 0; hooks.refs = []; hooks.deps = []; vi.clearAllMocks(); });
describe('store persistence on session deletion', () => {
    it('persists session deletion without rewriting unchanged solves, then persists a subsequent solve change', () => {
        const solve = { id: 'a', timestamp: 1, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE };
        const full = { id: 'full', name: 'Full', solveIds: ['a'], scramblerId: ['333'] };
        const empty = { id: 'empty', name: 'Empty', solveIds: [], scramblerId: ['333'] };
        const state = { stateLoaded: true, sessions: [full, empty], solves: { a: solve }, currentSessionId: 'full', statsConfig: DEFAULT_STATS_CONFIG, settings: DEFAULT_SETTINGS, goals: [], plugins: [], actionQueue: [] };
        const render = (next: Parameters<typeof useAppStorePersistence>[0]): void => { hooks.cursor = 0; hooks.refCursor = 0; useAppStorePersistence(next); };
        render(state);
        expect(writePersistedSolves).toHaveBeenCalledTimes(1);
        render({ ...state, sessions: [full] });
        expect(storage.setItem).toHaveBeenCalledWith('cmostimer_sessions', JSON.stringify([full]));
        expect(writePersistedSolves).toHaveBeenCalledTimes(1);
        render({ ...state, sessions: [full], solves: { a: { ...solve, time: 2000 } } });
        expect(writePersistedSolves).toHaveBeenCalledTimes(2);
        expect(writePersistedSolves).toHaveBeenLastCalledWith(JSON.stringify({ a: { ...solve, time: 2000 } }), true);
        const edited = { a: { ...solve, time: 2000 } };
        render({ ...state, solves: edited });
        vi.clearAllMocks();
        const first = { ...solve, id: 'b' }, second = { ...solve, id: 'c' };
        const appended = appendSolveState(appendSolveState(edited, first, ['full']), second, ['full']);
        render({ ...state, solves: appended });
        expect(writePersistedSolves).not.toHaveBeenCalled();
        expect(appendPersistedSolves).toHaveBeenCalledWith([first, second]);
    });
});
