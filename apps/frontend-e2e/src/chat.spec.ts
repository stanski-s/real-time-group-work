import { test, expect } from '@playwright/test';

test.describe('Real-time Chat and Collaboration Flow', () => {
  const user1Email = `e2e_chat_u1_${Date.now()}@example.com`;
  const user2Email = `e2e_chat_u2_${Date.now()}@example.com`;
  const password = 'Password123!';
  const workspaceName = `Chat Workspace ${Date.now()}`;
  const messageFromUser1 = `Hello from User 1! ${Date.now()}`;
  const messageFromUser2 = `Hi User 1, this is User 2! ${Date.now()}`;

  test('should support inviting user, joining, and messaging in real time', async ({ browser }) => {
    // 1. Setup two browser contexts with clipboard permissions
    const context1 = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const context2 = await browser.newContext({
      permissions: ['clipboard-read', 'clipboard-write'],
    });

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 2. User 1 registers and creates workspace
    await page1.goto('/register');
    await page1.fill('#name', 'User One');
    await page1.fill('#email', user1Email);
    await page1.fill('#password', password);
    await page1.click('button[type="submit"]');
    await expect(page1).toHaveURL('/');

    await page1.fill('input[placeholder="Nazwa Twojej nowej firmy"]', workspaceName);
    await page1.click('button:has-text("Stwórz przestrzeń roboczą")');
    await expect(page1.locator('h2')).toContainText(workspaceName);

    // 3. User 1 gets the invite link from clipboard
    await page1.click('button[title="Zaproś znajomych"]');
    const inviteLink = await page1.evaluate(async () => {
      return navigator.clipboard.readText();
    });
    expect(inviteLink).toContain('/join/');

    // 4. User 2 registers
    await page2.goto('/register');
    await page2.fill('#name', 'User Two');
    await page2.fill('#email', user2Email);
    await page2.fill('#password', password);
    await page2.click('button[type="submit"]');
    await expect(page2).toHaveURL('/');

    // 5. User 2 navigates to invite link and joins workspace
    await page2.goto(inviteLink);
    await expect(page2.locator('h1')).toContainText('Zostałeś zaproszony!');
    await page2.click('button:has-text("Dołącz do zespołu")');
    await expect(page2).toHaveURL('/');

    // Wait for the workspace to load for User 2
    await expect(page2.locator('h2')).toContainText(workspaceName);

    // 6. User 1 clicks on the 'general' channel (default channel created by backend)
    await page1.click('button:has-text("general")');
    // User 2 clicks on the 'general' channel too
    await page2.click('button:has-text("general")');

    // 7. User 1 sends a message
    const textarea1 = page1.locator('textarea[placeholder*="Napisz wiadomość"]');
    await textarea1.fill(messageFromUser1);
    await textarea1.press('Enter');

    // 8. User 2 should receive the message in real time
    await expect(page2.locator(`text=${messageFromUser1}`)).toBeVisible();

    // 9. User 2 replies
    const textarea2 = page2.locator('textarea[placeholder*="Napisz wiadomość"]');
    await textarea2.fill(messageFromUser2);
    await textarea2.press('Enter');

    // 10. User 1 should receive User 2's message in real time
    await expect(page1.locator(`text=${messageFromUser2}`)).toBeVisible();

    // Clean up
    await context1.close();
    await context2.close();
  });
});
