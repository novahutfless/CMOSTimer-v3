import type { Page } from '@playwright/test';

const ONBOARDING_KEY = 'cmostimer_onboarding_v1_complete';

export const startWithCompletedOnboarding = async (page: Page): Promise<void> => {
	await page.addInitScript(key => window.localStorage.setItem(key, 'true'), ONBOARDING_KEY);
};

export const openCommand = async (page: Page): Promise<void> => {
	await page.keyboard.press('5');
};

export const runCommand = async (page: Page, command: string): Promise<void> => {
	await openCommand(page);
	const input = page.getByTestId('command-input');
	await input.fill(command);
	await input.press('Enter');
};
