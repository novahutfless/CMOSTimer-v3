import { expect, test } from '@playwright/test';
import { startWithCompletedOnboarding } from './helpers';

// Exercise native browser activation after the modal restores the opener's focus.
test('manual entry consumes Enter before restoring a focused button', async ({ page }) => {
	await startWithCompletedOnboarding(page);
	await page.goto('/');
	await page.evaluate(() => {
		const button = document.createElement('button');
		button.textContent = 'Previously focused action';
		button.dataset.clicks = '0';
		button.style.cssText = 'position:fixed;top:0;left:0;z-index:9999';
		button.onclick = (): void => {
			button.dataset.clicks = String(Number(button.dataset.clicks) + 1);
		};
		document.body.append(button);
		document.addEventListener('keydown', event => {
			if (event.key === 'Enter') setTimeout(() => {
				button.dataset.enterConsumed = String(event.defaultPrevented);
			});
		}, true);
	});
	const button = page.getByRole('button', { name: 'Previously focused action' });
	await button.click();
	await expect(button).toBeFocused();
	await page.keyboard.press('1');
	const dialog = page.getByRole('dialog', { name: 'Manual time entry' });
	await expect(dialog).toBeVisible();
	await expect(dialog.locator('input')).toBeFocused();
	await page.keyboard.type('1234');
	await page.keyboard.press('Enter');
	await expect(dialog).toBeHidden();
	await expect(page.getByTestId('timer-display').first()).toContainText('1.234');
	await expect(button).toBeFocused();
	await expect(button).toHaveAttribute('data-enter-consumed', 'true');
	await expect(button).toHaveAttribute('data-clicks', '1');
});
