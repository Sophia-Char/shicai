(function () {
  'use strict';

  const A = () => window.App;

  // 用于在回复气泡里识别术语并生成「追问 / 加入学习」操作。
  // 只保留真正的金融术语，避免把日常词误标记。
  const CLIENT_TERMS = ['最大回撤', '夏普比率', '市盈率', '宽基指数', '行业基金', '资产配置', '风险偏好', '年化收益', '定投', '抄底', '择时', '复利', '仓位', '降准', 'PMI', '估值'];
  let funds = [];
  let profile = { experienceLevel: '新手', riskTolerance: '稳健', goal: '攒钱旅行', holdings: [], personaPreference: 'custom', personaCustom: '' };
  let conversations = [];
  let currentCid = 0;
  let messages = [];
  let sending = false;
  let conversationRequestToken = 0;
  let onboardingGuide = { active: false, saving: false, completed: false, step: 0, answers: {} };
  const CHAT_CACHE_PREFIX = 'shicai_chat_cache_v1';

  // 画像问卷独立维护在 public/js/profile-questionnaire.js，便于手动编辑题目和选项。
  const ONBOARDING_STEPS = Array.isArray(window.ProfileQuestionnaire) ? window.ProfileQuestionnaire : [];

  // —— AI 搭子引导设置理财目标 ——
  let goalGuide = { active: false, step: 0, answers: {} };
  const GOAL_STEPS = [
    { key: 'goal', q: '好呀，我们一起来把理财目标定下来吧！🎯\n\n**第一步：你想实现什么？**\n比如：攒钱旅行、买房首付、应急储备金、学习进修…也可以直接输入你自己的目标。', chips: ['攒钱旅行', '买房首付', '应急储备金', '学习进修'] },
    { key: 'amount', q: '**第二步：大概需要多少钱？**\n心里有个数就行，之后可以再调整。（直接输入数字，如：20000）', chips: ['5000', '10000', '50000', '100000'] },
    { key: 'months', q: '**第三步：打算多长时间达成？**\n（输入几个月或几年，如：2年、18个月）', chips: ['6个月', '1年', '2年', '3年'] },
    { key: 'monthly', q: '**第四步：每月大概能投入多少？**\n这是制定执行计划的关键，按你实际能拿出的闲钱来。（直接输入数字，如：1000）', chips: ['500', '1000', '2000', '5000'] },
  ];
  const GOAL_TRIGGER_RE = /设置理财目标|设定理财目标|规划理财目标|帮我定个目标|帮我定目标|想定个目标|想定目标|定个目标|定目标|设立目标|设置目标|规划目标|goal/i;

  function isOnboardingFlow() {
    return /(?:\?|&)onboarding=1(?:&|$)/.test(location.hash);
  }

  function isProfileGuideFlow() {
    return /(?:\?|&)(?:onboarding|guide)=1(?:&|$)/.test(location.hash);
  }

  function layoutHtml() {
    const onboarding = isProfileGuideFlow();
    return `
      <div class="container${onboarding ? ' onboarding-mode' : ''}">
        <div class="chat-3col">
          <aside class="sidebar conv-sidebar"${onboarding ? ' style="display:none;"' : ''}>
            <div class="sidebar-body">
              <button class="btn btn-primary btn-block conv-new" id="new-chat">＋ 新建对话</button>
              <div class="conv-list" id="conv-list"><div class="empty" style="padding:12px;">暂无对话</div></div>
            </div>
          </aside>

          <div class="chat-panel">
            <div class="chat-head">
              <div style="font-weight:700;">🤖 小拾${onboarding ? ' · 初始画像建立' : ''}</div>
              <div style="display:flex;gap:8px;align-items:center;">
                <button class="btn btn-ghost btn-sm" id="holdings-toggle"${onboarding ? ' style="display:none;"' : ''}>📦 编辑真实持仓</button>
                <button class="btn btn-ghost btn-sm" id="profile-guide-btn"${onboarding ? ' style="display:none;"' : ''}>✨ 建立/更新我的画像</button>
              </div>
            </div>
            <div class="persona-custom-bar" id="persona-custom-bar"${onboarding ? ' style="display:none;"' : ''}>
              <label for="persona-custom-input">自定义陪伴人格</label>
              <span class="persona-custom-status" id="persona-custom-status"></span>
              <textarea id="persona-custom-input" rows="1" maxlength="240" placeholder="例如：像严格但耐心的教练，少安慰，多用数据提醒我"></textarea>
              <button class="btn btn-ghost btn-sm" id="persona-custom-save">保存</button>
            </div>
            <div class="chat-body" id="chat-body"></div>
            ${onboarding ? '' : '<div class="suggest-chips" id="guide-chips" style="display:none;"></div><div class="suggest-chips" id="suggest-chips" style="display:none;"></div>'}
            <div class="chat-input">
              <textarea id="chat-input" class="textarea" placeholder="${onboarding ? '点击选项，或输入你自己的情况后发送…' : '和你的理财搭子聊聊吧…（Enter 发送，Shift+Enter 换行）'}"></textarea>
              <button class="btn btn-primary" id="chat-send">发送</button>
            </div>
          </div>

          <aside class="sidebar profile-sidebar" id="profile-sidebar" style="display:none;">
            <div class="sidebar-head" id="sidebar-toggle">
              <h3>📋 我的理财档案</h3>
              <span id="sidebar-arrow">收起</span>
            </div>
            <div class="sidebar-body">
              <div class="field">
                <label>我的真实持仓</label>
                <div class="muted" style="font-size:12px;margin-bottom:8px;">仅记录真实账户持仓，会写入个人画像；不影响模拟仓。</div>
                <div id="pf-holdings"></div>
                <div style="display:flex;gap:6px;margin-top:8px;">
                  <select class="select" id="pf-fund" style="flex:1;"></select>
                  <input class="input" id="pf-amount" type="number" min="0.01" step="0.01" placeholder="投入金额" style="width:100px;" />
                </div>
                <button class="btn btn-ghost btn-sm btn-block" id="pf-add" style="margin-top:8px;">+ 添加真实持仓</button>
              </div>
              <button class="btn btn-primary btn-block" id="pf-save">保存真实持仓到画像</button>
            </div>
          </aside>
        </div>
      </div>
    `;
  }

  async function loadFunds() {
    const d = await A().api('/api/funds');
    funds = d.funds || [];
    const sel = document.getElementById('pf-fund');
    if (sel) sel.innerHTML = funds.map((f) => `<option value="${f.code}">${f.name}（${f.code}）</option>`).join('');
  }

  async function loadProfile() {
    const d = await A().api('/api/profile');
    profile = d;
    A().setPersona('custom');
    const personaInput = document.getElementById('persona-custom-input');
    if (personaInput) personaInput.value = d.personaCustom || '';
    renderProfileForm();
    renderPersonaStatus();
  }

  function chatCacheKey(kind, id = 'all') {
    const user = A().state.user || {};
    const userKey = user.id || user.username || 'anonymous';
    return `${CHAT_CACHE_PREFIX}:${userKey}:${kind}:${id}`;
  }

  function readChatCache(kind, id) {
    try {
      const raw = sessionStorage.getItem(chatCacheKey(kind, id));
      const value = raw ? JSON.parse(raw) : null;
      return value && Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }

  function writeChatCache(kind, id, value) {
    try {
      sessionStorage.setItem(chatCacheKey(kind, id), JSON.stringify(value));
    } catch {}
  }

  function removeChatCache(kind, id) {
    try { sessionStorage.removeItem(chatCacheKey(kind, id)); } catch {}
  }

  function applyHistoryRows(rows) {
    messages = [];
    for (const r of rows || []) {
      messages.push({ role: 'user', text: r.message });
      messages.push({ role: 'ai', text: r.reply, proactive: false });
    }
    renderMessages();
  }

  function messagesToHistoryRows() {
    const rows = [];
    for (let i = 0; i + 1 < messages.length; i += 2) {
      if (messages[i].role !== 'user' || messages[i + 1].role !== 'ai') continue;
      rows.push({ message: messages[i].text, reply: messages[i + 1].text });
    }
    return rows.slice(-50);
  }

  async function refreshConversations() {
    const d = await A().api('/api/conversations');
    conversations = d.conversations || [];
    writeChatCache('conversations', 'all', conversations);
    renderConversations();
    if (conversations.length && !currentCid) {
      await selectConversation(conversations[0].id);
    } else if (!conversations.length) {
      currentCid = 0;
      messages = [];
      renderMessages();
    }
  }

  async function loadConversations() {
    const cached = readChatCache('conversations', 'all');
    if (cached) {
      conversations = cached;
      renderConversations();
      if (conversations.length && !currentCid) {
        void selectConversation(conversations[0].id);
      } else if (!conversations.length) {
        currentCid = 0;
        messages = [];
        renderMessages();
      }
      // 缓存先展示，服务端列表在后台更新。
      void refreshConversations().catch(() => {});
      return;
    }
    await refreshConversations();
  }

  function renderConversations() {
    const box = document.getElementById('conv-list');
    if (!box) return;
    if (!conversations.length) {
      box.innerHTML = '<div class="empty" style="padding:12px;">暂无对话，点上方新建</div>';
      return;
    }
    box.innerHTML = conversations.map((c) => `
      <div class="conv-item ${c.id === currentCid ? 'active' : ''}" data-id="${c.id}">
        <span class="title">${A().escapeHtml(c.title || '新的对话')}</span>
        <button class="del" data-id="${c.id}" title="删除">×</button>
      </div>`).join('');
    box.querySelectorAll('.conv-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('del')) return;
        selectConversation(Number(el.dataset.id));
      });
    });
    box.querySelectorAll('.conv-item .del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteConversation(Number(btn.dataset.id));
      });
    });
  }

  async function selectConversation(cid) {
    const requestToken = ++conversationRequestToken;
    currentCid = cid;
    renderConversations();
    const cached = readChatCache('history', cid);
    if (cached) applyHistoryRows(cached);
    else {
      messages = [];
      renderMessages();
    }
    try {
      const rows = await A().api(`/api/chat/history?conversationId=${cid}`);
      if (requestToken !== conversationRequestToken || currentCid !== cid) return;
      writeChatCache('history', cid, rows);
      applyHistoryRows(rows);
    } catch (e) {
      if (!cached && requestToken === conversationRequestToken) A().toast('加载对话失败：' + e.message);
    }
  }

  async function deleteConversation(cid) {
    await A().api(`/api/conversations/${cid}`, { method: 'DELETE' });
    removeChatCache('history', cid);
    conversations = conversations.filter((conversation) => Number(conversation.id) !== Number(cid));
    writeChatCache('conversations', 'all', conversations);
    A().toast('对话已删除');
    const wasCurrent = currentCid === cid;
    currentCid = 0;
    await loadConversations();
    if (wasCurrent && conversations.length) {
      await selectConversation(conversations[0].id);
    } else if (!conversations.length) {
      messages = [];
      renderMessages();
    }
  }

  function newChat() {
    currentCid = 0;
    messages = [];
    renderConversations();
    renderMessages();
    document.getElementById('chat-input').focus();
  }

  async function loadCompanion() {
    try {
      const d = await A().api('/api/companion/status');
      if (d.proactive && d.proactive.message) {
        messages.push({ role: 'ai', text: d.proactive.message, proactive: true });
        renderMessages();
      }
    } catch {}
  }

  function renderPersonaStatus() {
    const customActive = Boolean(String(profile.personaCustom || '').trim());
    const status = document.getElementById('persona-custom-status');
    if (status) {
      status.textContent = customActive ? '已启用' : '尚未设置，将使用统一基础表达';
      status.classList.toggle('active', customActive);
    }
  }

  function renderProfileForm() {
    const box = document.getElementById('pf-holdings');
    if (!box) return;
    const holdings = profile.holdings || [];
    box.innerHTML = holdings.length
      ? holdings.map((h, i) => `<div class="holding-item"><div style="min-width:0;flex:1;"><div>${A().escapeHtml(h.name || h.code)}</div><div class="muted" style="font-size:11px;">${A().escapeHtml(h.code || '')}${h.type ? ` · ${A().escapeHtml(h.type)}` : ''}</div></div><input class="input holding-amount" data-i="${i}" type="number" min="0.01" step="0.01" value="${Number(h.amount || 0)}" aria-label="${A().escapeHtml(h.name || h.code || '持仓')}投入金额" style="width:105px;padding:6px 8px;" /><span class="muted" style="font-size:12px;">元</span><span class="rm" data-i="${i}" title="删除">×</span></div>`).join('')
      : '<div class="empty" style="padding:10px;">暂无持仓</div>';
    box.querySelectorAll('.holding-amount').forEach((el) => {
      el.addEventListener('change', () => {
        const amount = Number(el.value);
        if (!Number.isFinite(amount) || amount <= 0) {
          el.value = Number(profile.holdings[Number(el.dataset.i)]?.amount || 0);
          A().toast('投入金额必须大于 0');
          return;
        }
        profile.holdings[Number(el.dataset.i)].amount = +amount.toFixed(2);
      });
    });
    box.querySelectorAll('.rm').forEach((el) => {
      el.addEventListener('click', () => {
        profile.holdings.splice(Number(el.dataset.i), 1);
        renderProfileForm();
      });
    });
  }

  // 提取回复中的术语：优先取「📖 小知识」块里 AI 明确讲解的术语，其次全文匹配真术语。
  // 返回去重后的术语数组（最多 3 个），供「追问 / 加入学习」按钮使用
  function extractTerms(text) {
    const out = [];
    const push = (t) => { if (t && !out.includes(t)) out.push(t); };
    const kn = String(text || '').match(/[【\[]?\s*📖\s*小知识[:：】\]]?\s*([^\n，。;；、]{1,24})/);
    if (kn) {
      for (const t of CLIENT_TERMS) if (kn[1].includes(t)) push(t);
    }
    for (const t of CLIENT_TERMS) if (String(text || '').includes(t)) push(t);
    return out.slice(0, 3);
  }

  function researchHtml(research) {
    if (!research || !research.verification) return '';
    const verification = research.verification;
    const labels = {
      official_confirmed: '官方来源确认',
      multi_source: '多来源交叉参考',
      unverified: '尚未确认',
      disputed: '存在来源冲突',
    };
    const sources = (verification.sources || []).slice(0, 3).map((source) =>
      `<a href="${A().escapeHtml(source.url || '#')}" target="_blank" rel="noopener">${A().escapeHtml(source.title || source.host || source.sourceId)}</a>`
    ).join(' · ');
    const fundPages = (research.data || []).filter((item) => item.kind === 'fund_history' && item.fundPageUrl).map((item) =>
      `<a href="${A().escapeHtml(item.fundPageUrl)}" target="_blank" rel="noopener">打开基金详情页核查 ↗</a>`
    ).join(' · ');
    return `<div class="research-meta"><span>📡 已联网检索</span><span class="research-status ${A().escapeHtml(verification.status || 'unverified')}">${A().escapeHtml(labels[verification.status] || '未确认')}</span>${sources ? `<span class="research-sources">来源：${sources}</span>` : '<span class="research-sources">未找到可核查来源</span>'}${fundPages ? `<span class="research-sources">${fundPages}</span>` : ''}</div>`;
  }

  function renderMessages() {
    const body = document.getElementById('chat-body');
    if (!body) return;
    if (!messages.length) {
      body.innerHTML = '<div class="msg ai"><div><div class="bubble">你好呀，我是小拾。我可以帮你理解概念、分析风险、梳理逻辑，在波动里陪着你。投资决策永远由你自己做，我负责陪你把它想明白。想先聊点什么？</div><div class="msg-meta">小拾</div></div></div>';
      return;
    }
    body.innerHTML = messages.map((m) => {
      if (m.role === 'user') {
        return `<div class="msg user"><div class="bubble">${A().escapeHtml(m.text)}</div><div class="bubble-actions"><button class="chip chip-sm" data-memory="1">➕ 添加到个人画像</button></div></div>`;
      }
      const meta = m.proactive ? '<div class="msg-meta">小拾 · 主动陪伴</div>' : '<div class="msg-meta">小拾</div>';
      const modelTerms = Array.isArray(m.termExplanations)
        ? m.termExplanations.map((item) => String(item?.term || '').trim()).filter(Boolean)
        : [];
      const terms = [...new Set([...extractTerms(m.text), ...modelTerms])].slice(0, 3);
      const termActions = terms.map((term) => `
        <button class="chip chip-sm" data-term-ask="${A().escapeHtml(term)}">❓ 追问「${A().escapeHtml(term)}」</button>
        <button class="chip chip-sm" data-term-learn="${A().escapeHtml(term)}">📚 加入学习「${A().escapeHtml(term)}」</button>`).join('');
      const onboardingAction = m.onboardingComplete
        ? '<div class="onboarding-action"><button class="btn btn-primary btn-sm" data-enter-companion="1">进入 AI 搭子 →</button></div>'
        : '';
      return `<div class="msg ai"><div><div class="bubble${m.proactive ? ' proactive' : ''}">${A().renderMarkdown(m.text)}${onboardingAction}</div>${researchHtml(m.research)}<div class="bubble-actions">${termActions}<button class="chip chip-sm" data-memory="1">➕ 添加到个人画像</button></div>${meta}</div></div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
    A().highlightTerms(body);
    body.querySelectorAll('[data-enter-companion]').forEach((button) => {
      button.addEventListener('click', () => { location.hash = '#/chat'; });
    });
  }

  function appendTyping() {
    const body = document.getElementById('chat-body');
    const el = document.createElement('div');
    el.className = 'msg ai';
    el.id = 'typing-msg';
    el.innerHTML = '<div><div class="bubble typing"><span></span><span></span><span></span><div class="typing-status">小拾正在整理数据…</div></div></div>';
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    el._typingTimers = [
      setTimeout(() => { const status = el.querySelector('.typing-status'); if (status) status.textContent = '正在分析你的问题，马上给出结论和依据…'; }, 4000),
      setTimeout(() => { const status = el.querySelector('.typing-status'); if (status) status.textContent = '网络较慢时会自动切换备用回复，请继续稍候…'; }, 10000),
      setTimeout(() => { const status = el.querySelector('.typing-status'); if (status) status.textContent = '模型仍在生成，已放宽等待时间，不会轻易截断回答…'; }, 30000),
    ];
  }

  function removeTyping() {
    const el = document.getElementById('typing-msg');
    if (el) {
      (el._typingTimers || []).forEach((id) => clearTimeout(id));
      el.remove();
    }
  }

  async function sendMessage(text) {
    text = (text || '').trim();
    if (!text || sending || onboardingGuide.saving) return;
    if (onboardingGuide.active) {
      handleOnboardingAnswer(text);
      return;
    }
    // 理财目标引导：进行中则把输入当作回答；触发词则启动引导
    if (goalGuide.active) {
      handleGuideAnswer(text);
      return;
    }
    if (GOAL_TRIGGER_RE.test(text)) {
      startGoalGuide();
      return;
    }
    sending = true;
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    sendBtn.disabled = true;
    messages.push({ role: 'user', text });
    renderMessages();
    input.value = '';
    appendTyping();
    try {
      const d = await A().api('/api/chat', {
        method: 'POST',
        timeoutMs: 60000,
        body: { message: text, personaId: A().state.personaId, conversationId: currentCid || undefined },
      });
      removeTyping();
      messages.push({ role: 'ai', text: d.reply, research: d.research, termExplanations: d.termExplanations, proactive: false });
      renderMessages();
      currentCid = d.conversationId || currentCid;
      if (currentCid) writeChatCache('history', currentCid, messagesToHistoryRows());
      if (Array.isArray(d.profileUpdates) && d.profileUpdates.length) {
        await loadProfile();
        A().toast('已从这次对话更新画像：' + d.profileUpdates.join('、'));
      }
      await loadConversations();
    } catch (e) {
      removeTyping();
      A().toast('发送失败：' + e.message);
    } finally {
      sending = false;
      sendBtn.disabled = false;
    }
  }

  // —— 理财目标引导流程 ——
  function renderGuideChips() {
    const box = document.getElementById('guide-chips');
    if (!box) return;
    const step = GOAL_STEPS[goalGuide.step];
    if (!step) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }
    box.style.display = 'flex';
    box.innerHTML = step.chips.map((c) => `<button class="chip" data-g="${A().escapeHtml(c)}">${A().escapeHtml(c)}</button>`).join('');
    box.querySelectorAll('.chip').forEach((c) => {
      c.addEventListener('click', () => sendMessage(c.dataset.g));
    });
  }

  function pushGuideStep() {
    const step = GOAL_STEPS[goalGuide.step];
    if (!step) return;
    messages.push({ role: 'ai', text: step.q, proactive: false });
    renderMessages();
    renderGuideChips();
  }

  function startGoalGuide() {
    if (goalGuide.active) return;
    goalGuide = { active: true, step: 0, answers: {} };
    pushGuideStep();
  }

  function cancelGoalGuide() {
    goalGuide = { active: false, step: 0, answers: {} };
    renderGuideChips();
  }

  function parseNum(v) {
    const s = String(v == null ? '' : v).trim();
    const wan = s.match(/([\d.]+)\s*万/);
    if (wan) return Math.round(parseFloat(wan[1]) * 10000);
    const m = s.match(/([\d.]+)/);
    return m ? parseFloat(m[1]) : NaN;
  }

  function parseMonths(v) {
    const s = String(v == null ? '' : v).trim();
    const y = s.match(/([\d.]+)\s*年/);
    if (y) return Math.round(parseFloat(y[1]) * 12);
    return parseNum(s);
  }

  function handleGuideAnswer(value) {
    const step = GOAL_STEPS[goalGuide.step];
    if (!step) return;
    const v = String(value == null ? '' : value).trim();
    if (!v) return;
    messages.push({ role: 'user', text: v });
    // 清洗数值
    if (step.key === 'amount') goalGuide.answers.amount = parseNum(v);
    else if (step.key === 'months') goalGuide.answers.months = parseMonths(v);
    else if (step.key === 'monthly') goalGuide.answers.monthly = parseNum(v);
    else goalGuide.answers.goal = v;
    renderMessages();
    goalGuide.step += 1;
    if (goalGuide.step >= GOAL_STEPS.length) {
      finishGoalGuide();
    } else {
      pushGuideStep();
    }
  }

  async function finishGoalGuide() {
    const a = goalGuide.answers;
    const goal = String(a.goal || '').trim();
    if (!goal) {
      messages.push({ role: 'ai', text: '目标内容好像没填上，我们重新来一次吧？直接点侧栏的「🎯 让小拾引导我设置理财目标」就好。', proactive: false });
      cancelGoalGuide();
      renderMessages();
      return;
    }
    try {
      const d = await A().api('/api/goal/complete', { method: 'POST', body: { goal, amount: a.amount, months: a.months, monthly: a.monthly } });
      profile.goal = d.goal;
      cancelGoalGuide();
      messages.push({ role: 'ai', text: '目标已记录！让我给你总结一下执行思路。', proactive: false });
      renderMessages();
      A().toast('理财目标已设置');
      // 让 AI 基于刚定的目标给一段鼓励与执行建议
      try {
        const advice = await A().api('/api/chat', {
          method: 'POST',
          body: { message: `我刚设置了理财目标：${d.goal}。请给我一段60-100字的鼓励和可执行的建议，并提醒一个最重要的执行要点，不要推荐具体产品。`, personaId: A().state.personaId },
        });
        messages.push({ role: 'ai', text: advice.reply, proactive: false });
        renderMessages();
      } catch {}
    } catch (e) {
      messages.push({ role: 'ai', text: '保存目标时出了点问题：' + e.message + '，再试一次？', proactive: false });
      renderMessages();
    }
  }

  // —— 首次登录/手动更新画像：精简风险测评 ——
  function pushOnboardingStep() {
    const step = ONBOARDING_STEPS[onboardingGuide.step];
    if (!step) return;
    messages.push({
      role: 'ai',
      text: step.q,
      proactive: false,
    });
    renderMessages();
    renderOnboardingChoices();
  }

  function renderOnboardingChoices() {
    const step = ONBOARDING_STEPS[onboardingGuide.step];
    const body = document.getElementById('chat-body');
    if (!body || !step) return;
    const aiMessages = [...body.querySelectorAll('.msg.ai')];
    let questionIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === 'ai' && messages[i].text === step.q) {
        questionIndex = messages.slice(0, i + 1).filter((item) => item.role === 'ai').length - 1;
        break;
      }
    }
    const bubble = questionIndex >= 0 ? aiMessages[questionIndex]?.querySelector('.bubble') : null;
    if (!bubble) return;
    bubble.querySelector('.onboarding-options')?.remove();
    const box = document.createElement('div');
    box.className = 'onboarding-options';
    box.innerHTML = step.options.map((option) => `<button class="chip" data-onboarding-option="${A().escapeHtml(option.id)}">${A().escapeHtml(option.label)}</button>`).join('');
    bubble.appendChild(box);
    box.querySelectorAll('[data-onboarding-option]').forEach((button) => {
      button.addEventListener('click', () => sendMessage(button.dataset.onboardingOption));
    });
  }

  function startOnboarding() {
    if (onboardingGuide.active || onboardingGuide.saving) return;
    const updating = profile.onboardingCompleted === true;
    currentCid = 0;
    messages = [];
    onboardingGuide = { active: true, saving: false, completed: false, step: 0, answers: {} };
    const questionCount = ONBOARDING_STEPS.length;
    const intro = updating
      ? `我们来用一份精简测评更新你的理财画像吧。共 ${questionCount} 题，之前的结果会被这次回答更新。`
      : `你好，${A().state.user?.username || '朋友'}！我是小拾。\n\n先用一份场景式测评建立你的理财画像：共 ${questionCount} 题，约 2 分钟完成。可以点击选项，也可以在输入框里写自己的情况。结果只作为学习辅助，不是正式的投资者适当性评级。`;
    messages.push({ role: 'ai', text: `${intro}\n\n题库参考：[中国证监会适当性管理办法](https://www.csrc.gov.cn/csrc/c106256/c1653849/content.shtml) 和 [中国基金业协会风险问卷指引](https://www.amac.org.cn/fwdt/wyb/jgdjhcpbeian/zcglcpba/xgzc/201912/t20191222_19879.html)。`, proactive: false });
    renderMessages();
    pushOnboardingStep();
    setTimeout(() => document.getElementById('chat-input')?.focus(), 0);
  }

  function handleOnboardingAnswer(value) {
    const step = ONBOARDING_STEPS[onboardingGuide.step];
    if (!step) return;
    const raw = String(value || '').trim();
    if (!raw) return;
    const option = step.options.find((item) => item.id === raw || item.label === raw);
    const answerText = option ? option.label : raw.slice(0, 240);
    if (answerText.length < 2) {
      A().toast('请点击一个选项，或输入更完整的自定义回答');
      return;
    }
    messages.push({ role: 'user', text: answerText });
    onboardingGuide.answers[step.key] = option ? option.id : `custom:${answerText}`;
    const input = document.getElementById('chat-input');
    if (input) input.value = '';
    onboardingGuide.step += 1;
    renderMessages();
    if (onboardingGuide.step >= ONBOARDING_STEPS.length) {
      const box = document.getElementById('guide-chips');
      if (box) { box.style.display = 'none'; box.innerHTML = ''; }
      finishOnboarding();
    } else pushOnboardingStep();
  }

  async function finishOnboarding() {
    const answers = onboardingGuide.answers;
    onboardingGuide.saving = true;
    const savingMessage = { role: 'ai', text: '我正在按每道题的语义整理你的回答并检查是否前后一致，请稍候…', proactive: false };
    messages.push(savingMessage);
    const savingStartedAt = Date.now();
    const savingMessageTimer = setInterval(() => {
      const elapsed = Date.now() - savingStartedAt;
      if (elapsed >= 24000) savingMessage.text = '模型仍在整理，最长等待 30 秒；如果无法可靠识别自定义回答，会明确提示你改选后重答。';
      else if (elapsed >= 12000) savingMessage.text = '模型响应较慢，我正在交叉核对混合表达和前后关系，最长等待 30 秒…';
      else if (elapsed >= 5000) savingMessage.text = '我正在按题目语义归位你的回答，而不是只看选项顺序…';
      else if (elapsed >= 3500) savingMessage.text = '我正在按题目语义归位你的回答，而不是只看选项顺序…';
      renderMessages();
    }, 1000);
    renderMessages();
    try {
      const d = await A().api('/api/onboarding/complete', { method: 'POST', body: { survey: answers } });
      if (d.needsRetake) {
        onboardingGuide.saving = false;
        const retryKeys = Array.isArray(d.retryKeys) ? d.retryKeys : [];
        const retryIndex = retryKeys.map((key) => ONBOARDING_STEPS.findIndex((step) => step.key === key)).find((index) => index >= 0);
        if (retryIndex >= 0) {
          retryKeys.forEach((key) => { delete onboardingGuide.answers[key]; });
          onboardingGuide.step = retryIndex;
        } else {
          onboardingGuide.step = Math.max(0, ONBOARDING_STEPS.length - 1);
        }
        messages.push({ role: 'ai', text: `这次回答还需要补充或澄清：${d.feedback || '请按题目描述自己的真实情况。'}\n\n请重新回答标出的题目，其他已完成的回答会保留。`, proactive: false });
        renderMessages();
        pushOnboardingStep();
        return;
      }
      onboardingGuide.saving = false;
      onboardingGuide.active = false;
      onboardingGuide.completed = true;
      const input = document.getElementById('chat-input');
      const sendButton = document.getElementById('chat-send');
      if (input) {
        input.value = '';
        input.placeholder = '画像已完成，请先阅读反馈并点击下方按钮…';
        input.disabled = true;
      }
      if (sendButton) sendButton.disabled = true;
      const feedback = d.feedback ? `\n\n**小拾的反馈**\n\n${d.feedback}` : '';
      messages.push({
        role: 'ai',
        text: `✅ 初始画像已经建立。\n\n${d.summary || '我会在之后的对话中继续理解你的情况，你也可以随时补充或修正。'}${feedback}\n\n请确认反馈内容后，再点击下方按钮进入 AI 搭子。`,
        onboardingComplete: true,
        proactive: false,
      });
      renderMessages();
      A().toast('初始画像已建立');
    } catch (e) {
      onboardingGuide.saving = false;
      messages.push({ role: 'ai', text: `保存初始画像时出了点问题：${e.message}。你可以重新发送上一条回答继续。`, proactive: false });
      renderMessages();
      // 保存失败时回到最后一题，允许用户重新选择并重试，不会卡死在初始化流程中。
      onboardingGuide.step = ONBOARDING_STEPS.length - 1;
      pushOnboardingStep();
    } finally {
      clearInterval(savingMessageTimer);
    }
  }

  async function triggerCompanion(type) {
    try {
      const d = await A().api('/api/companion/trigger', { method: 'POST', body: { type } });
      if (d.proactive && d.proactive.message) {
        messages.push({ role: 'ai', text: d.proactive.message, proactive: true });
        renderMessages();
      }
      if (type === 'reset') A().toast('已重置市场状态');
    } catch (e) {
      A().toast('触发失败：' + e.message);
    }
  }

  async function saveProfile() {
    const payload = { holdings: profile.holdings || [] };
    try {
      await A().api('/api/profile', { method: 'POST', body: payload });
      A().toast('真实持仓已写入个人画像');
    } catch (e) {
      A().toast('保存失败：' + e.message);
    }
  }

  async function saveCustomPersona() {
    const input = document.getElementById('persona-custom-input');
    if (!input) return;
    const personaCustom = input.value.trim().slice(0, 240);
    try {
      await A().api('/api/profile', { method: 'POST', body: { persona_custom: personaCustom } });
      profile.personaCustom = personaCustom;
      A().setPersona('custom');
      renderPersonaStatus();
      A().toast(personaCustom ? '自定义陪伴人格已保存' : '已清空自定义人格，将使用统一基础表达');
    } catch (e) {
      A().toast('保存人格失败：' + e.message);
    }
  }

  // —— 气泡操作：追问术语 / 加入学习 / 添加到个人画像 ——
  function bindBubbleActions() {
    const body = document.getElementById('chat-body');
    if (!body) return;
    body.addEventListener('click', async (e) => {
      const btn = e.target.closest('.bubble-actions .chip');
      if (!btn) return;
      const termAsk = btn.dataset.termAsk;
      const termLearn = btn.dataset.termLearn;
      const bubbleText = btn.closest('.msg').querySelector('.bubble').innerText || '';
      if (termAsk) {
        sendMessage(`什么是${termAsk}？请针对这个术语再详细讲讲。`);
      } else if (termLearn) {
        try {
          await A().api('/api/knowledge/term', { method: 'POST', body: { name: termLearn } });
          A().toast(`「${termLearn}」已加入学习记录`);
          btn.disabled = true;
          btn.textContent = '✅ 已加入';
        } catch (err) {
          A().toast('加入失败：' + err.message);
        }
      } else if (btn.dataset.memory) {
        try {
          await A().api('/api/memories', { method: 'POST', body: { content: bubbleText.slice(0, 300), source: 'chat' } });
          A().toast('已添加到个人画像（可在个人中心编辑）');
          btn.disabled = true;
          btn.textContent = '✅ 已记住';
        } catch (err) {
          A().toast('记录失败：' + err.message);
        }
      }
    });
  }

  // —— AI 动态生成默认问题模板，失败时保持隐藏 ——
  async function loadSuggestions() {
    try {
      const d = await A().api('/api/chat/suggestions', { method: 'POST', timeoutMs: 8000, body: { personaId: A().state.personaId } });
      const list = (d.suggestions || []).filter((s) => s && s.trim());
      const box = document.getElementById('suggest-chips');
      if (box && list.length >= 3) {
        box.innerHTML = list.slice(0, 4).map((s) => `<button class="chip" data-q="${A().escapeHtml(s)}">${A().escapeHtml(s)}</button>`).join('');
        box.style.display = 'flex';
        box.querySelectorAll('.chip').forEach((c) => {
          c.addEventListener('click', () => sendMessage(c.dataset.q));
        });
      }
    } catch {}
  }

  function bindEvents() {
    document.getElementById('new-chat').addEventListener('click', newChat);
    const holdingsToggle = document.getElementById('holdings-toggle');
    if (holdingsToggle) holdingsToggle.addEventListener('click', async () => {
      const sidebar = document.getElementById('profile-sidebar');
      if (!sidebar) return;
      const opening = sidebar.style.display === 'none';
      sidebar.style.display = opening ? 'block' : 'none';
      sidebar.parentElement?.classList.toggle('profile-open', opening);
      holdingsToggle.textContent = opening ? '收起真实持仓' : '📦 编辑真实持仓';
      if (opening && !funds.length) {
        try { await loadFunds(); } catch {}
      }
    });
    const profileGuideBtn = document.getElementById('profile-guide-btn');
    if (profileGuideBtn) profileGuideBtn.addEventListener('click', () => { location.hash = '#/chat?guide=1'; });
    const personaCustomSave = document.getElementById('persona-custom-save');
    if (personaCustomSave) personaCustomSave.addEventListener('click', saveCustomPersona);
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');
    sendBtn.addEventListener('click', () => sendMessage(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
    document.querySelectorAll('#suggest-chips .chip').forEach((c) => {
      c.addEventListener('click', () => sendMessage(c.dataset.q));
    });
    document.getElementById('pf-add').addEventListener('click', () => {
      const code = document.getElementById('pf-fund').value;
      const amount = Number(document.getElementById('pf-amount').value);
      if (!amount || amount <= 0) return A().toast('请输入持仓金额');
      const fund = funds.find((f) => f.code === code);
      profile.holdings = profile.holdings || [];
      profile.holdings.push({ code, name: fund ? fund.name : code, type: fund ? fund.type : '基金', amount, buy_date: new Date().toISOString().slice(0, 10) });
      document.getElementById('pf-amount').value = '';
      renderProfileForm();
    });
    document.getElementById('pf-save').addEventListener('click', saveProfile);
    document.querySelectorAll('[data-trigger]').forEach((b) => {
      b.addEventListener('click', () => triggerCompanion(b.dataset.trigger));
    });
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      const sb = document.getElementById('profile-sidebar');
      const collapsed = sb.classList.toggle('collapsed');
      document.getElementById('sidebar-arrow').textContent = collapsed ? '展开' : '收起';
    });
    bindBubbleActions();
  }

  async function render(root) {
    root.innerHTML = layoutHtml();
    goalGuide = { active: false, step: 0, answers: {} }; // 页面重建时重置引导状态
    onboardingGuide = { active: false, saving: false, completed: false, step: 0, answers: {} };
    renderPersonaStatus();
    bindEvents();
    try {
      // 画像引导不依赖会话列表；先加载画像并立即进入，避免历史会话接口异常时卡住初始化流程。
      await loadProfile();
      if (isProfileGuideFlow()) {
        if (isOnboardingFlow() && profile.onboardingCompleted === true) {
          location.hash = '#/chat';
          return;
        }
        startOnboarding();
        return;
      }
      await loadConversations();
      // 默认问题和主动陪伴都属于非关键内容，不阻塞聊天区首屏；默认问题仅在 AI 返回后显示。
      void Promise.allSettled([
        loadFunds(),
        loadSuggestions(),
        new Promise((resolve) => setTimeout(() => resolve(loadCompanion()), 250)),
      ]);
    } catch (e) {
      A().toast('加载失败：' + e.message);
    }
    // 从热点页/其他页面跳转而来：自动讲解指定术语或选中文字
    try {
      const m = location.hash.match(/[?&]term=([^&]+)/);
      if (m) {
        const term = decodeURIComponent(m[1]);
        history.replaceState(null, '', location.pathname + location.search + '#/chat');
        setTimeout(() => sendMessage(`什么是${term}？请用通俗的方式详细讲讲这个概念。`), 400);
      }
      const f = location.hash.match(/[?&]followup=1(?:&|$)/);
      if (f) {
        let payload = null;
        try { payload = JSON.parse(sessionStorage.getItem('shicai_selection_followup') || 'null'); } catch {}
        sessionStorage.removeItem('shicai_selection_followup');
        history.replaceState(null, '', location.pathname + location.search + '#/chat');
        if (payload && payload.text) {
          setTimeout(() => sendMessage(`关于我选中的这段内容：\n「${payload.text}」\n请结合上下文解释重点，指出其中可能容易误解的地方。`), 400);
        }
      }
    } catch {}
  }

  // 供全局术语系统调用：在当前聊天里直接发起对该术语的追问
  window.Pages = window.Pages || {};
  window.Pages.chat = {
    render,
    askTerm: (term) => {
      if (goalGuide.active) { A().toast('先完成当前的目标引导再追问术语吧'); return; }
      sendMessage(`什么是${term}？请用通俗的方式详细讲讲这个概念。`);
    },
    askSelectedText: (text) => {
      if (goalGuide.active || onboardingGuide.active) {
        A().toast('当前正在进行引导，请先完成引导再追问');
        return;
      }
      sendMessage(`关于我选中的这段内容：\n「${text}」\n请结合上下文解释重点，指出其中可能容易误解的地方。`);
    },
  };
})();
