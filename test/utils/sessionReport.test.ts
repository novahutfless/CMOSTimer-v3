import { describe, expect, it } from 'vitest';
import { Penalty, Session, SolveMap, TimePrecision } from '../../types';
import { buildPrintableSessionReport } from '../../utils/sessionReport';

describe('buildPrintableSessionReport', () => {
	it('renders printable session data while escaping user-provided text', () => {
		const session: Session = { id: 's1', name: 'Main <session>', scramblerId: ['333'], solveIds: ['ok', 'dnf'], sourceSessionIds: [] };
		const solves: SolveMap = {
			ok: { id: 'ok', timestamp: Date.UTC(2026, 0, 1), time: 1234, inspectionTime: -1, scramble: [['R', 'U']], scramblerId: ['333'], penalty: Penalty.NONE, tags: ['fast'], comment: 'safe <b>comment</b>' },
			dnf: { id: 'dnf', timestamp: Date.UTC(2026, 0, 2), time: 2000, inspectionTime: -1, scramble: [['L2']], scramblerId: ['333'], penalty: Penalty.DNF }
		};

		const report = buildPrintableSessionReport(session, solves, TimePrecision.CENTI);

		expect(report).toContain('Main &lt;session&gt;');
		expect(report).toContain('safe &lt;b&gt;comment&lt;/b&gt;');
		expect(report).not.toContain('safe <b>comment</b>');
		expect(report).toContain('>2</span></div>');
		expect(report).toContain('>1.23</span></div>');
		expect(report).toContain('>DNF</td>');
		expect(report).toContain('@media print');
	});
});
