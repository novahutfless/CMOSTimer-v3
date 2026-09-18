import { expect, test } from '@playwright/test';
import { openCommand, startWithCompletedOnboarding } from './helpers';

test('guides a first-time visitor once', async ({ page }) => {
	await page.goto('/');

	const onboarding = page.getByRole('dialog', { name: 'Welcome to CMOSTimer' });
	await expect(onboarding).toBeVisible();
	await expect(onboarding.getByRole('heading', { name: 'Your timer is always ready' })).toBeVisible();

	await onboarding.getByRole('button', { name: 'Next' }).click();
	await expect(onboarding.getByRole('heading', { name: 'Choose what you are practising' })).toBeVisible();
	await onboarding.getByRole('button', { name: 'Skip tour' }).click();
	await expect(onboarding).toBeHidden();

	await page.reload();
	await expect(page.getByRole('dialog', { name: 'Welcome to CMOSTimer' })).toBeHidden();
});

test('opens commands from the keyboard and relaunches onboarding', async ({ page }) => {
	await startWithCompletedOnboarding(page);
	await page.goto('/');

	await openCommand(page);
	const commandDialog = page.getByRole('dialog');
	const commandInput = page.getByTestId('command-input');
	await expect(commandDialog).toBeVisible();
	await expect(commandInput).toBeFocused();

	await commandInput.fill('onboarding');
	await commandInput.press('Enter');
	await expect(page.getByRole('dialog', { name: 'Welcome to CMOSTimer' })).toBeVisible();
});

test('traps focus in a modal and closes it with Escape', async ({ page }) => {
	await startWithCompletedOnboarding(page);
	await page.goto('/');

	await openCommand(page);
	const commandDialog = page.getByRole('dialog');
	const commandInput = page.getByTestId('command-input');
	await expect(commandInput).toBeFocused();

	await page.keyboard.press('Tab');
	await expect(commandInput).toBeFocused();
	await page.keyboard.press('Escape');
	await expect(commandDialog).toBeHidden();
});

test('starts and stops the timer with the primary platform control', async ({ page }, testInfo) => {
	await startWithCompletedOnboarding(page);
	await page.addInitScript(() => {
		window.localStorage.setItem('cmostimer_settings', JSON.stringify({ inspectionEnabled: false, holdToStart: false }));
	});
	await page.goto('/');

	const display = page.getByTestId('timer-display').first();
	await expect(display).toContainText('0.00');

	const useTouch = testInfo.project.name === 'mobile-chromium';
	if (useTouch) await display.tap();
	else await page.keyboard.press('Space');
	await expect.poll(async () => display.textContent()).not.toMatch(/^0[.,]0+$/);

	if (useTouch) await display.tap();
	else await page.keyboard.press('Space');
	const stoppedTime = await display.textContent();
	await page.waitForTimeout(150);
	await expect(display).toHaveText(stoppedTime ?? '');
});
