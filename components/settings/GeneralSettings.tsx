import React from 'react';
import { Settings, DateFormat } from '../../types';
import { getAvailableLanguages, t } from '../../translations';
import { Globe, EyeOff, Calendar } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { getLang } from './settingsUtils';

interface Props {
	settings: Settings;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	update: (k: keyof Settings, v: any) => void;
}

export const GeneralSettings: React.FC<Props> = ({ settings, update }) => {
	const lang = getLang(settings);
	const availableLanguages = getAvailableLanguages(lang);
	const languageOptions = availableLanguages.some(option => option.code === settings.language)
		? availableLanguages
		: [...availableLanguages, { code: settings.language, label: settings.language }];
	return (
		<div className="space-y-4">
			<SettingsSection className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Globe size={16} className="text-zinc-400"/>
					<div className="font-medium text-zinc-200">{t('lang.select', lang)}</div>
				</div>
				<select 
					value={settings.language}
					onChange={e => update('language', e.target.value)}
					className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
				>
					{languageOptions.map(option => (
						<option key={option.code} value={option.code}>{option.label}</option>
					))}
				</select>
			</SettingsSection>

			<SettingsSection className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Calendar size={16} className="text-zinc-400"/>
					<div className="font-medium text-zinc-200">{t('settings.dateFormat', lang)}</div>
				</div>
				<select 
					value={settings.dateFormat}
					onChange={e => update('dateFormat', e.target.value)}
					className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
				>
					<option value={DateFormat.ISO}>{t('date.fmt.iso', lang)}</option>
					<option value={DateFormat.US}>{t('date.fmt.us', lang)}</option>
					<option value={DateFormat.EU}>{t('date.fmt.eu', lang)}</option>
				</select>
			</SettingsSection>

			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2">
				<EyeOff size={16} /> {t('settings.uiBehavior', lang)}
			</h3>
          
			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<div className="font-medium text-zinc-200">{t('ui.hideWhileTiming', lang)}</div>
					<input 
						type="checkbox" 
						checked={settings.hideWhileTiming} 
						onChange={e => update('hideWhileTiming', e.target.checked)}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>
				{settings.hideWhileTiming && (
					<div className="border-t border-zinc-800 pt-2">
						<span className="text-xs text-zinc-500 block mb-1">{t('ui.hideText', lang)}</span>
						<input 
							type="text" 
							value={settings.hideWhileTimingText || ''} 
							onChange={e => update('hideWhileTimingText', e.target.value)}
							placeholder={t('timer.solvingPlaceholder', lang)}
							className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
						/>
					</div>
				)}
			</SettingsSection>

			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<div>
						<div className="font-medium text-zinc-200">{t('ui.pagination', lang)}</div>
					</div>
					<input 
						type="checkbox" 
						checked={settings.paginationEnabled} 
						onChange={e => update('paginationEnabled', e.target.checked)}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>
				{settings.paginationEnabled && (
					<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
						<span className="text-sm text-zinc-400">{t('ui.pageSize', lang)}</span>
						<input 
							type="number"
							value={settings.pageSize}
							onChange={e => update('pageSize', Math.max(10, parseInt(e.target.value)))}
							className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm w-20 text-right"
						/>
					</div>
				)}
			</SettingsSection>
		</div>
	);
};
