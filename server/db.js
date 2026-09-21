'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { hashPassword } = require('./auth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'shicai.db');

let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  persona_preference TEXT DEFAULT 'custom',
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS user_profile (
  user_id INTEGER PRIMARY KEY,
  experience_level TEXT DEFAULT '新手',
  risk_tolerance TEXT DEFAULT '稳健',
  goal TEXT DEFAULT '攒钱旅行',
  holding_json TEXT DEFAULT '[]',
  emotion_log_json TEXT DEFAULT '[]',
  personalized_news_enabled INTEGER DEFAULT 1,
  profile_inference_json TEXT DEFAULT '{}',
  risk_assessment_json TEXT DEFAULT '{}',
  onboarding_completed INTEGER DEFAULT 0,
  persona_custom TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT DEFAULT '新的对话',
  created_at TEXT DEFAULT (datetime('now','localtime')),
  updated_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS chat_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  conversation_id INTEGER,
  persona TEXT,
  message TEXT,
  reply TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS simulation (
  user_id INTEGER PRIMARY KEY,
  cash_balance REAL DEFAULT 100000,
  initial_capital REAL DEFAULT 100000,
  holdings_json TEXT DEFAULT '[]',
  transactions_json TEXT DEFAULT '[]',
  recurring_plans_json TEXT DEFAULT '[]',
  pending_orders_json TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  anonymous_name TEXT,
  content TEXT,
  tag TEXT,
  likes INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS post_likes (
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER,
  user_id INTEGER,
  content TEXT,
  is_ai INTEGER DEFAULT 0,
  anonymous_name TEXT DEFAULT '匿名',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  channel TEXT DEFAULT '',
  source TEXT,
  url TEXT,
  published_at TEXT,
  content TEXT,
  ai_summary TEXT,
  ai_relevance TEXT,
  ai_terms TEXT,
  ai_rational_view TEXT
);

CREATE TABLE IF NOT EXISTS knowledge_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  content TEXT,
  category TEXT,
  related_term TEXT
);

CREATE TABLE IF NOT EXISTS user_knowledge (
  user_id INTEGER NOT NULL,
  knowledge_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (user_id, knowledge_id)
);

CREATE TABLE IF NOT EXISTS user_memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  source TEXT DEFAULT 'chat',
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

const NEWS_SEED = [
  { title: '央行宣布下调存款准备金率0.5个百分点', source: '示例数据', published_at: '2026-08-26 08:10', ai_summary: '央行降低了银行需要“上交保管”的钱的比例，让银行手里有更多钱可以放贷。', ai_relevance: '市场上的钱变多，通常对股市、债市偏利好；但这类政策往往在消息落地前就被市场提前消化，短期反应并不稳定。', ai_terms: '降准,流动性', ai_rational_view: '降准是政策托底的信号，但历史上有不少“降准当天涨、之后又跌回去”的例子。政策是长期变量，短期涨跌更多是情绪。' },
  { title: '8月制造业PMI回升至50.3%，重回扩张区间', source: '示例数据', published_at: '2026-08-26 09:30', ai_summary: '反映工厂景气度的PMI指数回到50以上，说明制造业活动略有回暖。', ai_relevance: 'PMI是经济的“体温计”，超过50意味着经济在扩张。数据改善会让市场对上市公司盈利更有信心。', ai_terms: 'PMI,经济周期', ai_rational_view: '单月PMI回升值得关注，但别急着下结论。经济数据像天气，看单日没意义，看几个月甚至几个季度的趋势才有参考价值。' },
  { title: '新能源车月销量同比增长28%，渗透率再创新高', source: '示例数据', published_at: '2026-08-25 18:40', ai_summary: '新能源车卖得越来越多，在整体汽车销量中的占比持续上升。', ai_relevance: '热门行业的高增长往往已经反映在股价里，追“涨得好的行业”前，要先想清楚自己是在看未来，还是只看过去。', ai_terms: '渗透率,行业基金', ai_rational_view: '高增长行业不等于高回报基金。历史上很多风口行业长期看是赢家，但中间的回撤能把绝大多数跟风者甩下车。' },
  { title: '多家银行下调存款利率，储蓄收益持续走低', source: '示例数据', published_at: '2026-08-25 15:20', ai_summary: '把钱存在银行的利息更少了，低风险理财的回报空间被进一步压缩。', ai_relevance: '当存款利息变低，很多人会把钱挪向基金、债券等资产，这是理解“为什么要学投资”的重要背景。', ai_terms: '存款利率,通胀', ai_rational_view: '存款利率下降不等于“必须去炒股”。理财的第一步是匹配自己的风险承受能力，而不是因为收益低就冲动转向高波动资产。' },
  { title: '美联储释放降息信号，全球风险资产反弹', source: '示例数据', published_at: '2026-08-24 22:05', ai_summary: '美联储暗示未来可能降息，全球股市等风险资产短期走强。', ai_relevance: '海外流动性预期改善，会间接影响A股情绪和外资流向，但传导链条很长，普通投资者不必过度关注单一信号。', ai_terms: '降息,风险资产', ai_rational_view: '“预期”和“落地”之间往往有落差。市场炒的是预期，真正降息落地时，利好可能已经兑现。历史反复证明，追着消息跑不是好策略。' },
];

const KNOWLEDGE_SEED = [
  { title: '什么是基金', content: '基金是把很多人的钱聚在一起，交给专业机构去投资一篮子资产（股票、债券等）。你买入基金份额，相当于和别人“拼单”请专业大厨做饭。', category: '基础概念', related_term: '基金' },
  { title: '货币基金与债券基金', content: '货币基金主要投短期存款和国债，波动极小；债券基金主要投债券，收益和风险略高一点。它们像“凉白开”和“淡茶”，解渴、安心。', category: '基金分类', related_term: '货币基金' },
  { title: '股票基金与指数基金', content: '股票基金主要投股票，波动大、长期收益潜力高；指数基金是跟踪某个指数（如沪深300）的股票基金，规则透明、费用较低。', category: '基金分类', related_term: '宽基指数' },
  { title: '定投是什么', content: '定投就是固定时间、固定金额买入，价格高时买得少、价格低时买得多，长期摊平成本，省去择时的烦恼。', category: '投资策略', related_term: '定投' },
  { title: '什么是最大回撤', content: '最大回撤是某段时期内从最高点跌到最低点的最大跌幅，衡量的是“最惨的时候会亏多少”。', category: '风险指标', related_term: '最大回撤' },
  { title: '什么是夏普比率', content: '夏普比率衡量“每承担一份波动，能换来多少超额收益”。同样收益下波动越小，夏普比率越高，性价比越高。', category: '风险指标', related_term: '夏普比率' },
  { title: '估值与市盈率', content: '市盈率（PE）是股价除以每股盈利，用来判断贵不贵。低PE不一定便宜，高PE也不一定贵，要看盈利的成长性。', category: '估值', related_term: '估值' },
  { title: '复利的力量', content: '复利是“利滚利”，本金产生的收益继续产生收益。时间越长，复利越惊人，所以投资越早开始越好。', category: '投资理念', related_term: '复利' },
  { title: '为什么择时很难', content: '短期涨跌很难预测，研究显示错过涨幅最大的少数几个交易日，长期收益会大幅缩水。留在市场里往往比频繁进出更重要。', category: '投资理念', related_term: '择时' },
  { title: '波动与长期收益', content: '市场80%的时间在震荡甚至下跌，但长期向上的大趋势不变。理解波动，是拿得住的关键。', category: '投资理念', related_term: '波动' },
  { title: '资产配置的意义', content: '把鸡蛋放在不同篮子里（股票、债券、现金等），能分散风险，让组合更稳，也更拿得住。', category: '投资策略', related_term: '资产配置' },
  { title: '认识你的风险承受能力', content: '风险承受能力是“跌多少你还能睡得着”。先搞清楚自己的底线，再决定买什么，而不是反过来。', category: '风险认知', related_term: '风险偏好' },
];

function initDb() {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);

  // 迁移：为已存在的库补充新增列（新建库时 SCHEMA 已包含，无需重复）
  function ensureColumn(table, column, ddl) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (cols.includes(column)) return false;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    return true;
  }
  ensureColumn('user_profile', 'reply_style', "reply_style TEXT DEFAULT 'auto'");
  ensureColumn('user_profile', 'self_intro', "self_intro TEXT DEFAULT ''");
  ensureColumn('user_profile', 'personalized_news_enabled', "personalized_news_enabled INTEGER DEFAULT 1");
  ensureColumn('user_profile', 'profile_inference_json', "profile_inference_json TEXT DEFAULT '{}'");
  ensureColumn('user_profile', 'risk_assessment_json', "risk_assessment_json TEXT DEFAULT '{}'");
  const addedOnboardingColumn = ensureColumn('user_profile', 'onboarding_completed', 'onboarding_completed INTEGER DEFAULT 0');
  // 迁移前已经存在的账号视为完成过旧版建档，只有新注册账号进入新版首次引导。
  if (addedOnboardingColumn) db.exec('UPDATE user_profile SET onboarding_completed = 1 WHERE user_id IN (SELECT id FROM users)');
  ensureColumn('user_profile', 'persona_custom', "persona_custom TEXT DEFAULT ''");
  // 预设人格已移除，历史账号统一迁移为 custom，仅保留该字段兼容旧数据库。
  db.exec("UPDATE users SET persona_preference = 'custom' WHERE persona_preference IS NULL OR persona_preference IN ('warm', 'pro', 'humor')");
  ensureColumn('simulation', 'initial_capital', "initial_capital REAL DEFAULT 100000");
  ensureColumn('simulation', 'recurring_plans_json', "recurring_plans_json TEXT DEFAULT '[]'");
  ensureColumn('simulation', 'pending_orders_json', "pending_orders_json TEXT DEFAULT '[]'");
  ensureColumn('comments', 'anonymous_name', "anonymous_name TEXT DEFAULT '匿名'");
  ensureColumn('news', 'channel', "channel TEXT DEFAULT ''");

  // 画像快照是“当前状态”，不是历史流水；清理旧的系统生成快照。
  // 用户通过聊天或手动明确添加的 chat/manual 笔记不受影响。
  for (const source of ['onboarding', 'goal']) {
    const latest = db.prepare('SELECT user_id, MAX(id) AS latest_id FROM user_memories WHERE source = ? GROUP BY user_id').all(source);
    const removeOld = db.prepare('DELETE FROM user_memories WHERE user_id = ? AND source = ? AND id <> ?');
    for (const row of latest) removeOld.run(row.user_id, source, row.latest_id);
  }

  // 默认演示账号：拾光者 / 123456
  const user = db.prepare('SELECT id FROM users WHERE id = 1').get();
  if (!user) {
    db.prepare('INSERT INTO users (id, username, password_hash, persona_preference) VALUES (1, ?, ?, ?)')
      .run('拾光者', hashPassword('123456'), 'custom');
  }
  const prof = db.prepare('SELECT user_id FROM user_profile WHERE user_id = 1').get();
  if (!prof) db.prepare('INSERT INTO user_profile (user_id) VALUES (1)').run();
  const sim = db.prepare('SELECT user_id FROM simulation WHERE user_id = 1').get();
  if (!sim) db.prepare('INSERT INTO simulation (user_id) VALUES (1)').run();

  const newsCount = db.prepare('SELECT COUNT(*) AS c FROM news').get().c;
  if (newsCount === 0) {
    const stmt = db.prepare('INSERT INTO news (title, source, published_at, ai_summary, ai_relevance, ai_terms, ai_rational_view) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const n of NEWS_SEED) stmt.run(n.title, n.source, n.published_at, n.ai_summary, n.ai_relevance, n.ai_terms, n.ai_rational_view);
  }

  const kCount = db.prepare('SELECT COUNT(*) AS c FROM knowledge_points').get().c;
  if (kCount === 0) {
    const stmt = db.prepare('INSERT INTO knowledge_points (title, content, category, related_term) VALUES (?, ?, ?, ?)');
    for (const k of KNOWLEDGE_SEED) stmt.run(k.title, k.content, k.category, k.related_term);
  }

  return db;
}

function getDb() {
  return db || initDb();
}

function getState(key, fallback = null) {
  const row = getDb().prepare('SELECT value FROM app_state WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setState(key, value) {
  getDb()
    .prepare('INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

module.exports = { initDb, getDb, getState, setState, DATA_DIR, DB_PATH };
