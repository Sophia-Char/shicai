'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'akshare_fund_history.py');
const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map();
const inflight = new Map();

function pythonCandidates() {
  const root = path.join(__dirname, '..');
  return [
    process.env.AKSHARE_PYTHON,
    path.join(root, '.venv', 'Scripts', 'python.exe'),
    path.join(root, '.venv', 'bin', 'python'),
    'python',
    'python3',
  ].filter(Boolean);
}

function runPython(python, code) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, PYTHONUTF8: '1' };
    // 某些开发工具注入了不可写的 C:\\nss_ssl_sfagent.log，urllib3 会因此在建立 HTTPS 时失败。
    delete childEnv.SSLKEYLOGFILE;
    const child = spawn(python, [SCRIPT, code], { cwd: path.join(__dirname, '..'), env: childEnv, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish(reject, new Error('AkShare 请求超过45秒，可能是上游接口或网络不可用'));
    }, 45000);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => finish(reject, err));
    child.on('close', (status) => {
      if (status !== 0) return finish(reject, new Error(stderr.trim() || `AkShare 进程退出（${status}）`));
      try {
        const data = JSON.parse(stdout);
        if (!data.ok) return finish(reject, new Error(data.error || 'AkShare 未返回有效数据'));
        finish(resolve, data);
      } catch {
        finish(reject, new Error('AkShare 返回内容不是有效 JSON'));
      }
    });
  });
}

async function fetchFundHistory(code) {
  const normalized = String(code || '').trim();
  if (!/^\d{6}$/.test(normalized)) throw new Error('基金代码必须是6位数字');
  const now = Date.now();
  const hit = cache.get(normalized);
  if (hit && now - hit.time < CACHE_TTL) return hit.data;
  if (inflight.has(normalized)) return inflight.get(normalized);

  const task = (async () => {
    let lastError = null;
    for (const python of pythonCandidates()) {
      try {
        const result = await runPython(python, normalized);
        cache.set(normalized, { time: Date.now(), data: result });
        return result;
      } catch (err) {
        lastError = err;
        if (err && err.code === 'ENOENT') continue;
        if (/not recognized|无法将|不是内部或外部命令/i.test(String(err.message))) continue;
        if (/No module named ['"]?akshare/i.test(String(err.message))) continue;
        break;
      }
    }
    throw lastError || new Error('找不到可用的 Python/AkShare 环境');
  })();
  inflight.set(normalized, task);
  try {
    return await task;
  } finally {
    inflight.delete(normalized);
  }
}

module.exports = { fetchFundHistory };
