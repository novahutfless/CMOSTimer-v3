import { Session, Settings, StatConfig, Solve } from '../../types';

export type ImportSession = Omit<Session, 'solveIds'> & {
	solveIds: string[];
	solves?: Solve[];
};

export interface ParsedImport {
	type: 'CMOSTimer' | 'csTimer' | 'CubicTimer' | 'CMOSTimer v2' | 'NanoTimer';
	sessions: ImportSession[];
	settings?: Settings;
	statsConfig?: StatConfig[];
}
