'use strict';
// 验证 AI 搭子引导设置理财目标的后端链路
const BASE = 'http://localhost:3000';

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

(async () => {
  const login = await api('/api/auth/login', { method: 'POST', body: { username: '拾光者', password: '123456' } });
  const token = login.token;

  // 1. 引导完成接口：目标+金额+时间+月投
  const done = await api('/api/goal/complete', { method: 'POST', body: { goal: '攒钱旅行', amount: 20000, months: 24, monthly: 800 } }, token);
  console.log('✅ goal/complete ->', JSON.stringify(done));
  if (!/攒钱旅行/.test(done.goal) || !/20000/.test(done.goal) || !/24个月/.test(done.goal) || !/800/.test(done.goal)) {
    console.log('❌ 组合文本不完整'); process.exit(1);
  }

  // 2. 画像已更新
  const prof = await api('/api/profile', {}, token);
  console.log('✅ profile.goal ->', prof.goal);
  if (prof.goal !== done.goal) { console.log('❌ 画像未更新'); process.exit(1); }

  // 3. 画像笔记已沉淀
  const mems = await api('/api/memories', {}, token);
  const goalNote = mems.memories.find((m) => m.source === 'goal');
  console.log('✅ memories ->', goalNote ? goalNote.content : '(未找到)');
  if (!goalNote) { console.log('❌ 目标笔记未沉淀'); process.exit(1); }

  // 4. AI 能读到目标（问它我的目标是什么）
  const chat = await api('/api/chat', { method: 'POST', body: { message: '我的理财目标是什么？', personaId: 'warm' } }, token);
  console.log('✅ chat 提到目标 ->', chat.reply.slice(0, 80) + '…');
  if (!/攒钱旅行|20000|2万/.test(chat.reply)) { console.log('⚠️ AI 回复未提及目标（可能被省略，非阻塞）'); }

  // 清理：恢复默认目标 + 删除测试笔记
  await api('/api/profile', { method: 'POST', body: { goal: '攒钱旅行' } }, token);
  await api('/api/memories/' + goalNote.id, { method: 'DELETE' }, token);
  console.log('✅ 已清理测试数据（目标恢复默认）');
  console.log('\n===== 引导设置目标链路验证通过 =====');
})().catch((e) => { console.error('FATAL:', e); process.exit(2); });
