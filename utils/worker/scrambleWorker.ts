/// <reference lib="webworker" />

import { GeneratedScramble, generateScrambleWithAudit } from '../scramblerRegistry';

type ScrambleRequest = {
	id: number;
	scramblerIds: string | string[];
	customConfig?: unknown;
	seed?: number;
};

type ScrambleResponse =
	| { id: number; ok: true; result: GeneratedScramble }
	| { id: number; ok: false; error: string };

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener('message', (event: MessageEvent<ScrambleRequest>) => {
	const { id, scramblerIds, customConfig, seed } = event.data;
	void generateScrambleWithAudit(scramblerIds, customConfig, seed).then(
		result => workerScope.postMessage({ id, ok: true, result } satisfies ScrambleResponse),
		error => workerScope.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) } satisfies ScrambleResponse)
	);
});
