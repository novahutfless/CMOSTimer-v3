import {
	AppTheme,
	DateFormat,
	InspectionAbortAction,
	InspectionDirection,
	InspectionVoice,
	PBVisualType,
	Session,
	Settings,
	Solve,
	SolveMap,
	StartInputMethod,
	StatConfig,
	StatType,
	ShortcutAction,
	TimePrecision,
	WidgetId
} from '../types';
import { generateTestSessions } from '../utils/testData';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/layouts';

type LegacyScramblerId = string | string[];
type LegacyScramble = string | string[] | string[][];
type SolveWithOptionalStats = Solve & { stats?: unknown };

export const normalizeScramblerId = (scramblerId: LegacyScramblerId | undefined, fallback?: LegacyScramblerId): string[] => {
	const resolved = scramblerId ?? fallback ?? '333';
	return Array.isArray(resolved) ? resolved : [resolved];
};

export const normalizeScramble = (scramble: LegacyScramble | undefined): string[][] => {
	if (!scramble) return [];
	if (typeof scramble === 'string') return [scramble.split(' ')];
	if (Array.isArray(scramble)) {
		if (scramble.length > 0 && typeof scramble[0] === 'string') return [scramble as string[]];
		return scramble as string[][];
	}
	return [];
};

export const DEFAULT_STATS_CONFIG: StatConfig[] = [
	{ id: '1', type: StatType.SINGLE, size: 1 },
	{ id: '2', type: StatType.MEAN, size: 3 },
	{ id: '3', type: StatType.AVERAGE, size: 5 },
	{ id: '4', type: StatType.AVERAGE, size: 12 },
	{ id: '5', type: StatType.AVERAGE, size: 50 },
	{ id: '6', type: StatType.AVERAGE, size: 100 },
	{ id: '7', type: StatType.WEIGHTED_AVG, size: 1000 },
];

export const DEFAULT_TIMELIST_CONFIG: StatConfig[] = [
	{ id: 'ml0', type: StatType.SINGLE, size: 1 },
	{ id: 'ml1', type: StatType.MEAN, size: 3 },
	{ id: 'ml2', type: StatType.AVERAGE, size: 5 }
];

export const DEFAULT_SHORTCUTS: Record<ShortcutAction, string | null> = {
	[ShortcutAction.NEXT_SCRAMBLE]: 'Digit2',
	[ShortcutAction.PREV_SCRAMBLE]: 'Shift+Digit2',
	[ShortcutAction.PENALTY_PLUS_TWO]: 'Digit3',
	[ShortcutAction.PENALTY_DNF]: 'Digit4',
	[ShortcutAction.DELETE_LAST]: 'Backspace',
	[ShortcutAction.SELECT_FIRST]: 'Digit7',
	[ShortcutAction.OPEN_DETAILS]: 'Ctrl+Digit2',
	[ShortcutAction.ESCAPE]: 'Escape',
	[ShortcutAction.MOVE_SELECTION_UP]: 'ArrowUp',
	[ShortcutAction.MOVE_SELECTION_DOWN]: 'ArrowDown',
	[ShortcutAction.EXTEND_SELECTION_UP]: 'Shift+ArrowUp',
	[ShortcutAction.EXTEND_SELECTION_DOWN]: 'Shift+ArrowDown',
	[ShortcutAction.OPEN_SESSION_MANAGER]: 'Digit8',
	[ShortcutAction.MANUAL_ENTRY]: 'Digit1',
	[ShortcutAction.PREV_PUZZLE]: 'ArrowLeft',
	[ShortcutAction.NEXT_PUZZLE]: 'ArrowRight',
	[ShortcutAction.OPEN_COMMAND_PALETTE]: 'Digit5'
};

