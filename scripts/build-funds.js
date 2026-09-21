'use strict';
// 从 ai-wealth-companion 的基金快照（500只）生成拾财模拟仓使用的基金池数据。
// 输入：D:/develop/AI理财陪伴应用/ai-wealth-companion/backend/app/data/fund_snapshots.json
// 输出：拾财/server/funds-data.js
const fs = require('node:fs');
const path = require('node:path');

const SRC = 'D:/develop/AI理财陪伴应用/ai-wealth-companion/backend/app/data/fund_snapshots.json';
const OUT = path.join(__dirname, '..', 'server', 'funds-data.js');

// 行业关键词：命中则归为「行业主题」（否则宽基指数）
const INDUSTRY_WORDS = [
  '白酒', '医疗', '医药', '生物', '创新药', '新能源', '光伏', '碳中和', '电池', '半导体', '芯片',
  '科技', '人工智能', '智能', '消费', '食品', '饮料', '军工', '国防', '证券', '券商', '银行',
  '金融', '地产', '房地产', '有色', '煤炭', '钢铁', '汽车', '家电', '养殖', '农业', '畜牧',
  '游戏', '传媒', '互联网', '软件', '云计算', '通信', '机器人', '央企', '国企', '双创', '科创',
  '环保', 'ESG', '基建', '高铁', '交运', '旅游', '文娱', '影视',
];

// 策略/风格词：虽是指数但更接近宽基（策略指数）
const STRATEGY_WORDS = ['红利', '价值', '质量', '低波', '基本面', '优选', '龙头', '成长'];

function classify(f) {
  const type = String(f.fund_type || '');
  const name = String(f.fund_name || '');
  // 场内 ETF 与 ETF 联接的交易方式不同，必须在通用指数分类前单独保留。
  if (name.toUpperCase().includes('ETF') && !name.includes('联接')) return 'ETF';
  if (type.startsWith('债券型') || type.startsWith('指数型-固收')) return '债券型';
  if (type.startsWith('货币')) return '货币型';
  if (type.startsWith('QDII')) return 'QDII';
  if (type.startsWith('指数型-海外股票')) return 'QDII';
  if (type.startsWith('FOF')) return '混合型';
  if (type.startsWith('股票型')) return '股票型';
  if (type.startsWith('混合型')) return '混合型';
  if (type.startsWith('指数型')) {
    if (STRATEGY_WORDS.some((w) => name.includes(w))) return '宽基指数';
    if (INDUSTRY_WORDS.some((w) => name.includes(w))) return '行业主题';
    return '宽基指数';
  }
  // 未知类型兜底：按名称猜测
  if (INDUSTRY_WORDS.some((w) => name.includes(w))) return '行业主题';
  return '混合型';
}

function riskText(level) {
  const map = { 1: '低', 2: '中低', 3: '中', 4: '中高', 5: '高' };
  return map[level] || '中';
}

function round(v, n = 2) {
  if (v == null || !Number.isFinite(Number(v))) return 0;
  return Number(Number(v).toFixed(n));
}

const raw = fs.readFileSync(SRC, 'utf8');
const data = JSON.parse(raw);
const funds = Array.isArray(data) ? data : (data.funds || []);
const snapshotAsOf = fs.statSync(SRC).mtime.toISOString();
const generatedAt = new Date().toISOString();

const out = funds.map((f) => {
  const code = String(f.fund_code || '').trim();
  const name = String(f.fund_name || '').trim();
  return {
    code,
    name,
    type: classify(f),
    risk: riskText(f.risk_level),
    price: round(f.latest_nav, 4),
    return1y: round(f.return_1y_pct),
    maxDrawdown: round(f.max_drawdown_1y_pct),
  };
}).filter((f) => f.code && f.name);

// 类型统计
const typeCount = {};
for (const f of out) typeCount[f.type] = (typeCount[f.type] || 0) + 1;
console.log('生成基金数:', out.length);
console.log('类型分布:', JSON.stringify(typeCount));
console.log('风险分布:', JSON.stringify(out.reduce((m, f) => { m[f.risk] = (m[f.risk] || 0) + 1; return m; }, {})));
console.log('无收益/回撤的条数:', out.filter((f) => f.return1y === 0 || f.maxDrawdown === 0).length);

const content = `'use strict';
// 基金池数据 —— 由 scripts/build-funds.js 从 ai-wealth-companion 基金快照自动生成（${out.length} 只真实基金），请勿手改。
// 如需更新：修改源数据后运行 node scripts/build-funds.js
const funds = ${JSON.stringify(out, null, 2)};
funds.snapshotAsOf = ${JSON.stringify(snapshotAsOf)};
funds.generatedAt = ${JSON.stringify(generatedAt)};
module.exports = funds;
`;
fs.writeFileSync(OUT, content, 'utf8');
console.log('已写入:', OUT, '(', fs.statSync(OUT).size, 'bytes )');
