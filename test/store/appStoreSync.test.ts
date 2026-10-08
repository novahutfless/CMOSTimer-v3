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

const mountSync = (initial: SyncAction[] = [], initialSessionId = 'default'): {
    enqueue: ReturnType<typeof useAppStoreSync>;
    pending: () => SyncAction[];
    auth: () => AuthState;
    setSolves: ReturnType<typeof vi.fn>;
    selectedSession: () => string;
    selectLocally: (id: string) => void;
} => {
    let pending = initial;
    let selectedSession = initialSessionId;
    let auth: AuthState = { token: 'token', user: null, isSynced: false, lastSyncTime: 0 };
    const setSolves = vi.fn();
    const enqueue = useAppStoreSync({
        stateLoaded: true, auth, actionQueue: initial,
        setAuth: (update) => { auth = typeof update === 'function' ? update(auth) : update; },
        setActionQueue: (update) => { pending = typeof update === 'function' ? update(pending) : update; },
        setSessions: vi.fn(), setSolves, setSettings: vi.fn(), setStatsConfig: vi.fn(),
        setGoals: vi.fn(), setPlugins: vi.fn(),
        setCurrentSessionId: (update) => { selectedSession = typeof update === 'function' ? update(selectedSession) : update; }
    });
    for (const effect of hooks.effects.splice(0)) {
        const dispose = effect();
        if (dispose) cleanup.push(dispose);
    }
    return { enqueue, pending: () => pending, auth: () => auth, setSolves, selectedSession: () => selectedSession, selectLocally: id => { selectedSession = id; } };
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


describe('account session selection', () => {
    const sessionResponse = (selected: string): SyncResponse => ({
        ...response,
        data: { ...response.data!, sessions: ['first', 'five', 'last'].map(id => ({ id, name: id, scramblerId: ['333'], solveIds: [] })), currentSessionId: selected }
    });

    beforeEach(() => {
        vi.mocked(storage.getItem).mockReturnValue(null);
        vi.mocked(storage.setItem).mockReturnValue(true);
    });

    it('restores the account selection on login even when the previous local session still exists', async () => {
        vi.mocked(api.sync).mockResolvedValue(sessionResponse('last'));
        const sync = mountSync([], 'five');
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.selectedSession()).toBe('last');
        sync.selectLocally('first');
        await vi.advanceTimersByTimeAsync(30000);
        expect(sync.selectedSession()).toBe('first');
    });

    it('uploads a session switch before restoring the account snapshot', async () => {
        vi.mocked(api.sync).mockResolvedValue(sessionResponse('last'));
        const sync = mountSync([], 'five');
        sync.enqueue({ type: SyncActionType.UPDATE_CURRENT_SESSION, payload: 'last' });
        await vi.advanceTimersByTimeAsync(500);
        expect(api.sync).toHaveBeenCalledWith('token', [expect.objectContaining({ type: SyncActionType.UPDATE_CURRENT_SESSION, payload: 'last' })], 0, true);
        expect(sync.selectedSession()).toBe('last');
        expect(sync.pending()).toEqual([]);
    });

    it('falls back to a valid local selection when the saved account session was deleted', async () => {
        vi.mocked(api.sync).mockResolvedValue(sessionResponse('deleted'));
        const sync = mountSync([], 'five');
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.selectedSession()).toBe('five');
    });

    it('falls back to the first session when neither selection exists', async () => {
        vi.mocked(api.sync).mockResolvedValue(sessionResponse('deleted'));
        const sync = mountSync([], 'missing');
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.selectedSession()).toBe('first');
    });
});


