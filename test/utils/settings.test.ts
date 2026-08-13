import { describe, it, expect } from 'vitest';
import { getEffectiveSettings } from '../../utils/settings';
import { mergeSettingsWithDefaults } from '../../store/storageState';
import { AppTheme, DateFormat, InspectionDirection, InspectionVoice, InspectionAbortAction, PBVisualType, ShortcutAction, StartInputMethod, TimePrecision, WidgetId, Language } from '../../types';
import { Settings, Session } from '../../types';
import { buildSettingsPatch } from '../../store/solveOrder';

const baseSettings = (): Settings => ({
	inspectionEnabled: true,
	inspectionDirection: InspectionDirection.UP,
	inspectionVoice: InspectionVoice.NONE,
	inspectionAbortAction: InspectionAbortAction.DNF,
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
	layout: { presetId: 'standard', widgetMapping: { timer: WidgetId.TIMER }, mirror: false },
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
				inspectionAbortAction: InspectionAbortAction.CANCEL,
				restartDelayMs: 500,
				virtualCube: true
			}
		};
		const effective = getEffectiveSettings(global, session);
		expect(effective.inspectionEnabled).toBe(false);
		expect(effective.inspectionAbortAction).toBe(InspectionAbortAction.CANCEL);
		expect(effective.restartDelayMs).toBe(500);
		expect(effective.virtualCube).toBe(true);
	});

	it('merges persisted settings with nested defaults', () => {
		const merged = mergeSettingsWithDefaults({
			mobileLayout: { enabled: true, slot1: WidgetId.TIMER, slot2: WidgetId.EMPTY },
			scrambleImage: {
				baseColor: 'white',
				faceColors: { U: '#111111', R: '#222222', F: '#333333', D: '#444444', L: '#555555', B: '#666666', face7: '#777777', face8: '#888888', face9: '#999999', face10: '#aaaaaa', face11: '#bbbbbb', face12: '#cccccc' },
				clockColors: { clockFace: '#123456', clockBack: '#234567', pinUp: '#345678', pinDown: '#456789', wheelF: '#56789a', wheelB: '#6789ab', marksF: '#789abc', marksB: '#89abcd' }
			}
		});

		expect(merged.mobileLayout.enabled).toBe(true);
		expect(merged.mobileLayout.slot1).toBe(WidgetId.TIMER);
		expect(merged.mobileLayout.slot2).toBe(WidgetId.EMPTY);
		expect(merged.scrambleImage.baseColor).toBe('white');
		expect(merged.pbSheet.enabled).toBe(false);
	});

	it('builds leaf-level patches so concurrent nested changes do not overwrite each other', () => {
		const previous = { ...baseSettings(), backgroundImage: 'data:image/png;base64,old' };
		const next = {
			...previous,
			mobileLayout: { ...previous.mobileLayout, enabled: true },
			scrambleImage: {
				...previous.scrambleImage,
				faceColors: { ...previous.scrambleImage.faceColors, U: '#abcdef' }
			}
		};
		delete (next as Partial<Settings>).backgroundImage;

		expect(buildSettingsPatch(previous, next)).toEqual({
			backgroundImage: { __cmosDelete: true },
			mobileLayout: { enabled: true },
			scrambleImage: { faceColors: { U: '#abcdef' } }
		});
	});
});
