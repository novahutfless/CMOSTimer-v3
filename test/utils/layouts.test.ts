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
	});
});
