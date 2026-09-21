'use strict';

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT) || 9333;
const CHROME_PATH = process.env.CHROME_PATH || [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((candidate) => fs.existsSync(candidate));

if (!CHROME_PATH) {
  console.error('未找到 Chrome 或 Edge，可通过 CHROME_PATH 指定浏览器路径。');
  process.exit(1);
}

const routes = [
  { hash: '/', name: 'home', label: '首页' },
  { hash: '/chat', name: 'chat', label: 'AI搭子' },
  { hash: '/simulate', name: 'simulate', label: '模拟仓' },
  { hash: '/community', name: 'community', label: '社区' },
  { hash: '/insights', name: 'insights', label: '热点' },
  { hash: '/profile', name: 'profile', label: '个人中心' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getJson(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`Invalid JSON from ${url}: ${error.message}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function waitForDebugPort() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      return await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    } catch {
      await sleep(150);
    }
  }
  throw new Error('Chrome 调试端口未就绪');
}

function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(webSocketUrl);
    const pending = new Map();
    const events = [];
    let nextId = 1;

    socket.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          return new Promise((resolveCommand, rejectCommand) => {
            const id = nextId++;
            pending.set(id, { resolve: resolveCommand, reject: rejectCommand });
            socket.send(JSON.stringify({ id, method, params }));
          });
        },
        events,
        onEvent(handler) {
          events.push(handler);
        },
        close() {
          socket.close();
        },
      });
    });
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) request.reject(new Error(message.error.message));
        else request.resolve(message.result);
        return;
      }
      for (const handler of events) handler(message);
    });
    socket.addEventListener('error', () => reject(new Error('CDP WebSocket 连接失败')));
  });
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || '页面脚本执行失败');
  }
  return result.result.value;
}

async function waitFor(cdp, expression, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await sleep(120);
  }
  throw new Error(`等待页面状态超时：${expression}`);
}

async function capture(cdp, outputPath) {
  const result = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  });
  fs.writeFileSync(outputPath, Buffer.from(result.data, 'base64'));
}

(async () => {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shicai-chrome-'));
  const shotsDir = path.join(__dirname, 'shots');
  fs.mkdirSync(shotsDir, { recursive: true });

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--disable-extensions',
    '--hide-scrollbars',
    '--no-first-run',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let cdp;
  const errors = [];
  try {
    await waitForDebugPort();
    const target = await getJson(
      `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent(`${APP_URL}/#/login`)}`,
      'PUT',
    );
    cdp = await connectCdp(target.webSocketDebuggerUrl);
    cdp.onEvent((message) => {
      if (message.method === 'Runtime.exceptionThrown') {
        errors.push(`[pageerror] ${message.params.exceptionDetails.text || '未知异常'}`);
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        errors.push(`[console] ${message.params.args.map((arg) => arg.value || arg.description || '').join(' ')}`);
      }
    });
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await waitFor(cdp, `Boolean(document.querySelector('#lg-username'))`);
    await evaluate(cdp, `(() => {
      document.querySelector('#lg-username').value = '拾光者';
      document.querySelector('#lg-password').value = '123456';
      document.querySelector('#lg-submit').click();
      return true;
    })()`);
    await waitFor(cdp, `location.hash === '#/' && Boolean(document.querySelector('.topbar'))`);

    const report = [];
    for (const route of routes) {
      await evaluate(cdp, `location.hash = ${JSON.stringify(route.hash)}`);
      await waitFor(cdp, `location.hash === ${JSON.stringify(`#${route.hash}`)}`);
      await sleep(route.hash === '/' ? 1800 : 800);
      const metrics = await evaluate(cdp, `(() => {
        const app = document.getElementById('app');
        const text = (app?.innerText || '').replace(/\\s+/g, ' ').trim();
        return {
          title: text.slice(0, 55),
          textLength: text.length,
          viewportWidth: innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          appWidth: app?.scrollWidth || 0,
        };
      })()`);
      await capture(cdp, path.join(shotsDir, `${route.name}-desktop.png`));
      report.push({ ...route, ...metrics, overflow: metrics.documentWidth > metrics.viewportWidth + 1 });
    }

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await evaluate(cdp, `location.hash = '/chat'`);
    await sleep(800);
    const mobileMetrics = await evaluate(cdp, `(() => {
      const app = document.getElementById('app');
      return {
        title: (app?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 55),
        hash: location.hash,
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        textLength: (app?.innerText || '').trim().length,
      };
    })()`);
    await capture(cdp, path.join(shotsDir, 'chat-mobile.png'));

    console.log('页面渲染检查');
    for (const item of report) {
      console.log(`${item.overflow ? 'FAIL' : 'PASS'} ${item.label.padEnd(4, ' ')} ${item.title} (${item.textLength} 字符)`);
    }
    console.log(`${mobileMetrics.documentWidth > mobileMetrics.viewportWidth + 1 ? 'FAIL' : 'PASS'} 手机端 AI搭子 ${mobileMetrics.title} (${mobileMetrics.textLength} 字符, ${mobileMetrics.hash})`);
    console.log(`控制台错误：${errors.length}`);
    for (const error of errors) console.log(error);
    console.log(`截图目录：${shotsDir}`);

    if (errors.length || report.some((item) => item.overflow) || mobileMetrics.documentWidth > mobileMetrics.viewportWidth + 1) {
      process.exitCode = 1;
    }
  } finally {
    if (cdp) cdp.close();
    chrome.kill();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
