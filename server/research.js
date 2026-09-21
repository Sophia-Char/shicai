'use strict';

const { getMarketToday, getMarketFallback } = require('./market');
const { fetchFundHistory } = require('./fund-history');

// 模型路由不可用时的离线兜底；正常情况下由 decideResearchWithModel 判断。
const RESEARCH_QUERY_RE = /新闻|热点|最新消息|刚刚|最近|今天|政策|公告|事件|财报|降息|降准|PMI|销量|发布会|发生了什么|为什么涨|为什么跌|数据|行情|指数|价格|净值|收益率|夏普|回撤|估值|市盈率|涨跌|历史走势|实时|今日|当前|搜索|搜一下|查一下|查查|多少钱|多少元|多少%/i;
const FUND_CODE_RE = /\b\d{6}\b/;
const FUND_QUERY_RE = /基金|基金经理|基金公司|基金管理人|基金合同|招募说明书|定期报告|份额|申购|赎回|分红|单位净值|累计净值|基金规模/;
const OFFICIAL_HOST_SUFFIXES = [
  'gov.cn', 'pbc.gov.cn', 'csrc.gov.cn', 'amac.org.cn', 'sse.com.cn', 'szse.cn', 'cninfo.com.cn', 'stats.gov.cn',
  // 常见基金管理人官网；新增管理人时只需补充其官方主域名。
  'efunds.com.cn', 'chinaamc.com', 'nffund.com', 'harvestfund.com', 'bosera.com', 'gf-fund.com',
  'fullgoal.com.cn', 'huaan.com.cn', 'hftfund.com', 'zofund.com', 'thfund.com.cn', 'phfund.com.cn',
  'yhf.com.cn', 'gtfund.com', 'ccbfund.cn', 'icbccs.com.cn', 'cmfchina.com', 'bocim.com',
  'bocomschroder.com', 'igwfmc.com', 'pinganfund.com.cn', 'xqfunds.com', 'byfunds.com', 'abc-ca.com',
];
const OFFICIAL_HOST_RE = new RegExp(`(?:^|\\.)(?:${OFFICIAL_HOST_SUFFIXES.map((host) => host.replace(/\\./g, '\\\\.')).join('|')})$`, 'i');
const OFFICIAL_SEARCH_FILTER = `(${OFFICIAL_HOST_SUFFIXES.map((host) => `site:${host}`).join(' OR ')})`;
const CONTRADICTION_RE = /辟谣|否认|不实|澄清|未发生|不存在|假消息|误读/;

function shouldResearch(message) {
  return RESEARCH_QUERY_RE.test(String(message || ''));
}

function isFundRelatedQuery(message) {
  const text = String(message || '');
  return FUND_CODE_RE.test(text) || FUND_QUERY_RE.test(text);
}

