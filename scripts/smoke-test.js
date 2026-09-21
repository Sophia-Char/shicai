'use strict';

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('C:/Users/HUAWEI/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const shotsDir = path.join(os.tmpdir(), 'shicai-shots');
  fs.mkdirSync(shotsDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('[console] ' + msg.text());
  });
  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));

  await page.goto('http://localhost:3000/#/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.fill('#lg-username', '拾光者');
  await page.fill('#lg-password', '123456');
  await page.click('#lg-submit');
  await page.waitForTimeout(1200);

  const routes = ['/', '/chat', '/simulate', '/community', '/insights', '/profile'];
  for (const r of routes) {
    await page.goto('http://localhost:3000/#' + r, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const title = await page.evaluate(() => document.getElementById('app').innerText.replace(/\s+/g, ' ').slice(0, 160));
    console.log('ROUTE', r, '=>', title);
    await page.screenshot({ path: path.join(shotsDir, 'page-' + (r === '/' ? 'home' : r.slice(1)) + '.png'), fullPage: false });
  }

  console.log('\nERRORS (' + errors.length + '):');
  errors.forEach((e) => console.log(e));
  console.log('\nSHOTS_DIR=' + shotsDir);
  await browser.close();
})();
