'use strict';

const crypto = require('node:crypto');
const { getState, setState } = require('./db');

const CONFIG_KEY_PREFIX = 'ai_config:';
const LOCAL_SECRET_KEY = 'ai_config_local_secret';
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';

function normalizeBaseUrl(value) {
  const text = String(value || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  let url;
  try {
    url = new URL(text);
  } catch {
    throw new Error('API 地址格式不正确');
  }
  if (url.protocol !== 'https:') throw new Error('线上部署仅允许 HTTPS API 地址');
  if (url.username || url.password) throw new Error('API 地址不能包含账号密码');
  return url.toString().replace(/\/+$/, '');
}

function normalizeModel(value) {
  const model = String(value || DEFAULT_MODEL).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(model)) throw new Error('模型名称格式不正确');
  return model;
}

function normalizeApiKey(value) {
  const key = String(value || '').trim();
  if (!key) throw new Error('请输入 API Key');
  if (key.length > 512 || /\s/.test(key)) throw new Error('API Key 格式不正确');
  return key;
}

function secretMaterial() {
  const configured = String(process.env.AI_CONFIG_SECRET || '').trim();
  if (configured) return configured;
  let local = getState(LOCAL_SECRET_KEY, '');
  if (!local) {
    local = crypto.randomBytes(32).toString('hex');
    setState(LOCAL_SECRET_KEY, local);
  }
  return local;
}

function encryptionKey() {
  return crypto.createHash('sha256').update(secretMaterial()).digest();
}

function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
  const [version, ivText, tagText, encryptedText] = String(value || '').split(':');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw new Error('加密配置格式不正确');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

function configKey(uid) {
  return `${CONFIG_KEY_PREFIX}${uid}`;
}

function getUserAiConfig(uid) {
  const raw = getState(configKey(uid), '');
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw);
    const key = decryptSecret(stored.apiKey);
    return {
      key,
      baseUrl: normalizeBaseUrl(stored.baseUrl),
      model: normalizeModel(stored.model),
      source: 'user',
      updatedAt: stored.updatedAt || '',
    };
  } catch {
    return null;
  }
}

function saveUserAiConfig(uid, payload = {}) {
  const previous = getUserAiConfig(uid);
  const key = payload.apiKey ? normalizeApiKey(payload.apiKey) : previous?.key;
  if (!key) throw new Error('请输入 API Key');
  const baseUrl = normalizeBaseUrl(payload.baseUrl || previous?.baseUrl || DEFAULT_BASE_URL);
  const model = normalizeModel(payload.model || previous?.model || DEFAULT_MODEL);
  const updatedAt = new Date().toISOString();
  setState(configKey(uid), JSON.stringify({
    apiKey: encryptSecret(key),
    baseUrl,
    model,
    updatedAt,
  }));
  return { key, baseUrl, model, source: 'user', updatedAt };
}

function clearUserAiConfig(uid) {
  setState(configKey(uid), '');
}

function maskApiKey(key) {
  const text = String(key || '');
  if (!text) return '';
  if (text.length <= 10) return `${text.slice(0, 3)}****`;
  return `${text.slice(0, 6)}****${text.slice(-4)}`;
}

function getAiConfigStatus(uid) {
  const userConfig = getUserAiConfig(uid);
  const envKey = String(process.env.DEEPSEEK_API_KEY || '').trim();
  const envConfig = envKey
    ? {
      key: envKey,
      baseUrl: process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL,
      model: process.env.DEEPSEEK_MODEL || DEFAULT_MODEL,
      source: 'environment',
    }
    : null;
  const effective = userConfig || envConfig;
  return {
    configured: Boolean(effective?.key),
    source: userConfig ? 'user' : envKey ? 'environment' : 'none',
    userConfigured: Boolean(userConfig),
    maskedKey: maskApiKey(effective?.key),
    baseUrl: effective?.baseUrl || DEFAULT_BASE_URL,
    model: effective?.model || DEFAULT_MODEL,
    updatedAt: userConfig?.updatedAt || '',
  };
}

async function testAiConfig(config) {
  if (!config?.key) throw new Error('当前没有可用的 API Key');
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const model = normalizeModel(config.model);
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.key}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: '只回复 OK' }],
      temperature: 0,
      max_tokens: 8,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const safeDetail = detail.replace(/\s+/g, ' ').slice(0, 160);
    throw new Error(`API 测试失败（${res.status}）${safeDetail ? `：${safeDetail}` : ''}`);
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  return {
    ok: true,
    model: data?.model || model,
    reply: typeof reply === 'string' ? reply.trim().slice(0, 40) : 'OK',
  };
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  normalizeBaseUrl,
  normalizeModel,
  getUserAiConfig,
  saveUserAiConfig,
  clearUserAiConfig,
  getAiConfigStatus,
  testAiConfig,
};
