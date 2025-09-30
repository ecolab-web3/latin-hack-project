import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setupBrowserSession() {
  console.log('🚀 Launching Playwright browser...');

  // Create persistent context (like a regular browser profile)
  const userDataDir = path.join(__dirname, 'browser-profile');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: ['--start-maximized'],
    slowMo: 100, // Add slight delay for better visibility
    viewport: { width: 1280, height: 720 },
    // Enable geolocation if needed
    geolocation: { latitude: 37.7749, longitude: -122.4194 },
    permissions: ['geolocation']
  });

  // Get the first page (persistent context creates one automatically)
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();

  console.log('📱 Navigating to Web3Auth React app...');

  // Navigate to the local development server
  await page.goto('http://localhost:5174');

  // Wait for the page to load
  await page.waitForLoadState('networkidle');

  console.log('✅ Browser opened successfully!');
  console.log('🔗 Application URL: http://localhost:5174');
  console.log('');
  console.log('📋 You can now:');
  console.log('   • Test Web3Auth login with your Asset Hub networks');
  console.log('   • Interact with the application manually');
  console.log('   • Switch between Passet Hub, Kusama Asset Hub, and Westend');
  console.log('   • Test send transactions and balance checks');
  console.log('');
  console.log('💾 When ready, the session will be saved for automated testing');

  // Keep the browser open for manual interaction
  // You can interact with the app, login, etc.
  console.log('⏳ Browser will stay open for manual testing...');
  console.log('   Press Ctrl+C to close and save session state');

  // Setup graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n💾 Saving browser session state...');

    // Save the storage state (including cookies, localStorage, etc.)
    const sessionPath = path.join(__dirname, 'session-state.json');
    await context.storageState({ path: sessionPath });

    console.log(`✅ Session saved to: ${sessionPath}`);
    console.log(`📁 Profile data saved to: ${userDataDir}`);
    console.log('🔄 This session can be reused in future tests');

    await context.close();
    process.exit(0);
  });

  // Keep the script running
  await new Promise(() => {});
}

// Run the setup
setupBrowserSession().catch(error => {
  console.error('❌ Error setting up browser session:', error);
  process.exit(1);
});