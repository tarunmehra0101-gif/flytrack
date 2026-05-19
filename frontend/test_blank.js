const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('https://frontend-six-brown-71.vercel.app');
  await page.waitForTimeout(2000);
  console.log('Title:', await page.title());
  await browser.close();
})();
