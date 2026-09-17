import { Session, Solve, SolveMap } from '../types';
import { getSolveTime } from './math';

const CSV_HEADERS = [
	'session_id',
	'session_name',
	'solve_id',
	'timestamp_iso',
	'raw_time_ms',
	'final_time_ms',
	'penalty',
	'inspection_time_ms',
	'scrambler_ids',
	'source_scrambler',
	'scramble',
	'tags',
	'comment',
	'phases_json',
	'solution'
] as const;

const escapeCsv = (value: string | number | null | undefined): string => {
	const text = value === null || value === undefined ? '' : String(value);
	return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const solveRow = (solve: Solve, session?: Session): Array<string | number | null> => [
	session?.id || '',
	session?.name || '',
	solve.id,
	new Date(solve.timestamp).toISOString(),
	solve.time,
	getSolveTime(solve),
	solve.penalty,
	solve.inspectionTime,
	solve.scramblerId.join('|'),
	solve.sourceScrambler ? `${solve.sourceScrambler.source}:${solve.sourceScrambler.id}` : '',
	solve.scramble.map(part => part.join(' ')).join(' | '),
	solve.tags?.join('|') || '',
	solve.comment || '',
	solve.phases ? JSON.stringify(solve.phases) : '',
	solve.solution?.join(' ') || ''
];

/**
 * Produces one row per solve-session membership. A solve belonging to multiple
 * sessions is intentionally repeated so spreadsheet filters retain its session
 * context; unassigned solves are included once with blank session columns.
 */
export const buildSolvesCsv = (sessions: Session[], solves: SolveMap): string => {
	const rows: string[] = [CSV_HEADERS.join(',')];
	const exportedSolveIds = new Set<string>();

	sessions.forEach(session => {
		session.solveIds.forEach(solveId => {
			const solve = solves[solveId];
			if (!solve) return;
			rows.push(solveRow(solve, session).map(escapeCsv).join(','));
			exportedSolveIds.add(solveId);
		});
	});

	Object.values(solves)
		.filter(solve => !exportedSolveIds.has(solve.id))
		.sort((left, right) => left.timestamp - right.timestamp)
		.forEach(solve => rows.push(solveRow(solve).map(escapeCsv).join(',')));

	return rows.join('\r\n');
};
