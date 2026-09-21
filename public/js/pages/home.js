(function () {
  'use strict';

  const A = () => window.App;

  const EXP_LABEL = { '新手': '新手', '半年': '半年', '1-3年': '1-3年', '3年以上': '3年以上' };
  const RISK_LABEL = { '保守': '保守', '稳健': '稳健', '平衡': '平衡', '进取': '进取' };
  const GOAL_LABEL = { '攒钱旅行': '攒钱旅行', '买房首付': '买房首付', '退休储备': '退休储备', '随便玩玩': '随便玩玩' };

  function newsSourceLabel(news) {
    const url = String(news.url || '').toLowerCase();
    const channel = news.channel || (url.includes('cls.cn') ? '财联社电报' : url.includes('chinanews.com.cn') ? '中国新闻网财经' : url.includes('sohu.com') ? '搜狐财经' : url.includes('infzm.com') ? '南方周末' : news.source || '公开渠道');
    return news.source && news.source !== channel ? `来源：${channel} · 发布方：${news.source}` : `来源：${channel}`;
  }

  function proactiveCardHtml(proactive) {
    if (!proactive?.message) return '';
    const crash = proactive.type === 'crash';
    return `
      <div class="card" style="margin-bottom:18px;border-color:${crash ? '#fecaca' : '#fed7aa'};background:${crash ? '#fff7f7' : '#fffaf5'};">
        <div class="card-title">🔔 小拾主动提醒 <span class="hint">${crash ? '市场波动提醒' : proactive.type === 'rise' ? '市场上涨提醒' : '陪伴提醒'}</span></div>
        <div class="sim-ai-markdown" style="font-size:14px;line-height:1.8;color:var(--text-2);">${A().renderMarkdown(proactive.message)}</div>
        <a class="btn btn-ghost btn-sm" href="#/chat" style="margin-top:10px;">去和小拾聊聊 →</a>
      </div>`;
  }

  async function triggerCompanion(type) {
    const buttons = [...document.querySelectorAll('[data-companion-trigger]')];
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const data = await A().api('/api/companion/trigger', { method: 'POST', body: { type } });
      const notice = document.getElementById('home-proactive');
      if (notice) notice.innerHTML = proactiveCardHtml(data.proactive);
    } catch (e) {
      A().toast('触发失败：' + e.message);
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function render(root) {
    root.innerHTML = `
      <div class="container">
        <div class="page-head">
          <h1 class="page-title">你好，我是小拾 👋</h1>
          <p class="page-sub">你的理财学习伙伴，帮你理解，不帮你决策。</p>
        </div>
        <div id="home-loading">
          <div class="grid grid-2 home-card-grid">
            <div class="card"><div class="skeleton" style="height:160px;"></div></div>
            <div class="card"><div class="skeleton" style="height:160px;"></div></div>
          </div>
        </div>
        <div id="home-content" style="display:none;"></div>
      </div>
    `;
    load();
  }

  async function load() {
    try {
      const [dashboard, simulation, fundData, companion] = await Promise.all([
        A().api('/api/dashboard'),
        A().api('/api/simulate/state'),
        A().api('/api/funds'),
        // 首页进入时也检查一次主动陪伴，让大涨大跌提醒先出现在用户最先看到的首页。
        A().api('/api/companion/status').catch(() => ({ proactive: null })),
      ]);
      renderContent({ ...dashboard, simulation, funds: fundData.funds || [], proactive: companion.proactive });
    } catch (e) {
      document.getElementById('home-loading').innerHTML = `<div class="card empty">加载失败：${A().escapeHtml(e.message)}</div>`;
    }
  }

  function renderContent(d) {
    const loading = document.getElementById('home-loading');
    const content = document.getElementById('home-content');
    loading.style.display = 'none';

    const market = d.market || { indices: [], avgChange: 0 };
    const indicesHtml = market.indices
      .map((i) => {
        const cls = A().updownClass(i.change);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);">
            <span style="font-weight:600;">${A().escapeHtml(i.name)}</span>
            <span class="text-2">${A().fmtMoney(i.price)}</span>
            <span class="pill ${cls}">${A().fmtChange(i.change)}</span>
          </div>`;
      })
      .join('');

    const p = d.profile || {};
    const learn = d.learning || { learned: 0, total: 0 };
    const sourceLabel = market.source === 'simulated' ? '模拟数据' : '实时行情';
    const simulation = d.simulation || { holdings: [], total: 0 };
    const proactive = d.proactive;
    const proactiveHtml = proactiveCardHtml(proactive);
    const fundMap = new Map((d.funds || []).map((f) => [f.code, f]));
    const simulationHoldings = simulation.holdings || [];
    const holdingCards = simulationHoldings.length
      ? simulationHoldings.map((h) => {
        const fund = { ...(fundMap.get(h.code) || {}), ...h };
        return `<button class="fund-home-card" data-code="${A().escapeHtml(h.code)}">
          <span><b>${A().escapeHtml(h.name)}</b><small>${A().escapeHtml(h.code)} · ${A().escapeHtml(fund.type || '基金')}</small></span>
          <span class="fund-home-value"><b>${A().fmtMoney(h.value)}元</b><small>${h.shares} 份 · 查看详情 ›</small></span>
        </button>`;
      }).join('')
      : '<div class="empty" style="padding:20px 8px;">模拟仓暂无持仓，买入后可在这里点击查看基金详情。</div>';

    content.innerHTML = `
      <div id="home-proactive">${proactiveHtml}</div>
      <div class="grid grid-2 home-card-grid">
        <div class="card">
          <div class="card-title">今日市场概览 <span class="hint">${A().escapeHtml(market.date || '')} · ${A().escapeHtml(sourceLabel)}</span></div>
          ${indicesHtml || '<div class="empty">暂无行情数据</div>'}
          <div style="margin-top:14px;padding:12px 14px;background:var(--primary-soft-2);border-radius:12px;font-size:14px;color:var(--text-2);">
            💬 <span style="font-weight:700;color:var(--primary-dark);">小拾点评：</span>${A().escapeHtml(d.comment || '')}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
            <span class="muted" style="font-size:12px;">主动提醒演示：</span>
            <button class="btn btn-ghost btn-sm" data-companion-trigger="rise">模拟大涨</button>
            <button class="btn btn-ghost btn-sm" data-companion-trigger="crash">模拟大跌</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">我的理财画像
            <a class="btn btn-ghost btn-sm" href="#/profile">编辑画像</a>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
            <span class="badge">经验 · ${A().escapeHtml(EXP_LABEL[p.experienceLevel] || '新手')}</span>
            <span class="badge">风险 · ${A().escapeHtml(RISK_LABEL[p.riskTolerance] || '稳健')}</span>
            <span class="badge">目标 · ${A().escapeHtml(GOAL_LABEL[p.goal] || p.goal || '攒钱旅行')}</span>
          </div>
          <div class="divider"></div>
          <div style="display:flex;justify-content:space-between;font-size:14px;">
            <span class="muted">已上传持仓</span>
            <span style="font-weight:700;">${Number(p.holdingsCount || 0)} 笔</span>
          </div>
          <p class="muted" style="font-size:13px;margin-top:10px;">画像越完整，小拾给的建议越贴合你的情况。去 <a href="#/chat">AI搭子</a> 完善档案吧。</p>
        </div>
      </div>

      <div class="grid grid-3 home-card-grid">
        <div class="card">
          <div class="card-title">模拟仓持仓 <span class="hint">总资产 ${A().fmtMoney(simulation.total)}元</span></div>
          <div class="fund-home-list">${holdingCards}</div>
        </div>
        <div class="card">
          <div class="card-title">热点解读 <span class="hint">${A().escapeHtml(d.personalizedNewsEnabled ? (d.personalizationMode === 'ai' ? 'AI 已按你的画像筛选' : '已按画像筛选（规则兜底）') : '通用热点')}${d.newsLastUpdate ? ' · 更新于 ' + A().escapeHtml(d.newsLastUpdate) : ''}</span> <a class="hint" href="#/insights">全部 →</a></div>
          ${(d.hotNews || []).map((n, idx) => `
            <a href="#/insights" style="display:block;padding:10px 0;border-bottom:${idx === d.hotNews.length - 1 ? 'none' : '1px solid var(--border)'};">
              <div style="font-weight:600;color:var(--text);">${A().escapeHtml(n.displayTitle || n.title)}</div>
              ${n.personalized ? `<div style="margin-top:2px;"><span class="badge gray">🎯 ${A().escapeHtml(n.personalizationReason || '画像相关')}</span></div>` : ''}
              <div class="muted" style="font-size:12px;margin-top:2px;">${A().escapeHtml(newsSourceLabel(n))}${n.published_at ? ` · ${A().escapeHtml(String(n.published_at).slice(5, 16))}` : ''}</div>
              <div class="muted" style="font-size:13px;margin-top:2px;">${A().escapeHtml((n.ai_summary || n.content || '').slice(0, 60))}</div>
            </a>`).join('') || '<div class="empty">暂无热点</div>'}
        </div>

        <div class="card">
          <div class="card-title">学习进度</div>
          <div class="grid grid-3">
            <div class="stat">
              <div class="stat-value" style="color:var(--primary);">${learn.learned}/${learn.total}</div>
              <div class="stat-label">已学知识点</div>
            </div>
            <div class="stat">
              <div class="stat-value ${A().updownClass(d.simRate)}">${A().fmtChange(d.simRate)}</div>
              <div class="stat-label">模拟仓收益</div>
            </div>
            <div class="stat">
              <div class="stat-value">${d.streak || 1}</div>
              <div class="stat-label">连续使用天数</div>
            </div>
          </div>
          <div style="margin-top:16px;">
            <div style="font-size:12px;color:var(--muted);display:flex;justify-content:space-between;margin-bottom:6px;">
              <span>学习进度</span><span>${learn.learned}/${learn.total}</span>
            </div>
            <div style="height:8px;background:var(--bg-soft);border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${learn.total ? Math.round(learn.learned / learn.total * 100) : 0}%;background:linear-gradient(90deg,#fb923c,#f97316);border-radius:999px;"></div>
            </div>
            <a class="btn btn-ghost btn-sm" href="#/profile" style="margin-top:14px;">去学习 →</a>
          </div>
        </div>
      </div>
    `;
    content.style.display = 'block';
    content.querySelectorAll('[data-companion-trigger]').forEach((button) => {
      button.addEventListener('click', () => triggerCompanion(button.dataset.companionTrigger));
    });
    content.querySelectorAll('.fund-home-card').forEach((card) => {
      card.addEventListener('click', () => {
        const holding = simulationHoldings.find((h) => h.code === card.dataset.code);
        const fund = { ...(fundMap.get(card.dataset.code) || {}), ...(holding || {}) };
        A().openFundDetail(fund, holding);
      });
    });
  }

  window.Pages = window.Pages || {};
  window.Pages.home = { render };
})();
