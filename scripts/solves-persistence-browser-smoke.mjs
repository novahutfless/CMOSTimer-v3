import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
server.middlewares.use('/persistence-smoke', (_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Persistence test</title>');
});
await server.listen();
let browser;
try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage();
    await page.goto(server.resolvedUrls.local[0] + 'persistence-smoke');
    const result = await page.evaluate(async () => {
        const persistence = await import('/utils/solvesPersistence.ts');
        const assert = (value, message) => { if (!value) throw new Error(message); };
        const solve = id => ({ id, timestamp: 1, time: 1000, inspectionTime: -1, penalty: 'NONE', scramble: [['R']], scramblerId: ['333'] });
        await persistence.clearPersistedSolves();
        localStorage.setItem('cmostimer_solves', JSON.stringify({ legacy: solve('legacy') }));
        assert(JSON.parse(await persistence.readPersistedSolves()).legacy.id === 'legacy', 'Legacy migration');
        const base = {};
        for (let index = 0; index < 50000; index++) base[index] = solve(String(index));
        const serialized = JSON.stringify(base);
        await persistence.writePersistedSolves(serialized, true);
        const started = performance.now();
        await persistence.appendPersistedSolves([solve('added')]);
        const appendMs = performance.now() - started;
        const request = indexedDB.open('cmostimer-db', 1);
        const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        const storedBase = await new Promise((resolve, reject) => {
            const request = db.transaction('state').objectStore('state').get('solves_v1');
            request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
        });
        db.close();
        assert(storedBase === serialized, 'Append rewrote the baseline');
        const reloaded = JSON.parse(await persistence.readPersistedSolves());
        assert(Object.keys(reloaded).length === 50001 && reloaded.added.id === 'added', 'Incremental reload');
        // Ordered calls: a queued snapshot must precede the append that follows it.
        const snapshot = persistence.writePersistedSolves(JSON.stringify({ fresh: solve('fresh') }), true);
        const append = persistence.appendPersistedSolves([solve('latest')]);
        await Promise.all([snapshot, append]);
        const replaced = JSON.parse(await persistence.readPersistedSolves());
        assert(Object.keys(replaced).sort().join(',') === 'fresh,latest', 'Stale overrides survived replacement');
        const put = IDBObjectStore.prototype.put;
        IDBObjectStore.prototype.put = function () { throw new DOMException('Injected quota failure', 'QuotaExceededError'); };
        let failed = false;
        try { await persistence.appendPersistedSolves([solve('failed')]); } catch { failed = true; }
        finally { IDBObjectStore.prototype.put = put; }
        assert(failed, 'Write failure was swallowed');
        await persistence.appendPersistedSolves([solve('recovered')]);
        const recovered = JSON.parse(await persistence.readPersistedSolves());
        assert(!recovered.failed && recovered.recovered.id === 'recovered', 'Write chain did not recover safely');
        await persistence.clearPersistedSolves();
        assert(await persistence.readPersistedSolves() === null, 'Clear left stale data');
        // Exercise the native/fallback journal without a native backend.
        window.__TAURI__ = {};
        await persistence.writePersistedSolves(JSON.stringify({ base: solve('base') }), true);
        await persistence.appendPersistedSolves([solve('native')]);
        assert(JSON.parse(await persistence.readPersistedSolves()).native.id === 'native', 'Native journal reload');
        await persistence.writePersistedSolves(JSON.stringify({ replacement: solve('replacement') }), true);
        assert(Object.keys(JSON.parse(await persistence.readPersistedSolves())).join(',') === 'replacement', 'Native journal compaction');
        await persistence.clearPersistedSolves();
        delete window.__TAURI__;
        return { initialSolves: 50000, appendMs, checks: ['migration', 'baseline untouched', 'reload', 'ordered writes', 'replacement', 'failure recovery', 'clear', 'native journal'] };
    });
    console.log(JSON.stringify(result, null, 2));
} finally {
    if (browser) await browser.close();
    await server.close();
}
