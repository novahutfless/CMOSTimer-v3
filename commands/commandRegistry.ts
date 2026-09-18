import { ComputedSolve, Language, Penalty, Session, Settings, Solve } from '../types';

export type CommandResult = 'close' | 'stay-open';

export type CommandContext = {
	settings: Settings;
	setSettings: (settings: Settings) => void;
	sessions: Session[];
	computedSolves: ComputedSolve[];
	selectedIds: Set<string>;
	lastClickedId: string | null;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	updatePenalty: (id: string, penalty: Penalty) => void;
	switchSession: (id: string) => void;
	setGroupBySubsession: (enabled: boolean) => void;
	groupBySubsession: boolean;
	copyStatExport: (selector: string, best: boolean) => Promise<void>;
	installPlugin: (name: string) => Promise<void>;
	open: (target: 'help' | 'settings' | 'sessions' | 'statistics' | 'data' | 'manual' | 'rewind' | 'onboarding' | 'details', solveId?: string) => void;
};

export type CommandDefinition = {
	name: string;
	aliases: string[];
	usage?: string;
	description: string;
	execute: (args: string, context: CommandContext) => CommandResult | Promise<CommandResult>;
};

export const parseCommand = (value: string): { command: string; args: string } => {
	const trimmed = value.trim();
	const space = trimmed.search(/\s/);
	return space < 0
		? { command: trimmed.toLowerCase(), args: '' }
		: { command: trimmed.slice(0, space).toLowerCase(), args: trimmed.slice(space + 1).trim() };
};

export const getTargetSolveId = (context: Pick<CommandContext, 'computedSolves' | 'selectedIds' | 'lastClickedId'>): string | null => {
	if (context.lastClickedId && context.selectedIds.has(context.lastClickedId)) return context.lastClickedId;
	return context.computedSolves.find(solve => context.selectedIds.has(solve.id))?.id ?? context.computedSolves[0]?.id ?? null;
};

const requireTarget = (context: CommandContext): string => {
	const id = getTargetSolveId(context);
	if (!id) throw new Error('No solve is available.');
	return id;
};

const open = (target: Parameters<CommandContext['open']>[0]): CommandDefinition['execute'] => (_args, context) => {
	context.open(target);
	return 'stay-open';
};

const parsePenalty = (value: string, current: Penalty): Penalty => {
	const normalized = value.toLowerCase().replaceAll(' ', '');
	if (!normalized) return current === Penalty.NONE ? Penalty.PLUS_TWO : current === Penalty.PLUS_TWO ? Penalty.DNF : Penalty.NONE;
	if (['none', 'clear', '0'].includes(normalized)) return Penalty.NONE;
	if (['+2', '2', 'plus2'].includes(normalized)) return Penalty.PLUS_TWO;
	if (normalized === 'dnf') return Penalty.DNF;
	if (normalized === 'dns') return Penalty.DNS;
	throw new Error('Penalty must be none, +2, DNF, or DNS.');
};

export const BUILT_IN_COMMANDS: CommandDefinition[] = [
	{ name: '?', aliases: ['help', 'h'], description: 'Show every available command', execute: open('help') },
	{ name: 'details', aliases: ['dt'], description: 'Open details for the selected or latest solve', execute: (_args, context): CommandResult => {
		context.open('details', requireTarget(context)); return 'stay-open'; 
	} },
	{ name: 'penalty', aliases: ['pe'], usage: '[none|+2|dnf|dns]', description: 'Set or cycle the current solve penalty', execute: (args, context): CommandResult => {
		const id = requireTarget(context); const solve = context.computedSolves.find(item => item.id === id)!; context.updatePenalty(id, parsePenalty(args, solve.penalty)); return 'close'; 
	} },
	{ name: 'switch-session', aliases: ['ss'], usage: '[session name]', description: 'Switch session by name, or open sessions', execute: (args, context): CommandResult => {
		if (!args) {
			context.open('sessions'); return 'stay-open'; 
		} const needle = args.toLowerCase(); const exact = context.sessions.find(session => session.name.toLowerCase() === needle); const matches = context.sessions.filter(session => session.name.toLowerCase().includes(needle)); const session = exact ?? (matches.length === 1 ? matches[0] : undefined); if (!session) throw new Error(matches.length > 1 ? 'Session name is ambiguous.' : `Session “${args}” was not found.`); context.switchSession(session.id); return 'close'; 
	} },
	{ name: 'copy-export', aliases: ['ce'], usage: '<stat> [pb]', description: 'Copy the current or PB stat window, e.g. ce ao5 pb', execute: async (args, context): Promise<CommandResult> => {
		const [selector, mode, ...extra] = args.toLowerCase().split(/\s+/).filter(Boolean); if (!selector || extra.length || (mode && mode !== 'pb')) throw new Error('Use: ce <stat> [pb]'); await context.copyStatExport(selector, mode === 'pb'); return 'close' as const; 
	} },
	{ name: 'group-by-subsession', aliases: ['gbss'], usage: '[on|off|toggle]', description: 'Toggle timelist grouping by subsession', execute: (args, context): CommandResult => {
		const mode = args.toLowerCase() || 'toggle'; if (!['on', 'off', 'toggle'].includes(mode)) throw new Error('Use: gbss [on|off|toggle]'); context.setGroupBySubsession(mode === 'toggle' ? !context.groupBySubsession : mode === 'on'); return 'close'; 
	} },
	{ name: 'install-plugin', aliases: ['ip'], usage: '<name>', description: 'Install or update a registry plugin by name', execute: async (args, context): Promise<CommandResult> => {
		if (!args) throw new Error('Use: ip <plugin name>'); await context.installPlugin(args); return 'close' as const; 
	} },
	{ name: 'comment', aliases: ['c'], usage: '[text]', description: 'Set the current solve comment', execute: (args, context): CommandResult => {
		context.updateSolve(requireTarget(context), { comment: args }); return 'close'; 
	} },
	{ name: 'tags', aliases: ['t'], usage: '[tag, tag]', description: 'Set the current solve tags', execute: (args, context): CommandResult => {
		context.updateSolve(requireTarget(context), { tags: args.split(',').map(tag => tag.trim()).filter(Boolean) }); return 'close'; 
	} },
	{ name: 'language', aliases: ['lang'], usage: '<code>', description: 'Set the interface language', execute: (args, context): CommandResult => {
		if (!args) throw new Error('A language code is required.'); context.setSettings({ ...context.settings, language: args as Language }); return 'close'; 
	} },
	{ name: 'settings', aliases: ['se'], description: 'Open settings', execute: open('settings') },
	{ name: 'sessions', aliases: ['sm'], description: 'Open session manager', execute: open('sessions') },
	{ name: 'statistics', aliases: ['st'], description: 'Open statistics', execute: open('statistics') },
	{ name: 'data', aliases: ['da'], description: 'Open data management', execute: open('data') },
	{ name: 'manual-entry', aliases: ['me'], description: 'Enter a solve manually', execute: open('manual') },
	{ name: 'rewind', aliases: ['rw'], description: 'Open solve rewind', execute: open('rewind') },
	{ name: 'onboarding', aliases: ['ob', 'welcome', 'tour'], description: 'Open the onboarding tour', execute: open('onboarding') },
];

export const findCommand = (commands: CommandDefinition[], name: string): CommandDefinition | undefined =>
	commands.find(command => command.name === name || command.aliases.includes(name));
