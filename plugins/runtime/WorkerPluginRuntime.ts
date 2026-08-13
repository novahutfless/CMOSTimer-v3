import { CMOS_PLUGIN_API_VERSION, PluginEventName, PluginUiNode } from '../../types';
import { HostToWorkerMessage, isWorkerToHostMessage, PluginHostMethod, WorkerInvocation, WorkerRegistrations, WorkerToHostMessage } from './workerProtocol';

type WorkerRequestHandler = (method: PluginHostMethod, args: unknown[]) => Promise<unknown>;

export type PluginWorkerLike = {
	postMessage: (message: HostToWorkerMessage) => void;
	terminate: () => void;
	addEventListener: {
		(type: 'message', listener: (event: MessageEvent<WorkerToHostMessage>) => void): void;
		(type: 'error', listener: (event: ErrorEvent) => void): void;
	};
};

type WorkerFactory = () => PluginWorkerLike;
type WorkerRuntimeTimeouts = { startupMs: number; invocationMs: number; requestMs: number; cleanupMs: number };
const DEFAULT_TIMEOUTS: WorkerRuntimeTimeouts = { startupMs: 30_000, invocationMs: 10_000, requestMs: 120_000, cleanupMs: 1_000 };

const defaultWorkerFactory: WorkerFactory = () => {
	if (typeof Worker === 'undefined') throw new Error('Web Workers are not available on this target.');
	try {
		return new Worker(new URL('../worker/pluginWorker.ts', import.meta.url), { type: 'module', name: 'cmostimer-plugin' });
	} catch (error) {
		throw new Error(`Plugin worker isolation is unavailable on this target: ${asError(error).message}`);
	}
};

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));
const withTimeout = <T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> => new Promise<T>((resolve, reject) => {
	const timeout = setTimeout(() => reject(new Error(message)), milliseconds);
	promise.then(value => {
		clearTimeout(timeout);
		resolve(value);
	}, error => {
		clearTimeout(timeout);
		reject(error);
	});
});

export class WorkerPluginRuntime {
	private readonly worker: PluginWorkerLike;
	private readonly handleRequest: WorkerRequestHandler;
	private readonly timeouts: WorkerRuntimeTimeouts;
	private invocationId = 0;
	private cleanupId = 0;
	private startResolve: ((registrations: WorkerRegistrations) => void) | null = null;
	private startReject: ((error: Error) => void) | null = null;
	private startTimeout: ReturnType<typeof setTimeout> | null = null;
	private readonly pendingInvocations = new Map<number, { resolve: (value: PluginUiNode | void) => void; reject: (error: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
	private readonly pendingCleanups = new Map<number, () => void>();
	private terminated = false;

	public constructor(handleRequest: WorkerRequestHandler, workerFactory: WorkerFactory = defaultWorkerFactory, timeouts: Partial<WorkerRuntimeTimeouts> = {}) {
		this.handleRequest = handleRequest;
		this.timeouts = { ...DEFAULT_TIMEOUTS, ...timeouts };
		this.worker = workerFactory();
		this.worker.addEventListener('message', event => {
			if (this.terminated) return;
			let serialized: string;
			try {
				serialized = JSON.stringify(event.data);
			} catch {
				serialized = '';
			}
			if (!serialized || serialized.length > 2_000_000 || !isWorkerToHostMessage(event.data)) {
				this.handleFatalError(new Error('Plugin worker sent a malformed protocol message.'));
				return;
			}
			this.handleMessage(event.data);
		});
		this.worker.addEventListener('error', event => this.handleFatalError(new Error(event.message || 'Plugin worker crashed.')));
	}

	public start(code: string): Promise<WorkerRegistrations> {
		if (this.terminated) return Promise.reject(new Error('Plugin worker is terminated.'));
		return new Promise<WorkerRegistrations>((resolve, reject) => {
			this.startResolve = resolve;
			this.startReject = reject;
			this.startTimeout = setTimeout(() => this.handleFatalError(new Error(`Plugin startup exceeded ${this.timeouts.startupMs} ms.`)), this.timeouts.startupMs);
			this.worker.postMessage({ type: 'start', code, apiVersion: CMOS_PLUGIN_API_VERSION });
		});
	}

	public invoke(invocation: WorkerInvocation): Promise<PluginUiNode | void> {
		if (this.terminated) return Promise.reject(new Error('Plugin worker is terminated.'));
		this.invocationId += 1;
		const id = this.invocationId;
		return new Promise<PluginUiNode | void>((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pendingInvocations.delete(id);
				reject(new Error(`Plugin invocation exceeded ${this.timeouts.invocationMs} ms.`));
			}, this.timeouts.invocationMs);
			this.pendingInvocations.set(id, { resolve, reject, timeout });
			this.worker.postMessage({ type: 'invoke', invocationId: id, invocation });
		});
	}

