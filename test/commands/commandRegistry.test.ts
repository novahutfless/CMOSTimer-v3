import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_COMMANDS, CommandContext, findCommand, getTargetSolveId, parseCommand } from '../../commands/commandRegistry';
import { ComputedSolve, Penalty } from '../../types';

const solve = (id: string, penalty = Penalty.NONE): ComputedSolve => ({ id, penalty, time: 1000, timestamp: 1, inspectionTime: -1, scramble: [], scramblerId: ['333'], stats: { mean3: null, avg5: null, avg12: null } });

const context = (overrides: Partial<CommandContext> = {}): CommandContext => ({
	settings: { language: 'en' } as CommandContext['settings'],
	setSettings: vi.fn(), sessions: [], computedSolves: [solve('latest') as never], selectedIds: new Set(), lastClickedId: null,
	updateSolve: vi.fn(), updatePenalty: vi.fn(), switchSession: vi.fn(), setGroupBySubsession: vi.fn(), groupBySubsession: false,
	copyStatExport: vi.fn().mockResolvedValue(undefined), installPlugin: vi.fn().mockResolvedValue(undefined), open: vi.fn(),
	...overrides,
});

describe('command registry', () => {
	it('parses identical arguments for long names and abbreviations', () => {
		expect(parseCommand('  ce   ao5 pb ')).toEqual({ command: 'ce', args: 'ao5 pb' });
		expect(findCommand(BUILT_IN_COMMANDS, 'ce')).toBe(findCommand(BUILT_IN_COMMANDS, 'copy-export'));
	});

	it('targets the last-clicked selection, then another selection, then the latest solve', () => {
		const solves = [solve('latest'), solve('selected'), solve('clicked')] as never[];
		expect(getTargetSolveId({ computedSolves: solves, selectedIds: new Set(['selected', 'clicked']), lastClickedId: 'clicked' })).toBe('clicked');
		expect(getTargetSolveId({ computedSolves: solves, selectedIds: new Set(['selected']), lastClickedId: null })).toBe('selected');
		expect(getTargetSolveId({ computedSolves: solves, selectedIds: new Set(), lastClickedId: null })).toBe('latest');
	});

	it('supports penalty arguments and cycling', async () => {
		const ctx = context();
		await findCommand(BUILT_IN_COMMANDS, 'pe')!.execute('+2', ctx);
		expect(ctx.updatePenalty).toHaveBeenCalledWith('latest', Penalty.PLUS_TWO);
		ctx.computedSolves[0]!.penalty = Penalty.PLUS_TWO;
		await findCommand(BUILT_IN_COMMANDS, 'penalty')!.execute('', ctx);
		expect(ctx.updatePenalty).toHaveBeenLastCalledWith('latest', Penalty.DNF);
	});

	it('switches sessions by exact or unique partial name', async () => {
		const ctx = context({ sessions: [{ id: 'practice', name: 'OH Practice' }, { id: 'main', name: 'Main' }] as never[] });
		await findCommand(BUILT_IN_COMMANDS, 'ss')!.execute('oh', ctx);
		expect(ctx.switchSession).toHaveBeenCalledWith('practice');
	});

	it('passes export arguments and toggles grouping', async () => {
		const ctx = context({ groupBySubsession: true });
		await findCommand(BUILT_IN_COMMANDS, 'ce')!.execute('ao5 pb', ctx);
		expect(ctx.copyStatExport).toHaveBeenCalledWith('ao5', true);
		await findCommand(BUILT_IN_COMMANDS, 'gbss')!.execute('', ctx);
		expect(ctx.setGroupBySubsession).toHaveBeenCalledWith(false);
	});
});
