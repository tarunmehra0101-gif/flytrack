const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  console.log("Navigating to http://localhost:3000/");
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  console.log("Looking for sign in button...");
  try {
    const btn = await page.$('button[data-testid="google-signin-btn"]');
    if (btn) {
      console.log("Found button, clicking...");
      await btn.click();
      await page.waitForTimeout(2000);
    } else {
      console.log("Button not found.");
    }
  } catch (err) {
    console.error(err);
  }

  await browser.close();
})();
