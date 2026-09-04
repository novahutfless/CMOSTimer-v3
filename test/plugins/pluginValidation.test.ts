import { describe, expect, it } from 'vitest';
import { validateScramblerRegistration, validateUiNode } from '../../plugins/runtime/pluginValidation';

describe('isolated plugin validation', () => {
	it('accepts the bounded declarative UI protocol', () => {
		expect(validateUiNode({
			type: 'container',
			direction: 'column',
			children: [
				'Hello',
				{ type: 'input', value: 'names', placeholder: 'Names', action: 'names' },
				{ type: 'textarea', value: 'notes', rows: 3, action: 'notes' },
				{ type: 'numberInput', value: 5, min: 1, max: 10, step: 1, action: 'number' },
				{ type: 'checkbox', checked: true, label: 'Enabled', action: 'enabled' },
				{ type: 'select', value: 'one', options: [{ value: 'one', label: 'One' }], action: 'select' },
				{ type: 'tabs', value: 'one', tabs: [{ value: 'one', label: 'One' }], action: 'tab' },
				{ type: 'progress', value: 50, max: 100, label: 'Half' },
				{ type: 'table', columns: [{ key: 'name', label: 'Name' }], rows: [{ name: 'A' }] },
				{ type: 'barChart', data: [{ label: 'A', value: 2 }], showValues: true },
				{ type: 'lineChart', data: [{ label: 'A', value: 2 }, { label: 'B', value: 3 }] },
				{ type: 'button', text: 'Run', action: 'run' }
			]
		})).toMatchObject({ type: 'container' });
	});

	it('rejects arbitrary element types and excessively deep trees', () => {
		expect(() => validateUiNode({ type: 'html', html: '<script>bad()</script>' })).toThrow(/Unknown/);
		let node: unknown = 'leaf';
		for (let index = 0; index < 20; index += 1) node = { type: 'container', children: [node] };
		expect(() => validateUiNode(node)).toThrow(/levels/);
	});

	it('accepts only bounded host-mediated device buttons', () => {
		expect(validateUiNode({ type: 'deviceButton', text: 'Pair', action: 'pair', request: { kind: 'serial', baudRate: 115200 } })).toMatchObject({ type: 'deviceButton' });
		expect(() => validateUiNode({ type: 'deviceButton', text: 'Pair', action: 'pair', request: { kind: 'camera' } })).toThrow(/kind/);
	});

	it('accepts only bounded declarative move-pool scramblers', () => {
		expect(validateScramblerRegistration({ id: 'ru', name: 'R U', category: 'Training', visualizer: '3x3x3', moves: ['R', 'U'], length: 20 })).toMatchObject({ id: 'ru' });
		expect(() => validateScramblerRegistration({ id: 'bad', name: 'Bad', category: 'Bad', visualizer: '3x3x3', moves: [], length: 20 })).toThrow(/moves/);
	});

	it('rejects invalid select values and progress ranges', () => {
		expect(() => validateUiNode({ type: 'select', value: 'missing', options: [{ value: 'one', label: 'One' }], action: 'select' })).toThrow(/match/);
		expect(() => validateUiNode({ type: 'progress', value: 101, max: 100 })).toThrow(/exceed/);
	});
});
