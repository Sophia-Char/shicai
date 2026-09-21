(function () {
  'use strict';

  const A = () => window.App;
  const FEELINGS = ['焦虑', '平静', '兴奋', '无所谓'];
  const FEELING_VAL = { 焦虑: 1, 无所谓: 2, 平静: 3, 兴奋: 4 };
  const GOAL_OPTIONS = ['攒钱旅行', '买房首付', '退休储备', '随便玩玩', '自定义…'];
  const REPLY_STYLES = [
    { id: 'auto', label: '自动（按经验调整）' },
    { id: 'standard', label: '标准' },
    { id: 'concise', label: '简洁精炼' },
    { id: 'detailed', label: '详细充实' },
  ];
  function layoutHtml() {
    return `
      <div class="container">
        <div class="page-head">
          <h1 class="page-title">👤 个人中心</h1>
          <p class="page-sub">你的画像、学习记录和情绪轨迹。</p>
        </div>

        <div class="grid grid-2">
          <div class="card">
            <div class="card-title">我的画像</div>
            <div id="profile-summary"><div class="empty">加载中…</div></div>
            <div class="divider"></div>
            <div class="field">
              <label>理财目标</label>
              <select class="select" id="goal-select">${GOAL_OPTIONS.map((o) => `<option>${o}</option>`).join('')}</select>
              <input class="input" id="goal-custom" placeholder="输入你的理财目标…" style="margin-top:6px;display:none;" />
            </div>
            <div class="field">
              <label>自定义画像补充</label>
              <textarea class="textarea" id="self-intro" rows="3" placeholder="补充任何想让小拾记住你的信息，比如：我是学生，每月能投500块；我讨厌高风险…"></textarea>
            </div>
            <button class="btn btn-primary btn-block" id="profile-save">保存画像</button>
          </div>

          <div class="card">
            <div class="card-title">情绪日记</div>
            <p class="muted" style="font-size:13px;margin-top:0;">记录今天的感受，小拾会在波动时引用它关心你。</p>
            <div class="feeling-btns" id="feeling-btns">
              ${FEELINGS.map((f) => `<button class="feeling-btn" data-f="${f}">${f}</button>`).join('')}
            </div>
            <div id="emotion-chart" data-chart style="height:180px;margin-top:16px;"></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">AI 画像笔记 <span class="hint">聊天中点「➕ 添加到个人画像」会自动沉淀到这里，可自由编辑</span></div>
          <div id="memories-list"><div class="empty">加载中…</div></div>
          <div style="display:flex;gap:8px;margin-top:10px;">
            <input class="input" id="memory-input" placeholder="手动添加一条画像笔记，如：我目标是存够10万旅行基金" />
            <button class="btn btn-primary" id="memory-add">添加</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">学习记录 <span class="hint">点击知识点可标记为已掌握</span></div>
          <div id="kp-list"><div class="empty">加载中…</div></div>
        </div>

        <div class="card">
          <div class="card-title">设置</div>
          <div class="field">
            <label>自定义陪伴人格</label>
            <textarea class="textarea" id="custom-persona" rows="2" maxlength="240" placeholder="例如：像严格但耐心的教练，少安慰，多用数据提醒我"></textarea>
            <div class="muted" style="font-size:12px;margin-top:6px;">AI 搭子只使用这里填写的陪伴人格；清空后使用统一基础表达。</div>
          </div>
          <div class="field">
            <label>回复风格</label>
            <select class="select" id="reply-style">
              ${REPLY_STYLES.map((s) => `<option value="${s.id}">${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:400;color:var(--text);">
              <input type="checkbox" id="push-toggle" /> 开启个性化热点筛选
            </label>
            <div class="muted" style="font-size:12px;margin-top:6px;">开启后，首页和热点页会根据你的风险偏好、理财目标和当前持仓调整热点排序。</div>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" id="save-settings">保存设置</button>
            <button class="btn btn-ghost" id="view-boundary">查看 AI 能力边界说明</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">
            AI 接入设置
            <span class="badge gray" id="ai-config-badge">加载中</span>
          </div>
          <div class="grid grid-2">
            <div class="field">
              <label>DeepSeek API Key</label>
              <input class="input" id="ai-api-key" type="password" autocomplete="new-password" placeholder="sk-..." />
            </div>
            <div class="field">
              <label>API 地址</label>
              <input class="input" id="ai-base-url" placeholder="https://api.deepseek.com" />
            </div>
          </div>
          <div class="field">
            <label>模型</label>
            <input class="input" id="ai-model" placeholder="deepseek-chat" />
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-primary" id="ai-config-save">保存并启用</button>
            <button class="btn btn-ghost" id="ai-config-test">测试连接</button>
            <button class="btn btn-ghost" id="ai-config-clear">清除个人 Key</button>
          </div>
          <div class="muted" id="ai-config-note" style="font-size:12px;margin-top:10px;"></div>
        </div>
      </div>
    `;
  }

  function renderProfileSummary(p) {
    const box = document.getElementById('profile-summary');
    const holdings = p.holdings || [];
    box.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div class="post-avatar">${A().escapeHtml((p.username || '我')[0])}</div>
        <div>
          <div style="font-weight:700;">${A().escapeHtml(p.username || '我')}</div>
          <div class="muted" style="font-size:12px;">${p.personaCustom ? '自定义陪伴人格已启用' : '尚未设置自定义陪伴人格'}</div>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
        <span class="badge">经验 · ${A().escapeHtml(p.experienceLevel || '新手')}</span>
        <span class="badge">风险 · ${A().escapeHtml(p.riskTolerance || '稳健')}</span>
        <span class="badge">目标 · ${A().escapeHtml(p.goal || '攒钱旅行')}</span>
      </div>
      <div style="font-weight:600;margin-bottom:6px;">当前持仓（${holdings.length} 笔）</div>
      ${holdings.length
        ? holdings.map((h) => `<div style="display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-bottom:1px solid var(--border);"><span>${A().escapeHtml(h.name || h.code)}</span><span class="text-2">${A().fmtMoney(h.amount)}元</span></div>`).join('')
        : '<div class="empty" style="padding:12px;">暂无持仓，去 AI搭子 完善档案。</div>'}
    `;
  }

  function renderKnowledge(points) {
    const box = document.getElementById('kp-list');
    if (!points.length) {
      box.innerHTML = '<div class="empty">暂无知识点。</div>';
      return;
    }
    box.innerHTML = points.map((k) => `
      <div class="kp-item ${k.learned ? 'done' : ''}" data-id="${k.id}">
        <div class="kp-title">
          <span>${k.learned ? '✅' : '📚'} ${A().escapeHtml(k.title)} <span class="badge gray">${A().escapeHtml(k.category || '')}</span></span>
          <button class="btn btn-ghost btn-sm kp-toggle">${k.learned ? '已掌握' : '标记已学'}</button>
        </div>
        <div class="kp-content">${A().escapeHtml(k.content || '')}</div>
      </div>`).join('');
    box.querySelectorAll('.kp-toggle').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.kp-item').dataset.id;
        try {
          await A().api('/api/knowledge/complete', { method: 'POST', body: { id: Number(id) } });
          A().toast('已标记为掌握');
          const d = await A().api('/api/knowledge');
          renderKnowledge(d.points);
        } catch (e) {
          A().toast('失败：' + e.message);
        }
      });
    });
  }

  function renderEmotionChart(emotions) {
    const el = document.getElementById('emotion-chart');
    if (!el || !window.echarts) return;
    const labels = emotions.map((e) => e.date.slice(5));
    const values = emotions.map((e) => FEELING_VAL[e.feeling] ?? 2);
    A().initChart(el, {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 14, top: 14, bottom: 26 },
      xAxis: { type: 'category', data: labels, axisLabel: { color: '#9a8f82', fontSize: 11 }, axisLine: { lineStyle: { color: '#efe7dc' } } },
      yAxis: {
        type: 'value', min: 0.5, max: 4.5, interval: 1,
        axisLabel: { formatter: (v) => ['', '焦虑', '无所谓', '平静', '兴奋'][v] || '', color: '#9a8f82', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f3ede4' } },
      },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: '#f97316' },
        itemStyle: { color: '#f97316' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,.2)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
      }],
    });
  }

  function renderMemories(memories) {
    const box = document.getElementById('memories-list');
    if (!box) return;
    if (!memories || !memories.length) {
      box.innerHTML = '<div class="empty">暂无画像笔记。聊天中点 AI 回复下方的「➕ 添加到个人画像」，或手动添加。</div>';
      return;
    }
    box.innerHTML = memories.map((m) => `
      <div class="holding-item" style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
        <span style="flex:1;">📌 ${A().escapeHtml(m.content)}</span>
        <span class="muted" style="font-size:12px;flex-shrink:0;">${A().escapeHtml((m.created_at || '').slice(5, 16))}</span>
        <button class="btn btn-ghost btn-sm memory-del" data-id="${m.id}" style="flex-shrink:0;">删除</button>
      </div>`).join('');
    box.querySelectorAll('.memory-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await A().api('/api/memories/' + btn.dataset.id, { method: 'DELETE' });
          A().toast('已删除');
          await loadMemories();
        } catch (e) {
          A().toast('删除失败');
        }
      });
    });
  }

  async function loadMemories() {
    try {
      const d = await A().api('/api/memories');
      renderMemories(d.memories || []);
    } catch (e) {
      const box = document.getElementById('memories-list');
      if (box) box.innerHTML = '<div class="empty">加载失败</div>';
    }
  }

  function renderAiConfig(config) {
    const badge = document.getElementById('ai-config-badge');
    const note = document.getElementById('ai-config-note');
    const keyInput = document.getElementById('ai-api-key');
    const baseUrlInput = document.getElementById('ai-base-url');
    const modelInput = document.getElementById('ai-model');
    if (!badge || !note || !keyInput || !baseUrlInput || !modelInput) return;

    const sourceLabels = {
      user: '个人 Key',
      environment: '站点默认 Key',
      none: '未配置',
    };
    badge.textContent = sourceLabels[config.source] || '未配置';
    badge.className = `badge ${config.configured ? '' : 'gray'}`.trim();
    baseUrlInput.value = config.baseUrl || 'https://api.deepseek.com';
    modelInput.value = config.model || 'deepseek-chat';
    keyInput.value = '';

    if (config.userConfigured) {
      keyInput.placeholder = `已保存 ${config.maskedKey}，留空则保持不变`;
      note.textContent = '当前使用你保存的个人 Key，服务端加密存储，页面不会回显完整密钥。';
    } else if (config.source === 'environment') {
      keyInput.placeholder = `站点默认 Key ${config.maskedKey}`;
      note.textContent = '当前使用站点默认 Key；填写后会优先使用你的个人 Key。';
    } else {
      keyInput.placeholder = 'sk-...';
      note.textContent = '尚未配置可用 Key，填写后即可启用真实模型回复。';
    }
  }

  async function loadAiConfig() {
    try {
      const config = await A().api('/api/ai/config');
      renderAiConfig(config);
    } catch (e) {
      const badge = document.getElementById('ai-config-badge');
      if (badge) badge.textContent = '加载失败';
    }
  }

  function bindEvents(profile) {
    document.querySelectorAll('#feeling-btns .feeling-btn').forEach((b) => {
      b.addEventListener('click', async () => {
        try {
          const d = await A().api('/api/emotion', { method: 'POST', body: { feeling: b.dataset.f } });
          A().toast(`已记录「${b.dataset.f}」`);
          A().disposeCharts(document.getElementById('emotion-chart').closest('.card'));
          renderEmotionChart(d.emotions);
        } catch (e) {
          A().toast('记录失败');
        }
      });
    });

    const goalSel = document.getElementById('goal-select');
    const goalCustom = document.getElementById('goal-custom');
    if (goalSel) {
      const customGoal = profile.goal && !GOAL_OPTIONS.includes(profile.goal) ? profile.goal : '';
      goalSel.value = customGoal ? '自定义…' : (profile.goal || '攒钱旅行');
      if (goalCustom) {
        goalCustom.style.display = customGoal ? 'block' : 'none';
        goalCustom.value = customGoal;
      }
      goalSel.addEventListener('change', () => {
        if (goalCustom) {
          goalCustom.style.display = goalSel.value === '自定义…' ? 'block' : 'none';
          if (goalSel.value !== '自定义…') goalCustom.value = '';
        }
      });
    }
    const selfIntro = document.getElementById('self-intro');
    if (selfIntro) selfIntro.value = profile.selfIntro || '';

    document.getElementById('profile-save').addEventListener('click', async () => {
      const goalVal = goalSel ? goalSel.value : '攒钱旅行';
      const goal = goalVal === '自定义…' ? (goalCustom.value.trim() || '自定义目标') : goalVal;
      try {
        await A().api('/api/profile', {
          method: 'POST',
          body: {
            goal,
            self_intro: selfIntro ? selfIntro.value.trim() : '',
            reply_style: document.getElementById('reply-style').value,
          },
        });
        A().toast('画像已保存');
      } catch (e) {
        A().toast('保存失败：' + e.message);
      }
    });

    document.getElementById('memory-add').addEventListener('click', async () => {
      const input = document.getElementById('memory-input');
      const content = input.value.trim();
      if (!content) return A().toast('请输入内容');
      try {
        await A().api('/api/memories', { method: 'POST', body: { content, source: 'manual' } });
        input.value = '';
        A().toast('已添加画像笔记');
        await loadMemories();
      } catch (e) {
        A().toast('添加失败：' + e.message);
      }
    });
    document.getElementById('memory-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('memory-add').click();
    });

    document.getElementById('custom-persona').value = profile.personaCustom || '';
    document.getElementById('reply-style').value = profile.replyStyle || 'auto';
    const pushToggle = document.getElementById('push-toggle');
    pushToggle.checked = profile.personalizedNewsEnabled !== false;

    document.getElementById('save-settings').addEventListener('click', async () => {
      const personaCustom = document.getElementById('custom-persona').value.trim();
      const replyStyle = document.getElementById('reply-style').value;
      try {
        await A().api('/api/profile', { method: 'POST', body: {
          persona_custom: personaCustom,
          reply_style: replyStyle,
          personalizedNewsEnabled: pushToggle.checked,
        } });
        profile.personaPreference = 'custom';
        profile.personaCustom = personaCustom;
        renderProfileSummary(profile);
        A().setPersona('custom');
        A().toast(profile.personaCustom ? '设置已保存，自定义人格已启用' : '设置已保存，将使用统一基础表达');
      } catch (e) {
        A().toast('保存失败');
      }
    });

    document.getElementById('view-boundary').addEventListener('click', () => A().showBoundaryModal());

    document.getElementById('ai-config-save').addEventListener('click', async () => {
      const apiKey = document.getElementById('ai-api-key').value.trim();
      const baseUrl = document.getElementById('ai-base-url').value.trim();
      const model = document.getElementById('ai-model').value.trim();
      try {
        const result = await A().api('/api/ai/config', {
          method: 'POST',
          body: { apiKey: apiKey || undefined, baseUrl, model },
        });
        renderAiConfig(result.config);
        A().toast('AI 接入配置已保存');
      } catch (e) {
        A().toast(e.message);
      }
    });

    document.getElementById('ai-config-test').addEventListener('click', async () => {
      const apiKey = document.getElementById('ai-api-key').value.trim();
      const baseUrl = document.getElementById('ai-base-url').value.trim();
      const model = document.getElementById('ai-model').value.trim();
      const button = document.getElementById('ai-config-test');
      button.disabled = true;
      try {
        const result = await A().api('/api/ai/config/test', {
          method: 'POST',
          body: { apiKey: apiKey || undefined, baseUrl, model },
        });
        A().toast(`连接成功：${result.model || model}`);
      } catch (e) {
        A().toast(e.message);
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById('ai-config-clear').addEventListener('click', async () => {
      if (!confirm('确定清除当前账号保存的个人 API Key？')) return;
      try {
        const result = await A().api('/api/ai/config', { method: 'DELETE' });
        renderAiConfig(result.config);
        A().toast('个人 API Key 已清除');
      } catch (e) {
        A().toast(e.message);
      }
    });
  }

  async function render(root) {
    root.innerHTML = layoutHtml();
    try {
      const [profile, kp, emotion] = await Promise.all([
        A().api('/api/profile'),
        A().api('/api/knowledge'),
        A().api('/api/emotion'),
      ]);
      renderProfileSummary(profile);
      renderKnowledge(kp.points);
      renderEmotionChart(emotion.emotions || []);
      bindEvents(profile);
      await Promise.all([loadMemories(), loadAiConfig()]);
    } catch (e) {
      document.getElementById('profile-summary').innerHTML = `<div class="empty">加载失败：${A().escapeHtml(e.message)}</div>`;
    }
  }

  window.Pages = window.Pages || {};
  window.Pages.profile = { render };
})();
