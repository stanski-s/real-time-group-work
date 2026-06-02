import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = `e2e_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const testName = 'E2E Tester';

  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    // Fill register form
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    
    // Submit register form
    await page.click('button[type="submit"]');

    // Should redirect to main page/dashboard and find user initials/profile info
    await expect(page).toHaveURL('/');
  });

  test('should fail to register with an existing email', async ({ page }) => {
    await page.goto('/register');
    
    // Fill register form with same details
    await page.fill('#name', testName);
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    
    // Submit register form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorAlert = page.locator('form div.text-red-400');
    await expect(errorAlert).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    
    // Submit login form
    await page.click('button[type="submit"]');

    // Should redirect to main page/dashboard
    await expect(page).toHaveURL('/');
  });

  test('should fail login with invalid password', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form with invalid password
    await page.fill('#email', testEmail);
    await page.fill('#password', 'WrongPassword!');
    
    // Submit login form
    await page.click('button[type="submit"]');

    // Should show error message
    const errorAlert = page.locator('form div.text-red-400');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Nieprawidłowe dane logowania');
  });
});
