import { storage } from './platformStorage';

export const ONBOARDING_STORAGE_KEY = 'cmostimer_onboarding_v1_complete';

export const shouldShowOnboarding = (storedValue: string | null): boolean => storedValue !== 'true';

export const hasCompletedOnboarding = (): boolean => !shouldShowOnboarding(storage.getItem(ONBOARDING_STORAGE_KEY));

export const completeOnboarding = (): void => {
	storage.setItem(ONBOARDING_STORAGE_KEY, 'true');
};
