import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function openBrowserWithSession() {
  // Launch browser with a specific user data directory for persistence
  const userDataDir = path.join(__dirname, 'session-data');

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      '--start-maximized',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
    viewport: { width: 1280, height: 720 }
  });

  console.log('🚀 Browser opened with persistent session');
  console.log('📂 Session data will be stored in:', userDataDir);

  // Get the default page
  const page = browser.pages()[0] || await browser.newPage();

  // Navigate to your app
  await page.goto('http://localhost:5173');

  console.log('✅ Navigated to Web3Auth app');
  console.log('🔗 URL: http://localhost:5173');
  console.log('');
  console.log('You can now:');
  console.log('• Login with Web3Auth');
  console.log('• Test Asset Hub networks');
  console.log('• All session data will be automatically saved');
  console.log('');
  console.log('Close the browser when done - session will persist for next time');

  // Keep the process alive
  await new Promise(() => {});
}

openBrowserWithSession().catch(console.error);