	public emit(event: PluginEventName, payload: unknown): void {
		if (!this.terminated) this.worker.postMessage({ type: 'event', event, payload });
	}

	public async cleanup(): Promise<void> {
		if (this.terminated) return;
		this.cleanupId += 1;
		const id = this.cleanupId;
		await new Promise<void>(resolve => {
			const timeout = setTimeout(resolve, this.timeouts.cleanupMs);
			this.pendingCleanups.set(id, () => {
				clearTimeout(timeout);
				resolve();
			});
			this.worker.postMessage({ type: 'cleanup', cleanupId: id });
		});
		this.terminate();
	}

	public terminate(): void {
		if (this.terminated) return;
		this.terminated = true;
		this.worker.terminate();
		const error = new Error('Plugin worker was terminated.');
		this.startReject?.(error);
		if (this.startTimeout) clearTimeout(this.startTimeout);
		this.startTimeout = null;
		this.startResolve = null;
		this.startReject = null;
		this.pendingInvocations.forEach(pending => {
			clearTimeout(pending.timeout);
			pending.reject(error);
		});
		this.pendingInvocations.clear();
		this.pendingCleanups.forEach(resolve => resolve());
		this.pendingCleanups.clear();
	}

	private handleMessage(message: WorkerToHostMessage): void {
		if (message.type === 'ready') {
			if (this.startTimeout) clearTimeout(this.startTimeout);
			this.startTimeout = null;
			this.startResolve?.(message.registrations);
			this.startResolve = null;
			this.startReject = null;
		} else if (message.type === 'startupError') {
			if (this.startTimeout) clearTimeout(this.startTimeout);
			this.startTimeout = null;
			this.startReject?.(new Error(message.error));
			this.startResolve = null;
			this.startReject = null;
		} else if (message.type === 'request') {
			void this.respondToRequest(message.requestId, message.method, message.args);
		} else if (message.type === 'invocationResult') {
			const pending = this.pendingInvocations.get(message.invocationId);
			if (!pending) return;
			this.pendingInvocations.delete(message.invocationId);
			clearTimeout(pending.timeout);
			if (message.ok) pending.resolve(message.value);
			else pending.reject(new Error(message.error));
		} else if (message.type === 'cleanupComplete') {
			this.pendingCleanups.get(message.cleanupId)?.();
			this.pendingCleanups.delete(message.cleanupId);
		} else if (message.type === 'runtimeError') {
			console.error('[Plugin worker] Runtime callback failed:', message.error);
		}
	}

	private async respondToRequest(requestId: number, method: PluginHostMethod, args: unknown[]): Promise<void> {
		try {
			const value = await withTimeout(this.handleRequest(method, args), this.timeouts.requestMs, `Host request "${method}" exceeded ${this.timeouts.requestMs} ms.`);
			if (!this.terminated) this.worker.postMessage({ type: 'response', requestId, ok: true, value });
		} catch (error) {
			if (!this.terminated) this.worker.postMessage({ type: 'response', requestId, ok: false, error: asError(error).message });
		}
	}

	private handleFatalError(error: Error): void {
		this.startReject?.(new Error(`Plugin worker isolation failed to start: ${error.message}`));
		this.pendingInvocations.forEach(pending => {
			clearTimeout(pending.timeout);
			pending.reject(error);
		});
		this.terminate();
	}
}
