'use strict';

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { initDb, getDb, getState, setState } = require('./db');
const { hashPassword, verifyPassword, randomToken } = require('./auth');
const { runWithAiConfig } = require('./ai-context');
const {
  getUserAiConfig,
  saveUserAiConfig,
  clearUserAiConfig,
  getAiConfigStatus,
  testAiConfig,
} = require('./ai-config');
const {
  generateReply,
  buildProactiveMessage,
  generateProactiveMessage,
  buildAbsenceMessage,
  generateMarketComment,
  generateNewsAnalysis,
  generateSimulationReview,
  generateSimulationHoldingAnalysis,
  generateTermRecognition,
  appendTermExplanations,
  generatePersonalizedNewsSelection,
  generateProfileInference,
  generateRiskAssessmentReview,
  generateCommunityComment,
  generateSuggestions,
  decideResearchWithModel,
  buildMarketText,
  buildHoldingAnalysis,
  TERMS,
} = require('./ai');
const {
  FUNDS,
  getFund,
  getFundTradingRule,
  withFundTradingRule,
  getFundSnapshotStatus,
  reloadFundSnapshot,
  getMarketToday,
  getMarketFallback,
  triggerMarket,
  resetMarket,
  estimateHoldingsImpact,
} = require('./market');
const { refreshNews, personalizeNews } = require('./news');
const { fetchFundHistory } = require('./fund-history');
const { startFundPoolAutoUpdater } = require('./fund-pool-updater');
const { shouldResearch, isFundRelatedQuery, researchQuery, buildResearchText } = require('./research');
const {
  SOURCE_URLS: RISK_ASSESSMENT_SOURCE_URLS,
  QUESTION_KEYS,
  QUESTION_LABELS,
  evaluateRiskAssessment,
  fallbackRiskAssessment,
  findObviousNonsenseKeys,
} = require('./risk-assessment');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const personalizedNewsCache = new Map();
const PERSONALIZED_NEWS_CACHE_MS = 5 * 60 * 1000;
const COMMUNITY_AI_PENDING = '小拾正在补充这条帖子的观点…';

async function makeProactiveMessage(market, profile, holdingsImpact) {
  const aiMessage = await generateProactiveMessage({
    market,
    profile,
    holdingsImpact,
    personaId: profile?.personaPreference || 'custom',
  });
  return aiMessage || buildProactiveMessage(market, holdingsImpact, profile);
}

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

initDb();

