import { GeneratedScramble, generateScrambleWithAudit, isBuiltinScrambler } from './scramblerRegistry';
import { takeCachedScramble } from './remoteScrambleCache';

type PendingRequest = {
	resolve: (result: GeneratedScramble) => void;
	reject: (error: Error) => void;
};

type WorkerResponse =
	| { id: number; ok: true; result: GeneratedScramble }
	| { id: number; ok: false; error: string };

/**
 * Generates built-in scrambles off the UI thread. Plugin scramblers deliberately
 * stay in their own runtime, where their registrations and permissions exist.
 */
class BackgroundScrambleGenerator {
	private worker: Worker | null = null;
	private nextId = 1;
	private readonly pending = new Map<number, PendingRequest>();

	public generate(scramblerIds: string | string[], customConfig?: unknown, seed?: number): Promise<GeneratedScramble> {
		const ids = Array.isArray(scramblerIds) ? scramblerIds : [scramblerIds];
		if (seed === undefined && customConfig === undefined) {
			const cached = takeCachedScramble(ids);
			if (cached) return Promise.resolve(cached);
		}
		if (!this.canUseWorker(ids)) return generateScrambleWithAudit(scramblerIds, customConfig, seed);

		try {
			return this.generateInWorker(scramblerIds, customConfig, seed).catch(() => generateScrambleWithAudit(scramblerIds, customConfig, seed));
		} catch {
			return generateScrambleWithAudit(scramblerIds, customConfig, seed);
		}
	}

	private canUseWorker(ids: string[]): boolean {
		return typeof Worker !== 'undefined' && ids.every(isBuiltinScrambler);
	}

	private getWorker(): Worker {
		if (this.worker) return this.worker;
		const worker = new Worker(new URL('./worker/scrambleWorker.ts', import.meta.url), { type: 'module', name: 'cmostimer-scramble' });
		worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
			const response = event.data;
			const request = this.pending.get(response.id);
			if (!request) return;
			this.pending.delete(response.id);
			if (response.ok) request.resolve(response.result);
			else request.reject(new Error(response.error));
		});
		worker.addEventListener('error', () => this.failWorker(new Error('Background scramble worker failed.')));
		this.worker = worker;
		return worker;
	}

	private generateInWorker(scramblerIds: string | string[], customConfig?: unknown, seed?: number): Promise<GeneratedScramble> {
		const worker = this.getWorker();
		const id = this.nextId++;
		return new Promise<GeneratedScramble>((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			try {
				worker.postMessage({ id, scramblerIds, ...(customConfig === undefined ? {} : { customConfig }), ...(seed === undefined ? {} : { seed }) });
			} catch (error) {
				this.pending.delete(id);
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	private failWorker(error: Error): void {
		this.worker?.terminate();
		this.worker = null;
		this.pending.forEach(request => request.reject(error));
		this.pending.clear();
	}
}

const backgroundScrambleGenerator = new BackgroundScrambleGenerator();

export const generateScrambleInBackground = (scramblerIds: string | string[], customConfig?: unknown): Promise<string[][]> =>
	backgroundScrambleGenerator.generate(scramblerIds, customConfig).then(result => result.scramble);

export const generateScrambleWithAuditInBackground = (scramblerIds: string | string[], customConfig?: unknown, seed?: number): Promise<GeneratedScramble> =>
	backgroundScrambleGenerator.generate(scramblerIds, customConfig, seed);
