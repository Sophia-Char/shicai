'use strict';
// 验证 500 只基金池接入后的 API 链路
const BASE = 'http://localhost:3000';

(async () => {
  const loginRes = await fetch(BASE + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: '拾光者', password: '123456' }),
  });
  const { token } = await loginRes.json();

  const res = await fetch(BASE + '/api/funds', { headers: { Authorization: 'Bearer ' + token } });
  const { funds } = await res.json();
  console.log('/api/funds 返回基金数:', funds.length);

  const typeCount = {};
  const riskCount = {};
  funds.forEach((f) => {
    typeCount[f.type] = (typeCount[f.type] || 0) + 1;
    riskCount[f.risk] = (riskCount[f.risk] || 0) + 1;
  });
  console.log('类型分布:', JSON.stringify(typeCount));
  console.log('风险分布:', JSON.stringify(riskCount));

  const bad = funds.filter((f) => !f.code || !f.name || !f.price || !f.type || !f.risk);
  console.log('字段缺失条数:', bad.length);

  const searchable = funds.filter((f) => f.name.includes('债券'));
  console.log('名称含"债券"的基金数:', searchable.length);

  // 买入/卖出一条新链路（股票型基金），验证后回滚
  const f = funds.find((x) => x.type === '股票型');
  const buy = await fetch(BASE + '/api/simulate/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ code: f.code, amount: 1000, personaId: 'warm' }),
  });
  const buyData = await buy.json();
  console.log('买入', f.code, f.name, '->', buyData.ok ? 'OK 复盘已生成' : JSON.stringify(buyData));

  const sell = await fetch(BASE + '/api/simulate/sell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ code: f.code, amount: 99999, personaId: 'warm' }),
  });
  const sellData = await sell.json();
  console.log('卖出回滚 ->', sellData.ok ? 'OK' : JSON.stringify(sellData));

  if (funds.length !== 500 || bad.length > 0) process.exit(1);
  console.log('\n===== 500 只基金池接入验证通过 =====');
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
