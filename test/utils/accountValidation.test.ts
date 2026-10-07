import { describe, expect, it } from 'vitest';
import { validateLoginFields, validateRegistrationFields } from '../../utils/accountValidation';

describe('account validation', () => {
	it('accepts values at the server limits', () => {
		expect(validateRegistrationFields('abc', '123456', 'a@example.com')).toBeNull();
		expect(validateRegistrationFields('a'.repeat(64), 'p'.repeat(1024), `${'a'.repeat(244)}@x.example`)).toBeNull();
	});

	it('rejects registration values outside the server limits', () => {
		expect(validateRegistrationFields('ab', '123456', 'a@example.com')).toBe('username');
		expect(validateRegistrationFields('a'.repeat(65), '123456', 'a@example.com')).toBe('username');
		expect(validateRegistrationFields('account', '12345', 'a@example.com')).toBe('password');
		expect(validateRegistrationFields('account', 'p'.repeat(1025), 'a@example.com')).toBe('password');
		expect(validateRegistrationFields('account', '123456', `${'a'.repeat(245)}@x.example`)).toBe('email');
	});

	it('counts UTF-8 bytes rather than JavaScript characters', () => {
		expect(validateRegistrationFields('😀'.repeat(17), '123456', 'a@example.com')).toBe('username');
		expect(validateLoginFields('a'.repeat(65), 'password')).toBe('username');
	});
});
