'use strict';

// 精简题库依据公开的投资者适当性资料整理并改写：
// - 中国证监会《证券期货投资者适当性管理办法》：收入/资产/债务、知识经验、投资目标、风险偏好与可承受损失。
// - 中国证券投资基金业协会《私募投资基金投资者风险问卷调查内容与格式指引（个人版）》：投资期限、投资目标、风险态度与最大损失。
// 这里只做应用内画像参考，不构成正式的投资者适当性评估或投资建议。

const SOURCE_URLS = [
  'https://www.csrc.gov.cn/csrc/c106256/c1653849/content.shtml',
  'https://www.amac.org.cn/fwdt/wyb/jgdjhcpbeian/zcglcpba/xgzc/201912/t20191222_19879.html',
];

const QUESTION_KEYS = [
  'liquidity', 'cashflow', 'allocation', 'drawdown',
  'tradeoff', 'experience', 'objective', 'style',
];

const QUESTION_LABELS = {
  liquidity: '应急资金场景与投资期限',
  cashflow: '现金流、收入与债务压力',
  allocation: '投资资金占可支配资产的比例',
  drawdown: '面对短期亏损和波动的反应',
  tradeoff: '收益目标与风险取舍',
  experience: '投资经历',
  objective: '这笔钱承担的主要目标',
  style: '希望获得的陪伴方式与个性化要求',
};

const OPTION_LABELS = {
  liquidity_emergency: '很可能会动用，说明近期可能有应急或刚性支出，流动性需求较高',
  liquidity_monthly: '大概率不用，但遇到变化仍可能取用一部分',
  liquidity_long: '至少三年不用，可以承受阶段性波动',
  liquidity_very_long: '长期完全不需要动用，主要用于长期增值',
  cashflow_tight: '收入或现金流不稳定，或有较大短期债务压力',
  cashflow_basic: '有一些应急金，但储备还不充分或仍有还款压力',
  cashflow_stable: '收入较稳定，有基本应急金，投资不影响日常生活',
  cashflow_strong: '收入和应急金都较充足，投资资金不会影响生活安排',
  allocation_most: '投资资金约占可支配资产的七成以上，投资是资产的主要部分',
  allocation_half: '投资资金约占可支配资产的五至七成，大约一半或更多',
  allocation_part: '投资资金约占可支配资产的两至五成，投资只是其中一部分',
  allocation_small: '投资资金少于可支配资产的两成，主要资产仍是现金或低波动资产',
  drawdown_sell: '很难接受，可能尽快卖出止损',
  drawdown_worry: '会焦虑，先观察但可能改变原计划',
  drawdown_plan: '接受波动，按原计划观察和调整',
  drawdown_accept: '能承受较大波动，必要时按计划加仓或继续持有',
  tradeoff_safe: '全部选择 A',
  tradeoff_safe_more: '两者都有，但大部分选择 A',
  tradeoff_half: '两者各一半',
  tradeoff_growth_more: '两者都有，但大部分选择 B',
  experience_none: '基本没有投资经验，主要是存款',
  experience_fund: '买过基金、保险或银行理财，还需要一定指导',
  experience_stock: '交易过基金或股票，能独立做一些判断',
  experience_highrisk: '接触过期权、期货、融资融券等高风险产品',
  objective_preserve: '短期备用：随时可能用到，不能接受本金明显波动',
  objective_steady: '稳健储蓄替代：有1-3年目标，收益高于存款即可，回撤要尽量小',
  objective_growth: '长期增长：至少3年不用，能接受阶段性回撤，关注长期实际增长',
  objective_high: '高波动增值：至少5年不用，能接受较大回撤，优先收益潜力',
  style_concise: '简洁直接：先给结论，再列关键风险',
  style_standard: '通俗清楚：解释概念，保留必要数据',
  style_detailed: '详细分析：多给数据、区间和来源',
  style_coach: '教练模式：发现我冲动时直接提醒',
};

const SCORE_BY_KEY = {
  liquidity_emergency: 0,
  liquidity_monthly: 1,
  liquidity_long: 2,
  liquidity_very_long: 3,
  cashflow_tight: 0,
  cashflow_basic: 1,
  cashflow_stable: 2,
  cashflow_strong: 3,
  allocation_most: 0,
  allocation_half: 1,
  allocation_part: 2,
  allocation_small: 3,
  drawdown_sell: 0,
  drawdown_worry: 1,
  drawdown_plan: 2,
  drawdown_accept: 3,
  tradeoff_safe: 0,
  tradeoff_safe_more: 1,
  tradeoff_half: 2,
  tradeoff_growth_more: 3,
  experience_none: 0,
  experience_fund: 1,
  experience_stock: 2,
  experience_highrisk: 3,
  objective_preserve: 0,
  objective_steady: 1,
  objective_growth: 2,
  objective_high: 3,
};

const RISK_LEVELS = [
  { min: 0, max: 6, value: '保守' },
  { min: 7, max: 13, value: '稳健' },
  { min: 14, max: 20, value: '平衡' },
  { min: 21, max: 24, value: '进取' },
];

const EXPERIENCE_BY_KEY = {
  experience_none: '新手',
  experience_fund: '半年',
  experience_stock: '1-3年',
  experience_highrisk: '3年以上',
};

const GOAL_BY_KEY = {
  objective_preserve: '资产保值与流动性',
  objective_steady: '稳健增长',
  objective_growth: '长期增长',
  objective_high: '长期增值',
};

const HORIZON_BY_KEY = {
  liquidity_emergency: '1年以内',
  liquidity_monthly: '1-3年',
  liquidity_long: '3年以上',
  liquidity_very_long: '5年以上',
};

