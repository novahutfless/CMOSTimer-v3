import { LayoutPreset, WidgetId, LayoutConfig } from '../types';

export const WIDGET_DEFINITIONS = [
    { id: WidgetId.TIMER, name: 'Timer' },
    { id: WidgetId.SCRAMBLE, name: 'Scramble Text' },
    { id: WidgetId.SCRAMBLE_IMAGE, name: 'Scramble Visualizer' },
    { id: WidgetId.STATS, name: 'Statistics Panel' },
    { id: WidgetId.TIMELIST, name: 'Time List' },
    { id: WidgetId.SESSION, name: 'Session Selector' },
    { id: WidgetId.LOGO, name: 'Logo / Title' },
    { id: WidgetId.TOOLS, name: 'Toolbar' }
];

export const LAYOUT_PRESETS: LayoutPreset[] = [
    {
        id: 'standard',
        name: 'Standard',
        // Timelist takes right 28% (approx 350px on 1080p), rest is main area (72%)
        areas: [
            // Right Panel
            { id: 'timelist', x: 72, y: 0, w: 28, h: 100 },
            
            // Main Area (0-72%)
            // Headers
            { id: 'logo', x: 1, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 26, y: 0.5, w: 20, h: 6 }, // Middle of main area at the top
            { id: 'tools', x: 48, y: 0.5, w: 22, h: 6 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 72)
            // Scramble roughly centered horizontally in the 72% space
            { id: 'scramble', x: 0, y: 6, w: 72, h: 12 }, 
            
            // Visualizer - Below scramble, maybe offset slightly to right or center?
            // Let's put it center-ish but small
            // { id: 'scrambleImg', x: 52, y: 15, w: 18, h: 18 },
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 25, w: 72, h: 40 },
            
            // Extra slots below timer
            { id: 'slot1', x: 2, y: 82, w: 33, h: 15 },
            { id: 'slot2', x: 37, y: 82, w: 33, h: 15 },
        ],
        lockedMappings: {
            'logo': WidgetId.LOGO,
            'scramble': WidgetId.SCRAMBLE,
            'tools': WidgetId.TOOLS,
            'session': WidgetId.SESSION,
            'timelist': WidgetId.TIMELIST,
            'timer': WidgetId.TIMER
        }
    },
    {
        id: 'multislot',
        name: 'Multitool',
        areas: [
            // Right Panel
            { id: 'timelist', x: 72, y: 0, w: 28, h: 100 },
            
            // Main Area (0-72%)
            // Headers
            { id: 'logo', x: 1, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 26, y: 0.5, w: 20, h: 6 }, // Middle of main area at the top
            { id: 'tools', x: 48, y: 0.5, w: 22, h: 6 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 72)
            // Scramble roughly centered horizontally in the 72% space
            { id: 'scramble', x: 0, y: 6, w: 72, h: 12 }, 
            
            // Visualizer - Below scramble, maybe offset slightly to right or center?
            // Let's put it center-ish but small
            // { id: 'scrambleImg', x: 52, y: 15, w: 18, h: 18 },
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 25, w: 72, h: 40 },
            
            // Extra slots below timer
            { id: 'slot1', x: 2, y: 75, w: 15, h: 23 },
            { id: 'slot2', x: 18, y: 75, w: 15, h: 23 },
            { id: 'slot3', x: 37, y: 75, w: 15, h: 23 },
            { id: 'slot4', x: 53, y: 75, w: 15, h: 23 },
        ],
        lockedMappings: {
            'logo': WidgetId.LOGO,
            'scramble': WidgetId.SCRAMBLE,
            'tools': WidgetId.TOOLS,
            'session': WidgetId.SESSION,
            'timelist': WidgetId.TIMELIST,
            'timer': WidgetId.TIMER
        }
    },
    {
        id: 'widescreen',
        name: 'Widescreen',
        areas: [
            // Left
            { id: 'logo', x: 1, y: 2, w: 18, h: 5 },
            { id: 'session', x: 1, y: 10, w: 18, h: 15 },
            { id: 'slot1', x: 1, y: 30, w: 18, h: 68 },
            
            // Right
            { id: 'tools', x: 81, y: 2, w: 18, h: 5 },
            { id: 'timelist', x: 81, y: 10, w: 18, h: 88 },
            
            // Center
            { id: 'scramble', x: 20, y: 5, w: 60, h: 15 },
            { id: 'scrambleImg', x: 40, y: 22, w: 20, h: 20 },
            { id: 'timer', x: 20, y: 45, w: 60, h: 40 }
        ],
        lockedMappings: {
            'logo': WidgetId.LOGO,
            'scramble': WidgetId.SCRAMBLE,
            'tools': WidgetId.TOOLS,
            'session': WidgetId.SESSION,
            'scrambleImg': WidgetId.SCRAMBLE_IMAGE,
            'timelist': WidgetId.TIMELIST,
            'timer': WidgetId.TIMER
        }
    }
];

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    presetId: 'standard',
    widgetMapping: {
        'logo': WidgetId.LOGO,
        'scramble': WidgetId.SCRAMBLE,
        'tools': WidgetId.TOOLS,
        'session': WidgetId.SESSION,
        'timelist': WidgetId.TIMELIST,
        'timer': WidgetId.TIMER,
        'slot1': WidgetId.STATS,
        'slot2': WidgetId.SCRAMBLE_IMAGE
    }
};

export const getPreset = (id: string) => LAYOUT_PRESETS.find(p => p.id === id) || LAYOUT_PRESETS[0];

export const validateLayout = (config: LayoutConfig): LayoutConfig => {
    const preset = getPreset(config.presetId);
    const validMapping: Record<string, WidgetId> = {};
    const locked = preset.lockedMappings || {};
    
    // First apply locked mappings
    Object.entries(locked).forEach(([area, widget]) => {
        validMapping[area] = widget;
    });

    // Apply user mappings for non-locked, valid areas
    Object.entries(config.widgetMapping).forEach(([area, widget]) => {
        if (preset.areas.find(a => a.id === area) && !locked[area]) {
            validMapping[area] = widget;
        }
    });
    
    return { ...config, widgetMapping: validMapping };
};