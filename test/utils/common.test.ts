import { describe, it, expect } from 'vitest';
import { generateId } from '../../utils/common';

describe('Common Utils', () => {
	it('generateId returns a 9-char base36-ish string', () => {
		const id = generateId();
		expect(id).toHaveLength(9);
		expect(id).toMatch(/^[a-z0-9]+$/i);
	});
});
