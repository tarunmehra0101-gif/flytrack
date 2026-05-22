const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

(async () => {
  console.log("Starting dev server inside test runner...");
  const server = spawn('npm', ['run', 'start'], {
    cwd: path.join(__dirname, '../frontend'),
    env: { ...process.env, PORT: '3000', BROWSER: 'none', HOST: '127.0.0.1' },
    shell: true
  });

  // Log server outputs to make debugging easy
  server.stdout.on('data', data => console.log(`[Server] ${data.toString().trim()}`));
  server.stderr.on('data', data => console.error(`[Server Error] ${data.toString().trim()}`));

  // Wait for port 3000 to be open
  console.log("Waiting for dev server to start on http://127.0.0.1:3000...");
  let serverReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:3000');
      console.log(`Checking server status... fetch returned status ${res.status}`);
      serverReady = true;
      break;
    } catch (e) {
      // ignore and retry
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (!serverReady) {
    console.error("Dev server failed to start in time!");
    server.kill();
    process.exit(1);
  }

  // Launch browser and run tests
  let browser;
  try {
    console.log("Launching playwright chromium browser...");
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', error => errors.push('PAGE_ERROR: ' + error.message));

    // First do onboarding to get a user session
    console.log("Navigating to http://127.0.0.1:3000/...");
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
    await page.click('button[data-testid="google-signin-btn"]');
    await page.waitForTimeout(1000);
    
    // Fill name
    console.log("Checking onboarding preferred name...");
    const nameInput = await page.$('input[data-testid="onboarding-input-preferred_name"]');
    if (nameInput) {
      await nameInput.fill('TestUser');
      await page.click('button[data-testid="onboarding-next-btn"]');
      await page.waitForTimeout(1000);
    }

    // Now go to /home directly 
    console.log("Navigating to /home...");
    await page.goto('http://127.0.0.1:3000/home', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    const content = await page.content();
    if (content.includes("Something went off route")) {
      console.log("ERROR BOUNDARY TRIGGERED on /home!");
      process.exitCode = 1;
    } else {
      console.log("Home page rendered OK");
    }

    if (errors.length > 0) {
      console.log("\nConsole errors:");
      errors.forEach(e => console.log("  " + e.substring(0, 200)));
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    console.log("Stopping dev server...");
    server.kill('SIGTERM');
  }
})();