// —— 基础工具 ——
function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysBetween(fromDateStr, toDateStr) {
  const a = new Date(fromDateStr + 'T00:00:00');
  const b = new Date(toDateStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) {
        req.destroy();
        reject(new Error('body too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const abs = path.normalize(path.join(PUBLIC_DIR, filePath));
  if (!abs.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(abs, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

// —— 鉴权 ——
function createSession(uid) {
  const token = randomToken();
  getDb().prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, uid);
  return token;
}

function bearerToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function getUserFromRequest(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const row = getDb().prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  return row ? row.user_id : null;
}

// —— 用户级数据读取 ——
function getProfileRecord(uid) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  const row = db.prepare('SELECT * FROM user_profile WHERE user_id = ?').get(uid);
  let holdings = [];
  let emotions = [];
  let profileInference = {};
  let riskAssessment = {};
  try { holdings = JSON.parse(row.holding_json || '[]'); } catch {}
  try { emotions = JSON.parse(row.emotion_log_json || '[]'); } catch {}
  try { profileInference = JSON.parse(row.profile_inference_json || '{}'); } catch {}
  try { riskAssessment = JSON.parse(row.risk_assessment_json || '{}'); } catch {}
  return {
    username: user.username,
    personaPreference: 'custom',
    lastLogin: user.last_login,
    experienceLevel: row.experience_level,
    riskTolerance: row.risk_tolerance,
    goal: row.goal,
    replyStyle: row.reply_style || 'auto',
    selfIntro: row.self_intro || '',
    holdings,
    emotions,
    personalizedNewsEnabled: row.personalized_news_enabled !== 0,
    profileInference,
    riskAssessment,
    onboardingCompleted: row.onboarding_completed === 1,
    personaCustom: row.persona_custom || '',
    raw: row,
  };
}

function clearGeneratedProfileSnapshots(uid) {
  getDb().prepare("DELETE FROM user_memories WHERE user_id = ? AND source IN ('onboarding', 'goal')").run(uid);
}

function replaceGeneratedProfileSnapshot(uid, content, source) {
  const info = getDb().prepare('INSERT INTO user_memories (user_id, content, source) VALUES (?, ?, ?)').run(uid, content, source);
  const id = Number(info.lastInsertRowid);
  getDb().prepare('DELETE FROM user_memories WHERE user_id = ? AND source = ? AND id <> ?').run(uid, source, id);
  return id;
}

function onboardingSummary(assessment) {
  return [
    `风险倾向：${assessment.riskTolerance}（${assessment.score}/${assessment.maxScore}分）`,
    `投资目标：${assessment.goal}，预计期限：${assessment.horizon}`,
    `投资经验：${assessment.experienceLevel}`,
    `陪伴方式：${assessment.personaCustom}`,
    '这只是基于当前回答的画像参考，不代表收益承诺或正式适当性评级；收入、债务、应急金和目标发生变化时应重新评估。',
  ].join('；');
}

function newsProfileKey(profile) {
  return JSON.stringify({
    experienceLevel: profile.experienceLevel,
    riskTolerance: profile.riskTolerance,
    goal: profile.goal,
    selfIntro: profile.selfIntro,
    holdings: profile.holdings,
    emotions: profile.emotions,
    memories: profile.memories,
  });
}

function shortPersonalizationLabel(reason) {
  const text = String(reason || '')
    .trim()
    .replace(/^(与|因|基于|涉及|符合|匹配|关联|关于|用户)(的)?/g, '')
    .replace(/[，,、；;。.!！?？\s]+/g, '、')
    .replace(/^、|、$/g, '');
  const parts = text.split('、').filter(Boolean).filter((part) => !/^(持仓相关|风险偏好|理财目标|市场相关|通用热点|画像相关|用户画像|具体关联)$/.test(part));
  if (parts.length) return parts.slice(0, 2).join('、').slice(0, 18);
  if (/风险|波动|回撤|稳健|激进/.test(text)) return '风险偏好';
  if (/目标|期限|旅行|退休|买房|攒钱/.test(text)) return '理财目标';
  if (/市场|宏观|指数|利率|政策/.test(text)) return '市场相关';
  if (/教育|知识|通用/.test(text)) return '通用热点';
  return '画像相关';
}

function compactNewsTitle(originalTitle, aiTitle = '') {
  const original = String(originalTitle || '').replace(/\s+/g, '').trim();
  const originalChars = Array.from(original);
  if (originalChars.length <= 15) return original;
  const candidate = String(aiTitle || '').replace(/\s+/g, '').trim();
  if (candidate && Array.from(candidate).length <= 15 && !/[\[\]{}]/.test(candidate)) return candidate;
  const punctuationIndex = originalChars.findIndex((char, index) => index >= 3 && /[：:。！？!?]/.test(char));
  if (punctuationIndex > 0 && punctuationIndex <= 15) return originalChars.slice(0, punctuationIndex).join('');
  return `${originalChars.slice(0, 14).join('')}…`;
}

function applyAiNewsSelection(news, selection, limit) {
  const byId = new Map(news.map((item) => [Number(item.id), item]));
  return selection.slice(0, limit).flatMap((picked, index) => {
    const item = byId.get(Number(picked.id));
    if (!item) return [];
    return [{
      ...item,
      personalized: true,
      displayTitle: compactNewsTitle(item.title, picked.shortTitle),
      personalizationScore: selection.length - index,
      personalizationReason: shortPersonalizationLabel(picked.reason),
      personalizationMethod: 'ai',
    }];
  });
}

async function personalizeNewsForUser(uid, news, profile, limit) {
  const rows = Array.isArray(news) ? news : [];
  if (!profile || profile.personalizedNewsEnabled === false) {
    return { news: personalizeNews(rows, profile, limit), mode: 'disabled' };
  }
  profile.memories = getDb().prepare('SELECT content FROM user_memories WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(uid).map((m) => m.content);
  const cacheKey = `${uid}:${newsProfileKey(profile)}:${rows.map((item) => `${item.id}:${item.title}`).join('|')}:${limit}`;
  const cached = personalizedNewsCache.get(cacheKey);
  if (cached && Date.now() - cached.updatedAt < PERSONALIZED_NEWS_CACHE_MS) return cached.value;

  const selectionLimit = Math.min(limit, 12);
  const selection = await generatePersonalizedNewsSelection(profile, rows, selectionLimit);
  const aiRows = selection ? applyAiNewsSelection(rows, selection, limit) : [];
  const value = aiRows.length
    ? { news: aiRows, mode: 'ai' }
    : { news: personalizeNews(rows, profile, limit), mode: 'rules_fallback' };
  personalizedNewsCache.set(cacheKey, { updatedAt: Date.now(), value });
  return value;
}

// 从自然对话中提取明确表达的画像信息，使用结构化大模型判断，不使用关键词规则。
async function inferProfileFromMessage(message, profile) {
  const updates = {};
  const changes = [];
  if (!String(message || '').trim()) return { updates, changes };
  const inferred = await generateProfileInference(message, profile);
  if (!inferred) return inferProfileFromKeywords(message, profile);

  if (inferred.riskTolerance && inferred.riskTolerance !== profile.riskTolerance) {
    updates.riskTolerance = inferred.riskTolerance;
    changes.push(`风险偏好：${inferred.riskTolerance}`);
  }
  if (inferred.experienceLevel && inferred.experienceLevel !== profile.experienceLevel) {
    updates.experienceLevel = inferred.experienceLevel;
    changes.push(`投资经验：${inferred.experienceLevel}`);
  }
  if (inferred.goal && inferred.goal !== profile.goal) {
    updates.goal = inferred.goal;
    changes.push(`理财目标：${inferred.goal}`);
  }
  if (inferred.replyStyle && inferred.replyStyle !== profile.replyStyle) {
    updates.replyStyle = inferred.replyStyle;
    changes.push(`回复风格：${inferred.replyStyle}`);
  }
  if (inferred.personaCustom && inferred.personaCustom !== profile.personaCustom) {
    updates.personaCustom = inferred.personaCustom;
    changes.push('自定义陪伴人格已更新');
  }
  if (Array.isArray(inferred.holdings) && inferred.holdings.length) {
    const holdings = Array.isArray(profile.holdings) ? profile.holdings.slice() : [];
    for (const holding of inferred.holdings) {
      const identity = holding.code || holding.name;
      if (!identity) continue;
      const idx = holdings.findIndex((item) => (holding.code && item.code === holding.code) || (!holding.code && holding.name === item.name));
      const normalized = { ...holding, buy_date: holding.buy_date || localDateStr() };
      if (idx >= 0) holdings[idx] = { ...holdings[idx], ...normalized };
      else holdings.push(normalized);
      changes.push(`持仓：${holding.name || holding.code}`);
    }
    updates.holdings = holdings;
  }
  return { updates, changes: [...new Set(changes)].slice(0, 6) };
}

// 模型不可用时的离线兜底，仅保留原有关键词/格式规则，避免画像自动更新完全失效。
function inferProfileFromKeywords(message, profile) {
  const msg = String(message || '').trim();
  const updates = {};
  const changes = [];
  if (!msg) return { updates, changes };

  const riskRules = [
    { value: '保守', re: /保守|低风险|不想亏太多|不能接受大幅回撤|不喜欢高风险/ },
    { value: '稳健', re: /稳健|稳一点|波动小一点|风险适中/ },
    { value: '平衡', re: /平衡|股债平衡|攻守兼备/ },
    { value: '进取', re: /进取|激进|高风险|能承受大幅波动|追求高收益/ },
  ];
  const riskRule = riskRules.find((rule) => rule.re.test(msg));
  if (riskRule && riskRule.value !== profile.riskTolerance) {
    updates.riskTolerance = riskRule.value;
    changes.push(`风险偏好：${riskRule.value}`);
  }

  const styleRules = [
    { key: 'replyStyle', value: 'concise', label: '回复风格：简洁', re: /简洁一点|短一点|别太长|一句话说清|精炼一点/ },
    { key: 'replyStyle', value: 'detailed', label: '回复风格：详细', re: /详细一点|展开讲|多讲一点|讲透一点/ },
  ];
  const styleRule = styleRules.find((rule) => rule.re.test(msg));
  if (styleRule) {
    const current = styleRule.key === 'replyStyle' ? profile.replyStyle : profile.personaPreference;
    if (current !== styleRule.value) {
      updates[styleRule.key] = styleRule.value;
      changes.push(styleRule.label);
    }
  }

  const exp = msg.match(/(?:投资|理财)(?:经验)?(?:有|已经|超过)?\s*(半年|[一二两三四五六七八九十]+年|\d+(?:\.\d+)?年)/);
  if (exp) {
    const years = Number(exp[1].replace('年', '').replace('一', '1').replace('二', '2').replace('两', '2').replace('三', '3').replace('四', '4').replace('五', '5').replace('六', '6').replace('七', '7').replace('八', '8').replace('九', '9').replace('十', '10'));
    const value = exp[1].includes('半年') ? '半年' : years >= 3 ? '3年以上' : years >= 1 ? '1-3年' : '半年';
    if (value !== profile.experienceLevel) {
      updates.experienceLevel = value;
      changes.push(`投资经验：${value}`);
    }
  } else if (/我是新手|刚开始投资|第一次买基金|不懂基金/.test(msg) && profile.experienceLevel !== '新手') {
    updates.experienceLevel = '新手';
    changes.push('投资经验：新手');
  }

  const goalMatch = msg.match(/(?:我的)?(?:理财)?目标(?:是|为|想)?\s*([^，。；;\n]{2,30})/);
  if (goalMatch && !/是什么|怎么|如何/.test(goalMatch[1])) {
    const goal = goalMatch[1].trim().replace(/^(想要|希望|为了)\s*/, '').slice(0, 50);
    if (goal && goal !== profile.goal) {
      updates.goal = goal;
      changes.push(`理财目标：${goal}`);
    }
  }

  const holdingIntent = /我(?:目前)?(?:持有|买了|已经买入|手里有|有|仓位是)|(?:我的)?持仓(?:里)?有|我的组合/;
  if (holdingIntent.test(msg)) {
    const holdings = Array.isArray(profile.holdings) ? profile.holdings.slice() : [];
    const found = [];
    for (const fund of FUNDS) {
      if (msg.includes(fund.code) || msg.includes(fund.name)) found.push(fund);
    }
    const codes = msg.match(/\b\d{6}\b/g) || [];
    for (const code of codes) {
      if (!found.some((fund) => fund.code === code)) found.push(getFund(code) || { code, name: code, type: '基金', risk: '未知' });
    }
    for (const fund of found.slice(0, 10)) {
      const escapedCode = fund.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const amountMatch = msg.match(new RegExp(`${escapedCode}[^\\d]{0,16}(\\d+(?:\\.\\d+)?)\\s*(?:万)?(?:元|块)`))
        || msg.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:万)?(?:元|块)[^\\d]{0,16}${escapedCode}`));
      const amount = amountMatch ? Number(amountMatch[1]) * (amountMatch[0].includes('万') ? 10000 : 1) : null;
      const idx = holdings.findIndex((holding) => holding.code === fund.code);
      if (idx >= 0) {
        holdings[idx] = { ...holdings[idx], name: fund.name, type: fund.type, ...(amount ? { amount } : {}) };
      } else {
        holdings.push({ code: fund.code, name: fund.name, type: fund.type, amount: amount || 0, buy_date: localDateStr() });
      }
      changes.push(`持仓：${fund.name}${amount ? `（${amount}元）` : ''}`);
    }
    if (found.length) updates.holdings = holdings;
  }

  return { updates, changes: [...new Set(changes)].slice(0, 6) };
}

function applyProfileInference(uid, profile, inference) {
  if (!inference || !Object.keys(inference.updates).length) return profile;
  const updates = inference.updates;
  const db = getDb();
  const fields = [];
  const values = [];
  const add = (field, value) => { fields.push(`${field} = ?`); values.push(value); };
  if (updates.experienceLevel) add('experience_level', updates.experienceLevel);
  if (updates.riskTolerance) add('risk_tolerance', updates.riskTolerance);
  if (updates.goal) add('goal', updates.goal);
  if (updates.replyStyle) add('reply_style', updates.replyStyle);
  if (updates.holdings) add('holding_json', JSON.stringify(updates.holdings));
  if (updates.personaCustom) add('persona_custom', updates.personaCustom);
  const inferenceRecord = { source: 'chat', updatedAt: new Date().toISOString(), fields: inference.changes };
  add('profile_inference_json', JSON.stringify(inferenceRecord));
  if (fields.length) {
    values.push(uid);
    db.prepare(`UPDATE user_profile SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
  }
  if (['experienceLevel', 'riskTolerance', 'goal', 'holdings'].some((key) => Object.prototype.hasOwnProperty.call(updates, key))) {
    clearGeneratedProfileSnapshots(uid);
  }
  return getProfileRecord(uid);
}

function getSimulation(uid) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM simulation WHERE user_id = ?').get(uid);
  let holdings = [];
  let transactions = [];
  let recurringPlans = [];
  let pendingOrders = [];
  try { holdings = JSON.parse(row.holdings_json || '[]'); } catch {}
  try { transactions = JSON.parse(row.transactions_json || '[]'); } catch {}
  try { recurringPlans = JSON.parse(row.recurring_plans_json || '[]'); } catch {}
  try { pendingOrders = JSON.parse(row.pending_orders_json || '[]'); } catch {}
  return {
    cash: row.cash_balance,
    initialCapital: Number(row.initial_capital) > 0 ? Number(row.initial_capital) : 100000,
    holdings,
    transactions,
    recurringPlans: Array.isArray(recurringPlans) ? recurringPlans : [],
    pendingOrders: Array.isArray(pendingOrders) ? pendingOrders : [],
    createdAt: row.created_at,
  };
}

function saveSimulation(uid, cash, holdings, transactions, recurringPlans = [], pendingOrders = []) {
  getDb()
    .prepare('UPDATE simulation SET cash_balance = ?, holdings_json = ?, transactions_json = ?, recurring_plans_json = ?, pending_orders_json = ? WHERE user_id = ?')
    .run(cash, JSON.stringify(holdings), JSON.stringify(transactions), JSON.stringify(recurringPlans), JSON.stringify(pendingOrders), uid);
}

function currentTotalValue(sim) {
  const holdingsValue = sim.holdings.reduce((s, h) => s + (h.shares || 0) * (h.price || 0), 0);
  const frozenCash = sim.pendingOrders
    .filter((order) => order.status === 'pending_close' && order.type === 'buy')
    .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
  return sim.cash + frozenCash + holdingsValue;
}

function buildSimulationAiSnapshot(sim) {
  const total = currentTotalValue(sim);
  const holdings = sim.holdings.map((holding) => {
    const value = +(Number(holding.shares || 0) * Number(holding.price || 0)).toFixed(2);
    const cost = +(Number(holding.shares || 0) * Number(holding.avg_cost || 0)).toFixed(2);
    const pnl = +(value - cost).toFixed(2);
    return {
      ...holding,
      value,
      cost,
      pnl,
      pnlRate: cost > 0 ? +((pnl / cost) * 100).toFixed(2) : null,
    };
  });
  return {
    cash: +Number(sim.cash || 0).toFixed(2),
    initialCapital: +Number(sim.initialCapital || 0).toFixed(2),
    total: +Number(total).toFixed(2),
    profit: +(total - Number(sim.initialCapital || 0)).toFixed(2),
    rate: simulationRate(sim, total),
    holdings,
    transactions: sim.transactions.slice(-10),
    recurringPlans: sim.recurringPlans,
    pendingOrders: sim.pendingOrders,
  };
}

function fallbackSimulationHoldingAnalysis(profile, simulation, market, recentTransactions) {
  const latest = recentTransactions[recentTransactions.length - 1];
  const latestReason = latest?.reason || '最近一次操作未填写动机';
  return [
    '### 当前持仓分析',
    `当前模拟仓总资产约 ${simulation.total} 元，累计盈亏 ${simulation.profit} 元（收益率 ${simulation.rate}%）。`,
    '',
    '### 持仓结构',
    buildHoldingAnalysis({ ...profile, simulation }, market, { includeSimulation: true }),
    '',
    '### 盈亏与操作动机',
    `最近一次操作：${latest ? `${latest.type === 'sell' ? '赎回' : '申购'}${latest.name || '基金'} ${latest.amount ?? '暂无'} 元` : '暂无交易记录'}；操作动机：${latestReason}。`,
    '',
    '### 市场与检查项',
    `${buildMarketText(market)}\n建议继续核对市场风险、持仓集中度、资金使用期限和自己的风险承受能力；以上是模拟仓练习分析，不构成买卖建议。`,
  ].join('\n');
}

function simulationRate(sim, total = currentTotalValue(sim)) {
  const initial = Number(sim.initialCapital) > 0 ? Number(sim.initialCapital) : 100000;
  return +(((total - initial) / initial) * 100).toFixed(2);
}

function addRecurringPeriod(dateStr, frequency) {
  const date = new Date(`${dateStr}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return dateStr;
  if (frequency === '每周') date.setDate(date.getDate() + 7);
  else if (frequency === '每两周') date.setDate(date.getDate() + 14);
  else {
    const day = date.getDate();
    const months = frequency === '每季度' ? 3 : 1;
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, lastDay));
  }
  return localDateStr(date);
}

function applySimulationBuyShares(holdings, fund, requestedShares) {
  const price = Number(fund.price);
  const shares = +Number(requestedShares).toFixed(4);
  const amount = +(shares * price).toFixed(2);
  const idx = holdings.findIndex((h) => h.code === fund.code);
  if (idx >= 0) {
    const old = holdings[idx];
    const newShares = +(old.shares + shares).toFixed(4);
    const newCost = +(((old.shares * old.avg_cost) + amount) / newShares).toFixed(4);
    holdings[idx] = { ...old, shares: newShares, avg_cost: newCost, price, name: fund.name, type: fund.type };
  } else {
    holdings.push({ code: fund.code, name: fund.name, type: fund.type, shares, avg_cost: price, price, buy_date: localDateStr() });
  }
  return { price, shares };
}

function applySimulationBuy(holdings, fund, amount) {
  const price = Number(fund.price);
  return applySimulationBuyShares(holdings, fund, +(amount / price).toFixed(4));
}

function snapshotDate() {
  const value = String(FUNDS.snapshotAsOf || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function closePriceAvailable(order, now = new Date()) {
  const asOf = snapshotDate();
  const placedDate = String(order.placedDate || '').slice(0, 10);
  if (!asOf || !/^\d{4}-\d{2}-\d{2}$/.test(placedDate) || asOf < placedDate) return false;
  // 收盘净值确认的最早时点为本地 15:00；若已有更新日期，则无需等待当前日收盘。
  if (asOf > placedDate) return true;
  const placedAt = new Date(order.placedAt || '');
  if (Number.isFinite(placedAt.getTime()) && localDateStr(placedAt) === placedDate && placedAt.getHours() >= 15) return false;
  return now.getHours() >= 15;
}

function reservedSellShares(pendingOrders, code) {
  return pendingOrders
    .filter((order) => order.status === 'pending_close' && order.type === 'sell' && order.code === code)
    .reduce((sum, order) => sum + (Number(order.shares) || 0), 0);
}

function createPendingCloseOrder({ uid, fund, type, amount, shares = 0, reason = '', investmentPlan = null }) {
  const price = Number(fund.price);
  return {
    id: `order-${Date.now()}-${uid}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    code: fund.code,
    name: fund.name,
    amount: +Number(amount).toFixed(2),
    shares: +Number(shares).toFixed(4),
    estimatedPrice: Number.isFinite(price) ? price : null,
    tradeMode: 'close_nav',
    status: 'pending_close',
    placedAt: new Date().toISOString(),
    placedDate: localDateStr(),
    reason,
    investmentPlan,
  };
}

// 收盘净值挂单只在新的快照可用，或当日 15:00 后才确认，绝不按盘中现价成交。
function executePendingOrders(uid) {
  const sim = getSimulation(uid);
  if (!sim.pendingOrders.length) return false;
  const pendingOrders = [];
  const holdings = sim.holdings.slice();
  const transactions = sim.transactions.slice();
  let cash = Number(sim.cash);
  let changed = false;
  const executionDate = snapshotDate() || localDateStr();

  for (const order of sim.pendingOrders) {
    if (order.status !== 'pending_close' || !closePriceAvailable(order)) {
      pendingOrders.push(order);
      continue;
    }
    const fund = getFund(String(order.code || ''));
    const price = Number(fund?.price);
    if (!fund || !Number.isFinite(price) || price <= 0) {
      pendingOrders.push(order);
      continue;
    }
    const executionFund = { ...fund, price };
    if (order.type === 'buy') {
      const amount = Number(order.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        pendingOrders.push({ ...order, status: 'cancelled', cancelReason: '挂单金额无效' });
        changed = true;
        continue;
      }
      const executed = applySimulationBuy(holdings, executionFund, amount);
      transactions.push({
        id: Date.now() + transactions.length,
        type: 'buy',
        code: fund.code,
        name: fund.name,
        amount,
        price: executed.price,
        shares: executed.shares,
        unit: 'amount',
        reason: order.reason || '',
        date: executionDate,
        placedDate: order.placedDate,
        executionMode: 'close_nav',
        status: 'filled',
        pendingOrderId: order.id,
        investmentPlan: order.investmentPlan || null,
      });
      changed = true;
      continue;
    }

    const idx = holdings.findIndex((holding) => holding.code === fund.code);
    const holding = idx >= 0 ? holdings[idx] : null;
    const requestedShares = Number(order.shares);
    const sellShares = holding ? Math.min(requestedShares, Number(holding.shares) || 0) : 0;
    if (!holding || !Number.isFinite(sellShares) || sellShares <= 0) {
      pendingOrders.push({ ...order, status: 'cancelled', cancelReason: '确认时持仓不足' });
      changed = true;
      continue;
    }
    const sellValue = +(sellShares * price).toFixed(2);
    const remainingShares = +(holding.shares - sellShares).toFixed(4);
    if (remainingShares <= 0.001) holdings.splice(idx, 1);
    else holdings[idx] = { ...holding, shares: remainingShares, price };
    cash = +(cash + sellValue).toFixed(2);
    transactions.push({
      id: Date.now() + transactions.length,
      type: 'sell',
      code: fund.code,
      name: fund.name,
      amount: sellValue,
      price,
      shares: sellShares,
      unit: 'shares',
      reason: order.reason || '',
      date: executionDate,
      placedDate: order.placedDate,
      executionMode: 'close_nav',
      status: 'filled',
      pendingOrderId: order.id,
    });
    changed = true;
  }

  if (changed) saveSimulation(uid, cash, holdings, transactions, sim.recurringPlans, pendingOrders);
  return changed;
}

function executeDueRecurringPlans(uid) {
  const sim = getSimulation(uid);
  const today = localDateStr();
  const recurringPlans = sim.recurringPlans.map((plan) => ({ ...plan }));
  const holdings = sim.holdings.slice();
  const transactions = sim.transactions.slice();
  const pendingOrders = sim.pendingOrders.slice();
  let cash = Number(sim.cash);
  let changed = false;

  for (const plan of recurringPlans) {
    if (plan.active === false || !plan.nextRunDate || plan.nextRunDate > today) continue;
    const frequency = normalizeRecurringFrequency(plan.frequency);
    const fund = getFund(String(plan.code || ''));
    const rule = getFundTradingRule(fund);
    const isEtf = rule.tradeMode === 'exchange_realtime';
    const plannedShares = isEtf ? Number(plan.shares) : null;
    const amount = isEtf ? +(plannedShares * Number(fund?.price || 0)).toFixed(2) : Number(plan.amount);
    if (!fund || (isEtf
      ? (!Number.isInteger(plannedShares) || plannedShares <= 0 || !Number.isFinite(amount) || amount <= 0)
      : (!Number.isFinite(amount) || amount <= 0))) {
      plan.lastResult = '基金数据不可用，本期跳过';
      plan.lastExecutionDate = today;
      plan.nextRunDate = addRecurringPeriod(today, frequency);
      changed = true;
      continue;
    }
    if (amount > cash) {
      plan.lastResult = '余额不足，本期跳过';
      plan.lastExecutionDate = today;
      plan.nextRunDate = addRecurringPeriod(today, frequency);
      changed = true;
      continue;
    }
    if (rule.requiresCloseConfirmation) {
      const hasPending = pendingOrders.some((order) => order.status === 'pending_close' && order.type === 'buy' && order.investmentPlan?.planId === plan.id);
      if (!hasPending) {
        const investmentPlan = {
          enabled: true,
          planId: plan.id,
          frequency,
          amount,
          autoExecution: true,
        };
        pendingOrders.push(createPendingCloseOrder({ uid, fund, type: 'buy', amount, reason: '按定投计划自动挂单，等待收盘净值确认', investmentPlan }));
        cash = +(cash - amount).toFixed(2);
        plan.lastResult = '已挂单，等待收盘净值确认';
        plan.lastExecutionDate = today;
        plan.nextRunDate = addRecurringPeriod(today, frequency);
        changed = true;
      }
      continue;
    }
    const executed = isEtf
      ? applySimulationBuyShares(holdings, fund, plannedShares)
      : applySimulationBuy(holdings, fund, amount);
    const { price, shares } = executed;
    cash = +(cash - amount).toFixed(2);
    transactions.push({
      id: Date.now() + transactions.length,
      type: 'buy',
      code: fund.code,
      name: fund.name,
      amount,
      price,
      shares,
      unit: isEtf ? 'shares' : 'amount',
      reason: '按定投计划自动执行',
      date: today,
      executionMode: 'exchange_realtime',
      status: 'filled',
      investmentPlan: {
        enabled: true,
        planId: plan.id,
        frequency,
          amount,
          ...(isEtf ? { shares: plannedShares } : {}),
          autoExecution: true,
      },
    });
    plan.lastResult = '已自动执行';
    plan.lastExecutionDate = today;
    plan.nextRunDate = addRecurringPeriod(today, frequency);
    changed = true;
  }

  if (changed) saveSimulation(uid, cash, holdings, transactions, recurringPlans, pendingOrders);
  return changed;
}

function executeAllDueRecurringPlans() {
  const db = getDb();
  const users = db.prepare('SELECT user_id FROM simulation').all();
  let executed = 0;
  for (const user of users) {
    if (executeDueRecurringPlans(Number(user.user_id))) executed++;
  }
  return executed;
}

function executeAllPendingOrders() {
  const db = getDb();
  const users = db.prepare('SELECT user_id FROM simulation').all();
  let executed = 0;
  for (const user of users) {
    if (executePendingOrders(Number(user.user_id))) executed++;
  }
  return executed;
}

function normalizeTradeReason(reason) {
  return String(reason || '').trim().slice(0, 500);
}

function normalizeRecurringFrequency(value) {
  const allowed = new Set(['每周', '每两周', '每月', '每季度']);
  return allowed.has(String(value || '')) ? String(value) : '每月';
}

function formatInvestmentPlan(plan) {
  if (!plan || plan.enabled !== true) return '';
  return `这次申购已标记为定投：${plan.frequency}一次，每期 ${plan.amount} 元。定投不能保证收益或避免亏损，后续仍要复核投资期限、标的风险和持续投入能力。`;
}

function reviewReason(reason) {
  if (reason) {
    return `你记录的操作原因是：“${reason}”\n这条记录可以帮助你区分：当时是基于目标和策略，还是受短期情绪驱动。后续复盘时，记得对照实际结果检查这条理由是否仍然成立。`;
  }
  return '这次没有留下操作原因。下次可以顺手记一句当时的思考、策略或情绪，方便之后判断自己是否按计划执行。';
}

function getStreak(uid) {
  const today = localDateStr();
  const yesterday = localDateStr(new Date(Date.now() - 86400000));
  const last = getState(`streak_last_date:${uid}`);
  let count = Number(getState(`streak_count:${uid}`, '0'));
  if (last === today) {
    // noop
  } else if (last === yesterday) {
    count += 1;
  } else {
    count = 1;
  }
  setState(`streak_last_date:${uid}`, today);
  setState(`streak_count:${uid}`, count);
  return count;
}

// —— 生成类内容（确定性兜底） ——
function marketComment(market, personaId) {
  const up = market.avgChange >= 0;
  const abs = Math.abs(market.avgChange).toFixed(2);
  return up
    ? `今日市场整体上涨 ${abs}%，市场情绪偏暖。单日上涨不能证明趋势反转，建议结合趋势、估值和自己的投资计划继续观察。`
    : `今日市场整体下跌 ${abs}%，市场情绪偏谨慎。单日涨跌不能构成买卖结论，建议先把事实、持仓风险和自己的计划分开核对。`;
}

function learningLinkForFund(fund) {
  if (!fund) return '';
  const map = {
    行业主题: '要不要花2分钟了解一下「行业基金」和「宽基指数」的区别？',
    宽基指数: '要不要花2分钟了解一下「宽基指数」为什么比押单一行业更分散？',
    货币型: '要不要花2分钟了解一下「货币基金」和「债券基金」的风险差异？',
    混合型: '要不要花2分钟了解一下「资产配置」为什么能帮你分散风险？',
  };
  return map[fund.type] || '要不要花2分钟了解一下这只基金所属的类型和它的风险特征？';
}

function reviewBuy(fund, amount, personaId, reason = '', tradeMeta = {}) {
  const tradeText = Number.isFinite(Number(tradeMeta.shares))
    ? `${Number(tradeMeta.shares)} 份（约 ${amount} 元）`
    : `${amount} 元`;
  const open = {
    warm: `你申购了${fund.name} ${tradeText}。想听听我的观察吗？`,
    pro: `已记录：申购 ${fund.name} ${tradeText}。基于这只基金的公开特征，我的观察如下。`,
    humor: `已申购 ${fund.name} ${tradeText}。这笔操作我先不夸，给你几句“损友式”提醒。`,
  }[personaId] || `你申购了${fund.name} ${tradeText}。想听听我的观察吗？`;
  let body;
  if (fund.maxDrawdown <= -25) body = `这只基金近一年波动比较大（最大回撤约 ${Math.abs(fund.maxDrawdown)}%）。你选择它，是因为看好它的行业方向，还是看到了短期业绩？记住你现在的理由，未来回看会很重要。`;
  else if (fund.maxDrawdown <= -10) body = `这只基金属于中等波动（最大回撤约 ${Math.abs(fund.maxDrawdown)}%）。申购后别天天盯净值，给自己设一个“看账户的频率”，反而更容易拿得住。`;
  else body = `这只基金波动较小，适合作为组合里的“稳定器”。不过低波动也意味着弹性有限，想清楚它在你组合里的角色。`;
  const planText = formatInvestmentPlan(tradeMeta.investmentPlan);
  return `${open}\n\n${body}${planText ? `\n\n${planText}` : ''}\n\n${reviewReason(reason)}\n\n${learningLinkForFund(fund)}`;
}

function reviewSell(fund, amount, personaId, reason = '', tradeMeta = {}) {
  const tradeText = Number.isFinite(Number(tradeMeta.shares))
    ? `${Number(tradeMeta.shares)} 份（约 ${amount} 元）`
    : `约 ${amount} 元`;
  const open = {
    warm: `你赎回了${fund.name} 的一部分（${tradeText}）。赎回没有对错，我们来看看这次操作背后的逻辑。`,
    pro: `已记录：赎回 ${fund.name} ${tradeText}。是否合理，取决于赎回的理由而非市场涨跌。`,
    humor: `已赎回 ${fund.name} ${tradeText}。不管你是“止盈落袋”还是“止损跑路”，先来复盘一下。`,
  }[personaId] || `你赎回了${fund.name} 的一部分（${tradeText}）。`;
  return `${open}\n\n想邀请你回答一个问题：你赎回，是因为当初申购的逻辑变了，还是因为短期涨跌带来的情绪？如果是前者，赎回是纪律；如果是后者，可能需要警惕“情绪替你做决定”。\n\n${reviewReason(reason)}\n\n把这次的理由记下来，未来市场再波动时，你会感谢现在的自己。`;
}

async function reviewWithLiveResearch(uid, fund, type, amount, reason, personaId, tradeMeta = {}) {
  const baseReview = type === 'buy'
    ? reviewBuy(fund, amount, personaId, reason, tradeMeta)
    : reviewSell(fund, amount, personaId, reason, tradeMeta);
  try {
    const research = await researchQuery(`${fund.name} ${fund.code} 最新净值 近一年收益率 夏普率 最大回撤 风险特征`);
    const researchText = buildResearchText(research);
    const profile = getProfileRecord(uid);
    const simulation = getSimulation(uid);
    const simulationTotal = currentTotalValue(simulation);
    profile.simulation = {
      cash: +simulation.cash.toFixed(2),
      total: +simulationTotal.toFixed(2),
      rate: simulationRate(simulation, simulationTotal),
      initialCapital: simulation.initialCapital,
      holdings: simulation.holdings.map((holding) => ({ ...holding, value: +(holding.shares * holding.price).toFixed(2) })),
      transactions: simulation.transactions.slice(-10),
      recurringPlans: simulation.recurringPlans,
    };
    profile.market = getMarketFallback();
    const aiReview = await generateSimulationReview({
      profile,
      fund,
      trade: {
        type,
        amount,
        shares: tradeMeta.shares,
        executionPrice: tradeMeta.executionPrice,
        reason,
        historical: tradeMeta.historical === true,
        historicalTransaction: tradeMeta.historicalTransaction || null,
        investmentPlan: tradeMeta.investmentPlan || null,
      },
      researchText,
      personaId,
    });
    return {
      review: aiReview || `${baseReview}\n\n### 持仓分析\n${buildHoldingAnalysis(profile, profile.market, { includeSimulation: true })}\n\n### 最新数据核对\n${researchText}\n\n> 以上数据用于复盘核对，不代表买卖建议；验证状态为“尚未确认”或“存在来源冲突”时，不应把它当作确定事实。`,
      research: {
        searchedAt: research.searchedAt,
        verification: research.verification,
        data: research.data,
      },
    };
  } catch (error) {
    return { review: baseReview, research: { verification: { status: 'unverified', confidence: 0, rationale: `联网检索失败：${error.message}`, sources: [] }, data: [] } };
  }
}

const FUND_CODE_TO_LABEL = {};
for (const f of FUNDS) FUND_CODE_TO_LABEL[f.code] = `某${f.type === '宽基指数' ? '指数' : f.type}基金`;

function maskSensitive(content) {
  let out = content;
  for (const [code, label] of Object.entries(FUND_CODE_TO_LABEL)) out = out.split(code).join(label);
  out = out.replace(/\b\d{6}\b/g, '某基金');
  out = out.replace(/\d+(\.\d+)?\s*万/g, '一笔钱');
  out = out.replace(/\d+(\.\d+)?\s*元/g, '一笔钱');
  out = out.replace(/[¥￥]\s*\d+(\.\d+)?/g, '一笔钱');
  return out;
}

function communityAiComment(content) {
  const c = content || '';
  if (/清仓|全卖|割肉|全抛/.test(c)) return '清仓是每个人都会做的选择，不算错。不过想邀请你思考：你卖出的原因，是因为市场跌了，还是因为当初买入的逻辑变了？《投资最重要的事》里有个观点：如果你不能承受50%的亏损，那你就不应该买股票基金。把这次卖出的理由记下来，未来再遇到波动，你会感谢现在的自己。';
  if (/涨了|大涨|翻倍|太牛|赚了|盈利/.test(c)) return '恭喜！短期收益确实让人开心。一个小提醒：市场先生有时会随机发糖。可以回顾一下，你的收益是来源于判断，还是运气？区分这两者，是长期盈利的关键。另外，赚了钱之后最忌讳的是“加大投入”，先让情绪沉淀几天再说。';
  if (/亏了|亏损|跌了|绿了|套牢/.test(c)) return '亏损的感受很真实，谢谢你的分享。想补充一个视角：短期的账面浮亏不等于最终结果，真正重要的是你当初买入的逻辑是否还在。把情绪说出来，本身就是很好的减压方式。如果实在睡不着，可以先把账户放一放，等心态平复再回头看。';
  if (/新手|学习|笔记|知识/.test(c)) return '谢谢你分享学习心得。补充一点：理财知识最有效的方式是“边学边用、小金额实践”，把概念放到真实波动里体会，会比只看理论记得更牢。另外，从“知道”到“做到”之间隔着情绪这一关，多记录自己当时的判断，进步会更快。';
  return '谢谢你的分享。每个人的风险承受和处境都不同，所以适合自己的选择才是最好的。想提醒的是：社区里的信息只能作为参考，决策的依据永远是你自己的理解和承受能力。如果愿意多聊聊背后的想法，大家也能一起帮你把思路理得更清楚。';
}

// 帖子先完成落库并响应，AI 补充在请求结束后异步更新占位评论。
function queueCommunityAiComment(postId, uid, content, commentId) {
  Promise.resolve().then(async () => {
    let aiComment = null;
    try {
      const profile = getProfileRecord(uid);
      aiComment = await generateCommunityComment(content, 'custom', profile);
    } catch (error) {
      console.warn('[community-ai] generation failed:', error.message);
    }
    aiComment = aiComment || communityAiComment(content);
    getDb().prepare(
      'UPDATE comments SET content = ? WHERE id = ? AND post_id = ? AND is_ai = 1'
    ).run(aiComment, commentId, postId);
  }).catch((error) => {
    console.warn('[community-ai] supplement failed:', error.message);
  });
}

// —— API 路由 ——
async function handleApi(req, res, url, method) {
  const db = getDb();
  const pathname = url.pathname;

  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    });
    res.end();
    return;
  }

  if (pathname === '/api/health' && method === 'GET') return sendJson(res, 200, { ok: true });

  // 注册 / 登录（公开）
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    if (username.length < 2) return sendJson(res, 400, { error: '用户名至少2个字符' });
    if (password.length < 6) return sendJson(res, 400, { error: '密码至少6位' });
    if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) return sendJson(res, 409, { error: '用户名已存在' });
    const info = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hashPassword(password));
    const uid = Number(info.lastInsertRowid);
    db.prepare('INSERT INTO user_profile (user_id) VALUES (?)').run(uid);
    db.prepare('INSERT INTO simulation (user_id) VALUES (?)').run(uid);
    const token = createSession(uid);
    return sendJson(res, 200, { token, user: { id: uid, username, personaPreference: 'custom' }, onboardingRequired: true });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readBody(req);
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !verifyPassword(password, user.password_hash)) return sendJson(res, 401, { error: '用户名或密码错误' });
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(localDateStr(), user.id);
    const token = createSession(user.id);
    const profile = db.prepare('SELECT onboarding_completed FROM user_profile WHERE user_id = ?').get(user.id);
    return sendJson(res, 200, {
      token,
      user: { id: user.id, username: user.username, personaPreference: 'custom' },
      onboardingRequired: !profile || profile.onboarding_completed !== 1,
    });
  }

  // 其余接口需要登录
  const uid = getUserFromRequest(req);
  if (!uid) return sendJson(res, 401, { error: '未登录' });

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const token = bearerToken(req);
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = db.prepare('SELECT id, username, persona_preference, created_at FROM users WHERE id = ?').get(uid);
    return sendJson(res, 200, user);
  }

  // 用户级 AI 接入配置
  if (pathname === '/api/ai/config' && method === 'GET') {
    return sendJson(res, 200, getAiConfigStatus(uid));
  }

  if (pathname === '/api/ai/config' && method === 'POST') {
    const body = await readBody(req);
    try {
      saveUserAiConfig(uid, body);
      return sendJson(res, 200, { ok: true, config: getAiConfigStatus(uid) });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (pathname === '/api/ai/config' && method === 'DELETE') {
    clearUserAiConfig(uid);
    return sendJson(res, 200, { ok: true, config: getAiConfigStatus(uid) });
  }

  if (pathname === '/api/ai/config/test' && method === 'POST') {
    const body = await readBody(req);
    const existing = getUserAiConfig(uid);
    const candidate = {
      key: body.apiKey || existing?.key || process.env.DEEPSEEK_API_KEY || '',
      baseUrl: body.baseUrl || existing?.baseUrl || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: body.model || existing?.model || process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    };
    try {
      return sendJson(res, 200, await testAiConfig(candidate));
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  // 画像
  if (pathname === '/api/profile' && method === 'GET') {
    const p = getProfileRecord(uid);
    return sendJson(res, 200, {
      username: p.username,
      personaPreference: p.personaPreference,
      experienceLevel: p.experienceLevel,
      riskTolerance: p.riskTolerance,
      goal: p.goal,
      replyStyle: p.replyStyle,
      selfIntro: p.selfIntro,
      holdings: p.holdings,
      emotions: p.emotions,
      personalizedNewsEnabled: p.personalizedNewsEnabled,
      profileInference: p.profileInference,
      riskAssessment: p.riskAssessment,
      onboardingCompleted: p.onboardingCompleted,
      personaCustom: p.personaCustom,
    });
  }

  if (pathname === '/api/profile' && method === 'POST') {
    const body = await readBody(req);
    const cur = getProfileRecord(uid);
    const profileSnapshotReplaced = ['experience_level', 'risk_tolerance', 'goal', 'holdings', 'self_intro']
      .some((key) => Object.prototype.hasOwnProperty.call(body, key));
    const exp = body.experience_level || cur.experienceLevel;
    const risk = body.risk_tolerance || cur.riskTolerance;
    const goal = body.goal || cur.goal;
    let holdings = cur.holdings;
    if (Array.isArray(body.holdings)) holdings = body.holdings;
    if (body.personaPreference && body.personaPreference !== 'custom') {
      return sendJson(res, 400, { error: '预设人格已移除，请使用自定义陪伴人格' });
    }
    db.prepare("UPDATE users SET persona_preference = 'custom' WHERE id = ?").run(uid);
    const replyStyle = ['auto', 'concise', 'standard', 'detailed'].includes(body.reply_style) ? body.reply_style : cur.replyStyle;
    const selfIntro = typeof body.self_intro === 'string' ? body.self_intro.slice(0, 500) : cur.selfIntro;
    const personaCustom = typeof body.persona_custom === 'string' ? body.persona_custom.slice(0, 240) : cur.personaCustom;
    const newsEnabled = body.personalizedNewsEnabled != null
      ? (body.personalizedNewsEnabled ? 1 : 0)
      : body.personalized_news_enabled != null
        ? (body.personalized_news_enabled ? 1 : 0)
        : (cur.personalizedNewsEnabled ? 1 : 0);
    db.prepare('UPDATE user_profile SET experience_level = ?, risk_tolerance = ?, goal = ?, holding_json = ?, reply_style = ?, self_intro = ?, personalized_news_enabled = ?, persona_custom = ? WHERE user_id = ?')
      .run(exp, risk, goal, JSON.stringify(holdings), replyStyle, selfIntro, newsEnabled, personaCustom, uid);
    if (profileSnapshotReplaced) clearGeneratedProfileSnapshots(uid);
    return sendJson(res, 200, { ok: true });
  }

  // 首次登录/手动更新建档：使用精简风险测评题库完成画像，不把结果当作正式适当性评级。
  if (pathname === '/api/onboarding/complete' && method === 'POST') {
    const body = await readBody(req);
    const survey = body.survey && typeof body.survey === 'object' ? body.survey : body;
    const baseAssessment = evaluateRiskAssessment(survey);
    if (!baseAssessment.ok) return sendJson(res, 400, { error: `请完成 ${QUESTION_KEYS.length} 道画像测评题后再保存` });
    const nonsenseKeys = findObviousNonsenseKeys(survey);
    if (nonsenseKeys.length) {
      const labels = nonsenseKeys.map((key) => QUESTION_LABELS[key] || key).join('、');
      return sendJson(res, 200, {
        ok: false,
        needsRetake: true,
        retryKeys: nonsenseKeys.slice(0, 4),
        feedback: `检测到${labels}中的回答包含随机数字、重复字符或无实际含义的内容，无法作为有效画像回答。请重新回答对应题目，说明你的真实感受或选择最符合情况的选项。`,
        source: 'server_nonsense_guard',
      });
    }
    const modelAssessment = await generateRiskAssessmentReview({ survey, profile: getProfileRecord(uid) });
    if (modelAssessment && modelAssessment.valid === false) {
      return sendJson(res, 200, {
        ok: false,
        needsRetake: true,
        retryKeys: modelAssessment.retryKeys || [],
        feedback: modelAssessment.feedback || '有些回答还不够清楚，请按题目描述你自己的真实情况后再提交。',
      });
    }
    const fallbackAssessment = modelAssessment ? null : fallbackRiskAssessment(survey);
    if (fallbackAssessment && fallbackAssessment.valid === false) {
      return sendJson(res, 200, {
        ok: false,
        needsRetake: true,
        retryKeys: fallbackAssessment.retryKeys || [],
        feedback: fallbackAssessment.feedback,
        source: fallbackAssessment.source,
      });
    }
    const assessment = modelAssessment && modelAssessment.valid
      ? {
        ...baseAssessment,
        ...modelAssessment,
        score: modelAssessment.riskScore,
        maxScore: 24,
        version: 'compact-online-bank-v2-model',
        completedAt: new Date().toISOString(),
        sourceUrls: RISK_ASSESSMENT_SOURCE_URLS,
      }
      : fallbackAssessment;
    const goal = `${assessment.goal}（${assessment.horizon}）`;
    const intro = [
      `精简风险测评：${assessment.riskTolerance}（${assessment.score}/${assessment.maxScore}分）`,
      `投资目标：${goal}`,
      `投资经验：${assessment.experienceLevel}`,
      `陪伴方式：${assessment.personaCustom}`,
    ].join('；').slice(0, 500);
    const db = getDb();
    const inferenceRecord = {
      source: assessment.source || 'online_risk_question_bank_fallback',
      updatedAt: assessment.completedAt,
      fields: [`风险倾向：${assessment.riskTolerance}`, `投资经验：${assessment.experienceLevel}`, `投资目标：${assessment.goal}`],
      sourceUrls: RISK_ASSESSMENT_SOURCE_URLS,
    };
    db.prepare('UPDATE user_profile SET experience_level = ?, risk_tolerance = ?, goal = ?, reply_style = ?, self_intro = ?, profile_inference_json = ?, risk_assessment_json = ?, onboarding_completed = 1, persona_custom = ? WHERE user_id = ?')
      .run(assessment.experienceLevel, assessment.riskTolerance, goal, assessment.replyStyle, intro, JSON.stringify(inferenceRecord), JSON.stringify(assessment), assessment.personaCustom, uid);
    replaceGeneratedProfileSnapshot(uid, intro, 'onboarding');
    getDb().prepare("DELETE FROM user_memories WHERE user_id = ? AND source = 'goal'").run(uid);
    return sendJson(res, 200, {
      ok: true,
      summary: onboardingSummary(assessment),
      feedback: assessment.feedback,
      concerns: assessment.concerns || [],
      profile: getProfileRecord(uid),
      riskAssessment: assessment,
    });
  }

  // 多会话
  if (pathname === '/api/conversations' && method === 'GET') {
    const convs = db.prepare('SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC').all(uid);
    return sendJson(res, 200, { conversations: convs });
  }

  if (pathname === '/api/conversations' && method === 'POST') {
    const body = await readBody(req);
    const title = String(body.title || '新的对话').trim().slice(0, 30) || '新的对话';
    const info = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(uid, title);
    return sendJson(res, 200, { id: Number(info.lastInsertRowid), title });
  }

  if (pathname.startsWith('/api/conversations/') && method === 'DELETE') {
    const id = Number(pathname.split('/').pop());
    db.prepare('DELETE FROM chat_history WHERE conversation_id = ? AND user_id = ?').run(id, uid);
    db.prepare('DELETE FROM conversations WHERE id = ? AND user_id = ?').run(id, uid);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname.startsWith('/api/conversations/') && method === 'PATCH') {
    const id = Number(pathname.split('/').pop());
    const body = await readBody(req);
    const title = String(body.title || '').trim().slice(0, 30) || '新的对话';
    db.prepare('UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?').run(title, id, uid);
    return sendJson(res, 200, { ok: true });
  }

  // 对话历史
  if (pathname === '/api/chat/history' && method === 'GET') {
    const cid = Number(url.searchParams.get('conversationId') || 0);
    const rows = cid
      ? db.prepare('SELECT id, persona, message, reply, created_at FROM chat_history WHERE user_id = ? AND conversation_id = ? ORDER BY id DESC LIMIT 50').all(uid, cid)
      : db.prepare('SELECT id, persona, message, reply, created_at FROM chat_history WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(uid);
    return sendJson(res, 200, rows.reverse());
  }

  // 发送消息
  if (pathname === '/api/chat' && method === 'POST') {
    const body = await readBody(req);
    const message = String(body.message || '').trim();
    if (!message) return sendJson(res, 400, { error: 'message required' });
    const personaId = 'custom';
    let cid = Number(body.conversationId || 0);
    if (!cid) {
      const info = db.prepare('INSERT INTO conversations (user_id, title) VALUES (?, ?)').run(uid, message.slice(0, 20) || '新的对话');
      cid = Number(info.lastInsertRowid);
    } else {
      const conv = db.prepare('SELECT id FROM conversations WHERE id = ? AND user_id = ?').get(cid, uid);
      if (!conv) return sendJson(res, 404, { error: '对话不存在' });
    }
    let profile = getProfileRecord(uid);
    const [profileInference, termRecognition, researchDecision] = await Promise.all([
      inferProfileFromMessage(message, profile),
      generateTermRecognition(message, profile),
      decideResearchWithModel(message),
    ]);
    if (profileInference.changes.length) profile = applyProfileInference(uid, profile, profileInference);
    // 行情不是聊天回复的硬依赖：最多等待 1.2 秒，避免行情上游卡住导致“发送后一直没反应”。
    const market = await Promise.race([
      getMarketToday(),
      new Promise((resolve) => setTimeout(() => resolve(getMarketFallback()), 1200)),
    ]);
    let research = null;
    const fundRelated = isFundRelatedQuery(message);
    const fundCode = (message.match(/\b\d{6}\b/) || [])[0] || '';
    // 基金介绍和具体基金话题必须带可核查依据；其他问题仍由模型决定是否联网。
    const needsResearch = fundRelated || (researchDecision
      ? researchDecision.needsResearch
      : shouldResearch(message));
    if (needsResearch) {
      try {
        research = await researchQuery(researchDecision?.query || message, { fundRelated, fundCode });
      } catch (error) {
        research = {
          query: message,
          searchedAt: new Date().toISOString(),
          verification: { status: 'unverified', confidence: 0, rationale: `联网检索失败：${error.message}`, sources: [] },
          data: [{ kind: 'research_error', error: error.message }],
        };
      }
    }
    const history = db.prepare('SELECT message, reply FROM chat_history WHERE user_id = ? AND conversation_id = ? ORDER BY id DESC LIMIT 8').all(uid, cid).reverse();
    // 默认优先当前持仓；只有用户明确提到模拟仓时，才把模拟仓数据交给 AI。
    const includeSimulation = /模拟仓|模拟账户|虚拟仓|模拟盘|模拟收益|模拟资产|模拟持仓|练手仓/.test(message);
    // 注入最近新闻、画像笔记；模拟仓按本轮问题显式开关注入
    const sim = getSimulation(uid);
    const simTotal = currentTotalValue(sim);
    profile.simulation = {
      cash: +sim.cash.toFixed(2),
      total: +simTotal.toFixed(2),
      rate: simulationRate(sim, simTotal),
      initialCapital: sim.initialCapital,
      holdings: sim.holdings.map((h) => ({ code: h.code, name: h.name, shares: h.shares, value: +(h.shares * h.price).toFixed(2) })),
      transactions: sim.transactions.slice(-5).map((t) => ({
        type: t.type,
        name: t.name,
        amount: t.amount,
        date: t.date,
        reason: normalizeTradeReason(t.reason).slice(0, 180),
        investmentPlan: t.investmentPlan || null,
      })),
    };
    profile.memories = db.prepare('SELECT content FROM user_memories WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(uid).map((m) => m.content);
    const news = db.prepare('SELECT title, ai_summary, content FROM news ORDER BY published_at DESC, id DESC LIMIT 3').all();
    const generated = await generateReply(message, {
      personaId,
      profile,
      market,
      history,
      news,
      includeSimulation,
      research: research ? buildResearchText(research) : null,
    });
    const termExplanations = termRecognition?.terms || [];
    const reply = appendTermExplanations(generated.reply, termExplanations);
    db.prepare('INSERT INTO chat_history (user_id, conversation_id, persona, message, reply) VALUES (?, ?, ?, ?, ?)').run(uid, cid, personaId, message, reply);
    db.prepare("UPDATE conversations SET updated_at = datetime('now','localtime') WHERE id = ?").run(cid);
    return sendJson(res, 200, {
      reply,
      source: generated.source,
      personaId,
      conversationId: cid,
      profileUpdates: profileInference.changes,
      termExplanations,
      research: research ? {
        searchedAt: research.searchedAt,
        verification: research.verification,
        data: research.data,
      } : null,
    });
  }

  // 默认问题模板（只由 AI 动态生成，失败时返回空数组，由前端保持隐藏）
  if (pathname === '/api/chat/suggestions' && method === 'POST') {
    const body = await readBody(req);
    const profile = getProfileRecord(uid);
    const sim = getSimulation(uid);
    const simTotal = currentTotalValue(sim);
    profile.simulation = { total: +simTotal.toFixed(2), rate: simulationRate(sim, simTotal), initialCapital: sim.initialCapital, holdings: sim.holdings };
    profile.memories = db.prepare('SELECT content FROM user_memories WHERE user_id = ? ORDER BY id DESC LIMIT 10').all(uid).map((m) => m.content);
    const news = db.prepare('SELECT title, ai_summary FROM news ORDER BY published_at DESC, id DESC LIMIT 5').all();
    const personaId = 'custom';
    // 默认问题不需要等待行情上游；优先使用已有行情，否则立即使用本地兜底数据。
    const market = getMarketFallback();
    const suggestions = await generateSuggestions({ profile, market, news, personaId });
    return sendJson(res, 200, { suggestions });
  }

  // 市场
  if (pathname === '/api/market/today' && method === 'GET') {
    const market = await getMarketToday();
    const profile = getProfileRecord(uid);
    const personaId = 'custom';
    const aiComment = await generateMarketComment(market, personaId, profile);
    return sendJson(res, 200, { market, comment: aiComment || marketComment(market, personaId) });
  }

  if (pathname.startsWith('/api/funds/') && pathname.endsWith('/detail') && method === 'GET') {
    const code = decodeURIComponent(pathname.slice('/api/funds/'.length, -'/detail'.length));
    try {
      const history = await fetchFundHistory(code);
      const base = getFund(code) || { code, name: code, type: '基金', risk: '未记录' };
      const year = history.periods && history.periods['1y'];
      return sendJson(res, 200, {
        fund: {
          ...base,
          ...getFundTradingRule(base),
          code,
          fundPageUrl: `https://fund.eastmoney.com/${encodeURIComponent(code)}.html`,
          price: history.currentValue,
          return1y: year ? year.change : null,
          maxDrawdown: history.maxDrawdown,
          sharpe: history.sharpe,
        },
        ...history,
      });
    } catch (err) {
      console.error('[fund detail]', code, err.message);
      return sendJson(res, 502, { error: `AkShare 基金数据暂不可用：${err.message}` });
    }
  }

  if (pathname === '/api/funds' && method === 'GET') return sendJson(res, 200, { funds: FUNDS.map(withFundTradingRule), snapshot: getFundSnapshotStatus() });

  // 模拟仓
  if (pathname === '/api/simulate/review' && method === 'POST') {
    const body = await readBody(req);
    executePendingOrders(uid);
    const sim = getSimulation(uid);
    const transactionId = String(body.transactionId || '').trim();
    const transaction = sim.transactions.find((item) => String(item.id) === transactionId);
    if (!transaction) return sendJson(res, 404, { error: '交易记录不存在' });
    const fund = getFund(String(transaction.code || ''));
    if (!fund) return sendJson(res, 400, { error: '交易对应的基金信息不存在' });
    const amount = Number(transaction.amount);
    const reviewResult = await reviewWithLiveResearch(
      uid,
      fund,
      transaction.type === 'sell' ? 'sell' : 'buy',
      Number.isFinite(amount) ? amount : 0,
      transaction.reason || '',
      'custom',
      {
        historical: true,
        historicalTransaction: transaction,
        shares: Number.isFinite(Number(transaction.shares)) ? Number(transaction.shares) : null,
        executionPrice: Number.isFinite(Number(transaction.price)) ? Number(transaction.price) : null,
        investmentPlan: transaction.investmentPlan || null,
      },
    );
    return sendJson(res, 200, { ok: true, review: reviewResult.review, research: reviewResult.research, transaction });
  }

  if (pathname === '/api/simulate/holding-analysis' && method === 'POST') {
    executePendingOrders(uid);
    executeDueRecurringPlans(uid);
    const sim = getSimulation(uid);
    const simulation = buildSimulationAiSnapshot(sim);
    const profile = getProfileRecord(uid);
    const market = await getMarketToday();
    profile.simulation = simulation;
    profile.market = market;
    const analysis = await generateSimulationHoldingAnalysis({
      profile,
      simulation,
      market,
      recentTransactions: simulation.transactions,
      personaId: 'custom',
    });
    return sendJson(res, 200, {
      ok: true,
      analysis: analysis || fallbackSimulationHoldingAnalysis(profile, simulation, market, simulation.transactions),
      source: analysis ? 'ai' : 'fallback',
      market,
      generatedAt: new Date().toISOString(),
    });
  }

  if (pathname === '/api/simulate/settings' && method === 'POST') {
    const body = await readBody(req);
    const initialCapital = Number(body.initialCapital);
    if (!Number.isFinite(initialCapital) || initialCapital < 1000 || initialCapital > 100000000) {
      return sendJson(res, 400, { error: '初始资金需在1000至100000000元之间' });
    }
    const sim = getSimulation(uid);
    const hasHistory = sim.holdings.length > 0 || sim.transactions.length > 0 || sim.pendingOrders.length > 0;
    if (hasHistory && body.reset !== true) {
      return sendJson(res, 409, { error: '当前模拟仓已有持仓或交易记录，确认后将重置模拟仓' });
    }
    getDb().prepare('UPDATE simulation SET cash_balance = ?, initial_capital = ?, holdings_json = ?, transactions_json = ?, recurring_plans_json = ?, pending_orders_json = ? WHERE user_id = ?')
      .run(+initialCapital.toFixed(2), +initialCapital.toFixed(2), '[]', '[]', '[]', '[]', uid);
    return sendJson(res, 200, { ok: true, initialCapital: +initialCapital.toFixed(2), reset: hasHistory });
  }

  if (pathname === '/api/simulate/state' && method === 'GET') {
    executePendingOrders(uid);
    executeDueRecurringPlans(uid);
    const sim = getSimulation(uid);
    const total = currentTotalValue(sim);
    const profit = total - sim.initialCapital;
    const rate = simulationRate(sim, total);
    const holdings = sim.holdings.map((h) => ({ ...h, value: +(h.shares * h.price).toFixed(2) }));
    const frozenCash = sim.pendingOrders
      .filter((order) => order.status === 'pending_close' && order.type === 'buy')
      .reduce((sum, order) => sum + (Number(order.amount) || 0), 0);
    const allocation = [{ name: '现金', value: +sim.cash.toFixed(2) }, { name: '挂单冻结资金', value: +frozenCash.toFixed(2) }, ...holdings.map((h) => ({ name: h.name, value: h.value }))].filter((x) => x.value > 0);
    return sendJson(res, 200, { cash: +sim.cash.toFixed(2), initialCapital: sim.initialCapital, holdings, transactions: sim.transactions, recurringPlans: sim.recurringPlans, pendingOrders: sim.pendingOrders, total: +total.toFixed(2), profit: +profit.toFixed(2), rate, allocation });
  }

  if (pathname === '/api/simulate/buy' && method === 'POST') {
    const body = await readBody(req);
    executePendingOrders(uid);
    executeDueRecurringPlans(uid);
    const fund = getFund(String(body.code || ''));
    const reason = normalizeTradeReason(body.reason);
    const isRecurring = body.isRecurring === true || body.isRecurring === 'true';
    if (!fund) return sendJson(res, 400, { error: 'fund not found' });
    const rule = getFundTradingRule(fund);
    const isEtf = rule.tradeMode === 'exchange_realtime';
    const requestedShares = isEtf ? Number(body.shares) : null;
    const price = Number(fund.price);
    let amount;
    if (isEtf) {
      if (!Number.isInteger(requestedShares) || requestedShares < 100 || requestedShares % 100 !== 0) return sendJson(res, 400, { error: 'ETF申购份额必须是100的正整数倍' });
      if (!Number.isFinite(price) || price <= 0) return sendJson(res, 400, { error: 'ETF成交价不可用' });
      amount = +(requestedShares * price).toFixed(2);
    } else {
      amount = Number(body.amount);
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return sendJson(res, 400, { error: 'invalid amount' });
    }
    const sim = getSimulation(uid);
    if (amount > sim.cash) return sendJson(res, 400, { error: 'cash not enough' });
    const frequency = normalizeRecurringFrequency(body.recurringFrequency);
    const planId = `plan-${Date.now()}-${uid}`;
    const investmentPlan = isRecurring
      ? {
          enabled: true,
          planId,
          frequency,
          amount: +amount.toFixed(2),
          ...(isEtf ? { shares: requestedShares } : {}),
          autoExecution: false,
        }
      : null;
    const recurringPlans = isRecurring
      ? sim.recurringPlans.concat([{
          id: planId,
          code: fund.code,
          name: fund.name,
          type: fund.type,
          amount: +amount.toFixed(2),
          ...(isEtf ? { shares: requestedShares } : {}),
          frequency,
          nextRunDate: addRecurringPeriod(localDateStr(), frequency),
          active: true,
          createdDate: localDateStr(),
        }])
      : sim.recurringPlans;
    if (rule.requiresCloseConfirmation) {
      const order = createPendingCloseOrder({ uid, fund, type: 'buy', amount, reason, investmentPlan });
      saveSimulation(uid, +(sim.cash - amount).toFixed(2), sim.holdings, sim.transactions, recurringPlans, sim.pendingOrders.concat([order]));
      return sendJson(res, 200, {
        ok: true,
        pending: true,
        order,
        tradeMode: rule.tradeMode,
        message: `${rule.tradeModeLabel}，已挂单，收盘后按最新净值确认。`,
        investmentPlan,
      });
    }
    const holdings = sim.holdings.slice();
    const executed = isEtf
      ? applySimulationBuyShares(holdings, fund, requestedShares)
      : applySimulationBuy(holdings, fund, amount);
    const shares = executed.shares;
    const transactions = sim.transactions.concat([{ id: Date.now(), type: 'buy', code: fund.code, name: fund.name, amount, price: executed.price, shares, unit: isEtf ? 'shares' : 'amount', reason, date: localDateStr(), executionMode: rule.tradeMode, status: 'filled', investmentPlan }]);
    saveSimulation(uid, +(sim.cash - amount).toFixed(2), holdings, transactions, recurringPlans, sim.pendingOrders);
    const personaId = 'custom';
    const reviewResult = await reviewWithLiveResearch(uid, fund, 'buy', amount, reason, personaId, { investmentPlan, shares, executionPrice: executed.price });
    return sendJson(res, 200, { ok: true, review: reviewResult.review, research: reviewResult.research, investmentPlan });
  }

  if (pathname === '/api/simulate/sell' && method === 'POST') {
    const body = await readBody(req);
    executePendingOrders(uid);
    executeDueRecurringPlans(uid);
    const fund = getFund(String(body.code || ''));
    const reason = normalizeTradeReason(body.reason);
    if (!fund) return sendJson(res, 400, { error: 'fund not found' });
    const sim = getSimulation(uid);
    const idx = sim.holdings.findIndex((h) => h.code === fund.code);
    if (idx < 0) return sendJson(res, 400, { error: 'no holding' });
    const holding = sim.holdings[idx];
    const rule = getFundTradingRule(fund);
    const price = Number(fund.price);
    const isEtf = rule.tradeMode === 'exchange_realtime';
    const requestedShares = Number(body.shares);
    let amount;
    if (!Number.isFinite(requestedShares) || requestedShares <= 0) return sendJson(res, 400, { error: isEtf ? 'ETF赎回份额必须是正整数' : '开放式基金赎回必须按份额填写' });
    if (isEtf && (!Number.isInteger(requestedShares) || requestedShares < 100 || requestedShares % 100 !== 0)) return sendJson(res, 400, { error: 'ETF赎回份额必须是100的正整数倍' });
    if (!Number.isFinite(price) || price <= 0) return sendJson(res, 400, { error: '成交价不可用' });
    const availableShares = Math.max(0, (Number(holding.shares) || 0) - reservedSellShares(sim.pendingOrders, fund.code));
    if (requestedShares > availableShares + 0.0001) return sendJson(res, 400, { error: `可用份额不足，当前最多可赎回${isEtf ? Math.floor(availableShares) : availableShares.toFixed(4)}份` });
    const sellShares = isEtf
      ? requestedShares
      : +requestedShares.toFixed(4);
    const sellValue = +(sellShares * price).toFixed(2);
    amount = sellValue;
    if (!Number.isFinite(sellShares) || sellShares <= 0) return sendJson(res, 400, { error: '可赎回份额不足，已有赎回挂单占用' });
    if (rule.requiresCloseConfirmation) {
      const order = createPendingCloseOrder({ uid, fund, type: 'sell', amount: sellValue, shares: sellShares, reason });
      saveSimulation(uid, sim.cash, sim.holdings, sim.transactions, sim.recurringPlans, sim.pendingOrders.concat([order]));
      return sendJson(res, 200, {
        ok: true,
        pending: true,
        order,
        tradeMode: rule.tradeMode,
        message: `${rule.tradeModeLabel}，已挂单，收盘后按最新净值确认。`,
      });
    }
    const holdings = sim.holdings.slice();
    const remainingShares = +(holding.shares - sellShares).toFixed(4);
    if (remainingShares <= 0.001) holdings.splice(idx, 1);
    else holdings[idx] = { ...holding, shares: remainingShares, price };
    const transactions = sim.transactions.concat([{ id: Date.now(), type: 'sell', code: fund.code, name: fund.name, amount: +sellValue.toFixed(2), price, shares: sellShares, unit: 'shares', reason, date: localDateStr(), executionMode: rule.tradeMode, status: 'filled' }]);
    saveSimulation(uid, +(sim.cash + sellValue).toFixed(2), holdings, transactions, sim.recurringPlans, sim.pendingOrders);
    const personaId = 'custom';
    const reviewResult = await reviewWithLiveResearch(uid, fund, 'sell', +sellValue.toFixed(2), reason, personaId, { shares: sellShares, executionPrice: price });
    return sendJson(res, 200, { ok: true, review: reviewResult.review, research: reviewResult.research });
  }

  // 社区
  if (pathname === '/api/community/posts' && method === 'GET') {
    const posts = db.prepare(`
      SELECT p.*,
        CASE WHEN pl.post_id IS NULL THEN 0 ELSE 1 END AS liked
      FROM posts p
      LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = ?
      ORDER BY p.id DESC
      LIMIT 100
    `).all(uid);
    const withMeta = posts.map((p) => {
      const comments = db.prepare('SELECT * FROM comments WHERE post_id = ? ORDER BY id ASC').all(p.id)
        .map((comment) => ({
          ...comment,
          ai_pending: Number(comment.is_ai) === 1 && comment.content === COMMUNITY_AI_PENDING,
        }));
      return { ...p, comments };
    });
    return sendJson(res, 200, { posts: withMeta });
  }

  if (pathname === '/api/community/post' && method === 'POST') {
    const body = await readBody(req);
    const content = maskSensitive(String(body.content || '').trim());
    const tag = String(body.tag || '#情绪树洞');
    if (!content) return sendJson(res, 400, { error: 'content required' });
    const anon = '小韭菜' + (100 + Math.floor(Math.random() * 900));
    const info = db.prepare('INSERT INTO posts (user_id, anonymous_name, content, tag) VALUES (?, ?, ?, ?)').run(uid, anon, content, tag);
    const postId = Number(info.lastInsertRowid);
    const pending = db.prepare('INSERT INTO comments (post_id, user_id, content, is_ai) VALUES (?, ?, ?, 1)')
      .run(postId, uid, COMMUNITY_AI_PENDING);
    // 先返回已发布帖子，再异步生成 AI 补充，避免用户等待模型响应。
    queueCommunityAiComment(postId, uid, content, Number(pending.lastInsertRowid));
    return sendJson(res, 200, {
      ok: true,
      id: postId,
      anonymous_name: anon,
      ai_comment_pending: true,
    });
  }

  if (pathname === '/api/community/comment' && method === 'POST') {
    const body = await readBody(req);
    const postId = Number(body.postId || body.post_id || body.id);
    const rawContent = String(body.content || '').trim();
    if (!Number.isInteger(postId) || postId <= 0) return sendJson(res, 400, { error: 'postId required' });
    if (!rawContent) return sendJson(res, 400, { error: 'content required' });
    if (rawContent.length > 1000) return sendJson(res, 400, { error: '回复不能超过1000字' });
    if (!db.prepare('SELECT id FROM posts WHERE id = ?').get(postId)) return sendJson(res, 404, { error: '帖子不存在' });
    const content = maskSensitive(rawContent);
    const anon = '小韭菜' + (100 + Math.floor(Math.random() * 900));
    const info = db.prepare('INSERT INTO comments (post_id, user_id, content, is_ai, anonymous_name) VALUES (?, ?, ?, 0, ?)')
      .run(postId, uid, content, anon);
    return sendJson(res, 200, {
      ok: true,
      comment: {
        id: Number(info.lastInsertRowid), post_id: postId, user_id: uid,
        content, is_ai: 0, anonymous_name: anon,
      },
    });
  }

  if (pathname === '/api/community/like' && method === 'POST') {
    const body = await readBody(req);
    const postId = Number(body.id || body.postId || body.post_id);
    if (!Number.isInteger(postId) || postId <= 0) return sendJson(res, 400, { error: 'postId required' });
    if (!db.prepare('SELECT id FROM posts WHERE id = ?').get(postId)) return sendJson(res, 404, { error: '帖子不存在' });

    const existing = db.prepare('SELECT 1 FROM post_likes WHERE user_id = ? AND post_id = ?').get(uid, postId);
    let liked;
    if (existing) {
      db.prepare('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?').run(uid, postId);
      db.prepare('UPDATE posts SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END WHERE id = ?').run(postId);
      liked = false;
    } else {
      const info = db.prepare('INSERT OR IGNORE INTO post_likes (user_id, post_id) VALUES (?, ?)').run(uid, postId);
      if (Number(info.changes || 0) > 0) db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(postId);
      liked = true;
    }
    const post = db.prepare('SELECT likes FROM posts WHERE id = ?').get(postId);
    return sendJson(res, 200, { ok: true, liked, likes: Number(post.likes || 0) });
  }

  // 新闻
  if (pathname === '/api/news' && method === 'GET') {
    const profile = getProfileRecord(uid);
    const news = db.prepare('SELECT * FROM news ORDER BY published_at DESC, id DESC LIMIT 60').all();
    // 热点页首屏先拿时间排序的全部新闻，避免等待 AI 个性化筛选。
    // 前端随后不带 mode 再请求一次，获取 AI/规则个性化结果。
    if (url.searchParams.get('mode') === 'all') {
      return sendJson(res, 200, {
        news: news.map((item) => ({ ...item, personalized: false, personalizationMethod: 'all' })),
        personalizedNewsEnabled: profile.personalizedNewsEnabled,
        personalizationMode: 'initial',
        lastUpdate: getState('news_last_update'),
      });
    }
    const personalized = await personalizeNewsForUser(uid, news, profile, 60);
    return sendJson(res, 200, {
      news: personalized.news,
      personalizedNewsEnabled: profile.personalizedNewsEnabled,
      personalizationMode: personalized.mode,
      lastUpdate: getState('news_last_update'),
    });
  }

  if (pathname === '/api/news/generate' && method === 'POST') {
    const body = await readBody(req);
    const row = db.prepare('SELECT * FROM news WHERE id = ?').get(Number(body.id));
    if (!row) return sendJson(res, 404, { error: 'not found' });
    if (row.ai_summary) return sendJson(res, 200, { news: row, generated: true });
    const analysis = await generateNewsAnalysis(row, getProfileRecord(uid));
    if (analysis) {
      db.prepare('UPDATE news SET ai_summary = ?, ai_relevance = ?, ai_terms = ?, ai_rational_view = ? WHERE id = ?')
        .run(analysis.summary, analysis.relevance, analysis.terms, analysis.rationalView, row.id);
      row.ai_summary = analysis.summary;
      row.ai_relevance = analysis.relevance;
      row.ai_terms = analysis.terms;
      row.ai_rational_view = analysis.rationalView;
      return sendJson(res, 200, { news: row, generated: true });
    }
    return sendJson(res, 200, { news: row, generated: false });
  }

  // 知识库
  if (pathname === '/api/knowledge' && method === 'GET') {
    const points = db.prepare(
      'SELECT k.id, k.title, k.content, k.category, k.related_term, CASE WHEN uk.user_id IS NULL THEN 0 ELSE 1 END AS learned FROM knowledge_points k LEFT JOIN user_knowledge uk ON uk.knowledge_id = k.id AND uk.user_id = ? ORDER BY k.id ASC'
    ).all(uid);
    return sendJson(res, 200, { points });
  }

  if (pathname === '/api/knowledge/complete' && method === 'POST') {
    const body = await readBody(req);
    db.prepare('INSERT OR IGNORE INTO user_knowledge (user_id, knowledge_id) VALUES (?, ?)').run(uid, Number(body.id));
    return sendJson(res, 200, { ok: true });
  }

  // 聊天术语加入学习：按标题查找/创建知识点并标记已学（驱动首页学习进度动态增长）
  if (pathname === '/api/knowledge/term' && method === 'POST') {
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 30);
    if (!name) return sendJson(res, 400, { error: 'name required' });
    const content = String(body.content || TERMS[name] || '').trim().slice(0, 300) || `${name}：在 AI 搭子对话中学到的概念。`;
    let kp = db.prepare('SELECT id FROM knowledge_points WHERE title = ?').get(name);
    let kpId;
    if (kp) {
      kpId = Number(kp.id);
      if (body.content) db.prepare('UPDATE knowledge_points SET content = ? WHERE id = ?').run(content, kpId);
    } else {
      const info = db.prepare('INSERT INTO knowledge_points (title, content, category, related_term) VALUES (?, ?, ?, ?)')
        .run(name, content, '对话术语', name);
      kpId = Number(info.lastInsertRowid);
    }
    db.prepare('INSERT OR IGNORE INTO user_knowledge (user_id, knowledge_id) VALUES (?, ?)').run(uid, kpId);
    return sendJson(res, 200, { ok: true, id: kpId, learned: true });
  }

  // AI 搭子引导设置理财目标：组合目标文本 → 更新画像 + 沉淀画像笔记
  if (pathname === '/api/goal/complete' && method === 'POST') {
    const body = await readBody(req);
    const goal = String(body.goal || '').trim().slice(0, 50);
    if (!goal) return sendJson(res, 400, { error: 'goal required' });
    const amount = Number(body.amount);
    const months = Number(body.months);
    const monthly = Number(body.monthly);
    const parts = [goal];
    if (Number.isFinite(amount) && amount > 0) parts.push(`目标${amount}元`);
    if (Number.isFinite(months) && months > 0) parts.push(`${months}个月`);
    if (Number.isFinite(monthly) && monthly > 0) parts.push(`每月可投${monthly}元`);
    const goalText = parts.join(' · ');
    db.prepare('UPDATE user_profile SET goal = ? WHERE user_id = ?').run(goalText, uid);
    replaceGeneratedProfileSnapshot(uid, `理财目标：${goalText}（由AI搭子引导设置）`, 'goal');
    return sendJson(res, 200, { ok: true, goal: goalText });
  }

  // 画像笔记（聊天中沉淀，可查看/编辑/删除）
  if (pathname === '/api/memories' && method === 'GET') {
    const rows = db.prepare('SELECT id, content, source, created_at FROM user_memories WHERE user_id = ? ORDER BY id DESC LIMIT 100').all(uid);
    return sendJson(res, 200, { memories: rows });
  }

  if (pathname === '/api/memories' && method === 'POST') {
    const body = await readBody(req);
    const content = String(body.content || '').trim().slice(0, 500);
    if (!content) return sendJson(res, 400, { error: 'content required' });
    const source = String(body.source || 'chat').slice(0, 20);
    const info = db.prepare('INSERT INTO user_memories (user_id, content, source) VALUES (?, ?, ?)').run(uid, content, source);
    return sendJson(res, 200, { ok: true, id: Number(info.lastInsertRowid) });
  }

  if (pathname.startsWith('/api/memories/') && method === 'DELETE') {
    const id = Number(pathname.split('/').pop());
    db.prepare('DELETE FROM user_memories WHERE id = ? AND user_id = ?').run(id, uid);
    return sendJson(res, 200, { ok: true });
  }

  // 情绪日记
  if (pathname === '/api/emotion' && method === 'GET') {
    return sendJson(res, 200, { emotions: getProfileRecord(uid).emotions });
  }

  if (pathname === '/api/emotion' && method === 'POST') {
    const body = await readBody(req);
    const feeling = String(body.feeling || '平静');
    const p = getProfileRecord(uid);
    const emotions = p.emotions.concat([{ date: localDateStr(), feeling }]);
    db.prepare('UPDATE user_profile SET emotion_log_json = ? WHERE user_id = ?').run(JSON.stringify(emotions), uid);
    return sendJson(res, 200, { ok: true, emotions });
  }

  // 主动陪伴
  if (pathname === '/api/companion/status' && method === 'GET') {
    const today = localDateStr();
    const p = getProfileRecord(uid);
    if (p.lastLogin && daysBetween(p.lastLogin, today) >= 3 && getState(`absence_shown_date:${uid}`) !== today) {
      setState(`absence_shown_date:${uid}`, today);
      db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(today, uid);
      return sendJson(res, 200, { proactive: { type: 'absence', message: buildAbsenceMessage() } });
    }
    const market = await getMarketToday();
    if (market.triggered && getState(`market_shown_date:${uid}`) !== today) {
      setState(`market_shown_date:${uid}`, today);
      const impact = estimateHoldingsImpact(p.holdings, market.avgChange);
      return sendJson(res, 200, { proactive: { type: market.avgChange >= 0 ? 'rise' : 'crash', message: await makeProactiveMessage(market, p, impact) } });
    }
    db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(today, uid);
    return sendJson(res, 200, { proactive: null });
  }

  if (pathname === '/api/companion/trigger' && method === 'POST') {
    const body = await readBody(req);
    const type = body.type;
    const p = getProfileRecord(uid);
    const today = localDateStr();
    if (type === 'absence') {
      db.prepare('UPDATE users SET last_login = ? WHERE id = ?').run(localDateStr(new Date(Date.now() - 4 * 86400000)), uid);
      setState(`absence_shown_date:${uid}`, today);
      return sendJson(res, 200, { proactive: { type: 'absence', message: buildAbsenceMessage(p.personaPreference) } });
    }
    if (type === 'rise' || type === 'crash') {
      const market = triggerMarket(type);
      setState(`market_shown_date:${uid}`, today);
      const impact = estimateHoldingsImpact(p.holdings, market.avgChange);
      return sendJson(res, 200, { proactive: { type, message: await makeProactiveMessage(market, p, impact) }, market });
    }
    if (type === 'reset') {
      resetMarket();
      setState(`market_shown_date:${uid}`, '');
      setState(`absence_shown_date:${uid}`, '');
      return sendJson(res, 200, { ok: true });
    }
    return sendJson(res, 400, { error: 'invalid type' });
  }

  // 首页聚合
  if (pathname === '/api/dashboard' && method === 'GET') {
    const p = getProfileRecord(uid);
    const market = await getMarketToday();
    const personalized = await personalizeNewsForUser(
      uid,
      db.prepare('SELECT id, title, channel, ai_summary, content, source, published_at, url FROM news ORDER BY published_at DESC, id DESC LIMIT 60').all(),
      p,
      3
    );
    const learned = db.prepare('SELECT COUNT(*) AS c FROM user_knowledge WHERE user_id = ?').get(uid).c;
    const totalPoints = db.prepare('SELECT COUNT(*) AS c FROM knowledge_points').get().c;
    const sim = getSimulation(uid);
    const total = currentTotalValue(sim);
    const rate = simulationRate(sim, total);
    const streak = getStreak(uid);
    const aiComment = await generateMarketComment(market, p.personaPreference, p);
    return sendJson(res, 200, {
      market,
      comment: aiComment || marketComment(market, p.personaPreference),
      profile: { experienceLevel: p.experienceLevel, riskTolerance: p.riskTolerance, goal: p.goal, holdingsCount: p.holdings.length },
      hotNews: personalized.news,
      personalizationMode: personalized.mode,
      personalizedNewsEnabled: p.personalizedNewsEnabled,
      learning: { learned, total: totalPoints },
      streak,
      simRate: rate,
      simulationInitialCapital: sim.initialCapital,
      newsLastUpdate: getState('news_last_update'),
    });
  }

  return sendJson(res, 404, { error: 'not found' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    try {
      const uid = getUserFromRequest(req);
      const requestAiConfig = uid ? getUserAiConfig(uid) : null;
      await runWithAiConfig(requestAiConfig, () => handleApi(req, res, url, req.method));
    } catch (err) {
      console.error('[api error]', err);
      if (!res.headersSent) sendJson(res, 500, { error: 'internal error' });
    }
    return;
  }
  serveStatic(req, res, url.pathname);
});

function getLanIPs() {
  const result = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) result.push(iface.address);
    }
  }
  return result;
}

function startScheduler() {
  refreshNews().then((n) => console.log(`[新闻] 启动刷新完成，新增 ${n} 条`)).catch(() => {});
  setInterval(() => {
    refreshNews().then((n) => { if (n) console.log(`[定时] 新闻更新 +${n} 条`); }).catch(() => {});
  }, 30 * 60 * 1000);
  try {
    executeAllPendingOrders();
    executeAllDueRecurringPlans();
  } catch (error) { console.warn('[模拟交易] 启动检查失败:', error.message); }
  setInterval(() => {
    try {
      const filled = executeAllPendingOrders();
      const updated = executeAllDueRecurringPlans();
      if (filled) console.log(`[模拟交易] 收盘挂单确认 ${filled} 个账户`);
      if (updated) console.log(`[定投] 自动执行 ${updated} 个计划`);
    } catch (error) {
      console.warn('[模拟交易] 定时检查失败:', error.message);
    }
  }, 60 * 1000);
  startFundPoolAutoUpdater({ getFundSnapshotStatus, reloadFundSnapshot });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`拾财 · 已启动：http://localhost:${PORT}`);
  const ips = getLanIPs();
  if (ips.length) console.log('局域网访问：' + ips.map((ip) => `http://${ip}:${PORT}`).join('   '));
  console.log('DeepSeek 状态：', process.env.DEEPSEEK_API_KEY ? '已配置（真实回复）' : '未配置（内置合规回复引擎）');
  console.log('默认账号：拾光者 / 123456');
  startScheduler();
});
