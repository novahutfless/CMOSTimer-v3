import { describe, expect, it } from 'vitest';
import { validateScramblerRegistration, validateUiNode } from '../../plugins/runtime/pluginValidation';

describe('isolated plugin validation', () => {
	it('accepts the bounded declarative UI protocol', () => {
		expect(validateUiNode({
			type: 'container',
			direction: 'column',
			children: ['Hello', { type: 'button', text: 'Run', action: 'run' }]
		})).toMatchObject({ type: 'container' });
	});

	it('rejects arbitrary element types and excessively deep trees', () => {
		expect(() => validateUiNode({ type: 'html', html: '<script>bad()</script>' })).toThrow(/Unknown/);
		let node: unknown = 'leaf';
		for (let index = 0; index < 20; index += 1) node = { type: 'container', children: [node] };
		expect(() => validateUiNode(node)).toThrow(/levels/);
	});

	it('accepts only bounded declarative move-pool scramblers', () => {
		expect(validateScramblerRegistration({ id: 'ru', name: 'R U', category: 'Training', visualizer: '3x3x3', moves: ['R', 'U'], length: 20 })).toMatchObject({ id: 'ru' });
		expect(() => validateScramblerRegistration({ id: 'bad', name: 'Bad', category: 'Bad', visualizer: '3x3x3', moves: [], length: 20 })).toThrow(/moves/);
	});
});
