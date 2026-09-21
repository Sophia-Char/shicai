'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'update-fund-pool-akshare.py');
const UPDATE_TIMEOUT_MS = 30 * 60 * 1000;
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function pythonCandidates() {
  return [
    process.env.AKSHARE_PYTHON,
    path.join(ROOT, '.venv', 'Scripts', 'python.exe'),
    path.join(ROOT, '.venv', 'bin', 'python'),
    'python',
    'python3',
  ].filter(Boolean);
}

function parseLastJsonLine(stdout) {
  const lines = String(stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const value = JSON.parse(lines[i]);
      if (value && typeof value === 'object') return value;
    } catch {}
  }
  return null;
}

function runPython(python) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, PYTHONUTF8: '1' };
    delete childEnv.SSLKEYLOGFILE;
    const child = spawn(python, [SCRIPT], {
      cwd: ROOT,
      env: childEnv,
      windowsHide: true,
    });
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
      finish(reject, new Error('基金快照更新超过30分钟，可能是上游接口或网络不可用'));
    }, UPDATE_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (err) => finish(reject, err));
    child.on('close', (status) => {
      const result = parseLastJsonLine(stdout);
      if (status !== 0) return finish(reject, new Error(result?.error || stderr.trim() || `基金快照更新进程退出（${status}）`));
      if (!result?.ok) return finish(reject, new Error(result?.error || '基金快照更新未返回成功结果'));
      finish(resolve, result);
    });
  });
}

async function updateFundPool() {
  let lastError = null;
  for (const python of pythonCandidates()) {
    try {
      return await runPython(python);
    } catch (error) {
      lastError = error;
      if (error?.code === 'ENOENT' || /not recognized|无法将|不是内部或外部命令|No module named ['"]?akshare/i.test(String(error.message))) continue;
      break;
    }
  }
  throw lastError || new Error('找不到可用的 Python/AkShare 环境');
}

function startFundPoolAutoUpdater({ getFundSnapshotStatus, reloadFundSnapshot, logger = console }) {
  let running = null;

  const refreshIfStale = (reason = 'scheduled') => {
    if (running) return running;
    const status = getFundSnapshotStatus();
    if (status.isFresh) {
      logger.log(`[基金快照] ${reason}检查：仍在48小时有效期内（截至 ${status.snapshotAsOf || '未知'}）`);
      return Promise.resolve({ ok: true, skipped: true, snapshotAsOf: status.snapshotAsOf });
    }

    logger.log(`[基金快照] ${reason}检查：快照已过期，开始通过 AkShare 更新`);
    running = updateFundPool()
      .then((result) => {
        reloadFundSnapshot();
        const drawdownCoverage = Number.isFinite(Number(result.drawdownCoverage))
          ? `${(Number(result.drawdownCoverage) * 100).toFixed(1)}%`
          : '未知';
        logger.log(`[基金快照] 更新完成：净值/收益 ${result.matched}/${result.total}，最大回撤覆盖率 ${drawdownCoverage}`);
        return result;
      })
      .catch((error) => {
        logger.warn(`[基金快照] 更新失败，继续使用旧快照：${error.message}`);
        return { ok: false, error: error.message };
      })
      .finally(() => { running = null; });
    return running;
  };

  // 不阻塞 HTTP 服务启动；过期时立即后台更新，之后每天检查一次。
  refreshIfStale('启动').catch(() => {});
  const timer = setInterval(() => { refreshIfStale('每日').catch(() => {}); }, UPDATE_INTERVAL_MS);
  timer.unref?.();
  return { refreshIfStale, stop: () => clearInterval(timer) };
}

module.exports = { startFundPoolAutoUpdater, updateFundPool };
