const { test, expect } = require('@playwright/test');
const { generateSync } = require('otplib');

test.describe('SVCE Smart No-Dues ERP - End-to-End Clearance Lifecycle', () => {

  // =========================================================================
  // 1. STUDENT JOURNEY
  // =========================================================================
  test('1. Student Journey: Authentication, Clearance Pipeline & Borrow Records', async ({ page }) => {
    // Navigate to Portal
    await page.goto('/');

    // Verify Login Page Elements
    await expect(page.locator('#login-username')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();

    // Fill Student Credentials
    await page.fill('#login-username', 'IT2024001');
    await page.fill('#login-password', 'Svce@2026!');
    await page.click('button[type="submit"]');

    // Verify Navigation to Student Dashboard
    await expect(page.locator('text=STUDENT CLEARANCE DESK').or(page.locator('text=Welcome back')).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Clearance Status').or(page.locator('text=Department Library')).or(page.locator('text=Pending Returns')).first()).toBeVisible();

    // Inspect Books Tab / Navigation
    const booksTab = page.locator('button:has-text("Books"), a:has-text("Books")').first();
    if (await booksTab.isVisible()) {
      await booksTab.click();
      await expect(page.locator('text=Borrowed Books').or(page.locator('text=Library Record')).or(page.locator('table')).first()).toBeVisible();
    }
  });

  // =========================================================================
  // 2. OFFICER APPROVAL FLOW
  // =========================================================================
  test('2. Officer Approval Journey: Department Library Staff Dashboard & Review Queue', async ({ page }) => {
    await page.goto('/');

    // Sign in as Department Library Staff
    await page.fill('#login-username', 'EMP-LIB-IT-01');
    await page.fill('#login-password', 'Svce@2026!');
    await page.click('button[type="submit"]');

    // Verify Officer Dashboard is loaded
    await expect(page.locator('text=FACULTY OFFICERS DESK').or(page.locator('text=Department Library')).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Recent Clearance Requests').or(page.locator('text=Pending Requests')).or(page.locator('table')).first()).toBeVisible();
  });

  // =========================================================================
  // 3. HOD EXECUTIVE APPROVAL & DIRECT LOGIN FLOW
  // =========================================================================
  test('3. HOD Executive Journey: Direct Single Login & Final Approval Panel', async ({ page }) => {
    await page.goto('/');

    // Step 1: Primary Credentials
    await page.fill('#login-username', 'EMP-HOD-IT-01');
    await page.fill('#login-password', 'Svce@2026!');
    await page.click('button[type="submit"]');

    // Step 2: Verify HOD Executive Dashboard Access directly without MFA challenge
    await expect(page.locator('text=Head of Department').or(page.locator('text=Dr V Vidhya')).or(page.locator('text=HOD Dashboard')).first()).toBeVisible({ timeout: 15000 });
  });

  // =========================================================================
  // 4. PUBLIC CERTIFICATE VERIFICATION VIA QR URL
  // =========================================================================
  test('4. Public Verification via QR URL: Authentic Certificate vs Invalid Token', async ({ page }) => {
    // Case A: Valid officially issued certificate
    const validToken = 'b8zGz53U1pfME185xIv7ZAXHnCB_o2rU';
    await page.goto(`/verify/${validToken}`);

    // Verify institutional header and authentic certificate badge
    await expect(page.locator('text=Sri Venkateswara College of Engineering').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Officially Verified Certificate').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=IT2025082').first()).toBeVisible();

    // Case B: Tampered / Non-existent certificate token
    const tamperedToken = 'invalid-tampered-token-99999';
    await page.goto(`/verify/${tamperedToken}`);

    await expect(page.locator('text=Verification Failed').first()).toBeVisible({ timeout: 15000 });
  });
});
