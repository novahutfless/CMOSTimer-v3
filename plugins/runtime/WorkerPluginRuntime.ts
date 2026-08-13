import { CMOS_PLUGIN_API_VERSION, PluginEventName, PluginUiNode } from '../../types';
import { HostToWorkerMessage, PluginHostMethod, WorkerInvocation, WorkerRegistrations, WorkerToHostMessage } from './workerProtocol';

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

const defaultWorkerFactory: WorkerFactory = () => {
	if (typeof Worker === 'undefined') throw new Error('Web Workers are not available on this target.');
	try {
		return new Worker(new URL('../worker/pluginWorker.ts', import.meta.url), { type: 'module', name: 'cmostimer-plugin' });
	} catch (error) {
		throw new Error(`Plugin worker isolation is unavailable on this target: ${asError(error).message}`);
	}
};

const asError = (error: unknown): Error => error instanceof Error ? error : new Error(String(error));

export class WorkerPluginRuntime {
	private readonly worker: PluginWorkerLike;
	private readonly handleRequest: WorkerRequestHandler;
	private invocationId = 0;
	private cleanupId = 0;
	private startResolve: ((registrations: WorkerRegistrations) => void) | null = null;
	private startReject: ((error: Error) => void) | null = null;
	private readonly pendingInvocations = new Map<number, { resolve: (value: PluginUiNode | void) => void; reject: (error: Error) => void }>();
	private readonly pendingCleanups = new Map<number, () => void>();
	private terminated = false;

	public constructor(handleRequest: WorkerRequestHandler, workerFactory: WorkerFactory = defaultWorkerFactory) {
		this.handleRequest = handleRequest;
		this.worker = workerFactory();
		this.worker.addEventListener('message', event => this.handleMessage(event.data));
		this.worker.addEventListener('error', event => this.handleFatalError(new Error(event.message || 'Plugin worker crashed.')));
	}

	public start(code: string): Promise<WorkerRegistrations> {
		if (this.terminated) return Promise.reject(new Error('Plugin worker is terminated.'));
		return new Promise<WorkerRegistrations>((resolve, reject) => {
			this.startResolve = resolve;
			this.startReject = reject;
			this.worker.postMessage({ type: 'start', code, apiVersion: CMOS_PLUGIN_API_VERSION });
		});
	}

	public invoke(invocation: WorkerInvocation): Promise<PluginUiNode | void> {
		if (this.terminated) return Promise.reject(new Error('Plugin worker is terminated.'));
		this.invocationId += 1;
		const id = this.invocationId;
		return new Promise<PluginUiNode | void>((resolve, reject) => {
			this.pendingInvocations.set(id, { resolve, reject });
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
			const timeout = setTimeout(resolve, 500);
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
		this.startResolve = null;
		this.startReject = null;
		this.pendingInvocations.forEach(pending => pending.reject(error));
		this.pendingInvocations.clear();
		this.pendingCleanups.forEach(resolve => resolve());
		this.pendingCleanups.clear();
	}

	private handleMessage(message: WorkerToHostMessage): void {
		if (message.type === 'ready') {
			this.startResolve?.(message.registrations);
			this.startResolve = null;
			this.startReject = null;
		} else if (message.type === 'startupError') {
			this.startReject?.(new Error(message.error));
			this.startResolve = null;
			this.startReject = null;
		} else if (message.type === 'request') {
			void this.respondToRequest(message.requestId, message.method, message.args);
		} else if (message.type === 'invocationResult') {
			const pending = this.pendingInvocations.get(message.invocationId);
			if (!pending) return;
			this.pendingInvocations.delete(message.invocationId);
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
			const value = await this.handleRequest(method, args);
			this.worker.postMessage({ type: 'response', requestId, ok: true, value });
		} catch (error) {
			this.worker.postMessage({ type: 'response', requestId, ok: false, error: asError(error).message });
		}
	}

	private handleFatalError(error: Error): void {
		this.startReject?.(new Error(`Plugin worker isolation failed to start: ${error.message}`));
		this.pendingInvocations.forEach(pending => pending.reject(error));
		this.terminate();
	}
}
