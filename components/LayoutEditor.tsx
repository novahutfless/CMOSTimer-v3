

import React, { useState } from 'react';
import { LayoutConfig, WidgetId, Language } from '../types';
import { LAYOUT_PRESETS, WIDGET_DEFINITIONS, getPreset } from '../utils/layouts';
import { pluginManager } from '../plugins/PluginManager';
import { X, Check, Lock, Zap } from 'lucide-react';
import { t } from '../translations';
import { useAppStore } from '../hooks/useAppStore';

interface Props {
    initialConfig: LayoutConfig;
    onSave: (config: LayoutConfig) => void;
    onClose: () => void;
}

export const LayoutEditor: React.FC<Props> = ({ initialConfig, onSave, onClose }) => {
    const { settings } = useAppStore();
    const lang = settings.language || Language.EN;
    const [config, setConfig] = useState<LayoutConfig>(initialConfig);
    const preset = getPreset(config.presetId);
    const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

    const lockedMappings = preset.lockedMappings || {};
    const pluginWidgets = pluginManager.getWidgets();

    const allWidgets = [
        ...WIDGET_DEFINITIONS,
        ...pluginWidgets.map(p => ({ id: p.id, name: p.name, isPlugin: true }))
    ];

    const handlePresetChange = (id: string) => {
        const newPreset = getPreset(id);
        const newLocked: Record<string, WidgetId> = newPreset.lockedMappings || {};
        
        const newMapping: Record<string, WidgetId> = { ...newLocked };
        
        // Attempt to port over placement if area ID matches and is not locked
        Object.entries(config.widgetMapping).forEach(([areaId, w]) => {
            const widget = w;
            if (newPreset.areas.find(a => a.id === areaId) && !newLocked[areaId] && !Object.values(newLocked).includes(widget)) {
                newMapping[areaId] = widget;
            }
        });
        setConfig({ presetId: id, widgetMapping: newMapping as any });
    };

    const handleDrop = (areaId: string) => {
        if (!draggedWidget) return;
        if (lockedMappings[areaId]) return; 
        
        const newMapping = { ...config.widgetMapping };
        // Enforce single instance
        Object.keys(newMapping).forEach(key => {
            if (newMapping[key] === draggedWidget && !lockedMappings[key]) delete newMapping[key];
        });
        
        newMapping[areaId] = draggedWidget as WidgetId;
        setConfig(prev => ({ ...prev, widgetMapping: newMapping }));
        setDraggedWidget(null);
    };

    const getWidgetName = (id: string) => allWidgets.find(w => w.id === id)?.name || id;

    const isUsed = (id: string) => Object.values(config.widgetMapping).includes(id as WidgetId);
    const isLockedWidget = (id: string) => Object.values(lockedMappings).includes(id as WidgetId);
    const isLockedArea = (areaId: string) => !!lockedMappings[areaId];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-zinc-100">{t('layout.title', lang)}</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100"><X size={20}/></button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-72 border-r border-zinc-800 bg-zinc-950/50 p-4 flex flex-col gap-6 overflow-y-auto">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('layout.preset', lang)}</label>
                            <select 
                                value={config.presetId}
                                onChange={e => handlePresetChange(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-200 text-sm"
                            >
                                {LAYOUT_PRESETS.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">{t('layout.widgets', lang)}</label>
                            <div className="space-y-2">
                                {allWidgets.map(widget => {
                                    const locked = isLockedWidget(widget.id);
                                    const placed = isUsed(widget.id);
                                    const isPlugin = (widget as any).isPlugin;
                                    return (
                                        <div 
                                            key={widget.id}
                                            draggable={!locked}
                                            onDragStart={() => !locked && setDraggedWidget(widget.id)}
                                            className={`p-3 rounded border text-sm font-medium flex items-center justify-between transition-all ${
                                                locked 
                                                ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed' 
                                                : placed 
                                                    ? 'bg-zinc-900/30 border-zinc-800 text-zinc-500 cursor-grab' 
                                                    : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-blue-500 cursor-grab active:cursor-grabbing'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2">
                                                {widget.name}
                                                {locked && <Lock size={12} />}
                                                {isPlugin && <Zap size={12} className="text-yellow-500" />}
                                            </span>
                                            {placed && <Check size={14} />}
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-zinc-600 mt-2">
                                {t('layout.info', lang)}
                            </p>
                        </div>
                    </div>

                    {/* Visualizer */}
                    <div className="flex-1 bg-zinc-900 p-8 relative overflow-hidden">
                        <div className="absolute inset-4 bg-zinc-950 rounded border border-zinc-800 shadow-inner">
                            {preset.areas.map(area => {
                                const assignedWidgetId = config.widgetMapping[area.id];
                                const widgetName = assignedWidgetId ? getWidgetName(assignedWidgetId) : t('layout.emptySlot', lang);
                                const locked = isLockedArea(area.id);
                                
                                return (
                                    <div
                                        key={area.id}
                                        style={{ 
                                            left: `${area.x}%`, 
                                            top: `${area.y}%`, 
                                            width: `${area.w}%`, 
                                            height: `${area.h}%` 
                                        }}
                                        onDragOver={e => !locked && e.preventDefault()}
                                        onDrop={() => handleDrop(area.id)}
                                        className={`
                                            absolute flex items-center justify-center rounded border-2 border-dashed transition-all
                                            ${locked 
                                                ? 'bg-zinc-900 border-zinc-800 text-zinc-500' 
                                                : assignedWidgetId 
                                                    ? 'bg-blue-900/20 border-blue-500/30 text-blue-200' 
                                                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-600 hover:bg-zinc-800 hover:border-zinc-600'
                                            }
                                        `}
                                    >
                                        <div className="text-center pointer-events-none">
                                            {locked && <div className="absolute top-2 right-2"><Lock size={12} /></div>}
                                            <div className="font-mono text-[10px] opacity-50 uppercase mb-1">{area.id}</div>
                                            <div className="font-bold text-xs sm:text-sm">{widgetName}</div>
                                        </div>
                                        
                                        {assignedWidgetId && !locked && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newMapping = { ...config.widgetMapping };
                                                    delete newMapping[area.id];
                                                    setConfig(prev => ({ ...prev, widgetMapping: newMapping }));
                                                }}
                                                className="absolute bottom-1 text-[10px] text-red-400 hover:underline"
                                            >
                                                {t('layout.remove', lang)}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                
                <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">{t('btn.cancel', lang)}</button>
                    <button 
                        onClick={() => onSave(config)} 
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold"
                    >
                        {t('layout.save', lang)}
                    </button>
                </div>
            </div>
        </div>
    );
};