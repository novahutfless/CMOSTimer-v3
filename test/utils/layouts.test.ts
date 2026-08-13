import { describe, it, expect } from 'vitest';
import { getPreset, validateLayout, DEFAULT_LAYOUT_CONFIG } from '../../utils/layouts';
import { WidgetId } from '../../types';

describe('Layout Utils', () => {
	it('returns fallback preset when missing', () => {
		const preset = getPreset('does-not-exist');
		expect(preset.id).toBe('standard');
	});

	it('validates mappings and preserves locked areas', () => {
		const config = {
			...DEFAULT_LAYOUT_CONFIG,
			presetId: 'standard',
			mirror: true,
			widgetMapping: {
				...DEFAULT_LAYOUT_CONFIG.widgetMapping,
				timer: WidgetId.GOALS, // locked in preset
				slot1: WidgetId.TIME_DISTRIBUTION,
				badSlot: WidgetId.METRONOME
			}
		};

		const validated = validateLayout(config);
		expect(validated.widgetMapping.timer).toBe(WidgetId.TIMER);
		expect(validated.widgetMapping.slot1).toBe(WidgetId.TIME_DISTRIBUTION);
		expect(validated.widgetMapping).not.toHaveProperty('badSlot');
		expect(validated.mirror).toBe(true);
	});

	it('defaults mirror to false for legacy layout data', () => {
		const legacyConfig = {
			presetId: 'standard',
			widgetMapping: {
				timer: WidgetId.STATS
			}
		};

		const validated = validateLayout(legacyConfig as unknown as typeof DEFAULT_LAYOUT_CONFIG);
		expect(validated.mirror).toBe(false);
	});

	it('gives the header edges and session selector the intended space', () => {
		for (const presetId of ['standard', 'tripletool', 'multislot', 'nerd']) {
			const preset = getPreset(presetId);
			expect(preset.areas.find(area => area.id === 'logo')).toMatchObject({ x: 0, w: 20 });
			expect(preset.areas.find(area => area.id === 'session')).toMatchObject({ x: 22, w: 36 });
			expect(preset.areas.find(area => area.id === 'tools')).toMatchObject({ x: 60, w: 20 });
		}

		const fullWidthPreset = getPreset('smtimelist');
		expect(fullWidthPreset.areas.find(area => area.id === 'logo')).toMatchObject({ x: 0, w: 20 });
		expect(fullWidthPreset.areas.find(area => area.id === 'session')).toMatchObject({ x: 22, w: 56 });
		expect(fullWidthPreset.areas.find(area => area.id === 'tools')).toMatchObject({ x: 80, w: 20 });
	});
});
