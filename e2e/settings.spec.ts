import { expect, test } from '@playwright/test';
import { runCommand, startWithCompletedOnboarding } from './helpers';

test.beforeEach(async ({ page }) => {
	await startWithCompletedOnboarding(page);
	await page.goto('/');
});

test('opens settings from a command and persists per-puzzle key bindings', async ({ page }) => {
	await runCommand(page, 'settings');

	const settings = page.getByRole('dialog', { name: 'Settings' });
	await expect(settings).toBeVisible();
	await settings.getByRole('button', { name: 'Shortcuts', exact: true }).click();

	const cubeUp = settings.getByLabel('cube U', { exact: true });
	await cubeUp.press('KeyZ');
	await expect(cubeUp).toHaveValue('Z');

	await settings.getByRole('button', { name: 'pyraminx', exact: true }).click();
	await expect(settings.getByLabel('pyraminx U', { exact: true })).toHaveValue('J');
	await settings.getByRole('button', { name: 'Save Changes' }).click();

	await page.reload();
	await runCommand(page, 'settings');
	const reopenedSettings = page.getByRole('dialog', { name: 'Settings' });
	await reopenedSettings.getByRole('button', { name: 'Shortcuts', exact: true }).click();
	await expect(reopenedSettings.getByLabel('cube U', { exact: true })).toHaveValue('Z');
	await reopenedSettings.getByRole('button', { name: 'pyraminx', exact: true }).click();
	await expect(reopenedSettings.getByLabel('pyraminx U', { exact: true })).toHaveValue('J');
});

test('restores focus to the control that opened a modal', async ({ page }) => {
	const trigger = page.getByRole('button', { name: 'Download & Offline Use' });
	await trigger.focus();
	await trigger.click();

	const dialog = page.getByRole('dialog', { name: 'Download & Offline Use' });
	await expect(dialog).toBeVisible();
	await page.keyboard.press('Escape');

	await expect(dialog).toBeHidden();
	await expect(trigger).toBeFocused();
});
