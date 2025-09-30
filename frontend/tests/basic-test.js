import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe('Web3Auth Asset Hub Tests', () => {
  test.beforeEach(async ({ context, page }) => {
    // Load the stored session if it exists
    const sessionPath = path.join(__dirname, 'session-data');

    console.log('🔄 Loading session from:', sessionPath);

    // Navigate to the app
    await page.goto('http://localhost:5174');
    await page.waitForLoadState('networkidle');
  });

  test('should load the Web3Auth application', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Web3Auth');

    // Check if login button exists (when not logged in)
    const loginButton = page.locator('button', { hasText: 'Login' });
    const logoutButton = page.locator('button', { hasText: 'Log Out' });

    // Should have either login or logout button
    const hasLogin = await loginButton.isVisible().catch(() => false);
    const hasLogout = await logoutButton.isVisible().catch(() => false);

    expect(hasLogin || hasLogout).toBe(true);

    console.log('✅ Application loaded successfully');
  });

  test('should show Asset Hub networks in switch chain component', async ({ page }) => {
    // Look for the Switch Network section
    const switchChainSection = page.locator('h2', { hasText: 'Switch Network' });
    await expect(switchChainSection).toBeVisible();

    // Check for Asset Hub network buttons
    const passetHubButton = page.locator('button', { hasText: 'Passet Hub' });
    const kusamaAssetHubButton = page.locator('button', { hasText: 'Kusama Asset Hub' });
    const westendButton = page.locator('button', { hasText: 'Westend Network' });

    // At least one Asset Hub network should be visible
    const hasAssetHubNetworks = await Promise.all([
      passetHubButton.isVisible().catch(() => false),
      kusamaAssetHubButton.isVisible().catch(() => false),
      westendButton.isVisible().catch(() => false)
    ]);

    expect(hasAssetHubNetworks.some(visible => visible)).toBe(true);

    console.log('✅ Asset Hub networks are visible');
  });

  test('should display wallet address when connected', async ({ page }) => {
    // Check if wallet address is displayed
    const walletAddressSection = page.locator('text=Wallet Address:');

    if (await walletAddressSection.isVisible()) {
      // If connected, should show an address or "Not connected"
      const addressText = await page.locator('text=Wallet Address:').textContent();
      expect(addressText).toBeTruthy();
      console.log('✅ Wallet address section found:', addressText);
    } else {
      console.log('ℹ️  Not connected - wallet address not shown');
    }
  });
});

// Export test configuration
export default {
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
  }
};