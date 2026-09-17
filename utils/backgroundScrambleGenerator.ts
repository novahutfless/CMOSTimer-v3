import { generateScramble, isBuiltinScrambler } from './scramblerRegistry';

type PendingRequest = {
	resolve: (scramble: string[][]) => void;
	reject: (error: Error) => void;
};

type WorkerResponse =
	| { id: number; ok: true; scramble: string[][] }
	| { id: number; ok: false; error: string };

/**
 * Generates built-in scrambles off the UI thread. Plugin scramblers deliberately
 * stay in their own runtime, where their registrations and permissions exist.
 */
class BackgroundScrambleGenerator {
	private worker: Worker | null = null;
	private nextId = 1;
	private readonly pending = new Map<number, PendingRequest>();

	public generate(scramblerIds: string | string[], customConfig?: unknown): Promise<string[][]> {
		const ids = Array.isArray(scramblerIds) ? scramblerIds : [scramblerIds];
		if (!this.canUseWorker(ids)) return generateScramble(scramblerIds, customConfig);

		try {
			return this.generateInWorker(scramblerIds, customConfig).catch(() => generateScramble(scramblerIds, customConfig));
		} catch {
			return generateScramble(scramblerIds, customConfig);
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
			if (response.ok) request.resolve(response.scramble);
			else request.reject(new Error(response.error));
		});
		worker.addEventListener('error', () => this.failWorker(new Error('Background scramble worker failed.')));
		this.worker = worker;
		return worker;
	}

	private generateInWorker(scramblerIds: string | string[], customConfig?: unknown): Promise<string[][]> {
		const worker = this.getWorker();
		const id = this.nextId++;
		return new Promise<string[][]>((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			try {
				worker.postMessage(customConfig === undefined ? { id, scramblerIds } : { id, scramblerIds, customConfig });
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
	backgroundScrambleGenerator.generate(scramblerIds, customConfig);
