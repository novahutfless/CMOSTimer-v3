

import { Settings, Session } from '../types';

export const getEffectiveSettings = (global: Settings, session?: Session): Settings => {
	if (!session || !session.settingsOverride) return global;
  
	const override = session.settingsOverride;
	const effective = { ...global };

	if (override.inspectionEnabled !== undefined) effective.inspectionEnabled = override.inspectionEnabled;
	if (override.inspectionDirection !== undefined) effective.inspectionDirection = override.inspectionDirection;
	if (override.inspectionVoice !== undefined) effective.inspectionVoice = override.inspectionVoice;
	if (override.autoPenalty !== undefined) effective.autoPenalty = override.autoPenalty;
	if (override.holdToStart !== undefined) effective.holdToStart = override.holdToStart;
	if (override.restartDelayEnabled !== undefined) effective.restartDelayEnabled = override.restartDelayEnabled;
	if (override.restartDelayMs !== undefined) effective.restartDelayMs = override.restartDelayMs;
	if (override.timePrecision !== undefined) effective.timePrecision = override.timePrecision;
	if (override.inspectionPrecision !== undefined) effective.inspectionPrecision = override.inspectionPrecision;
	if (override.hideWhileTiming !== undefined) effective.hideWhileTiming = override.hideWhileTiming;
	if (override.numberOfPhases !== undefined) effective.numberOfPhases = override.numberOfPhases;
	if (override.prePBs !== undefined) effective.prePBs = override.prePBs;
	if (override.useStackmat !== undefined) effective.useStackmat = override.useStackmat;
	if (override.virtualCube !== undefined) effective.virtualCube = override.virtualCube;

	return effective;
};