'use strict';

const https = require('node:https');
const zlib = require('node:zlib');
const fs = require('node:fs');

// 基金池：500 只真实基金（由 scripts/build-funds.js 从 ai-wealth-companion 基金快照生成）
// 仅用于学习演示，不构成投资建议
const FUNDS = require('./funds-data');
const FUND_SNAPSHOT_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MARKET_TRIGGER_THRESHOLD = 5;

// 只有明确标注为 ETF 且不是 ETF 联接基金的品种，才按场内基金处理。
// 其余基金统一按开放式基金的收盘净值确认，避免把“指数基金/ETF 联接”等误当成实时交易品种。
function getFundTradingRule(fund) {
  const name = String(fund?.name || '').toUpperCase();
  const isExchangeEtf = String(fund?.type || '').toUpperCase() === 'ETF'
    || (name.includes('ETF') && !name.includes('联接'));
  if (isExchangeEtf) {
    return {
      isEtf: true,
      tradeMode: 'exchange_realtime',
      tradeModeLabel: '场内 ETF · 实时交易',
      pricingLabel: '实时参考价',
      orderMode: 'immediate',
      requiresCloseConfirmation: false,
    };
  }
  return {
    isEtf: false,
    tradeMode: 'close_nav',
    tradeModeLabel: '开放式基金 · 收盘净值确认',
    pricingLabel: '收盘单位净值',
    orderMode: 'pending_close',
    requiresCloseConfirmation: true,
  };
}

function withFundTradingRule(fund) {
  return fund ? { ...fund, ...getFundTradingRule(fund) } : fund;
}

// 更新脚本写入磁盘后，热加载基金池，避免必须重启服务才能看到新快照。
function reloadFundSnapshot() {
  const modulePath = require.resolve('./funds-data');
  delete require.cache[modulePath];
  const freshFunds = require(modulePath);
  if (!Array.isArray(freshFunds)) throw new Error('基金快照格式无效');
  FUNDS.splice(0, FUNDS.length, ...freshFunds);
  for (const key of ['snapshotAsOf', 'generatedAt', 'updatedFields', 'staleFields']) {
    if (freshFunds[key] === undefined) delete FUNDS[key];
    else FUNDS[key] = freshFunds[key];
  }
  return FUNDS;
}

function getFundSnapshotStatus(now = Date.now()) {
  const snapshotAsOf = typeof FUNDS.snapshotAsOf === 'string' ? FUNDS.snapshotAsOf : '';
  const updatedFields = Array.isArray(FUNDS.updatedFields) ? FUNDS.updatedFields : [];
  const staleFields = Array.isArray(FUNDS.staleFields) ? FUNDS.staleFields : [];
  let generatedFileMtime = '';
  try {
    generatedFileMtime = fs.statSync(require.resolve('./funds-data')).mtime.toISOString();
  } catch {}
  if (!snapshotAsOf) {
    return {
      status: 'unknown',
      isFresh: false,
      snapshotAsOf: null,
      generatedAt: FUNDS.generatedAt || generatedFileMtime || null,
      checkedAt: new Date(now).toISOString(),
      maxAgeHours: 48,
      updatedFields,
      staleFields,
      message: '基金快照未记录原始数据时间，无法确认是否为最新。',
    };
  }
  const timestamp = Date.parse(snapshotAsOf);
  if (!Number.isFinite(timestamp)) {
    return {
      status: 'unknown',
      isFresh: false,
      snapshotAsOf,
      generatedAt: FUNDS.generatedAt || generatedFileMtime || null,
      checkedAt: new Date(now).toISOString(),
      maxAgeHours: 48,
      updatedFields,
      staleFields,
      message: '基金快照时间格式无效，无法确认是否为最新。',
    };
  }
  const ageMs = Math.max(0, now - timestamp);
  const isFresh = ageMs <= FUND_SNAPSHOT_MAX_AGE_MS;
  return {
    status: isFresh ? 'fresh' : 'stale',
    isFresh,
    snapshotAsOf,
    generatedAt: FUNDS.generatedAt || generatedFileMtime || null,
    checkedAt: new Date(now).toISOString(),
    ageHours: +(ageMs / 3600000).toFixed(1),
    maxAgeHours: 48,
    updatedFields,
    staleFields,
    message: isFresh
      ? staleFields.length ? `基金快照在有效期内，但${staleFields.join('、')}沿用旧数据。` : '基金快照在有效期内。'
      : '基金快照已超过48小时，可能已过期。',
  };
}

