import React from 'react';
import { Settings, StartInputMethod, InspectionDirection, InspectionFlashConfig, TimePrecision, InspectionVoice, InspectionAbortAction } from '../../types';
import { t } from '../../translations';
import { Keyboard, Zap, Mic, Plug } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { getLang } from './settingsUtils';

interface Props {
	settings: Settings;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	update: (k: keyof Settings, v: any) => void;
	updateFlash: (k: keyof InspectionFlashConfig, v: boolean) => void;
}

export const TimerSettings: React.FC<Props> = ({ settings, update, updateFlash }) => {
	const lang = getLang(settings);
	return (
		<div className="space-y-4">
			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 text-zinc-200 font-medium">
						<Keyboard size={16} className="text-zinc-500"/> 
						{t('timer.startInput', lang)}
					</div>
					<select 
						value={settings.startInput}
						onChange={e => update('startInput', e.target.value)}
						className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
					>
						<option value={StartInputMethod.SPACE}>{t('input.space', lang)}</option>
						<option value={StartInputMethod.CTRL_CTRL}>{t('input.ctrl', lang)}</option>
						<option value={StartInputMethod.NEAR_SPACE}>{t('input.near', lang)}</option>
						<option value={StartInputMethod.ANY}>{t('input.any', lang)}</option>
					</select>
				</div>
              
				<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
					<div className="flex items-center gap-2 text-zinc-200 font-medium">
						<Plug size={16} className="text-zinc-500"/> 
						{t('timer.useStackmat', lang)}
					</div>
					<input 
						type="checkbox" 
						checked={settings.useStackmat} 
						onChange={e => update('useStackmat', e.target.checked)}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>
			</SettingsSection>

			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="font-medium text-zinc-200">{t('timer.inspection', lang)}</div>
					<input 
						type="checkbox" 
						checked={settings.inspectionEnabled} 
						onChange={e => update('inspectionEnabled', e.target.checked)}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>
				{settings.inspectionEnabled && (
					<>
						<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
							<span className="text-sm text-zinc-400">{t('timer.direction', lang)}</span>
							<select 
								value={settings.inspectionDirection}
								onChange={e => update('inspectionDirection', e.target.value)}
								className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
							>
								<option value={InspectionDirection.DOWN}>15 {'->'} 0</option>
								<option value={InspectionDirection.UP}>0 {'->'} 15</option>
							</select>
						</div>

						<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
							<div className="flex items-center gap-2 text-zinc-300 text-sm">
								<Mic size={14} /> {t('timer.voice', lang)}
							</div>
							<select 
								value={settings.inspectionVoice}
								onChange={e => update('inspectionVoice', e.target.value)}
								className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
							>
								<option value={InspectionVoice.NONE}>{t('voice.none', lang)}</option>
								<option value={InspectionVoice.MALE}>{t('voice.male', lang)}</option>
								<option value={InspectionVoice.FEMALE}>{t('voice.female', lang)}</option>
							</select>
						</div>

						<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
							<span className="text-sm text-zinc-400">{t('timer.autoPenalty', lang)}</span>
							<input 
								type="checkbox" 
								checked={settings.autoPenalty} 
								onChange={e => update('autoPenalty', e.target.checked)}
								className="w-5 h-5 accent-blue-600"
							/>
						</div>

						<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
							<span className="text-sm text-zinc-400">{t('timer.abortAction', lang)}</span>
							<select 
								value={settings.inspectionAbortAction}
								onChange={e => update('inspectionAbortAction', e.target.value)}
								className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
							>
								<option value={InspectionAbortAction.DNF}>{t('timer.abortAction.dnf', lang)}</option>
								<option value={InspectionAbortAction.CANCEL}>{t('timer.abortAction.cancel', lang)}</option>
							</select>
						</div>
                      
						<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
							<div className="flex items-center gap-2 text-zinc-300 text-sm">
								<Zap size={14} /> {t('timer.flashes', lang)}
							</div>
							<div className="flex gap-4">
								<label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
									<input type="checkbox" checked={settings.inspectionFlashes?.enabled8} onChange={e => updateFlash('enabled8', e.target.checked)} />
                                   8s
								</label>
								<label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
									<input type="checkbox" checked={settings.inspectionFlashes?.enabled12} onChange={e => updateFlash('enabled12', e.target.checked)} />
                                   12s
								</label>
								<label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
									<input type="checkbox" checked={settings.inspectionFlashes?.enabled15} onChange={e => updateFlash('enabled15', e.target.checked)} />
                                   15s
								</label>
							</div>
						</div>
					</>
				)}
			</SettingsSection>

			<SettingsSection className="flex items-center justify-between">
				<div className="font-medium text-zinc-200">{t('timer.holdToStart', lang)}</div>
				<input 
					type="checkbox" 
					checked={settings.holdToStart} 
					onChange={e => update('holdToStart', e.target.checked)}
					className="w-5 h-5 accent-blue-600"
				/>
			</SettingsSection>

			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="font-medium text-zinc-200">{t('timer.restartDelay', lang)}</div>
					<input 
						type="checkbox" 
						checked={settings.restartDelayEnabled} 
						onChange={e => update('restartDelayEnabled', e.target.checked)}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>
				{settings.restartDelayEnabled && (
					<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
						<span className="text-sm text-zinc-400">ms</span>
						<input 
							type="number"
							value={settings.restartDelayMs}
							onChange={e => update('restartDelayMs', Math.max(0, parseInt(e.target.value)))}
							className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-20 text-right"
						/>
					</div>
				)}
			</SettingsSection>

			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-sm text-zinc-300">{t('timer.precision', lang)}</span>
					<select 
						value={settings.timePrecision}
						onChange={e => update('timePrecision', parseInt(e.target.value))}
						className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
					>
						<option value={TimePrecision.SECONDS}>0</option>
						<option value={TimePrecision.DECI}>0.1</option>
						<option value={TimePrecision.CENTI}>0.01</option>
						<option value={TimePrecision.MILLI}>0.001</option>
					</select>
				</div>
			</SettingsSection>
		</div>
	);
};