describe('unchanged snapshot polling', () => {
    beforeEach(() => {
        vi.mocked(storage.getItem).mockReturnValue(null);
        vi.mocked(storage.setItem).mockReturnValue(true);
    });

    it('sends the last applied server time and accepts unchanged polls without replacing state', async () => {
        vi.mocked(api.sync).mockResolvedValueOnce(response)
            .mockResolvedValueOnce({ success: true, syncedAt: 200, notChanged: true })
            .mockResolvedValueOnce({ success: true, syncedAt: 300, notChanged: true });
        const sync = mountSync();
        await vi.advanceTimersByTimeAsync(0);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 0, true);
        await vi.advanceTimersByTimeAsync(15000);
        expect(api.sync).toHaveBeenCalledTimes(1); // No idle poll before 30 seconds.
        await vi.advanceTimersByTimeAsync(15000);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 100, true);
        expect(sync.auth().isSynced).toBe(true);
        expect(sync.setSolves).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(30000);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 200, true);
        expect(sync.auth().lastSyncTime).toBe(300);
    });

    it('does not establish a cursor from an initial unchanged response', async () => {
        vi.mocked(api.sync).mockResolvedValueOnce({ success: true, syncedAt: 200, notChanged: true }).mockResolvedValue(response);
        const sync = mountSync();
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.auth().isSynced).toBe(false);
        await vi.advanceTimersByTimeAsync(100);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 0, true);
        expect(sync.setSolves).toHaveBeenCalledTimes(1);
    });

    it('keeps the cursor after a failed poll and applies the next changed snapshot', async () => {
        vi.mocked(api.sync).mockResolvedValueOnce(response).mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ ...response, syncedAt: 300 });
        const sync = mountSync();
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(30000);
        expect(sync.auth().isSynced).toBe(false);
        await vi.advanceTimersByTimeAsync(1000);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 100, true);
        expect(sync.setSolves).toHaveBeenCalledTimes(2);
    });

    it('does not advance the snapshot cursor for acknowledgement-only upload batches', async () => {
        vi.mocked(api.sync).mockResolvedValueOnce(response)
            .mockResolvedValueOnce({ success: true, syncedAt: 200 })
            .mockResolvedValueOnce({ ...response, syncedAt: 300 });
        const sync = mountSync();
        await vi.advanceTimersByTimeAsync(0);
        sync.enqueue([action('one'), action('two')]);
        await vi.advanceTimersByTimeAsync(600);
        expect(vi.mocked(api.sync).mock.calls.slice(1).map(call => [call[2], call[3]])).toEqual([[100, false], [100, true]]);
        expect(sync.auth().isSynced).toBe(true);
    });

    it('does not advance the cursor when local work arrives during an unchanged poll', async () => {
        let reply!: (value: SyncResponse) => void;
        vi.mocked(api.sync).mockResolvedValueOnce(response)
            .mockImplementationOnce(() => new Promise(resolve => { reply = resolve; }))
            .mockResolvedValueOnce({ ...response, syncedAt: 300 });
        const sync = mountSync();
        await vi.advanceTimersByTimeAsync(0);
        await vi.advanceTimersByTimeAsync(30000);
        sync.enqueue(action('new'));
        reply({ success: true, syncedAt: 200, notChanged: true });
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.auth().isSynced).toBe(false);
        expect(sync.pending()).toHaveLength(1);
        await vi.advanceTimersByTimeAsync(100);
        expect(vi.mocked(api.sync).mock.calls[2][2]).toBe(100);
        expect(sync.auth().isSynced).toBe(true);
    });

    it('starts a new sync lifecycle with a full snapshot even after previous unchanged polls', async () => {
        vi.mocked(api.sync).mockResolvedValueOnce(response).mockResolvedValueOnce({ success: true, syncedAt: 200, notChanged: true }).mockResolvedValue(response);
        mountSync();
        await vi.advanceTimersByTimeAsync(30000);
        cleanup.splice(0).forEach(dispose => dispose());
        mountSync();
        await vi.advanceTimersByTimeAsync(0);
        expect(api.sync).toHaveBeenLastCalledWith('token', [], 0, true);
    });
});


describe('pull activity', () => {
    beforeEach(() => {
        vi.mocked(storage.getItem).mockReturnValue(null);
        vi.mocked(storage.setItem).mockReturnValue(true);
    });

    it('marks an empty request as pulling and clears activity when it completes', async () => {
        let reply!: (value: SyncResponse) => void;
        vi.mocked(api.sync).mockImplementationOnce(() => new Promise(resolve => { reply = resolve; }));
        const sync = mountSync();
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.auth().isPulling).toBe(true);
        sync.enqueue(action('during-pull'));
        expect(sync.pending()).toHaveLength(1);
        reply(response);
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.auth().isPulling).toBe(false);
        expect(sync.pending()).toHaveLength(1);
    });

    it('does not mark uploads as pulls and clears activity after a failed pull', async () => {
        let reject!: (error: Error) => void;
        vi.mocked(api.sync).mockResolvedValueOnce(response)
            .mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
        const sync = mountSync([action('upload')]);
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.auth().isPulling).toBe(false);
        await vi.advanceTimersByTimeAsync(30000);
        expect(sync.auth().isPulling).toBe(true);
        reject(new Error('offline'));
        await vi.advanceTimersByTimeAsync(0);
        expect(sync.auth().isPulling).toBe(false);
    });
});
