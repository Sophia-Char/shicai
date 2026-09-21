'use strict';

const https = require('node:https');
const zlib = require('node:zlib');
const { getDb, getState, setState } = require('./db');

const CLS_URL = 'https://www.cls.cn/api/cache?app=CailianpressWeb&name=telegraph&os=web&sv=8.7.9';
const CNS_FINANCE_RSS_URL = 'https://www.chinanews.com.cn/rss/finance.xml';
const SOHU_FINANCE_FEED_URL = 'https://v2.sohu.com/public-api/feed?scene=CATEGORY&sceneId=1463&page=1&size=30';
const INFZM_NEWS_URL = 'https://www.infzm.com/contents?term_id=2';

function compactNewsTitle(title) {
  const chars = Array.from(String(title || '').replace(/\s+/g, '').trim());
  if (chars.length <= 15) return chars.join('');
  const punctuationIndex = chars.findIndex((char, index) => index >= 3 && /[：:。！？!?]/.test(char));
  if (punctuationIndex > 0 && punctuationIndex <= 15) return chars.slice(0, punctuationIndex).join('');
  return `${chars.slice(0, 14).join('')}…`;
}

function httpGetText(url, headers = {}) {
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
        headers: Object.assign(
          {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept-Encoding': 'gzip, deflate',
          },
          headers
        ),
      },
      (res) => {
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
            done(raw.toString('utf8'));
          } catch {
            done(null);
          }
        });
      }
    );
    req.setTimeout(8000, () => {
      req.destroy();
      done(null);
    });
    req.on('error', () => done(null));
  });
}

