import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testPassword = 'Password123!';
  const testName = 'E2E Tester';

  test('should register a new user successfully', async ({ page }) => {
    const registerEmail = `register_success_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
    await page.goto('/register');
    
    // Fill register form
    await page.fill('#name', testName);
    await page.fill('#email', registerEmail);
    await page.fill('#password', testPassword);
    
    // Submit register form
    await page.click('button[type="submit"]');

    // Should redirect to main page/dashboard
    await expect(page).toHaveURL('/');
  });

  test('should fail to register with an existing email', async ({ page }) => {
    const duplicateEmail = `duplicate_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
    
    // Register first time
    await page.goto('/register');
    await page.fill('#name', testName);
    await page.fill('#email', duplicateEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Log out by clearing cookies
    await page.context().clearCookies();
    
    // Try registering again with the same email
    await page.goto('/register');
    await page.fill('#name', testName);
    await page.fill('#email', duplicateEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');

    // Should show error message
    const errorAlert = page.locator('form div.text-red-400');
    await expect(errorAlert).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    const loginEmail = `login_success_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
    
    // Register first
    await page.goto('/register');
    await page.fill('#name', testName);
    await page.fill('#email', loginEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Log out by clearing cookies
    await page.context().clearCookies();
    
    // Go to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('#email', loginEmail);
    await page.fill('#password', testPassword);
    
    // Submit login form
    await page.click('button[type="submit"]');

    // Should redirect to main page/dashboard
    await expect(page).toHaveURL('/');
  });

  test('should fail login with invalid password', async ({ page }) => {
    const loginFailEmail = `login_fail_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
    
    // Register first
    await page.goto('/register');
    await page.fill('#name', testName);
    await page.fill('#email', loginFailEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Log out by clearing cookies
    await page.context().clearCookies();
    
    // Go to login page
    await page.goto('/login');
    
    // Fill login form with invalid password
    await page.fill('#email', loginFailEmail);
    await page.fill('#password', 'WrongPassword!');
    
    // Submit login form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorAlert = page.locator('form div.text-red-400');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Nieprawidłowe dane logowania');
  });
});
