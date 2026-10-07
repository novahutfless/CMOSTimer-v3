import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';

const path = process.argv[2];
if (!path) throw new Error('Usage: node scripts/benchmark-v2-import.mjs <v2-export.json>');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
    const { parseCMOSTimerV2 } = await server.ssrLoadModule('/utils/importers/cmostimerV2.ts');
    const { prepareImportData } = await server.ssrLoadModule('/store/importProcessing.ts');
    const { splitSyncAction } = await server.ssrLoadModule('/store/syncUtils.ts');
    const raw = await readFile(path, 'utf8');
    const start = performance.now();
    const parsed = parseCMOSTimerV2(JSON.parse(raw.replace(/^\uFEFF/, '')));
    const parsedAt = performance.now();
    const result = prepareImportData({ sessions: parsed.sessions.map(session => ({ session, targetId: 'NEW' })) }, [], {});
    const preparedAt = performance.now();
    const serialized = JSON.stringify({ sessions: result.sessions, solves: result.solves });
    const serializedAt = performance.now();
    const queued = result.pendingSyncActions.flatMap((action, index) => splitSyncAction({ ...action, opId: String(index), timestamp: index }));
    const queue = JSON.stringify(queued);
    const finishedAt = performance.now();
    console.log(JSON.stringify({
        sessions: result.sessions.length,
        memberships: result.sessions.reduce((count, session) => count + session.solveIds.length, 0),
        storedSolves: Object.keys(result.solves).length,
        parseMs: Math.round(parsedAt - start), prepareMs: Math.round(preparedAt - parsedAt),
        serializeMs: Math.round(serializedAt - preparedAt), queueMs: Math.round(finishedAt - serializedAt),
        totalMs: Math.round(finishedAt - start), snapshotChars: serialized.length, queueChars: queue.length,
        unresolvedSessions: result.sessions.filter(session => session.scramblerId.some(id => id.startsWith('cmostimer-v2:'))).map(session => session.name),
        mappings: result.sessions.map(session => ({ name: session.name, scramblerId: session.scramblerId }))
    }, null, 2));
} finally {
    await server.close();
}
