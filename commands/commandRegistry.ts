import { ComputedSolve, Language, Penalty, Session, Settings, Solve } from '../types';

export type CommandResult = 'close' | 'stay-open';

export type CommandContext = {
	settings: Settings;
	setSettings: (settings: Settings) => void;
	sessions: Session[];
	computedSolves: ComputedSolve[];
	selectedIds: Set<string>;
	lastClickedId: string | null;
	selectSolves: (ids: string[]) => void;
	updateSolve: (id: string, updates: Partial<Solve>) => void;
	updatePenalty: (id: string, penalty: Penalty) => void;
	switchSession: (id: string) => void;
	setGroupBySubsession: (enabled: boolean) => void;
	groupBySubsession: boolean;
	setOption: (name: string, value: string) => void;
	setSessionOption: (name: string, value: string | undefined) => void;
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

export const splitCommandChain = (value: string): string[] => {
	const commands: string[] = [];
	let current = '';
	let escaped = false;
	for (const character of value) {
		if (escaped) {
			current += character;
			escaped = false;
		} else if (character === '\\') {
			escaped = true;
		} else if (character === '&') {
			if (current.trim()) commands.push(current.trim());
			current = '';
		} else {
			current += character;
		}
	}
	if (escaped) current += '\\';
	if (current.trim()) commands.push(current.trim());
	return commands;
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

const PENALTIES: Record<string, Penalty> = {
	'none': Penalty.NONE, 'clear': Penalty.NONE, '0': Penalty.NONE,
	'2': Penalty.PLUS_TWO, '+2': Penalty.PLUS_TWO, 'plus2': Penalty.PLUS_TWO,
	'4': Penalty.PLUS_FOUR, '+4': Penalty.PLUS_FOUR,
	'6': Penalty.PLUS_SIX, '+6': Penalty.PLUS_SIX,
	'8': Penalty.PLUS_EIGHT, '+8': Penalty.PLUS_EIGHT,
	'10': Penalty.PLUS_TEN, '+10': Penalty.PLUS_TEN,
	'12': Penalty.PLUS_TWELVE, '+12': Penalty.PLUS_TWELVE,
	'14': Penalty.PLUS_FOURTEEN, '+14': Penalty.PLUS_FOURTEEN,
	'16': Penalty.PLUS_SIXTEEN, '+16': Penalty.PLUS_SIXTEEN,
	'dnf': Penalty.DNF, 'dns': Penalty.DNS,
};

const parsePenalty = (value: string, current: Penalty): Penalty => {
	const normalized = value.toLowerCase().replaceAll(' ', '');
	if (!normalized) return current === Penalty.NONE ? Penalty.PLUS_TWO : current === Penalty.PLUS_TWO ? Penalty.DNF : Penalty.NONE;
	const penalty = PENALTIES[normalized];
	if (!penalty) throw new Error('Penalty must be none, 2–16, DNF, or DNS.');
	return penalty;
};

const selectSolves = (args: string, context: CommandContext): CommandResult => {
	const normalized = args.trim().toLowerCase();
	if (!normalized) throw new Error('Use: sel <number|start-end|latest>');
	if (normalized === 'l' || normalized === 'latest') {
		if (!context.computedSolves[0]) throw new Error('No solve is available.');
		context.selectSolves([context.computedSolves[0].id]);
		return 'close';
	}
	const match = /^(\d+)(?:-(\d+))?$/.exec(normalized);
	if (!match) throw new Error('Use: sel <number|start-end|latest>');
	const start = Number(match[1]);
	const end = Number(match[2] ?? match[1]);
	if (start < 1 || end < start || end > context.computedSolves.length) throw new Error(`Solve range must be between 1 and ${context.computedSolves.length}.`);
	const ids = Array.from({ length: end - start + 1 }, (_, offset) => context.computedSolves[context.computedSolves.length - (start + offset)]!.id);
	context.selectSolves(ids);
	return 'close';
};

const setOption = (args: string, context: CommandContext, session: boolean): CommandResult => {
	const [name, ...valueParts] = args.split(/\s+/);
	if (!name || valueParts.length === 0) throw new Error(`Use: ${session ? 'sopt' : 'opt'} <option> <value>`);
	const value = valueParts.join(' ');
	if (session && value.toLowerCase() === 'unset') context.setSessionOption(name, undefined);
	else if (session) context.setSessionOption(name, value);
	else context.setOption(name, value);
	return 'close';
};

export const BUILT_IN_COMMANDS: CommandDefinition[] = [
	{ name: '?', aliases: ['help', 'h'], description: 'Show every available command', execute: open('help') },
	{ name: 'select', aliases: ['sel'], usage: '<number|start-end|latest>', description: 'Replace the timelist selection', execute: selectSolves },
	{ name: 'details', aliases: ['dt'], description: 'Open details for the selected or latest solve', execute: (_args, context): CommandResult => {
		context.open('details', requireTarget(context)); return 'stay-open'; 
	} },
	{ name: 'penalty', aliases: ['pe', 'p'], usage: '[none|2..16|dnf|dns]', description: 'Set or cycle the current solve penalty', execute: (args, context): CommandResult => {
		const id = requireTarget(context); const solve = context.computedSolves.find(item => item.id === id)!; context.updatePenalty(id, parsePenalty(args, solve.penalty)); return 'close'; 
	} },
	{ name: 'option', aliases: ['opt'], usage: '<name> <value>', description: 'Set a global option', execute: (args, context) => setOption(args, context, false) },
	{ name: 'session-option', aliases: ['sopt'], usage: '<name> <value|unset>', description: 'Set or unset a current-session option', execute: (args, context) => setOption(args, context, true) },
	{ name: 'switch-session', aliases: ['ss'], usage: '[session name]', description: 'Switch session by name, or open sessions', execute: (args, context): CommandResult => {
		if (!args) {
			context.open('sessions'); return 'stay-open';
		}
		const needle = args.toLowerCase();
		const exact = context.sessions.find(session => session.name.toLowerCase() === needle);
		const matches = context.sessions.filter(session => session.name.toLowerCase().includes(needle));
		const session = exact ?? (matches.length === 1 ? matches[0] : undefined);
		if (!session) throw new Error(matches.length > 1 ? 'Session name is ambiguous.' : `Session "${args}" was not found.`);
		context.switchSession(session.id);
		return 'close';
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
