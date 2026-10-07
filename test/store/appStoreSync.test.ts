import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthState, SyncAction, SyncActionType } from '../../types';

const hooks = vi.hoisted(() => ({ effects: [] as Array<() => void | (() => void)> }));
vi.mock('react', () => ({
    useRef: <T>(value: T): { current: T } => ({ current: value }),
    useCallback: <T>(callback: T): T => callback,
    useEffect: (effect: () => void | (() => void)): void => { hooks.effects.push(effect); }
}));
vi.mock('../../utils/api', () => ({ api: { sync: vi.fn() } }));
vi.mock('../../utils/platformStorage', () => ({ storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } }));
import { useAppStoreSync } from '../../store/appStoreEffects';
import { api, SyncResponse } from '../../utils/api';
import { DEFAULT_SETTINGS } from '../../store/defaults';
import { storage } from '../../utils/platformStorage';

const action = (id: string): SyncAction => ({
    opId: id, timestamp: 1, type: SyncActionType.ADD_SOLVE_ATOMIC,
    payload: { solve: { id, timestamp: 1, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: 'NONE', comment: 'x'.repeat(410000) }, sessionIds: [] }
});
const response: SyncResponse = { success: true, syncedAt: 100, data: { sessions: [], solves: {}, settings: DEFAULT_SETTINGS, statsConfig: [], goals: [], plugins: [], currentSessionId: 'default', updatedAt: 100 } };
let cleanup: Array<() => void> = [];

const mountSync = (initial: SyncAction[] = []): {
    enqueue: ReturnType<typeof useAppStoreSync>;
    pending: () => SyncAction[];
    auth: () => AuthState;
    setSolves: ReturnType<typeof vi.fn>;
} => {
    let pending = initial;
    let auth: AuthState = { token: 'token', user: null, isSynced: false, lastSyncTime: 0 };
    const setSolves = vi.fn();
    const enqueue = useAppStoreSync({
        stateLoaded: true, auth, actionQueue: initial,
        setAuth: (update) => { auth = typeof update === 'function' ? update(auth) : update; },
        setActionQueue: (update) => { pending = typeof update === 'function' ? update(pending) : update; },
        setSessions: vi.fn(), setSolves, setSettings: vi.fn(), setStatsConfig: vi.fn(),
        setGoals: vi.fn(), setPlugins: vi.fn(), setCurrentSessionId: vi.fn()
    });
    for (const effect of hooks.effects.splice(0)) {
        const dispose = effect();
        if (dispose) cleanup.push(dispose);
    }
    return { enqueue, pending: () => pending, auth: () => auth, setSolves };
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
    for (const dispose of cleanup) dispose();
    cleanup = [];
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('live sync hook with failed queue persistence', () => {
    it('retries a failed request, uploads every batch despite failed saves, and does not restore stale acknowledged operations', async () => {
        const initial = [action('old-a'), action('old-b')];
        let disk = JSON.stringify(initial);
        vi.mocked(storage.getItem).mockImplementation(key => key === 'cmostimer_sync_queue' ? disk : null);
        vi.mocked(storage.setItem).mockImplementation((key, value) => {
            if (key !== 'cmostimer_sync_queue') return true;
            if (value.length > 900000) return false;
            disk = value;
            return true;
        });
        vi.mocked(api.sync).mockRejectedValueOnce(new Error('network unavailable')).mockImplementation(async (_token, _actions, _timestamp, includeData) => includeData ? response : { success: true, syncedAt: 100 });
        const sync = mountSync(initial);
        sync.enqueue([action('new-a'), action('new-b')]);
        expect(sync.pending()).toHaveLength(4);
        expect(JSON.parse(disk)).toHaveLength(2);
        await vi.advanceTimersByTimeAsync(500);
        expect(sync.pending()).toHaveLength(4);
        expect(sync.setSolves).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1000);
        expect(sync.pending()).toHaveLength(3);
        expect(JSON.parse(disk)).toHaveLength(2); // Still the older queue.
        await vi.advanceTimersByTimeAsync(300);
        expect(api.sync).toHaveBeenCalledTimes(5); // One failure, then four acknowledged batches.
        const uploaded = vi.mocked(api.sync).mock.calls.map(call => (call[1][0].payload as { solve: { id: string } }).solve.id);
        expect(uploaded).toEqual(['old-a', 'old-a', 'old-b', 'new-a', 'new-b']);
        expect(vi.mocked(api.sync).mock.calls.map(call => call[3])).toEqual([false, false, false, false, true]);
        expect(sync.pending()).toEqual([]);
        expect(JSON.parse(disk)).toEqual([]);
        expect(sync.auth().isSynced).toBe(true);
        expect(sync.setSolves).toHaveBeenCalledTimes(1); // Remote state applies only after all uploads.
    });

    it('finishes uploading even when every queue write fails', async () => {
        vi.mocked(storage.getItem).mockReturnValue(null);
        vi.mocked(storage.setItem).mockReturnValue(false);
        vi.mocked(api.sync).mockImplementation(async (_token, _actions, _timestamp, includeData) => includeData ? response : { success: true, syncedAt: 100 });
        const sync = mountSync();
        sync.enqueue([action('first'), action('second')]);
        await vi.advanceTimersByTimeAsync(600);
        expect(api.sync).toHaveBeenCalledTimes(2);
        expect(vi.mocked(api.sync).mock.calls.map(call => call[3])).toEqual([false, true]);
        expect(sync.pending()).toEqual([]);
        expect(sync.auth().isSynced).toBe(true);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('sync will keep retrying'));
        expect(vi.mocked(console.error).mock.calls.every(call => call.length === 1)).toBe(true);
    });
    it('fetches a missing final snapshot before declaring sync complete', async () => {
        vi.mocked(storage.getItem).mockReturnValue(null);
        vi.mocked(storage.setItem).mockReturnValue(true);
        vi.mocked(api.sync).mockResolvedValueOnce({ success: true, syncedAt: 100 }).mockResolvedValue(response);
        const sync = mountSync();
        sync.enqueue(action('last'));
        await vi.advanceTimersByTimeAsync(500);
        expect(sync.pending()).toEqual([]);
        expect(sync.auth().isSynced).toBe(false);
        expect(sync.setSolves).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(100);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 0, true);
        expect(sync.auth().isSynced).toBe(true);
        expect(sync.setSolves).toHaveBeenCalledTimes(1);
    });

    it('does not apply a final-batch snapshot if another solve was queued during the request', async () => {
        vi.mocked(storage.getItem).mockReturnValue(null);
        vi.mocked(storage.setItem).mockReturnValue(true);
        let reply!: (result: SyncResponse) => void;
        vi.mocked(api.sync).mockImplementationOnce(() => new Promise(resolve => { reply = resolve; })).mockResolvedValue(response);
        const sync = mountSync();
        sync.enqueue(action('first'));
        await vi.advanceTimersByTimeAsync(500);
        sync.enqueue(action('second'));
        reply(response);
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.pending()).toHaveLength(1);
        expect(sync.setSolves).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(100);
        expect(sync.pending()).toEqual([]);
        expect(sync.setSolves).toHaveBeenCalledTimes(1);
        expect(sync.auth().isSynced).toBe(true);
    });

});
