import React from 'react';
import { Settings, Language, AppTheme, PBVisualType, ScrambleImageConfig } from '../../types';
import { t } from '../../translations';
import { Image, Eye, Grid } from 'lucide-react';

interface Props { settings: Settings; update: (k: keyof Settings, v: any) => void; }

const THEME_PRESETS: Record<AppTheme, { bg: string, text: string }> = {
	[AppTheme.ZINC]: { bg: '#18181b', text: '#e4e4e7' },
	[AppTheme.BLUE]: { bg: '#172554', text: '#bfdbfe' },
	[AppTheme.GREEN]: { bg: '#052e16', text: '#bbf7d0' },
	[AppTheme.ORANGE]: { bg: '#431407', text: '#fed7aa' },
	[AppTheme.PURPLE]: { bg: '#3b0764', text: '#e9d5ff' },
	[AppTheme.ROSE]: { bg: '#4c0519', text: '#fecdd3' },
};

export const AppearanceSettings: React.FC<Props> = ({ settings, update }) => {
	const lang = settings.language || Language.EN;
  
	const updateScrambleColor = (group: 'faceColors' | 'clockColors', key: string, value: string) => {
		const newConfig = { ...settings.scrambleImage };
		if (group === 'faceColors') 
			newConfig.faceColors = { ...newConfig.faceColors, [key]: value };
		else 
			newConfig.clockColors = { ...newConfig.clockColors, [key]: value };
      
		update('scrambleImage', newConfig);
	};

	const updateBaseColor = (val: string) => {
		update('scrambleImage', { ...settings.scrambleImage, baseColor: val });
	};

	const handleThemeChange = (theme: AppTheme) => {
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
				{[AppTheme.ZINC, AppTheme.BLUE, AppTheme.GREEN, AppTheme.ORANGE, AppTheme.PURPLE, AppTheme.ROSE].map(theme => (
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
			<div className="bg-zinc-950 p-3 rounded border border-zinc-800 grid grid-cols-2 gap-4">
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
			</div>
          
			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">Background Image</h3>
			<div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-3">
				<div className="flex flex-col gap-1">
					<span className="text-xs text-zinc-500 flex items-center gap-1"><Image size={12}/> Image URL</span>
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
						<span className="text-xs text-zinc-500 flex items-center gap-1"><Eye size={12}/> Opacity</span>
						<span className="text-xs text-zinc-400">{settings.backgroundImageOpacity}%</span>
					</div>
					<input 
						type="range" 
						min="0" 
						max="100" 
						value={settings.backgroundImageOpacity} 
						onChange={e => update('backgroundImageOpacity', parseInt(e.target.value))} 
						className="w-full accent-blue-500"
					/>
				</div>
			</div>

			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4 flex items-center gap-2"><Grid size={16}/> Scramble Image</h3>
			<div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-4">
				<div className="flex items-center justify-between">
					<span className="text-sm text-zinc-300">Base Style</span>
					<select 
						value={settings.scrambleImage?.baseColor || 'black'}
						onChange={e => updateBaseColor(e.target.value)}
						className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm outline-none"
					>
						<option value="black">Black (Normal)</option>
						<option value="white">White (Inverse)</option>
						<option value="stickerless">Stickerless</option>
					</select>
				</div>
               
				<div className="space-y-2">
					<span className="text-xs font-bold text-zinc-500 uppercase">Face Colors</span>
					<div className="grid grid-cols-6 gap-2">
						{['U', 'R', 'F', 'D', 'L', 'B'].map(key => (
							<div key={key} className="flex flex-col items-center gap-1">
								<input 
									type="color" 
									value={(settings.scrambleImage?.faceColors as any)[key]} 
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
									value={(settings.scrambleImage?.faceColors as any)[key]} 
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
					<span className="text-xs font-bold text-zinc-500 uppercase">Clock Colors</span>
					<div className="grid grid-cols-4 gap-2">
						{[
							{ k: 'clockFace', l: 'Face' }, { k: 'clockBack', l: 'Back' }, 
							{ k: 'pinUp', l: 'Pin U' }, { k: 'pinDown', l: 'Pin D' },
							{ k: 'wheelF', l: 'Wheel F' }, { k: 'wheelB', l: 'Wheel B' },
							{ k: 'marksF', l: 'Digit F' }, { k: 'marksB', l: 'Digit B' }
						].map(item => (
							<div key={item.k} className="flex flex-col items-center gap-1">
								<input 
									type="color" 
									value={(settings.scrambleImage?.clockColors as any)[item.k]} 
									onChange={e => updateScrambleColor('clockColors', item.k, e.target.value)}
									className="bg-transparent w-6 h-6 cursor-pointer"
								/>
								<span className="text-[10px] text-zinc-500 text-center leading-tight">{item.l}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2 pt-4">Personal Bests</h3>
			<div className="bg-zinc-950 p-3 rounded border border-zinc-800 space-y-3">
				<div className="flex items-center justify-between">
					<span className="text-sm text-zinc-300">{t('pb.visuals', lang)}</span>
					<select 
						value={settings.pbVisuals}
						onChange={e => update('pbVisuals', e.target.value)}
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
			</div>
		</div>
	);
};