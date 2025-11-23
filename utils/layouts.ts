

import { LayoutPreset, WidgetId, LayoutConfig } from '../types';

export const WIDGET_DEFINITIONS = [
    { id: WidgetId.TIMER, name: 'Timer' },
    { id: WidgetId.SCRAMBLE, name: 'Scramble Text' },
    { id: WidgetId.SCRAMBLE_IMAGE, name: 'Scramble Visualizer' },
    { id: WidgetId.STATS, name: 'Statistics Panel' },
    { id: WidgetId.TIMELIST, name: 'Time List' },
    { id: WidgetId.SESSION, name: 'Session Selector' },
    { id: WidgetId.LOGO, name: 'Logo / Title' },
    { id: WidgetId.TOOLS, name: 'Toolbar' },
    { id: WidgetId.TIME_DISTRIBUTION, name: 'Time Distribution' },
    { id: WidgetId.GOALS, name: 'Goals Tracker' },
    { id: WidgetId.SOLVES_OVER_TIME, name: 'Activity Graph' },
    { id: WidgetId.METRONOME, name: 'Metronome' },
    { id: WidgetId.TAG_ASSIGNER, name: 'Tag Assigner' }
];

export const LAYOUT_PRESETS: LayoutPreset[] = [
    {
        id: 'standard',
        name: 'Standard',
        // 2 slots
        areas: [
            // Right Panel
            { id: 'timelist', x: 80, y: 0, w: 20, h: 100 },
            
            // Main Area (0-80%)
            // Headers
            { id: 'logo', x: 2, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 30, y: 0.5, w: 20, h: 5 }, // Middle of main area at the top
            { id: 'tools', x: 58, y: 0.5, w: 20, h: 5 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 80)
            // Scramble roughly centered horizontally in the 80% space
            { id: 'scramble', x: 0, y: 6, w: 80, h: 17 }, 
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 25, w: 80, h: 40 },
            
            // Extra slots below timer
            { id: 'slot1', x: 2, y: 79, w: 33, h: 18 },
            { id: 'slot2', x: 45, y: 79, w: 33, h: 18 },
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
        id: 'tripletool',
        name: 'Tripletool',
        // 3 slots
        areas: [
            // Right Panel
            { id: 'timelist', x: 80, y: 0, w: 20, h: 100 },
            
            // Main Area (0-80%)
            // Headers
            { id: 'logo', x: 2, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 30, y: 0.5, w: 20, h: 5 }, // Middle of main area at the top
            { id: 'tools', x: 58, y: 0.5, w: 20, h: 5 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 80)
            // Scramble roughly centered horizontally in the 80% space
            { id: 'scramble', x: 0, y: 6, w: 80, h: 17 }, 
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 25, w: 80, h: 40 },
            
            // Extra slots below timer
            { id: 'slot1', x: 2, y: 79, w: 24, h: 18 },
            { id: 'slot2', x: 28, y: 79, w: 24, h: 18 },
            { id: 'slot3', x: 54, y: 79, w: 24, h: 18 },
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
        id: 'smtimelist',
        name: 'Small timelist',
        // 3 slots
        areas: [
            // Main Area (0-80%)
            // Headers
            { id: 'logo', x: 2, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 40, y: 0.5, w: 20, h: 5 }, // Middle of main area at the top
            { id: 'tools', x: 78, y: 0.5, w: 20, h: 5 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 80)
            // Scramble roughly centered horizontally in the 80% space
            { id: 'scramble', x: 0, y: 6, w: 100, h: 17 }, 
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 25, w: 100, h: 40 },
            
            // Extra slots below timer
            { id: 'slot1', x: 5, y: 79, w: 28, h: 18 },
            { id: 'slot2', x: 38, y: 79, w: 28, h: 18 },
            { id: 'timelist', x: 69, y: 79, w: 28, h: 18 },
        ],
        lockedMappings: {
            'logo': WidgetId.LOGO,
            'scramble': WidgetId.SCRAMBLE,
            'tools': WidgetId.TOOLS,
            'session': WidgetId.SESSION,
            'timer': WidgetId.TIMER
        }
    },
    {
        id: 'multislot',
        name: 'Multitool',
        areas: [
            // Right Panel
            { id: 'timelist', x: 80, y: 0, w: 20, h: 100 },
            
            // Main Area (0-80%)
            // Headers
            { id: 'logo', x: 2, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 30, y: 0.5, w: 20, h: 5 }, // Middle of main area at the top
            { id: 'tools', x: 58, y: 0.5, w: 20, h: 5 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 80)
            // Scramble roughly centered horizontally in the 80% space
            { id: 'scramble', x: 0, y: 6, w: 80, h: 12 }, 
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 25, w: 80, h: 40 },
            
            // Extra slots below timer
            { id: 'slot1', x: 2, y: 75, w: 18, h: 23 },
            { id: 'slot2', x: 22, y: 75, w: 17, h: 23 },
            { id: 'slot3', x: 41, y: 75, w: 17, h: 23 },
            { id: 'slot4', x: 60, y: 75, w: 18, h: 23 },
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
        id: 'nerd',
        name: 'Nerd',
        areas: [
            // Right Panel
            { id: 'timelist', x: 80, y: 0, w: 20, h: 100 },
            
            // Main Area (0-80%)
            // Headers
            { id: 'logo', x: 2, y: 0.5, w: 20, h: 5 },
            { id: 'session', x: 30, y: 0.5, w: 20, h: 5 }, // Middle of main area at the top
            { id: 'tools', x: 58, y: 0.5, w: 20, h: 5 }, // Top right of main area
            
            // Content - Centered in Main Area (Width 80)
            // Scramble roughly centered horizontally in the 80% space
            { id: 'scramble', x: 0, y: 6, w: 80, h: 14 }, 
            
            // Timer - Dead center of main area
            { id: 'timer', x: 0, y: 22, w: 80, h: 36 },
            
            // Extra slots below timer
            { id: 'slot1', x: 2, y: 60, w: 18, h: 18 },
            { id: 'slot2', x: 22, y: 60, w: 17, h: 18 },
            { id: 'slot3', x: 41, y: 60, w: 17, h: 18 },
            { id: 'slot4', x: 60, y: 60, w: 18, h: 18 },
            { id: 'slot5', x: 2, y: 80, w: 18, h: 18 },
            { id: 'slot6', x: 22, y: 80, w: 17, h: 18 },
            { id: 'slot7', x: 41, y: 80, w: 17, h: 18 },
            { id: 'slot8', x: 60, y: 80, w: 18, h: 18 },
        ],
        lockedMappings: {
            'logo': WidgetId.LOGO,
            'scramble': WidgetId.SCRAMBLE,
            'tools': WidgetId.TOOLS,
            'session': WidgetId.SESSION,
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
        'slot2': WidgetId.SCRAMBLE_IMAGE,
        'slot3': WidgetId.TIME_DISTRIBUTION,
        'slot4': WidgetId.GOALS,
        'slot5': WidgetId.SOLVES_OVER_TIME,
        'slot6': WidgetId.METRONOME,
        'slot7': WidgetId.TAG_ASSIGNER,
        'slot8': WidgetId.EMPTY
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