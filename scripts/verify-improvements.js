'use strict';
// 验证 15 项改进的后端部分（需要服务已启动）—— 使用全新注册的临时用户，隔离历史数据
const BASE = 'http://localhost:3000';
const UNIQ = Date.now().toString(36);

async function api(path, opts = {}, token) {
  const options = Object.assign({ method: 'GET', headers: {} }, opts || {});
  if (token) options.headers['Authorization'] = 'Bearer ' + token;
  if (options.body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(BASE + path, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(path + ' -> ' + res.status + ' ' + JSON.stringify(data).slice(0, 200));
  return data;
}

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? '✅' : '❌') + ' ' + name + (detail ? ' | ' + detail : ''));
}

(async () => {
  // 注册全新临时用户（模拟仓空、画像默认）
  const reg = await api('/api/auth/register', { method: 'POST', body: { username: '测试用户' + UNIQ, password: 'test123456' } });
  const token = reg.token;

  // #1/#14: profile 新字段
  const prof = await api('/api/profile', {}, token);
  check('#1/#14 profile 返回 replyStyle/selfIntro', 'replyStyle' in prof && 'selfIntro' in prof, `replyStyle=${prof.replyStyle}, selfIntro=${JSON.stringify(prof.selfIntro)}`);

  await api('/api/profile', { method: 'POST', body: { reply_style: 'concise', self_intro: '我是学生，每月闲钱500元', goal: '存钱开工作室' } }, token);
  const prof2 = await api('/api/profile', {}, token);
  check('#1/#12/#14 保存 replyStyle/自定义目标/selfIntro', prof2.replyStyle === 'concise' && prof2.goal === '存钱开工作室' && prof2.selfIntro.includes('学生'), `goal=${prof2.goal}, replyStyle=${prof2.replyStyle}`);

  // #9/#10: chat 上下文注入（模拟仓 + 新闻）
  const chat1 = await api('/api/chat', { method: 'POST', body: { message: '我的模拟仓现在情况怎么样？', personaId: 'warm' } }, token);
  check('#9 chat 返回正常（空仓也应能回答）', !!chat1.reply, 'source=' + chat1.source);
  const chat2 = await api('/api/chat', { method: 'POST', body: { message: '最近有什么财经新闻？', personaId: 'warm' } }, token);
  check('#10 chat 带新闻上下文', !!chat2.reply, 'source=' + chat2.source);

  // #11: 动态建议
  const sug = await api('/api/chat/suggestions', { method: 'POST', body: { personaId: 'warm' } }, token);
  check('#11 建议生成', Array.isArray(sug.suggestions) && sug.suggestions.length >= 3, JSON.stringify(sug.suggestions));

  // #2: 社区 AI 评论（DeepSeek 生成 2-4 句）
  const post = await api('/api/community/post', { method: 'POST', body: { content: '今天亏了好多，心里有点慌，不知道要不要割肉', tag: '#情绪树洞' } }, token);
  check('#2 社区AI评论内容变丰富', post.ai_comment && post.ai_comment.length > 80, `长度=${post.ai_comment.length}，开头=${post.ai_comment.slice(0, 40)}…`);

  // #6: 基金池扩充
  const funds = await api('/api/funds', {}, token);
  check('#6 基金池扩充', funds.funds.length >= 22, `共 ${funds.funds.length} 只`);

  // #6: 空仓收益率曲线平坦
  const sim = await api('/api/simulate/state', {}, token);
  const allZero = sim.equityCurve.values.every((v) => v === 0);
  check('#6 空仓曲线平坦', allZero, `rate=${sim.rate}%，values前3=${sim.equityCurve.values.slice(0, 3)}`);

  // #6/#7: 模拟买入 + 复盘 + 持仓生效
  const buy = await api('/api/simulate/buy', { method: 'POST', body: { code: '513100', amount: 10000, personaId: 'warm' } }, token);
  check('#7 买入复盘生成', !!buy.review, buy.review.slice(0, 40) + '…');
  const sim2 = await api('/api/simulate/state', {}, token);
  check('#6 买入后持仓生效', sim2.holdings.length === 1 && sim2.holdings[0].code === '513100', `持仓=${sim2.holdings.length}，总资产=${sim2.total}`);

  // #15: 术语加入学习
  await api('/api/knowledge/term', { method: 'POST', body: { name: '市盈率' } }, token);
  const kp = await api('/api/knowledge', {}, token);
  check('#15 术语加入学习', kp.points.some((p) => p.title === '市盈率' && p.learned === 1), `总知识点=${kp.points.length}`);

  // #14: 画像笔记 CRUD
  const mem = await api('/api/memories', { method: 'POST', body: { content: '用户偏好低风险', source: 'test' } }, token);
  const mems = await api('/api/memories', {}, token);
  check('#14 画像笔记添加/查询', mems.memories.length >= 1, `共 ${mems.memories.length} 条`);
  await api('/api/memories/' + mem.id, { method: 'DELETE' }, token);
  const mems2 = await api('/api/memories', {}, token);
  check('#14 画像笔记删除', !mems2.memories.some((m) => m.id === mem.id), '');

  const failed = results.filter((r) => !r.ok);
  console.log('\n===== 结果：' + (results.length - failed.length) + '/' + results.length + ' 通过 =====');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('FATAL:', e); process.exit(2); });
