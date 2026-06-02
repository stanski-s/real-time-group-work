import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/login');

  // App title is TypeSpace
  expect(await page.locator('h1').innerText()).toContain('TypeSpace');
});
