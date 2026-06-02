import { test, expect } from '@playwright/test';

test.describe('Workspaces and Channels Flow', () => {
  const testEmail = `e2e_workspace_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'Workspace Owner';
  const workspaceName = `E2E Workspace ${Date.now()}`;
  const channelName = `e2e-channel-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    // Register and navigate to dashboard
    await page.goto('/register');
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create a workspace and then add a channel', async ({ page }) => {
    // When workspaces list is empty, it displays the workspace creator
    await expect(page.locator('h1')).toContainText('Witaj w TypeSpace!');
    
    // Create Workspace
    await page.fill('input[placeholder="Nazwa Twojej nowej firmy"]', workspaceName);
    await page.click('button:has-text("Stwórz przestrzeń roboczą")');

    // Workspace should load, showing active workspace header
    await expect(page.locator('h2').first()).toContainText(workspaceName);

    // Create a new channel
    // Click '+' next to "Kanały" (the button with title "Dodaj kanał")
    await page.click('button[title="Dodaj kanał"]');

    // Fill the new channel name input and press Enter
    const channelInput = page.locator('input[placeholder="nowy-kanał"]');
    await expect(channelInput).toBeVisible();
    await channelInput.fill(channelName);
    await channelInput.press('Enter');

    // Verify channel was created and is visible in the sidebar
    await expect(page.locator(`button:has-text("${channelName}")`)).toBeVisible();
  });
});