function fmtTimestamp(sec) {
  const d = new Date(Number(sec) * 1000);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function decodeXml(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[/gi, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function cleanRssText(value, max = 1200) {
  return decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function rssTag(block, tag) {
  const escaped = tag.replace(':', '\\:');
  const match = block.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'));
  return match ? cleanRssText(match[1]) : '';
}

function rssLink(block) {
  const textLink = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (textLink) return decodeXml(textLink[1]).trim();
  const attrLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?\s*>/i);
  return attrLink ? decodeXml(attrLink[1]).trim() : '';
}

function fmtRssTimestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

function fmtRelativeTimestamp(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d+)\s*(分钟|小时)前$/);
  if (match) {
    const minutes = Number(match[1]) * (match[2] === '小时' ? 60 : 1);
    return fmtRssTimestamp(new Date(Date.now() - minutes * 60 * 1000).toISOString());
  }
  const dateMatch = text.match(/^(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const now = new Date();
    return `${now.getFullYear()}-${dateMatch[1]}-${dateMatch[2]} 00:00`;
  }
  return '';
}

function parseRssFeed(text, channel, defaultSource, limit) {
  const out = [];
  const items = String(text || '').match(/<item\b[\s\S]*?<\/item>/gi) || [];
  for (const item of items) {
    const title = rssTag(item, 'title');
    const description = rssTag(item, 'description') || rssTag(item, 'content:encoded');
    const link = rssLink(item) || rssTag(item, 'guid');
    const published = rssTag(item, 'pubDate') || rssTag(item, 'dc:date');
    if (!title || !description || description.length < 10) continue;
    out.push({
      title: title.length > 90 ? title.slice(0, 90) + '…' : title,
      channel,
      source: rssTag(item, 'dc:creator') || rssTag(item, 'author') || defaultSource,
      url: link,
      published_at: fmtRssTimestamp(published),
      content: description,
    });
    if (out.length >= limit) break;
  }
  return out;
}

// 拉取财联社电报快讯并解析
async function fetchClsNews(limit = 30) {
  const text = await httpGetText(CLS_URL, { Referer: 'https://www.cls.cn/telegraph' });
  if (!text) return [];
  try {
    const json = JSON.parse(text);
    const list = json && json.data && json.data.roll_data;
    if (!Array.isArray(list)) return [];
    const out = [];
    for (const item of list) {
      const body = String(item.content || item.brief || '').trim();
      const headline = String(item.title || '').trim() || body.slice(0, 80);
      // 跳过纯推广/解读类空内容条目
      if (!body || body.length < 10) continue;
      const author = String(item.author || '').trim();
      out.push({
        title: headline.length > 90 ? headline.slice(0, 90) + '…' : headline,
        channel: '财联社电报',
        source: author || '财联社',
        url: item.assocArticleUrl || `https://www.cls.cn/detail/${item.id}`,
        published_at: fmtTimestamp(item.ctime),
        content: body,
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

// 拉取中国新闻网财经 RSS。来源字段保留原始发布方，channel 字段标记抓取渠道。
async function fetchCnsFinanceNews(limit = 30) {
  const text = await httpGetText(CNS_FINANCE_RSS_URL, {
    Accept: 'application/rss+xml, application/xml, text/xml',
  });
  if (!text) return [];
  return parseRssFeed(text, '中国新闻网财经', '中国新闻网', limit);
}

// 拉取搜狐财经当前公开 feed，避免使用已停止更新的历史 RSS。
async function fetchSohuFinanceNews(limit = 30) {
  const text = await httpGetText(`${SOHU_FINANCE_FEED_URL}&_=${Date.now()}`, {
    Accept: 'application/json',
    Referer: 'https://business.sohu.com/',
  });
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
    return list.slice(0, limit).map((item) => {
      const id = String(item.id || '').trim();
      const authorId = String(item.authorId || '').trim();
      const url = typeof item.outerLink === 'string' && item.outerLink
        ? item.outerLink
        : id && authorId ? `https://www.sohu.com/a/${id}_${authorId}` : 'https://business.sohu.com/';
      return {
        title: String(item.title || item.mobileTitle || '').trim().slice(0, 90),
        channel: '搜狐财经',
        source: String(item.authorName || item.originalSource || '').trim() || '搜狐财经',
        url,
        published_at: fmtRssTimestamp(item.publicTime),
        content: String(item.title || item.mobileTitle || '').trim(),
      };
    }).filter((item) => item.title.length >= 8);
  } catch {
    return [];
  }
}

// 南方周末暂无稳定 RSS，解析其官网新闻列表并保留文章原文链接。
async function fetchInfzmNews(limit = 20) {
  const html = await httpGetText(INFZM_NEWS_URL, {
    Accept: 'text/html,application/xhtml+xml',
    Referer: 'https://www.infzm.com/',
  });
  if (!html) return [];
  const out = [];
  const seenUrls = new Set();
  const pattern = /<a\b[^>]*href=["']([^"']*\/contents\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = pattern.exec(html)) && out.length < limit) {
    const url = new URL(decodeXml(match[1]), INFZM_NEWS_URL).toString();
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);
    const titleMatch = match[2].match(/<h5\b[^>]*>([\s\S]*?)<\/h5>/i);
    const title = cleanRssText(titleMatch ? titleMatch[1] : match[2], 90);
    if (!title || title.length < 8) continue;
    const descriptionMatch = match[2].match(/nfzm-content-item__description[^>]*>\s*<div\b[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    const metaMatch = match[2].match(/nfzm-content-item__meta[\s\S]*?<\/footer>/i);
    const metaValues = metaMatch
      ? [...metaMatch[0].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map((m) => cleanRssText(m[1], 80))
      : [];
    out.push({
      title: title.length > 90 ? title.slice(0, 90) + '…' : title,
      channel: '南方周末',
      source: '南方周末',
      url,
      published_at: fmtRelativeTimestamp(metaValues.find((value) => /前$/.test(value) || /^\d{2}-\d{2}$/.test(value))),
      content: cleanRssText(descriptionMatch ? descriptionMatch[1] : title),
    });
  }
  return out;
}

// 将抓取的新闻写入数据库（按标题去重），返回新增条数
function upsertNews(items) {
  if (!items.length) return 0;
  const db = getDb();
  const existsStmt = db.prepare('SELECT id FROM news WHERE title = ?');
  const insert = db.prepare(
    'INSERT INTO news (title, channel, source, url, published_at, content) VALUES (?, ?, ?, ?, ?, ?)'
  );
  let added = 0;
  for (const n of items) {
    if (existsStmt.get(n.title)) continue;
    insert.run(n.title, n.channel || n.source || '公开渠道', n.source, n.url, n.published_at, n.content);
    added++;
  }
  return added;
}

// 抓取并入库，返回本次新增数量
async function refreshNews() {
  const results = await Promise.allSettled([
    fetchClsNews(30),
    fetchCnsFinanceNews(30),
    fetchSohuFinanceNews(30),
    fetchInfzmNews(20),
  ]);
  const items = [];
  const seenTitles = new Set();
  for (const result of results) {
    if (result.status !== 'fulfilled' || !Array.isArray(result.value)) continue;
    for (const item of result.value) {
      if (seenTitles.has(item.title)) continue;
      seenTitles.add(item.title);
      items.push(item);
    }
  }
  const added = upsertNews(items);
  if (added > 0 || items.length > 0) {
    const now = new Date();
    const p = (n) => String(n).padStart(2, '0');
    setState('news_last_update', `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())} ${p(now.getHours())}:${p(now.getMinutes())}`);
  }
  return added;
}

const RISK_NEWS_TERMS = {
  保守: ['存款', '利率', '债券', '货币基金', '低风险', '降准'],
  稳健: ['债券', '利率', '存款', '降准', '流动性', '混合'],
  平衡: ['混合', '资产配置', '股市', '债券', '风险资产'],
  进取: ['股市', '科技', '新能源', '行业', '风险资产', '反弹'],
};

const HOLDING_THEME_TERMS = [
  ['新能源', '新能源', '光伏', '电池', '汽车'],
  ['科技', '科技', '半导体', '芯片', '人工智能'],
  ['医药', '医药', '医疗', '生物'],
  ['消费', '消费', '食品', '白酒'],
  ['红利', '红利', '股息'],
  ['海外', '海外', '纳斯达克', '美股', '港股'],
  ['宽基', '沪深300', '中证', '上证', '宽基'],
  ['债券', '债券', '利率', '信用债', '纯债'],
  ['货币', '货币', '存款', '现金'],
];

function personalizeNews(items, profile, limit = 3) {
  const rows = Array.isArray(items) ? items : [];
  if (!profile || profile.personalizedNewsEnabled === false) {
    return rows.slice(0, limit).map((item) => ({ ...item, personalized: false }));
  }

  const holdings = Array.isArray(profile.holdings) ? profile.holdings : [];
  const risk = profile.riskTolerance || '稳健';
  const riskTerms = RISK_NEWS_TERMS[risk] || RISK_NEWS_TERMS.稳健;
  const holdingTerms = [];
  for (const holding of holdings) {
    const name = String(holding.name || '');
    const type = String(holding.type || '');
    if (holding.code) holdingTerms.push({ term: String(holding.code), label: name || holding.code, weight: 12 });
    if (name) holdingTerms.push({ term: name, label: name, weight: 10 });
    if (type) holdingTerms.push({ term: type, label: type, weight: 5 });
    for (const [label, ...terms] of HOLDING_THEME_TERMS) {
      if (name.includes(label) || type.includes(label)) {
        terms.forEach((term) => holdingTerms.push({ term, label, weight: 7 }));
      }
    }
  }

  return rows
    .map((item, index) => {
      const text = [item.title, item.content, item.ai_summary, item.ai_relevance].filter(Boolean).join(' ');
      let score = 0;
      const reasons = [];
      for (const rule of holdingTerms) {
        if (rule.term && text.includes(rule.term)) {
          score += rule.weight;
          if (!reasons.includes(rule.label)) reasons.push(rule.label);
        }
      }
      for (const term of riskTerms) {
        if (text.includes(term)) score += 2;
      }
      const goal = String(profile.goal || '');
      if (goal && text.includes(goal)) {
        score += 3;
        reasons.push('理财目标');
      }
      return {
        ...item,
        personalized: true,
        displayTitle: compactNewsTitle(item.title),
        personalizationScore: score,
        personalizationReason: reasons.includes('理财目标')
          ? '理财目标'
          : reasons.length
            ? reasons.slice(0, 2).join('、').slice(0, 18)
            : '风险偏好',
        _newsIndex: index,
      };
    })
    .sort((a, b) => b.personalizationScore - a.personalizationScore
      || String(b.published_at || '').localeCompare(String(a.published_at || ''))
      || a._newsIndex - b._newsIndex)
    .slice(0, limit)
    .map(({ _newsIndex, ...item }) => item);
}

module.exports = {
  refreshNews,
  fetchClsNews,
  fetchCnsFinanceNews,
  fetchSohuFinanceNews,
  fetchInfzmNews,
  personalizeNews,
};
