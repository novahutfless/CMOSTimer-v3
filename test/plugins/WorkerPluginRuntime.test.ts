import { describe, expect, it, vi } from 'vitest';
import { WorkerPluginRuntime, PluginWorkerLike } from '../../plugins/runtime/WorkerPluginRuntime';
import { HostToWorkerMessage, WorkerToHostMessage } from '../../plugins/runtime/workerProtocol';

class FakeWorker implements PluginWorkerLike {
	public readonly sent: HostToWorkerMessage[] = [];
	public terminated = false;
	private messageListener: ((event: MessageEvent<WorkerToHostMessage>) => void) | null = null;
	private errorListener: ((event: ErrorEvent) => void) | null = null;

	public postMessage(message: HostToWorkerMessage): void {
		this.sent.push(message); 
	}
	public terminate(): void {
		this.terminated = true; 
	}
	public addEventListener(type: 'message' | 'error', listener: ((event: MessageEvent<WorkerToHostMessage>) => void) | ((event: ErrorEvent) => void)): void {
		if (type === 'message') this.messageListener = listener as (event: MessageEvent<WorkerToHostMessage>) => void;
		else this.errorListener = listener as (event: ErrorEvent) => void;
	}
	public message(message: WorkerToHostMessage): void {
		this.messageListener?.({ data: message } as MessageEvent<WorkerToHostMessage>); 
	}
	public error(message: string): void {
		this.errorListener?.({ message } as ErrorEvent); 
	}
}

const emptyRegistrations = { widgets: [], renderers: [], scramblers: [], languages: [], translations: [], events: [], commands: [] };

describe('WorkerPluginRuntime', () => {
	it('starts code in a worker and receives serializable registrations', async () => {
		const worker = new FakeWorker();
		const runtime = new WorkerPluginRuntime(async () => undefined, () => worker);
		const starting = runtime.start(`await cmos.toast('hello')`);
		expect(worker.sent[0]).toMatchObject({ type: 'start', code: `await cmos.toast('hello')` });
		worker.message({ type: 'ready', registrations: { ...emptyRegistrations, widgets: [{ id: 'safe', name: 'Safe', hasActionHandler: false }] } });
		await expect(starting).resolves.toMatchObject({ widgets: [{ id: 'safe' }] });
		runtime.terminate();
	});

	it('exposes only enumerated request RPC and returns its result', async () => {
		const worker = new FakeWorker();
		const handler = vi.fn(async () => ({ currentSessionId: 'session' }));
		const runtime = new WorkerPluginRuntime(handler, () => worker);
		worker.message({ type: 'request', requestId: 7, method: 'getState', args: [] });
		await vi.waitFor(() => expect(worker.sent).toHaveLength(1));
		expect(handler).toHaveBeenCalledWith('getState', []);
		expect(worker.sent).toContainEqual({ type: 'response', requestId: 7, ok: true, value: { currentSessionId: 'session' } });
		runtime.terminate();
	});

	it('proxies declarative render invocations and terminates after cleanup', async () => {
		const worker = new FakeWorker();
		const runtime = new WorkerPluginRuntime(async () => undefined, () => worker);
		const rendering = runtime.invoke({ kind: 'renderWidget', key: 'widget' });
		const invokeMessage = worker.sent[0];
		expect(invokeMessage).toMatchObject({ type: 'invoke', invocation: { kind: 'renderWidget', key: 'widget' } });
		if (invokeMessage?.type !== 'invoke') throw new Error('Expected invocation');
		worker.message({ type: 'invocationResult', invocationId: invokeMessage.invocationId, ok: true, value: { type: 'text', text: 'safe' } });
		await expect(rendering).resolves.toEqual({ type: 'text', text: 'safe' });

		const cleaning = runtime.cleanup();
		const cleanupMessage = worker.sent.find(message => message.type === 'cleanup');
		if (!cleanupMessage || cleanupMessage.type !== 'cleanup') throw new Error('Expected cleanup request');
		worker.message({ type: 'cleanupComplete', cleanupId: cleanupMessage.cleanupId });
		await cleaning;
		expect(worker.terminated).toBe(true);
	});

	it('rejects startup if the worker crashes', async () => {
		const worker = new FakeWorker();
		const runtime = new WorkerPluginRuntime(async () => undefined, () => worker);
		const starting = runtime.start('// crash');
		worker.error('worker crashed');
		await expect(starting).rejects.toThrow('worker crashed');
	});

	it('terminates a worker that sends malformed protocol data', async () => {
		const worker = new FakeWorker();
		const runtime = new WorkerPluginRuntime(async () => undefined, () => worker);
		const starting = runtime.start('// malformed');
		worker.message({ type: 'request', requestId: -1, method: 'getState', args: [] } as unknown as WorkerToHostMessage);
		await expect(starting).rejects.toThrow('malformed protocol');
		expect(worker.terminated).toBe(true);
	});

	it('bounds startup and invocation execution time', async () => {
		vi.useFakeTimers();
		try {
			const startupWorker = new FakeWorker();
			const startupRuntime = new WorkerPluginRuntime(async () => undefined, () => startupWorker, { startupMs: 20 });
			const starting = startupRuntime.start('await new Promise(() => {})');
			const startupExpectation = expect(starting).rejects.toThrow('startup exceeded');
			await vi.advanceTimersByTimeAsync(21);
			await startupExpectation;

			const invocationWorker = new FakeWorker();
			const invocationRuntime = new WorkerPluginRuntime(async () => undefined, () => invocationWorker, { invocationMs: 20 });
			const invoking = invocationRuntime.invoke({ kind: 'renderWidget', key: 'slow' });
			const invocationExpectation = expect(invoking).rejects.toThrow('invocation exceeded');
			await vi.advanceTimersByTimeAsync(21);
			await invocationExpectation;
			invocationRuntime.terminate();
		} finally {
			vi.useRealTimers();
		}
	});

	it('returns an error when a host RPC exceeds its deadline', async () => {
		vi.useFakeTimers();
		try {
			const worker = new FakeWorker();
			const runtime = new WorkerPluginRuntime(() => new Promise(() => undefined), () => worker, { requestMs: 20 });
			worker.message({ type: 'request', requestId: 3, method: 'getState', args: [] });
			await vi.advanceTimersByTimeAsync(21);
			expect(worker.sent).toContainEqual({ type: 'response', requestId: 3, ok: false, error: 'Host request "getState" exceeded 20 ms.' });
			runtime.terminate();
		} finally {
			vi.useRealTimers();
		}
	});
});