// 大盘指数基准数据（模拟）
const BASE_INDEX = {
  SH: { code: '000001', name: '上证指数', base: 3320.45 },
  SZ: { code: '399001', name: '深证成指', base: 10680.22 },
  CY: { code: '399006', name: '创业板指', base: 2180.15 },
};

// 内存中的“今日行情”状态；可被主动陪伴触发覆盖
let marketOverride = null;

// 真实行情缓存（避免频繁请求）
let realCache = { data: null, time: 0, fetching: null };
const MARKET_TTL = 60 * 1000; // 60 秒

function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 模拟行情（联网失败时的兜底，保证演示始终可用）
function simulatedMarket() {
  const now = new Date();
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rand = (salt) => {
    const x = Math.sin(h + salt) * 10000;
    const v = x - Math.floor(x);
    return (v * 2.0 - 1.0) * 0.9;
  };
  const shChange = rand(1);
  const szChange = rand(2);
  const cyChange = rand(3);
  const indices = [
    { ...BASE_INDEX.SH, change: shChange, price: +(BASE_INDEX.SH.base * (1 + shChange / 100)).toFixed(2) },
    { ...BASE_INDEX.SZ, change: szChange, price: +(BASE_INDEX.SZ.base * (1 + szChange / 100)).toFixed(2) },
    { ...BASE_INDEX.CY, change: cyChange, price: +(BASE_INDEX.CY.base * (1 + cyChange / 100)).toFixed(2) },
  ];
  const avgChange = (shChange + szChange + cyChange) / 3;
  return {
    date: localDateStr(),
    indices,
    avgChange: +avgChange.toFixed(2),
    triggered: Math.abs(avgChange) > MARKET_TRIGGER_THRESHOLD,
    source: 'simulated',
  };
}

// 带超时与重定向的 GET 文本请求（强制 IPv4，避免部分网络下 IPv6 连接异常）
function httpGetText(url, encoding = 'utf8', redirects = 3) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const req = https.get(
      url,
      {
        family: 4,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Referer: 'https://quote.eastmoney.com/',
          'Accept-Encoding': 'gzip, deflate',
        },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          httpGetText(next, encoding, redirects - 1).then(done);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          done(null);
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const enc = (res.headers['content-encoding'] || '').toLowerCase();
          try {
            let raw = buf;
            if (enc === 'gzip') raw = zlib.gunzipSync(buf);
            else if (enc === 'deflate') raw = zlib.inflateSync(buf);
            else if (enc === 'br') raw = zlib.brotliDecompressSync(buf);
            done(new TextDecoder(encoding).decode(raw));
          } catch {
            done(null);
          }
        });
      }
    );
    req.setTimeout(6000, () => {
      req.destroy();
      done(null);
    });
    req.on('error', () => done(null));
  });
}

function buildMarketResult(indices, source) {
  const avgChange = +(indices.reduce((sum, i) => sum + i.change, 0) / indices.length).toFixed(2);
  return {
    date: localDateStr(),
    indices,
    avgChange,
    triggered: Math.abs(avgChange) > MARKET_TRIGGER_THRESHOLD,
    source,
  };
}

// 数据源 1：东方财富（JSON）
async function fetchFromEastmoney() {
  const url =
    'https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001,0.399006&fields=f2,f3,f4,f12,f14&fltt=2';
  const text = await httpGetText(url);
  if (!text) return null;
  try {
    const json = JSON.parse(text);
    const list = json && json.data && json.data.diff;
    if (!Array.isArray(list) || !list.length) return null;
    const byCode = {};
    for (const d of list) byCode[d.f12] = d;
    const spec = [
      { code: '000001', name: '上证指数' },
      { code: '399001', name: '深证成指' },
      { code: '399006', name: '创业板指' },
    ];
    const indices = spec
      .map((s) => {
        const d = byCode[s.code];
        if (!d) return null;
        return { code: s.code, name: d.f14 || s.name, price: Number(d.f2), change: Number(d.f3), changeAmount: Number(d.f4) };
      })
      .filter(Boolean);
    if (indices.length < 3) return null;
    return buildMarketResult(indices, 'eastmoney');
  } catch {
    return null;
  }
}