const STYLE_BY_KEY = {
  style_concise: { replyStyle: 'concise', personaCustom: '先给结论，再列关键依据和风险。' },
  style_standard: { replyStyle: 'standard', personaCustom: '用通俗解释，保留必要的数据和风险提示。' },
  style_detailed: { replyStyle: 'detailed', personaCustom: '多给数据、区间、依据和可验证来源。' },
  style_coach: { replyStyle: 'detailed', personaCustom: '像严格但耐心的教练，发现我冲动时提醒我。' },
};

function parseAnswer(value) {
  const text = typeof value === 'string' ? value.trim().slice(0, 300) : '';
  if (!text) return null;
  if (text.startsWith('custom:')) {
    const custom = text.slice(7).trim().slice(0, 240);
    return custom ? { value: `custom:${custom}`, custom } : null;
  }
  return { value: text, custom: null };
}

function isObviousNonsense(text) {
  const normalized = String(text || '').replace(/\s+/g, '').trim();
  if (!normalized) return true;
  if (!/[\u3400-\u9fffA-Za-z]/u.test(normalized)) return true;
  if (/^(?:[啊哈呵嗯额呃啦杀]){2,}$/u.test(normalized)) return true;
  if (/^(?:哈哈|呵呵|啊啊|嗯嗯|随便|不知道|不清楚)+$/u.test(normalized)) return true;
  if ((normalized.match(/\d/g) || []).length >= 4 && /([杀啊哈呵啦嗯额呃])\1{1,}/u.test(normalized)) return true;
  if (/^([a-z])\1{2,}$/i.test(normalized)) return true;
  return false;
}

function findObviousNonsenseKeys(survey = {}) {
  return QUESTION_KEYS.filter((key) => {
    const answer = parseAnswer(survey[key]);
    return Boolean(answer?.custom && isObviousNonsense(answer.custom));
  });
}

function evaluateRiskAssessment(survey = {}) {
  const normalized = {};
  const missing = [];
  for (const key of QUESTION_KEYS) {
    const answer = parseAnswer(survey[key]);
    if (!answer) missing.push(key);
    else normalized[key] = answer.value;
  }
  if (missing.length) return { ok: false, missing };

  const selected = QUESTION_KEYS.map((key) => normalized[key]);
  const known = selected.filter((value) => Object.prototype.hasOwnProperty.call(SCORE_BY_KEY, value));
  const customAnswers = selected.filter((value) => value.startsWith('custom:'));
  const invalid = selected.filter((value) => !Object.prototype.hasOwnProperty.call(SCORE_BY_KEY, value)
    && !Object.prototype.hasOwnProperty.call(STYLE_BY_KEY, value)
    && !value.startsWith('custom:'));
  if (invalid.length) return { ok: false, missing: ['invalid'] };

  const knownScore = known.reduce((sum, value) => sum + SCORE_BY_KEY[value], 0);
  const knownMax = known.length * 3;
  return {
    ok: true,
    answers: normalized,
    knownScore,
    knownMax,
    maxScore: 24,
    customAnswers,
    hasCustomAnswers: customAnswers.length > 0,
  };
}

function fallbackRiskAssessment(survey = {}) {
  const base = evaluateRiskAssessment(survey);
  if (!base.ok) return base;
  const customKeys = QUESTION_KEYS.filter((key) => base.answers[key]?.startsWith('custom:'));
  if (customKeys.length) {
    return {
      ...base,
      valid: false,
      needsRetake: true,
      retryKeys: customKeys,
      feedback: '模型未能在规定时间内完成自然语言回答识别。本地兜底只处理标准选项，请将自定义或混合回答改为选择最符合你情况的选项后重新提交。',
      source: 'online_risk_question_bank_fallback_requires_retake',
    };
  }
  const score = Math.round((base.knownScore / Math.max(base.knownMax, 1)) * base.maxScore);
  const level = RISK_LEVELS.find((item) => score >= item.min && score <= item.max) || RISK_LEVELS[1];
  const experienceLevel = EXPERIENCE_BY_KEY[base.answers.experience] || '新手';
  const goal = GOAL_BY_KEY[base.answers.objective] || '稳健增长';
  const horizon = HORIZON_BY_KEY[base.answers.liquidity] || '未记录';
  const style = STYLE_BY_KEY[base.answers.style] || STYLE_BY_KEY.style_standard;
  return {
    ...base,
    version: 'compact-online-bank-v2',
    completedAt: new Date().toISOString(),
    score,
    riskTolerance: level.value,
    experienceLevel,
    goal,
    horizon,
    replyStyle: style.replyStyle,
    personaCustom: style.personaCustom,
    feedback: '当前模型暂不可用，已根据你选择的标准选项保存初步画像；之后如果收入、债务、资金期限或你对亏损的接受程度发生变化，建议重新测评。',
    concerns: [],
    source: 'online_risk_question_bank_fallback',
    sourceUrls: SOURCE_URLS,
  };
}

function formatRiskAssessmentAnswers(survey = {}) {
  return QUESTION_KEYS.map((key, index) => {
    const answer = parseAnswer(survey[key]);
    const question = QUESTION_LABELS[key] || key;
    if (!answer) return `${index + 1}. 【${question}｜${key}】\n用户原答：未回答`;
    if (answer.custom) return `${index + 1}. 【${question}｜${key}】\n用户原答：${answer.custom}`;
    return `${index + 1}. 【${question}｜${key}】\n用户原答：${answer.value}\n该选项含义：${OPTION_LABELS[answer.value] || answer.value}`;
  }).join('\n');
}

module.exports = {
  QUESTION_KEYS,
  QUESTION_LABELS,
  SOURCE_URLS,
  OPTION_LABELS,
  evaluateRiskAssessment,
  fallbackRiskAssessment,
  formatRiskAssessmentAnswers,
  findObviousNonsenseKeys,
};
