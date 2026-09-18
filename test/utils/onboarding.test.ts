import { describe, expect, it } from 'vitest';
import { ONBOARDING_STORAGE_KEY, shouldShowOnboarding } from '../../utils/onboarding';

describe('onboarding persistence', () => {
	it('shows onboarding until the completion marker is present', () => {
		expect(shouldShowOnboarding(null)).toBe(true);
		expect(shouldShowOnboarding('false')).toBe(true);
		expect(shouldShowOnboarding('true')).toBe(false);
	});

	it('uses a versioned storage key so future tours can be introduced safely', () => {
		expect(ONBOARDING_STORAGE_KEY).toMatch(/_v\d+_/);
	});
});