// 数据源 2：腾讯（GBK 编码）
async function fetchFromTencent() {
  const url = 'https://qt.gtimg.cn/q=sh000001,sz399001,sz399006';
  const text = await httpGetText(url, 'gbk');
  if (!text) return null;
  try {
    const nameMap = { '000001': '上证指数', '399001': '深证成指', '399006': '创业板指' };
    const indices = [];
    for (const line of text.split(';')) {
      const m = line.match(/v_(?:sh|sz)(\d{6})="([^"]*)"/);
      if (!m) continue;
      const code = m[1];
      const parts = m[2].split('~');
      const price = Number(parts[3]);
      const change = Number(parts[32]);
      const changeAmount = Number(parts[31]);
      if (!Number.isFinite(price) || !Number.isFinite(change)) continue;
      indices.push({ code, name: parts[1] || nameMap[code], price, change, changeAmount });
    }
    if (indices.length < 3) return null;
    return buildMarketResult(indices, 'tencent');
  } catch {
    return null;
  }
}

// 聚合：多数据源 + 重试，任一成功即返回
async function fetchRealMarket() {
  const attempts = [fetchFromEastmoney, fetchFromTencent, fetchFromEastmoney, fetchFromTencent];
  for (const fn of attempts) {
    const data = await fn();
    if (data) return data;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function getMarketToday() {
  if (marketOverride) return marketOverride;
  const now = Date.now();
  if (realCache.data && now - realCache.time < MARKET_TTL) return realCache.data;
  if (realCache.fetching) return realCache.fetching;
  realCache.fetching = (async () => {
    const real = await fetchRealMarket();
    if (real) {
      realCache.data = real;
    } else if (!realCache.data) {
      realCache.data = simulatedMarket();
    }
    realCache.time = Date.now();
    realCache.fetching = null;
    return realCache.data;
  })();
  return realCache.fetching;
}

// 聊天接口使用的快速兜底：行情接口较慢或上游不可用时，不阻塞 AI 回复。
function getMarketFallback() {
  return realCache.data || simulatedMarket();
}

// 触发一次模拟市场波动（用于演示主动陪伴）
function triggerMarket(type) {
  const isRise = type === 'rise';
  const magnitude = isRise ? 6.2 : -6.4;
  const indices = [
    { ...BASE_INDEX.SH, change: magnitude, price: +(BASE_INDEX.SH.base * (1 + magnitude / 100)).toFixed(2) },
    { ...BASE_INDEX.SZ, change: magnitude + 0.4, price: +(BASE_INDEX.SZ.base * (1 + (magnitude + 0.4) / 100)).toFixed(2) },
    { ...BASE_INDEX.CY, change: magnitude - 0.3, price: +(BASE_INDEX.CY.base * (1 + (magnitude - 0.3) / 100)).toFixed(2) },
  ];
  marketOverride = {
    date: new Date().toISOString().slice(0, 10),
    indices,
    avgChange: +magnitude.toFixed(2),
    triggered: Math.abs(magnitude) > MARKET_TRIGGER_THRESHOLD,
  };
  return marketOverride;
}

function resetMarket() {
  marketOverride = null;
}

function getFund(code) {
  return FUNDS.find((f) => f.code === code) || null;
}

// 根据用户持仓估算今日影响（模拟：行业基金放大指数波动）
function estimateHoldingsImpact(holdings, avgChange) {
  if (!Array.isArray(holdings) || holdings.length === 0) return null;
  const total = holdings.reduce((s, h) => s + (h.amount || 0), 0);
  let weighted = 0;
  for (const h of holdings) {
    const fund = getFund(h.code);
    const factor = fund && (fund.type === '行业主题' || fund.type === '股票型' || fund.risk === '高') ? 1.6 : fund && fund.type === '货币型' ? 0.1 : 1.0;
    weighted += ((h.amount || 0) / (total || 1)) * factor;
  }
  const estChange = +(avgChange * weighted).toFixed(2);
  const estValue = +(total * (1 + estChange / 100)).toFixed(2);
  return { total, estChange, estValue };
}

module.exports = {
  FUNDS,
  getFund,
  getFundTradingRule,
  withFundTradingRule,
  reloadFundSnapshot,
  getFundSnapshotStatus,
  getMarketToday,
  getMarketFallback,
  triggerMarket,
  resetMarket,
  estimateHoldingsImpact,
};
