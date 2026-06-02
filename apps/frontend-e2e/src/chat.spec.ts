import { test, expect } from '@playwright/test';

// clipboard-read/write via evaluate() works in Chromium without explicit permission grant.
// Firefox and WebKit don't support clipboard-read in newContext(), so this test is Chromium-only.
test.use({ browserName: 'chromium' });

test.describe('Real-time Chat and Collaboration Flow', () => {
  test('should support inviting user, joining, and messaging in real time', async ({ browser }) => {
    const ts = Date.now();
    const user1Email = `e2e_chat_u1_${ts}@example.com`;
    const user2Email = `e2e_chat_u2_${ts}@example.com`;
    const password = 'Password123!';
    const workspaceName = `Chat Workspace ${ts}`;
    const messageFromUser1 = `Hello from User 1! ${ts}`;
    const messageFromUser2 = `Hi User 1, this is User 2! ${ts}`;

    // 1. Two completely isolated contexts — no shared cookies
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

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
    await expect(page1.locator('h2').first()).toContainText(workspaceName);

    // 3. User 1 copies the invite link via clipboard API (Chromium supports this)
    await context1.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page1.click('button[title="Zaproś znajomych"]');
    await page1.waitForTimeout(500); // ensure clipboard is written
    const inviteLink = await page1.evaluate(async () => navigator.clipboard.readText());
    expect(inviteLink).toContain('/join/');

    // 4. User 2 registers (context2 is already isolated — no cookies from User 1)
    await page2.goto('/register');
    await page2.fill('#name', 'User Two');
    await page2.fill('#email', user2Email);
    await page2.fill('#password', password);
    await page2.click('button[type="submit"]');
    await expect(page2).toHaveURL('/');

    // 5. User 2 clears their session and visits the invite link as an unauthenticated user.
    // Without this, the app sees User 2 as already logged in and shows the main app
    // instead of the /join/ invite landing page.
    await context2.clearCookies();
    await page2.goto(inviteLink);

    // /join/[id] redirects unauthenticated users to /login?redirect=/join/[id]
    await expect(page2).toHaveURL(/\/login/);

    // Log in as User 2 — the app will redirect back to the invite link after login
    await page2.fill('#email', user2Email);
    await page2.fill('#password', password);
    await page2.click('button[type="submit"]');

    // After login, should land back on /join/... showing the invite page
    await expect(page2).toHaveURL(/\/join\//);
    await expect(page2.locator('h1')).toContainText('Zostałeś zaproszony!');
    await page2.click('button:has-text("Dołącz do zespołu")');
    await expect(page2).toHaveURL('/');

    // Wait for the workspace to load for User 2
    await expect(page2.locator('h2').first()).toContainText(workspaceName);

    // 6. Both users navigate to the 'general' channel
    await page1.click('button:has-text("general")');
    await page2.click('button:has-text("general")');

    // 7. User 1 sends a message
    const textarea1 = page1.locator('textarea[placeholder*="Napisz wiadomość"]');
    await textarea1.fill(messageFromUser1);
    await textarea1.press('Enter');

    // 8. User 2 should receive the message in real time via WebSocket
    await expect(page2.locator(`text=${messageFromUser1}`)).toBeVisible({ timeout: 10000 });

    // 9. User 2 replies
    const textarea2 = page2.locator('textarea[placeholder*="Napisz wiadomość"]');
    await textarea2.fill(messageFromUser2);
    await textarea2.press('Enter');

    // 10. User 1 should receive User 2's message in real time
    await expect(page1.locator(`text=${messageFromUser2}`)).toBeVisible({ timeout: 10000 });

    // Clean up
    await context1.close();
    await context2.close();
  });
});
