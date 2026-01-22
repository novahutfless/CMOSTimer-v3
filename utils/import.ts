import { ParsedImport } from './importers/types';
import { parseCMOSTimerV2 } from './importers/cmostimerV2';
import { parseCMOSTimerV3 } from './importers/cmostimerV3';
import { parseCsTimer } from './importers/cstimer';
import { parseCubicTimer } from './importers/cubicTimer';
import { parseNanoTimer } from './importers/nanoTimer';

export type { ParsedImport } from './importers/types';

export const parseImportData = (jsonString: string, fileName = ''): ParsedImport => {
	let data;
	let isJson = false;

	try {
		data = JSON.parse(jsonString);
		isJson = true;
	} catch {
		// Not JSON
	}

	if (isJson && data) {
		// --- Format Detection ---

		// 1. CMOSTimer v2
		// Detection: Has initCount OR (has sessions array AND cachedSolves object)
		if (data.initCount !== undefined || (data.sessions && data.cachedSolves)) {
			try {
				return parseCMOSTimerV2(data);
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : String(e);
				throw new Error(`CMOSTimer v2 Import Failed: ${message}`);
			}
		}

		// 2. CMOSTimer v3
		if (data.version && data.sessions) {
			try {
				return parseCMOSTimerV3(data);
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : String(e);
				throw new Error(`CMOSTimer v3 Import Failed: ${message}`);
			}
		}

		// 3. csTimer
		if (data.properties && data.session1) {
			try {
				return parseCsTimer(data);
			} catch (e: unknown) {
				const message = e instanceof Error ? e.message : String(e);
				throw new Error(`csTimer Import Failed: ${message}`);
			}
		}
	}

	// 4. NanoTimer (CSV starting with header)
	if (jsonString.startsWith('cubetype,') || jsonString.includes('cubetype,solvetype')) {
		try {
			return parseNanoTimer(jsonString);
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			throw new Error(`NanoTimer Import Failed: ${message}`);
		}
	}

	// 5. Cubic Timer (Text)
	if (jsonString.trim().startsWith('"') || jsonString.includes('";"')) {
		try {
			const parsed = parseCubicTimer(jsonString, fileName);
			const firstSession = parsed.sessions[0];
			if (firstSession?.solves && firstSession.solves.length > 0) return parsed;
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			throw new Error(`Cubic Timer Import Failed: ${message}`);
		}
	}

	if (isJson) {
		throw new Error('Unknown JSON file format. Structure not recognized as CMOSTimer (v2/v3) or csTimer.');
	}

	throw new Error('Unknown file format. Please provide a valid JSON or text export.');
};