export const DEFAULT_SETTINGS: Settings = {
	inspectionEnabled: true,
	inspectionDirection: InspectionDirection.DOWN,
	inspectionVoice: InspectionVoice.NONE,
	inspectionAbortAction: InspectionAbortAction.DNF,
	autoPenalty: true,
	holdToStart: true,
	startInput: StartInputMethod.SPACE,
	restartDelayEnabled: false,
	restartDelayMs: 500,
	timePrecision: TimePrecision.MILLI,
	inspectionPrecision: TimePrecision.SECONDS,
	inspectionFlashes: { enabled8: false, enabled12: false, enabled15: false },
	useStackmat: false,
	hideWhileTiming: false,
	hideWhileTimingText: '',
	theme: AppTheme.ZINC,
	backgroundColor: '#18181b',
	textColor: '#e4e4e7',
	backgroundImage: '',
	backgroundImageOpacity: 20,
	language: 'en',
	dateFormat: DateFormat.ISO,
	pbVisuals: PBVisualType.HIGHLIGHT,
	pbFireworks: true,
	paginationEnabled: false,
	pageSize: 100,
	timelistStats: DEFAULT_TIMELIST_CONFIG,
	timeDistribution: { mode: 'ALL', size: 100 },
	solvesOverTime: {
		mode: 'SESSION',
		customDate: new Date().toISOString().split('T')[0],
		customCount: 100
	},
	goalsWidget: {
		showCompleted: true
	},
	metronome: {
		bpm: 60,
		volume: 50
	},
	mobileLayout: {
		enabled: false,
		slot1: WidgetId.EMPTY,
		slot2: WidgetId.EMPTY
	},
	shortcuts: DEFAULT_SHORTCUTS,
	layout: DEFAULT_LAYOUT_CONFIG,
	scrambleImage: {
		baseColor: 'black',
		faceColors: {
			U: '#FFFFFF', R: '#DC2626', F: '#16A34A', D: '#EAB308', L: '#EA580C', B: '#2563EB',
			face7: '#9CA3AF', face8: '#F472B6', face9: '#FEF3C7', face10: '#A7F3D0', face11: '#C084FC', face12: '#FCD34D'
		},
		clockColors: {
			clockFace: '#374151', clockBack: '#1F2937',
			pinUp: '#EAB308', pinDown: '#4B5563',
			wheelF: '#1F2937', wheelB: '#374151',
			marksF: '#FFFFFF', marksB: '#FFFFFF'
		}
	},
	pbSheet: {
		enabled: false,
		title: 'My PBs',
		sessionIds: [],
		stats: [
			{ id: 's_single', type: StatType.SINGLE, size: 1 },
			{ id: 's_mo3', type: StatType.MEAN, size: 3 },
			{ id: 's_ao5', type: StatType.AVERAGE, size: 5 },
			{ id: 's_ao12', type: StatType.AVERAGE, size: 12 },
			{ id: 's_ao50', type: StatType.AVERAGE, size: 50 },
			{ id: 's_ao100', type: StatType.AVERAGE, size: 100 },
			{ id: 's_ao500', type: StatType.AVERAGE, size: 500 },
			{ id: 's_ao1000', type: StatType.AVERAGE, size: 1000 }
		],
		showDate: true,
		showSolveCount: true
	}
};

export const buildDefaultNormalizedData = (): { sessions: Session[]; solves: SolveMap } => {
	const sessions: Session[] = [];
	const solves: SolveMap = {};
	const test = generateTestSessions();

	test.forEach(s => {
		const solveIds = (s.solves || []).map((solve: Solve) => {
			solve.scramble = normalizeScramble(solve.scramble as unknown as LegacyScramble);
			solve.scramblerId = normalizeScramblerId(solve.scramblerId as unknown as LegacyScramblerId);
			if ('stats' in (solve as SolveWithOptionalStats)) delete (solve as SolveWithOptionalStats).stats;
			solves[solve.id] = solve;
			return solve.id;
		});
		const { solves: _solves, ...rest } = s;
		void _solves;
		sessions.push({ ...rest, scramblerId: [rest.scramblerId], solveIds, sourceSessionIds: [] } as Session);
	});

	return { sessions, solves };
};
