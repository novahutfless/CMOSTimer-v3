import React from 'react';
import { Settings, SettingsUpdater, AppTheme, PBVisualType } from '../../types';
import { t } from '../../translations';
import { Image, Eye, Grid } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { getLang } from './settingsUtils';
import { THEME_OPTIONS, THEME_PRESETS } from '@/utils';

interface Props {
	settings: Settings;
	update: SettingsUpdater;
}

export const AppearanceSettings: React.FC<Props> = ({ settings, update }) => {
	const lang = getLang(settings);
  
	const faceColors: Record<string, string> = settings.scrambleImage?.faceColors || {};
	const clockColors: Record<string, string> = settings.scrambleImage?.clockColors || {};
	
	const updateScrambleColor = (group: 'faceColors' | 'clockColors', key: string, value: string): void => {
		const newConfig = { ...settings.scrambleImage };
		if (group === 'faceColors') 
			newConfig.faceColors = { ...newConfig.faceColors, [key]: value };
		else 
			newConfig.clockColors = { ...newConfig.clockColors, [key]: value };
      
		update('scrambleImage', newConfig);
	};

	const updateBaseColor = (val: string): void => {
		update('scrambleImage', { ...settings.scrambleImage, baseColor: val as Settings['scrambleImage']['baseColor'] });
	};

	const handleThemeChange = (theme: AppTheme): void => {
		update('theme', theme);
		const colors = THEME_PRESETS[theme];
		if (colors) {
			update('backgroundColor', colors.bg);
			update('textColor', colors.text);
		}
	};

	return (
		<div className="space-y-4">
			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">{t('theme.title', lang)}</h3>
			<div className="grid grid-cols-3 gap-2">
				{THEME_OPTIONS.map(theme => (
					<button
						key={theme}
						onClick={() => handleThemeChange(theme)}
						className={`p-3 rounded border text-sm capitalize font-medium transition-all ${settings.theme === theme ? 'ring-2 ring-offset-2 ring-offset-zinc-900 ring-white border-transparent' : 'border-zinc-800 hover:border-zinc-600'}`}
						style={{ 
							backgroundColor: THEME_PRESETS[theme].bg, 
							color: THEME_PRESETS[theme].text 
						}}
					>
						{theme}
					</button>
				))}
			</div>

			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">{t('theme.customColors', lang)}</h3>
			<SettingsSection className="grid grid-cols-2 gap-4">
				<div className="flex flex-col gap-1">
					<span className="text-xs text-zinc-500">{t('color.bg', lang)}</span>
					<div className="flex gap-2">
						<input type="color" value={settings.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="bg-transparent w-8 h-8 cursor-pointer"/>
						<input type="text" value={settings.backgroundColor} onChange={e => update('backgroundColor', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 text-xs font-mono"/>
					</div>
				</div>
				<div className="flex flex-col gap-1">
					<span className="text-xs text-zinc-500">{t('color.text', lang)}</span>
					<div className="flex gap-2">
						<input type="color" value={settings.textColor} onChange={e => update('textColor', e.target.value)} className="bg-transparent w-8 h-8 cursor-pointer"/>
						<input type="text" value={settings.textColor} onChange={e => update('textColor', e.target.value)} className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 text-xs font-mono"/>
					</div>
				</div>
			</SettingsSection>
          
			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">{t('appearance.backgroundImage', lang)}</h3>
			<SettingsSection className="space-y-3">
				<div className="flex flex-col gap-1">
					<span className="text-xs text-zinc-500 flex items-center gap-1"><Image size={12}/> {t('appearance.imageUrl', lang)}</span>
					<input 
						type="text" 
						placeholder="https://example.com/image.jpg"
						value={settings.backgroundImage || ''} 
						onChange={e => update('backgroundImage', e.target.value)} 
						className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm font-mono text-zinc-200"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex justify-between">
						<span className="text-xs text-zinc-500 flex items-center gap-1"><Eye size={12}/> {t('appearance.opacity', lang)}</span>
						<span className="text-xs text-zinc-400">{settings.backgroundImageOpacity}%</span>
					</div>
					<input 
						type="range" 
						min="0" 
						max="100" 
						value={settings.backgroundImageOpacity} 
						onChange={e => update('backgroundImageOpacity', Number.parseInt(e.target.value, 10))}
						className="w-full accent-blue-500"
					/>
				</div>
			</SettingsSection>

			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4 flex items-center gap-2"><Grid size={16}/> {t('appearance.scrambleImage', lang)}</h3>
			<SettingsSection className="space-y-4">
				<div className="flex items-center justify-between">
					<span className="text-sm text-zinc-300">{t('appearance.baseStyle', lang)}</span>
					<select 
						value={settings.scrambleImage?.baseColor || 'black'}
						onChange={e => updateBaseColor(e.target.value)}
						className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm outline-none"
					>
						<option value="black">{t('appearance.base.black', lang)}</option>
						<option value="white">{t('appearance.base.white', lang)}</option>
						<option value="stickerless">{t('appearance.base.stickerless', lang)}</option>
					</select>
				</div>
               
				<div className="space-y-2">
					<span className="text-xs font-bold text-zinc-500 uppercase">{t('appearance.faceColors', lang)}</span>
					<div className="grid grid-cols-6 gap-2">
						{['U', 'R', 'F', 'D', 'L', 'B'].map(key => (
							<div key={key} className="flex flex-col items-center gap-1">
								<input 
									type="color" 
									value={faceColors[key] || '#000000'} 
									onChange={e => updateScrambleColor('faceColors', key, e.target.value)}
									className="bg-transparent w-6 h-6 cursor-pointer"
									title={key}
								/>
								<span className="text-[10px] text-zinc-500 font-mono">{key}</span>
							</div>
						))}
						{['face7', 'face8', 'face9', 'face10', 'face11', 'face12'].map((key, idx) => (
							<div key={key} className="flex flex-col items-center gap-1">
								<input 
									type="color" 
									value={faceColors[key] || '#000000'} 
									onChange={e => updateScrambleColor('faceColors', key, e.target.value)}
									className="bg-transparent w-6 h-6 cursor-pointer"
									title={`Ext ${idx+1}`}
								/>
								<span className="text-[10px] text-zinc-500 font-mono">{idx+7}</span>
							</div>
						))}
					</div>
				</div>

				<div className="space-y-2 border-t border-zinc-800 pt-2">
					<span className="text-xs font-bold text-zinc-500 uppercase">{t('appearance.clockColors', lang)}</span>
					<div className="grid grid-cols-4 gap-2">
						{[
							{ k: 'clockFace', label: 'appearance.clock.face' }, { k: 'clockBack', label: 'appearance.clock.back' }, 
							{ k: 'pinUp', label: 'appearance.clock.pinUp' }, { k: 'pinDown', label: 'appearance.clock.pinDown' },
							{ k: 'wheelF', label: 'appearance.clock.wheelF' }, { k: 'wheelB', label: 'appearance.clock.wheelB' },
							{ k: 'marksF', label: 'appearance.clock.digitF' }, { k: 'marksB', label: 'appearance.clock.digitB' }
						].map(item => (
							<div key={item.k} className="flex flex-col items-center gap-1">
								<input 
									type="color" 
									value={clockColors[item.k] || '#000000'} 
									onChange={e => updateScrambleColor('clockColors', item.k, e.target.value)}
									className="bg-transparent w-6 h-6 cursor-pointer"
								/>
								<span className="text-[10px] text-zinc-500 text-center leading-tight">{t(item.label, lang)}</span>
							</div>
						))}
					</div>
				</div>
			</SettingsSection>

			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">{t('appearance.personalBests', lang)}</h3>
			<SettingsSection className="space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-sm text-zinc-300">{t('pb.visuals', lang)}</span>
					<select 
						value={settings.pbVisuals}
						onChange={e => update('pbVisuals', e.target.value as Settings['pbVisuals'])}
						className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
					>
						<option value={PBVisualType.NONE}>None</option>
						<option value={PBVisualType.HIGHLIGHT}>Highlight</option>
						<option value={PBVisualType.BADGE}>Badge</option>
					</select>
				</div>
				<div className="flex items-center justify-between border-t border-zinc-800 pt-3">
					<div className="font-medium text-zinc-200">{t('pb.fireworks', lang)}</div>
					<input 
						type="checkbox" 
						checked={settings.pbFireworks} 
						onChange={e => update('pbFireworks', e.target.checked)}
						className="w-5 h-5 accent-blue-600"
					/>
				</div>
			</SettingsSection>
		</div>
	);
};