function cleanText(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

async function fetchText(url, timeoutMs = 9000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Shicai/1.0',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'zh-CN,zh;q=0.9',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return '';
  return (await res.text()).slice(0, 500000);
}

function stripHtml(value) {
  return cleanText(String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'"));
}

function parseBingResults(html, limit = 8) {
  const rows = [];
  const re = /<li[^>]+class=["'][^"']*b_algo[^"']*["'][\s\S]*?<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?[\s\S]*?<\/li>/gi;
  let match;
  while ((match = re.exec(html)) && rows.length < limit) {
    const url = match[1].replace(/&amp;/g, '&');
    if (!/^https?:\/\//i.test(url)) continue;
    rows.push({ title: stripHtml(match[2]), snippet: stripHtml(match[3]), url, host: normalizeHost(url), source: 'Bing检索' });
  }
  return rows;
}

function parseDuckResults(html, limit = 8) {
  const rows = [];
  const re = /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/)[^>]+>/gi;
  let match;
  while ((match = re.exec(html)) && rows.length < limit) {
    let url = match[1].replace(/&amp;/g, '&');
    if (url.startsWith('//')) url = 'https:' + url;
    if (!/^https?:\/\//i.test(url)) continue;
    rows.push({ title: stripHtml(match[2]), snippet: stripHtml(match[3]), url, host: normalizeHost(url), source: 'DuckDuckGo检索' });
  }
  return rows;
}

async function searchWeb(query, options = {}) {
  const officialOnly = options.officialOnly === true;
  const searchText = officialOnly
    ? `${cleanText(query, 135)} 基金管理人官网 官方公告 ${OFFICIAL_SEARCH_FILTER}`
    : cleanText(query, 180);
  const encoded = encodeURIComponent(searchText);
  const endpoints = [
    [`https://www.bing.com/search?q=${encoded}&setlang=zh-CN&cc=CN`, parseBingResults],
    [`https://html.duckduckgo.com/html/?q=${encoded}&kl=cn-zh`, parseDuckResults],
  ];
  for (const [url, parser] of endpoints) {
    try {
      const html = await fetchText(url);
      const rows = parser(html);
      const accepted = officialOnly ? rows.filter((row) => OFFICIAL_HOST_RE.test(row.host || '')) : rows;
      if (accepted.length) return accepted;
    } catch {}
  }
  return [];
}

function dedupeSources(sources) {
  const seen = new Set();
  return (Array.isArray(sources) ? sources : []).filter((item) => {
    const key = item.url || `${item.host}|${item.title}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

function verifySources(sources) {
  const rows = dedupeSources(sources).map((row) => ({ ...row, host: row.host || normalizeHost(row.url) }));
  const hosts = new Set(rows.map((row) => row.host).filter(Boolean));
  const official = rows.filter((row) => OFFICIAL_HOST_RE.test(row.host || ''));
  const hasConflict = rows.some((row) => CONTRADICTION_RE.test(`${row.title} ${row.snippet}`));
  let status = 'unverified';
  let rationale = '检索结果不足，不能确认核心事实。';
  if (hasConflict && rows.length >= 2) {
    status = 'disputed';
    rationale = '检索结果中出现相互冲突或辟谣表述，不能直接下结论。';
  } else if (official.length) {
    status = 'official_confirmed';
    rationale = `发现${official.length}个官方域名来源，但仍只确认来源明确支持的事实。`;
  } else if (hosts.size >= 2) {
    status = 'multi_source';
    rationale = `发现${hosts.size}个相互独立的来源，核心事实可作为交叉参考。`;
  }
  const confidence = status === 'official_confirmed' ? 0.86 : status === 'multi_source' ? 0.72 : status === 'disputed' ? 0.35 : 0.3;
  return {
    status,
    confidence,
    rationale,
    sources: rows.map((row, index) => ({
      sourceId: `web-${index + 1}`,
      title: row.title,
      snippet: row.snippet,
      url: row.url,
      host: row.host,
      source: row.source,
    })),
  };
}

function formatFundData(code, detail) {
  if (!detail || !detail.ok) return null;
  const year = detail.periods && detail.periods['1y'];
  return {
    kind: 'fund_history',
    code,
    fundPageUrl: `https://fund.eastmoney.com/${code}.html`,
    source: detail.source || 'AKShare',
    sourceDetail: detail.sourceDetail || '',
    dataAsOf: detail.dataAsOf || '',
    retrievedAt: detail.retrievedAt || new Date().toISOString(),
    valueLabel: detail.valueLabel || '净值',
    currentValue: detail.currentValue,
    return1y: year ? year.change : null,
    sharpe: detail.sharpe,
    maxDrawdown: detail.maxDrawdown,
    observationCount: detail.observationCount,
  };
}

async function researchQuery(query, options = {}) {
  const message = cleanText(query, 220);
  const code = (String(options.fundCode || '').match(FUND_CODE_RE) || message.match(FUND_CODE_RE) || [])[0] || '';
  const fundRelated = options.fundRelated === true || isFundRelatedQuery(message);
  const searchMessage = code && !message.includes(code) ? `${message} ${code}` : message;
  const webPromise = searchWeb(searchMessage, { officialOnly: fundRelated });
  const fundPromise = code
    ? fetchFundHistory(code).then((detail) => formatFundData(code, detail)).catch((error) => ({ kind: 'fund_history_error', code, error: cleanText(error.message, 180) }))
    : Promise.resolve(null);
  const marketPromise = /行情|指数|大盘|上证|深证|创业板/.test(message)
    ? Promise.race([getMarketToday(), new Promise((resolve) => setTimeout(() => resolve(getMarketFallback()), 3500))])
    : Promise.resolve(null);
  const [webSources, fundData, market] = await Promise.all([webPromise, fundPromise, marketPromise]);
  const verification = verifySources(webSources);
  const data = [];
  if (fundData) data.push(fundData);
  if (fundRelated) data.push({ kind: 'source_policy', policy: 'fund_official_only' });
  if (market) data.push({ kind: 'market_snapshot', ...market, retrievedAt: new Date().toISOString() });
  return {
    query: message,
    searchedAt: new Date().toISOString(),
    verification,
    data,
  };
}

function buildResearchText(research) {
  if (!research) return '本轮未进行联网检索。';
  const verification = research.verification || {};
  const lines = [
    `检索时间：${research.searchedAt || '未知'}`,
    `验证状态：${verification.status || 'unverified'}（置信度${verification.confidence ?? 0}）`,
    `验证说明：${verification.rationale || '暂无'}`,
  ];
  for (const row of research.data || []) {
    if (row.kind === 'fund_history') {
      lines.push(`数据${row.code}：${row.valueLabel}${row.currentValue ?? '暂无'}；近1年${row.return1y ?? '暂无'}%；夏普率${row.sharpe ?? '暂无'}；最大回撤${row.maxDrawdown ?? '暂无'}%；截至${row.dataAsOf || '未知'}。基金详情页：${row.fundPageUrl}`);
    } else if (row.kind === 'market_snapshot') {
      lines.push(`市场快照（${row.source || 'unknown'}，${row.date || '未知日期'}）：${(row.indices || []).map((item) => `${item.name}${item.change > 0 ? '+' : ''}${item.change}%`).join('、')}。`);
    } else if (row.kind === 'source_policy') {
      lines.push('基金相关网页检索：仅接受监管机构、基金业协会、交易所、上市公司公告等官方域名来源；未找到官方来源时不使用普通媒体结果。');
    } else if (row.kind === 'fund_history_error') {
      lines.push(`数据${row.code}获取失败：${row.error}`);
    } else if (row.kind === 'research_error') {
      lines.push(`联网检索失败：${row.error}`);
    }
  }
  const sources = verification.sources || [];
  if (sources.length) {
    lines.push('来源：');
    sources.slice(0, 5).forEach((row) => lines.push(`- ${row.sourceId} ${row.title}（${row.host}） ${row.url}`));
    lines.push('检索摘要：' + sources.slice(0, 5).map((row) => `${row.sourceId}：${row.snippet || '无摘要'}`).join('；'));
  }
  return lines.join('\n');
}

module.exports = { shouldResearch, isFundRelatedQuery, searchWeb, verifySources, researchQuery, buildResearchText };
