import { describe, it, expect } from 'vitest';
import { getEffectiveSettings } from '../../utils/settings';
import { AppTheme, DateFormat, InspectionDirection, InspectionVoice, PBVisualType, ShortcutAction, StartInputMethod, TimePrecision, WidgetId, Language } from '../../types';
import { Settings, Session } from '../../types';

const baseSettings = (): Settings => ({
	inspectionEnabled: true,
	inspectionDirection: InspectionDirection.UP,
	inspectionVoice: InspectionVoice.NONE,
	autoPenalty: false,
	holdToStart: false,
	startInput: StartInputMethod.SPACE,
	restartDelayEnabled: false,
	restartDelayMs: 0,
	timePrecision: TimePrecision.CENTI,
	inspectionPrecision: TimePrecision.CENTI,
	inspectionFlashes: { enabled8: false, enabled12: false, enabled15: false },
	useStackmat: false,
	hideWhileTiming: false,
	hideWhileTimingText: '',
	theme: AppTheme.ZINC,
	backgroundColor: '#000000',
	textColor: '#ffffff',
	backgroundImageOpacity: 1,
	language: Language.EN,
	layout: { presetId: 'standard', widgetMapping: { timer: WidgetId.TIMER } },
	dateFormat: DateFormat.ISO,
	scrambleImage: {
		baseColor: 'black',
		faceColors: { U: '', R: '', F: '', D: '', L: '', B: '', face7: '', face8: '', face9: '', face10: '', face11: '', face12: '' },
		clockColors: { clockFace: '', clockBack: '', pinUp: '', pinDown: '', wheelF: '', wheelB: '', marksF: '', marksB: '' }
	},
	pbVisuals: PBVisualType.NONE,
	pbFireworks: false,
	paginationEnabled: false,
	pageSize: 10,
	timelistStats: [],
	timeDistribution: { mode: 'ALL', size: 10 },
	solvesOverTime: { mode: 'SESSION', customDate: '', customCount: 0 },
	goalsWidget: { showCompleted: true },
	metronome: { bpm: 120, volume: 50 },
	mobileLayout: { enabled: false, slot1: WidgetId.EMPTY, slot2: WidgetId.EMPTY },
	shortcuts: Object.values(ShortcutAction).reduce((acc, key) => {
		acc[key] = null;
		return acc;
	}, {} as Record<ShortcutAction, null>),
	pbSheet: { enabled: false, title: '', sessionIds: [], stats: [], showDate: false, showSolveCount: false }
});

describe('Settings Utils', () => {
	it('returns global settings when no session override', () => {
		const global = baseSettings();
		const effective = getEffectiveSettings(global);
		expect(effective).toBe(global);
	});

	it('applies session overrides', () => {
		const global = baseSettings();
		const session: Session = {
			id: 's1',
			name: 'Test',
			scramblerId: [],
			solveIds: [],
			settingsOverride: {
				inspectionEnabled: false,
				restartDelayMs: 500,
				virtualCube: true
			}
		};
		const effective = getEffectiveSettings(global, session);
		expect(effective.inspectionEnabled).toBe(false);
		expect(effective.restartDelayMs).toBe(500);
		expect(effective.virtualCube).toBe(true);
	});
});
