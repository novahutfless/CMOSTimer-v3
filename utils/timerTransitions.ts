import { Settings, StartInputMethod, TimerState } from '../types';

type TimerInputSettings = Pick<Settings, 'startInput' | 'inspectionEnabled' | 'holdToStart'>;

export type TimerPressIntent = 'IGNORE' | 'SPLIT' | 'INSPECTION' | 'PREPARE' | 'READY';
export type TimerReleaseIntent = 'IGNORE' | 'START' | 'CANCEL_TO_IDLE' | 'CANCEL_TO_INSPECTION';

export const isTimerStartKey = (startInput: StartInputMethod, code: string): boolean => {
	switch (startInput) {
	case StartInputMethod.SPACE:
		return code === 'Space';
	case StartInputMethod.CTRL_CTRL:
		return code === 'ControlLeft' || code === 'ControlRight';
	case StartInputMethod.NEAR_SPACE:
		return ['Space', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'AltLeft', 'AltRight'].includes(code);
	case StartInputMethod.ANY:
		return true;
	default:
		return code === 'Space';
	}
};

export const areTimerStartKeysReady = (startInput: StartInputMethod, pressed: ReadonlySet<string>): boolean =>
	startInput !== StartInputMethod.CTRL_CTRL || (pressed.has('ControlLeft') && pressed.has('ControlRight'));

export const nextTimerPressIntent = (state: TimerState, settings: TimerInputSettings, pressed: ReadonlySet<string>): TimerPressIntent => {
	if (state === TimerState.LOCKED)
		return 'IGNORE';
	if (state === TimerState.RUNNING)
		return 'SPLIT';
	if ((state === TimerState.IDLE || state === TimerState.STOPPED) && settings.inspectionEnabled)
		return 'INSPECTION';
	if ((state === TimerState.IDLE || state === TimerState.STOPPED || state === TimerState.INSPECTION) && areTimerStartKeysReady(settings.startInput, pressed))
		return settings.holdToStart ? 'PREPARE' : 'READY';
	return 'IGNORE';
};

export const nextTimerReleaseIntent = (state: TimerState, preparedFromInspection: boolean): TimerReleaseIntent => {
	if (state === TimerState.READY)
		return 'START';
	if (state === TimerState.HOLDING)
		return preparedFromInspection ? 'CANCEL_TO_INSPECTION' : 'CANCEL_TO_IDLE';
	return 'IGNORE';
};
