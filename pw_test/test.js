const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', error => errors.push('PAGE_ERROR: ' + error.message));

  // First do onboarding to get a user session
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.click('button[data-testid="google-signin-btn"]');
  await page.waitForTimeout(500);
  
  // Fill name
  const nameInput = await page.$('input[data-testid="onboarding-input-preferred_name"]');
  if (nameInput) {
    await nameInput.fill('TestUser');
    await page.click('button[data-testid="onboarding-next-btn"]');
    await page.waitForTimeout(500);
  }

  // Now go to /home directly 
  console.log("Navigating to /home...");
  await page.goto('http://localhost:3000/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  if (content.includes("Something went off route")) {
    console.log("ERROR BOUNDARY TRIGGERED on /home!");
  } else {
    console.log("Home page rendered OK");
  }

  if (errors.length > 0) {
    console.log("\nConsole errors:");
    errors.forEach(e => console.log("  " + e.substring(0, 200)));
  }

  await browser.close();
})();
