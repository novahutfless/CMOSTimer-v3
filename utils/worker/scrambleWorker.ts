/// <reference lib="webworker" />

import { generateScramble } from '../scramblerRegistry';

type ScrambleRequest = {
	id: number;
	scramblerIds: string | string[];
	customConfig?: unknown;
};

type ScrambleResponse =
	| { id: number; ok: true; scramble: string[][] }
	| { id: number; ok: false; error: string };

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener('message', (event: MessageEvent<ScrambleRequest>) => {
	const { id, scramblerIds, customConfig } = event.data;
	void generateScramble(scramblerIds, customConfig).then(
		scramble => workerScope.postMessage({ id, ok: true, scramble } satisfies ScrambleResponse),
		error => workerScope.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) } satisfies ScrambleResponse)
	);
});
