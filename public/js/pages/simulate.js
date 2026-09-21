(function () {
  'use strict';

  const A = () => window.App;
  const FUND_TYPES = ['宽基指数', '行业主题', '混合型', '债券型', 'QDII', '股票型', '货币型', 'ETF'];
  const FUND_RISKS = ['低', '中', '高'];
  const RECURRING_FREQUENCIES = ['每周', '每两周', '每月', '每季度'];
  let funds = [];
  let fundSnapshot = null;
  let selectedCode = null;
  let state = null;
  let charts = [];
  let latestReview = '';

  function layoutHtml() {
    return `
      <div class="container">
        <div class="page-head">
          <h1 class="page-title">📈 模拟投资仓</h1>
          <p class="page-sub">自定义虚拟资金，练手不心疼。每一笔操作，小拾都会陪你复盘。</p>
        </div>
        <div id="sim-loading"><div class="card"><div class="skeleton" style="height:200px;"></div></div></div>
        <div id="sim-content" style="display:none;">
          <div class="card">
            <div class="card-title">账户概览 <span class="hint" id="initial-capital-hint"></span><button class="btn btn-ghost btn-sm" id="capital-settings">设置初始资金</button>
            </div>
            <div class="grid grid-4" id="sim-stats"></div>
          </div>

          <div class="grid grid-2">
            <div class="card">
              <div class="card-title">申购 / 赎回 <span class="hint" id="fund-snapshot-status"></span></div>
              <div class="field">
                <label>搜索基金（代码 / 名称 / 类型）</label>
                <input class="input" id="fund-search" placeholder="如：新能源、516160、宽基…" />
                <div style="display:grid;grid-template-columns:1fr 1fr 1.25fr;gap:8px;margin-top:8px;">
                  <select class="select" id="fund-type-filter"><option value="">全部类型</option>${FUND_TYPES.map((type) => `<option value="${type}">${type}</option>`).join('')}</select>
                  <select class="select" id="fund-risk-filter"><option value="">全部风险</option>${FUND_RISKS.map((risk) => `<option value="${risk}">风险${risk}</option>`).join('')}</select>
                  <select class="select" id="fund-sort"><option value="default">默认排序</option><option value="return-desc">近1年收益率：高→低</option><option value="return-asc">近1年收益率：低→高</option></select>
                </div>
                <div id="fund-results" style="margin-top:8px;max-height:210px;overflow:auto;"></div>
              </div>
              <div id="fund-detail" style="display:none;margin-top:6px;"></div>
              <div class="field" style="margin-top:12px;">
                <label id="trade-input-label">金额（元）</label>
                <input class="input" id="trade-amount" type="number" min="1" step="0.01" placeholder="如 5000" />
                <div id="trade-input-hint" class="muted" style="font-size:12px;margin-top:5px;">开放式基金按金额提交，收盘后按单位净值确认份额。</div>
                <div id="redemption-shortcuts" hidden style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:9px;">
                  <span class="muted" style="font-size:12px;">快捷赎回：</span>
                  <button type="button" class="btn btn-ghost btn-sm redemption-shortcut" data-ratio="0.3333333333">1/3</button>
                  <button type="button" class="btn btn-ghost btn-sm redemption-shortcut" data-ratio="0.5">1/2</button>
                  <button type="button" class="btn btn-ghost btn-sm redemption-shortcut" data-ratio="1">全部</button>
                </div>
              </div>
              <div style="display:flex;gap:10px;">
                <button class="btn btn-primary" id="buy-btn" style="flex:1;">申购</button>
                <button class="btn btn-ghost" id="sell-btn" style="flex:1;">赎回</button>
              </div>
            </div>

            <div class="card">
              <div class="card-title">AI 复盘</div>
              <div id="review-box">
                <div class="empty">完成一笔申购或赎回后，小拾会在这里给你复盘。</div>
              </div>
            </div>
          </div>

          <div class="grid" style="grid-template-columns:minmax(0,1fr);">
            <div class="card">
              <div class="card-title">持仓占比</div>
              <div id="pie-chart" data-chart style="height:300px;"></div>
            </div>
          </div>

          <div class="card" style="margin-top:18px;">
            <div class="card-title">定投计划 <span class="hint">到期后按基金交易方式执行</span></div>
            <div id="recurring-list"></div>
          </div>

          <div class="card" style="margin-top:18px;">
            <div class="card-title">待确认订单 <span class="hint">开放式基金收盘后按净值确认</span></div>
            <div id="pending-orders-list"></div>
          </div>

          <div class="grid grid-2">
            <div class="card">
              <div class="card-title">当前持仓 <span class="hint">点击申购/赎回可直接操作</span></div>
              <div id="holdings-list"></div>
            </div>
            <div class="card">
              <div class="card-title">交易记录</div>
              <div id="tx-list"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  async function loadFunds() {
    const d = await A().api('/api/funds');
    funds = d.funds || [];
    fundSnapshot = d.snapshot || null;
    renderFundSnapshotStatus();
  }

  function renderFundSnapshotStatus() {
    const el = document.getElementById('fund-snapshot-status');
    if (!el || !fundSnapshot) return;
    const date = fundSnapshot.snapshotAsOf ? String(fundSnapshot.snapshotAsOf).replace('T', ' ').slice(0, 16) : '';
    if (fundSnapshot.status === 'fresh') {
      el.textContent = fundSnapshot.staleFields?.length
        ? `⚠ 快照截至 ${date}，部分指标未更新`
        : `快照截至 ${date}`;
      el.style.color = fundSnapshot.staleFields?.length ? 'var(--danger, #b91c1c)' : 'var(--text-2)';
    } else if (fundSnapshot.status === 'stale') {
      el.textContent = `⚠ 快照可能已过期（${date}）`;
      el.style.color = 'var(--danger, #b91c1c)';
    } else {
      el.textContent = '⚠ 快照时间未知';
      el.style.color = 'var(--danger, #b91c1c)';
    }
  }

  // ETF 筛选和交易方式共用同一套识别规则：场内 ETF 可实时交易，ETF 联接仍按开放式基金处理。
  function isEtfFund(fund) {
    const name = String(fund?.name || '').toUpperCase();
    return fund?.isEtf === true
      || fund?.tradeMode === 'exchange_realtime'
      || (String(fund?.type || '').toUpperCase() === 'ETF' && !name.includes('联接'))
      || (name.includes('ETF') && !name.includes('联接'));
  }

  function fundTypeLabel(fund) {
    return isEtfFund(fund) ? 'ETF' : (fund?.type || '基金');
  }

  function filterFunds(q, type = '', risk = '', sort = 'default') {
    q = (q || '').trim().toLowerCase();
    const list = funds.filter((f) => {
      const matchesQuery = !q || String(f.code).includes(q) || String(f.name).toLowerCase().includes(q) || String(f.type).toLowerCase().includes(q) || fundTypeLabel(f).toLowerCase().includes(q);
      const matchesType = !type || (type === 'ETF' ? isEtfFund(f) : f.type === type);
      return matchesQuery && matchesType && (!risk || f.risk === risk);
    });
    const returnValue = (fund) => Number.isFinite(Number(fund.return1y)) ? Number(fund.return1y) : null;
    if (sort === 'return-desc') return list.sort((a, b) => (returnValue(b) ?? -Infinity) - (returnValue(a) ?? -Infinity));
    if (sort === 'return-asc') return list.sort((a, b) => (returnValue(a) ?? Infinity) - (returnValue(b) ?? Infinity));
    return list;
  }

  function renderFundResults(q) {
    const box = document.getElementById('fund-results');
    const type = document.getElementById('fund-type-filter')?.value || '';
    const risk = document.getElementById('fund-risk-filter')?.value || '';
    const sort = document.getElementById('fund-sort')?.value || 'default';
    const list = filterFunds(q, type, risk, sort);
    if (!list.length) {
      box.innerHTML = '<div class="empty" style="padding:12px;">没有匹配的基金</div>';
      return;
    }
    const total = list.length;
    const show = list.slice(0, 30);
    box.innerHTML = `<div class="muted" style="font-size:12px;padding:2px 2px 6px;">共 ${total} 只基金${q ? '，匹配 ' + list.length + ' 只' : '，输入代码/名称/类型搜索'}（显示前 ${show.length} 只）</div>` +
      show.map((f) => `
      <div class="fund-option" data-code="${f.code}" style="display:flex;justify-content:space-between;align-items:center;padding:9px 11px;border:1px solid var(--border);border-radius:10px;margin-bottom:6px;cursor:pointer;transition:all .15s;">
        <div>
          <div style="font-weight:600;font-size:14px;">${A().escapeHtml(f.name)}</div>
          <div class="muted" style="font-size:12px;">${A().escapeHtml(f.code)} · ${A().escapeHtml(fundTypeLabel(f))} · 风险${A().escapeHtml(f.risk)}</div>
        </div>
        <div style="text-align:right;">
          <div class="${A().updownClass(f.return1y)}" style="font-weight:700;">${A().fmtChange(f.return1y)}</div>
          <div class="muted" style="font-size:12px;">近1年</div>
        </div>
      </div>`).join('');
    box.querySelectorAll('.fund-option').forEach((el) => {
      el.addEventListener('click', () => selectFund(el.dataset.code));
      el.addEventListener('mouseenter', () => { el.style.borderColor = 'var(--primary)'; el.style.background = 'var(--primary-soft-2)'; });
      el.addEventListener('mouseleave', () => { el.style.borderColor = 'var(--border)'; el.style.background = ''; });
    });
  }

  function selectFund(code) {
    selectedCode = code;
    const f = funds.find((x) => x.code === code);
    const detail = document.getElementById('fund-detail');
    const rule = tradingRule(f);
    const buyButton = document.getElementById('buy-btn');
    const sellButton = document.getElementById('sell-btn');
    if (buyButton) buyButton.textContent = rule.actionLabel('buy');
    if (sellButton) sellButton.textContent = rule.actionLabel('sell');
    updateTradeInput(f);
    detail.style.display = 'block';
    detail.innerHTML = `
      <div style="padding:12px 14px;background:var(--primary-soft-2);border-radius:12px;">
        <div style="font-weight:700;">${A().escapeHtml(f.name)} <span class="badge gray">${A().escapeHtml(fundTypeLabel(f))}</span> <span class="badge">风险${A().escapeHtml(f.risk)}</span></div>
        <div style="display:flex;gap:18px;margin-top:8px;font-size:13px;color:var(--text-2);flex-wrap:wrap;">
          <span>近1年：<b class="${A().updownClass(f.return1y)}">${A().fmtChange(f.return1y)}</b></span>
          <span>最大回撤：<b class="${A().updownClass(f.maxDrawdown)}">${A().fmtChange(f.maxDrawdown)}</b></span>
          <span>净值：<b>${A().fmtMoney(f.price)}</b></span>
        </div>
        <div class="muted" style="font-size:12px;margin-top:8px;">${fundDesc(f)}</div>
        <div style="margin-top:8px;padding:8px 10px;background:${rule.isRealtime ? '#ecfdf5' : '#fff7ed'};border-radius:8px;font-size:12px;color:${rule.isRealtime ? '#166534' : '#9a3412'};">交易方式：${A().escapeHtml(rule.label)}。${A().escapeHtml(rule.hint)}</div>
        <button class="btn btn-ghost btn-sm" data-open-fund="${f.code}" style="margin-top:10px;">📊 查看详情 / 净值曲线</button>
        <button class="btn btn-ghost btn-sm" data-ai-fund="${f.code}" style="margin-top:10px;">💬 让小拾点评这只基金</button>
        <div id="ai-fund-${f.code}" style="margin-top:8px;"></div>
      </div>`;
    const detailBtn = detail.querySelector(`[data-open-fund="${f.code}"]`);
    if (detailBtn) detailBtn.addEventListener('click', () => A().openFundDetail(f));
    const aiBtn = detail.querySelector(`[data-ai-fund="${f.code}"]`);
    if (aiBtn) aiBtn.addEventListener('click', () => aiCommentFund(f.code, detail.querySelector('#ai-fund-' + f.code)));
    document.querySelectorAll('.fund-option').forEach((el) => {
      el.style.borderColor = el.dataset.code === code ? 'var(--primary)' : 'var(--border)';
      el.style.background = el.dataset.code === code ? 'var(--primary-soft)' : '';
    });
  }

  // 基金的类型说明（确定性文案，配合 AI 点评使用）
  function fundDesc(f) {
    const typeDesc = {
      宽基指数: '跟踪大盘指数，覆盖多行业，波动相对分散，适合作为组合底仓。',
      行业主题: '只投单一行业，弹性大、波动也大，适合能承受高波动、看好该方向的人。',
      混合型: '股债混合配置，攻守兼顾，波动介于指数与债券之间。',
      债券型: '主要投债券，波动小、收益稳健，是组合里的"稳定器"。',
      QDII: '投资海外市场的基金，可分散单一市场风险，但需注意汇率影响。',
      股票型: '主要投资股票的主动管理基金，长期收益潜力高，但短期波动也大。',
      货币型: '投短期存款和国债，波动极小，适合放闲钱，但收益也低。',
      ETF: '在交易所挂牌交易，交易方式接近股票，可在交易时段按实时参考价申购和赎回。',
    }[isEtfFund(f) ? 'ETF' : f.type] || '投资于对应资产类别，风险收益特征取决于底层资产。';
    return `💡 ${typeDesc}（近1年收益 ${A().fmtChange(f.return1y)}，最大回撤 ${A().fmtChange(f.maxDrawdown)}）`;
  }

  function tradingRule(fund) {
    const isRealtime = isEtfFund(fund);
    return isRealtime
      ? {
          isRealtime: true,
          label: fund.tradeModeLabel || '场内 ETF · 实时交易',
          hint: '申购和赎回都按份额，必须是 100 份的整数倍，按实时参考价立即成交。',
          actionLabel: (type) => type === 'buy' ? 'ETF申购（100份倍数）' : 'ETF赎回（100份倍数）',
        }
      : {
          isRealtime: false,
          label: fund.tradeModeLabel || '开放式基金 · 收盘净值确认',
          hint: '申购按金额提交；赎回按份额提交，收盘后按价格快照确认金额。',
          actionLabel: (type) => type === 'buy' ? '金额申购' : '份额赎回',
    };
  }

  function updateTradeInput(fund, type = 'buy') {
    const rule = tradingRule(fund);
    const label = document.getElementById('trade-input-label');
    const input = document.getElementById('trade-amount');
    const hint = document.getElementById('trade-input-hint');
    const shortcutBox = document.getElementById('redemption-shortcuts');
    if (!label || !input || !hint) return;
    const useShares = rule.isRealtime || type === 'sell';
    if (shortcutBox) {
      shortcutBox.hidden = !(type === 'sell' && state?.holdings?.some((holding) => holding.code === fund?.code));
      shortcutBox.querySelectorAll('.redemption-shortcut').forEach((button) => {
        button.disabled = true;
        button.onclick = null;
      });
      if (!shortcutBox.hidden) {
        const holding = state.holdings.find((item) => item.code === fund.code);
        const reservedShares = (state.pendingOrders || [])
          .filter((order) => order.code === fund.code && order.type === 'sell' && ['pending', 'pending_close'].includes(order.status))
          .reduce((total, order) => total + (Number(order.shares) || 0), 0);
        const availableShares = Math.max(0, (Number(holding?.shares) || 0) - reservedShares);
        shortcutBox.querySelectorAll('.redemption-shortcut').forEach((button) => {
          const ratio = Number(button.dataset.ratio);
          const rawShares = availableShares * ratio;
          const shares = rule.isRealtime
            ? Math.floor(rawShares / 100) * 100
            : Number(rawShares.toFixed(4));
          button.disabled = !Number.isFinite(shares) || shares <= 0;
          button.title = button.disabled ? '当前可赎回份额不足以按该比例提交' : `填入 ${shares} 份`;
          button.onclick = () => {
            if (button.disabled) return;
            input.value = rule.isRealtime ? String(shares) : shares.toFixed(4);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          };
        });
      }
    }
    if (useShares) {
      label.textContent = '交易份额（份）';
      input.min = rule.isRealtime ? '100' : '0.0001';
      input.step = rule.isRealtime ? '100' : '0.0001';
      input.placeholder = rule.isRealtime ? '如 100（必须是100的倍数）' : '如 1000.0000';
      hint.textContent = rule.isRealtime
        ? 'ETF 申购和赎回都以份额为单位，必须是 100 份的整数倍。'
        : '开放式基金赎回按份额提交，收盘后按单位净值快照计算赎回金额。';
    } else {
      label.textContent = '金额（元）';
      input.min = '1';
      input.step = '0.01';
      input.placeholder = '如 5000';
      hint.textContent = '开放式基金申购按金额提交，收盘后按单位净值快照确认份额。';
    }
  }

  // #8：AI 点评基金（复用 /api/chat，不荐股、只讲客观特征与注意点）
  async function aiCommentFund(code, box) {
    const f = funds.find((x) => x.code === code);
    if (!f || !box) return;
    box.innerHTML = '<div class="muted" style="font-size:13px;">小拾正在分析…</div>';
    try {
      const d = await A().api('/api/chat', {
        method: 'POST',
        body: {
          message: `请点评一下这只基金：${f.name}（基金代码 ${f.code}，${f.type}，近1年收益 ${f.return1y}%，最大回撤 ${f.maxDrawdown}%，风险等级 ${f.risk}）。请核查它的最新公开信息并说明依据，再分析风险收益特征、适合什么人、需要注意什么，不要推荐申购或赎回。`,
          personaId: A().state.personaId,
        },
      });
      box.innerHTML = `<div class="sim-ai-markdown" style="font-size:13px;line-height:1.8;background:var(--bg-soft);border-radius:10px;padding:10px 12px;color:var(--text-2);">🤖 ${A().renderMarkdown(d.reply)}</div>${researchMetaHtml(d.research)}`;
    } catch (e) {
      box.innerHTML = `<div class="muted" style="font-size:13px;">点评失败：${A().escapeHtml(e.message)}</div>`;
    }
  }

  function renderStats(s) {
    const capitalHint = document.getElementById('initial-capital-hint');
    if (capitalHint) capitalHint.textContent = `初始资金 ${A().fmtMoney(s.initialCapital || 100000)} 元`;
    document.getElementById('sim-stats').innerHTML = `
      <div class="stat"><div class="stat-value">${A().fmtMoney(s.total)}</div><div class="stat-label">总资产</div></div>
      <div class="stat"><div class="stat-value">${A().fmtMoney(s.cash)}</div><div class="stat-label">可用现金</div></div>
      <div class="stat"><div class="stat-value ${A().updownClass(s.profit)}">${s.profit >= 0 ? '+' : ''}${A().fmtMoney(s.profit)}</div><div class="stat-label">累计盈亏</div></div>
      <div class="stat"><div class="stat-value ${A().updownClass(s.rate)}">${A().fmtChange(s.rate)}</div><div class="stat-label">收益率</div></div>
    `;
  }

  function renderCharts(s) {
    A().disposeCharts();
    const pieEl = document.getElementById('pie-chart');
    if (pieEl && window.echarts) {
      const pie = A().initChart(pieEl, {
        tooltip: { trigger: 'item', formatter: '{b}: {c}元 ({d}%)' },
        legend: { bottom: 0, type: 'scroll', textStyle: { color: '#5c534a' } },
        series: [{
          type: 'pie',
          radius: ['42%', '68%'],
          center: ['50%', '45%'],
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          data: s.allocation.map((a) => ({ name: a.name, value: a.value })),
          // 使用高区分度的分类色，避免橙、橘红、黄色相邻时难以辨认。
          color: [
            '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2',
            '#ea580c', '#4f46e5', '#65a30d', '#db2777', '#0f766e', '#92400e',
          ],
        }],
      });
      charts.push(pie);
    }
  }

  function renderHoldings(s) {
    const box = document.getElementById('holdings-list');
    if (!s.holdings.length) {
      box.innerHTML = '<div class="empty">还没有持仓，先申购一笔练练手吧。</div>';
      return;
    }
    box.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="color:var(--muted);text-align:left;">
        <th style="padding:6px;">基金</th><th>份额</th><th>成本</th><th>市值</th><th></th>
      </tr></thead>
      <tbody>${s.holdings.map((h) => `
        <tr class="hold-row" data-code="${h.code}" style="border-top:1px solid var(--border);cursor:pointer;" title="点击查看基金详情">
          <td style="padding:8px 6px;"><b>${A().escapeHtml(h.name)}</b><br><span class="muted">${h.code}</span></td>
          <td>${h.shares}</td>
          <td>${A().fmtMoney(h.avg_cost)}</td>
          <td>${A().fmtMoney(h.value)}</td>
          <td style="white-space:nowrap;text-align:right;">
            <button class="btn btn-ghost btn-sm quick-trade" data-quick-trade="buy" data-code="${A().escapeHtml(h.code)}">申购</button>
            <button class="btn btn-ghost btn-sm quick-trade" data-quick-trade="sell" data-code="${A().escapeHtml(h.code)}" style="margin-left:4px;color:var(--down);">赎回</button>
          </td>
        </tr>`).join('')}</tbody></table>`;
    box.querySelectorAll('.hold-row').forEach((el) => {
      el.addEventListener('click', () => {
        const code = el.dataset.code;
        const holding = s.holdings.find((h) => h.code === code);
        const fund = { ...(funds.find((f) => f.code === code) || {}), ...(holding || {}) };
        A().openFundDetail(fund, holding);
      });
    });
    box.querySelectorAll('[data-quick-trade]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        prepareQuickTrade(btn.dataset.quickTrade, btn.dataset.code);
      });
    });
  }

  function renderTransactions(s) {
    const box = document.getElementById('tx-list');
    if (!s.transactions.length) {
      box.innerHTML = '<div class="empty">暂无交易记录。</div>';
      return;
    }
    box.innerHTML = s.transactions.slice().reverse().map((t) => `
      <div style="padding:9px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <span>${t.type === 'buy' ? '🟢 申购' : '🔴 赎回'} ${A().escapeHtml(t.name)}</span>
          <span class="muted" style="white-space:nowrap;">${t.date} · ${A().fmtMoney(t.amount)}元</span>
        </div>
        ${Number.isFinite(Number(t.shares)) ? `<div class="muted" style="margin-top:5px;">成交：${A().fmtMoney(t.shares)} 份${Number.isFinite(Number(t.price)) ? ` × ${A().fmtMoney(t.price)} 元` : ''}</div>` : ''}
        ${t.executionMode ? `<div style="margin-top:5px;"><span class="badge gray">${t.executionMode === 'exchange_realtime' ? '实时成交' : '收盘净值确认'}</span></div>` : ''}
        ${t.investmentPlan?.enabled ? `<div style="margin-top:5px;"><span class="badge">${t.investmentPlan.autoExecution ? '自动执行 · ' : ''}定投 · ${A().escapeHtml(t.investmentPlan.frequency || '周期未设置')} · 每期${A().fmtMoney(t.investmentPlan.amount ?? t.amount)}元</span></div>` : ''}
        <div style="margin-top:5px;line-height:1.6;color:var(--text-2);">
          ${t.reason ? `💭 ${A().escapeHtml(t.reason)}` : '<span class="muted">未填写操作原因</span>'}
        </div>
        <div style="margin-top:7px;text-align:right;"><button class="btn btn-ghost btn-sm tx-review" data-review-transaction="${A().escapeHtml(String(t.id))}">AI复盘</button></div>
      </div>`).join('');
    box.querySelectorAll('[data-review-transaction]').forEach((button) => {
      button.addEventListener('click', () => reviewTransaction(button.dataset.reviewTransaction, button));
    });
  }

  async function reviewTransaction(transactionId, triggerButton = null) {
    const box = document.getElementById('review-box');
    if (!box) return;
    if (triggerButton) {
      triggerButton.disabled = true;
      triggerButton.dataset.reviewLabel = triggerButton.textContent;
      triggerButton.textContent = '复盘中…';
    }
    box.innerHTML = '<div class="empty">小拾正在调取这笔历史交易的成交份额、价格和当时理由进行复盘…</div>';
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try {
      const d = await A().api('/api/simulate/review', {
        method: 'POST',
        body: { transactionId },
      });
      showReview(d.review, d.research);
      document.getElementById('review-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      box.innerHTML = `<div class="empty">历史交易复盘失败：${A().escapeHtml(e.message)}</div>`;
    } finally {
      if (triggerButton) {
        triggerButton.disabled = false;
        triggerButton.textContent = triggerButton.dataset.reviewLabel || 'AI复盘';
      }
    }
  }

  function renderRecurringPlans(s) {
    const box = document.getElementById('recurring-list');
    if (!box) return;
    const plans = Array.isArray(s.recurringPlans) ? s.recurringPlans : [];
    if (!plans.length) {
      box.innerHTML = '<div class="empty">还没有定投计划。申购时勾选“标记为定投”即可创建。</div>';
      return;
    }
    box.innerHTML = plans.map((plan) => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <span><b>${A().escapeHtml(plan.name || plan.code || '基金')}</b> · ${A().escapeHtml(plan.frequency || '周期未设置')} · ${Number.isFinite(Number(plan.shares)) ? `每期${A().fmtMoney(plan.shares)}份（按当日价计算）` : `每期${A().fmtMoney(plan.amount)}元`}</span>
          <span class="${plan.active === false ? 'muted' : 'up'}">${plan.active === false ? '已暂停' : '进行中'}</span>
        </div>
        <div class="muted" style="margin-top:4px;">下次执行：${A().escapeHtml(plan.nextRunDate || '待计算')}${plan.lastResult ? ` · ${A().escapeHtml(plan.lastResult)}` : ''}</div>
      </div>`).join('');
  }

  function renderPendingOrders(s) {
    const box = document.getElementById('pending-orders-list');
    if (!box) return;
    const orders = Array.isArray(s.pendingOrders) ? s.pendingOrders.filter((order) => order.status === 'pending_close') : [];
    if (!orders.length) {
      box.innerHTML = '<div class="empty">暂无等待收盘确认的订单。</div>';
      return;
    }
    box.innerHTML = orders.slice().reverse().map((order) => `
      <div style="padding:10px 0;border-bottom:1px solid var(--border);font-size:13px;">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
          <span><b>${order.type === 'buy' ? '🟡 挂单申购' : '🟡 挂单赎回'}</b> ${A().escapeHtml(order.name || order.code || '基金')}</span>
          <span class="muted">${A().escapeHtml(order.placedDate || '日期未知')} · ${order.type === 'sell' ? `${A().fmtMoney(order.shares)}份` : `${A().fmtMoney(order.amount)}元`}</span>
        </div>
        <div class="muted" style="margin-top:4px;">${order.type === 'sell' ? '等待收盘价格快照确认赎回金额' : '等待收盘单位净值确认'}${order.estimatedPrice ? ` · 预估价格 ${A().fmtMoney(order.estimatedPrice)}` : ''}${order.investmentPlan?.enabled ? ` · 定投${A().escapeHtml(order.investmentPlan.frequency || '')}` : ''}</div>
      </div>`).join('');
  }

  function renderState(s) {
    state = s;
    renderStats(s);
    renderCharts(s);
    renderHoldings(s);
    renderTransactions(s);
    renderRecurringPlans(s);
    renderPendingOrders(s);
    const shortcutBox = document.getElementById('redemption-shortcuts');
    const selectedFund = funds.find((fund) => fund.code === selectedCode);
    if (shortcutBox && !shortcutBox.hidden && selectedFund) updateTradeInput(selectedFund, 'sell');
  }

  async function refresh() {
    const d = await A().api('/api/simulate/state');
    renderState(d);
  }

  function researchMetaHtml(research) {
    const verification = research && research.verification;
    if (!verification) return '';
    const labels = {
      official_confirmed: '官方来源确认',
      multi_source: '多来源交叉参考',
      unverified: '尚未确认',
      disputed: '存在来源冲突',
    };
    const sources = (verification.sources || []).slice(0, 5).map((source) =>
      `<a href="${A().escapeHtml(source.url || '#')}" target="_blank" rel="noopener">${A().escapeHtml(source.title || source.host || source.sourceId)}</a>`
    ).join(' · ');
    const fundPages = (research.data || []).filter((item) => item.kind === 'fund_history' && item.fundPageUrl).map((item) =>
      `<a href="${A().escapeHtml(item.fundPageUrl)}" target="_blank" rel="noopener">打开基金详情页核查 ↗</a>`
    ).join(' · ');
    return `<div class="research-meta"><span>📡 已联网检索</span><span class="research-status ${A().escapeHtml(verification.status || 'unverified')}">${A().escapeHtml(labels[verification.status] || '未确认')}</span>${sources ? `<span class="research-sources">来源：${sources}</span>` : '<span class="research-sources">未找到可核查来源</span>'}${fundPages ? `<span class="research-sources">${fundPages}</span>` : ''}</div>`;
  }

  function showReview(review, research) {
    latestReview = review || '';
    const box = document.getElementById('review-box');
    box.innerHTML = `
      <div id="review-text" class="sim-ai-markdown" style="font-size:15px;line-height:1.8;">${A().renderMarkdown(review)}</div>
      ${researchMetaHtml(research)}
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        <button class="chip" data-rq="这笔操作占我的初始资金和当前组合多大比例？">看仓位占比</button>
        <button class="chip" data-rq="我应该核对哪些指标，才能判断这笔操作是否有依据？">看核对指标</button>
        <button class="chip" data-rq="什么情况出现时，我需要重新评估这笔操作？">设复盘条件</button>
        <button class="chip" id="holding-analysis-btn">🧭 分析当前持仓</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <input class="input" id="review-input" placeholder="追问小拾，比如：这基金波动大吗？" />
        <button class="btn btn-ghost btn-sm" id="review-send">追问</button>
      </div>
      <div id="review-answers"></div>
    `;
    box.querySelectorAll('[data-rq]').forEach((b) => {
      b.addEventListener('click', () => followUpReview(b.dataset.rq));
    });
    const holdingAnalysisBtn = box.querySelector('#holding-analysis-btn');
    if (holdingAnalysisBtn) holdingAnalysisBtn.addEventListener('click', analyzeCurrentHoldings);
    const input = document.getElementById('review-input');
    const sendBtn = document.getElementById('review-send');
    sendBtn.addEventListener('click', () => {
      const q = input.value.trim();
      if (q) followUpReview(q);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = input.value.trim();
        if (q) followUpReview(q);
      }
    });
  }

  // #7：对复盘内容继续追问（带复盘上下文进入 AI 对话）
  async function followUpReview(question) {
    const answers = document.getElementById('review-answers');
    if (!answers) return;
    const item = document.createElement('div');
    item.style.cssText = 'margin-top:10px;padding:10px 12px;background:var(--bg-soft);border-radius:10px;font-size:13px;color:var(--text-2);';
    item.innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:4px;">你追问：${A().escapeHtml(question)}</div><div>🤖 思考中…</div>`;
    answers.appendChild(item);
    try {
      const d = await A().api('/api/chat', {
        method: 'POST',
        body: {
          message: `【刚才的交易复盘】\n${latestReview.slice(0, 400)}\n\n用户追问：${question}`,
          personaId: A().state.personaId,
        },
      });
      item.innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:4px;">你追问：${A().escapeHtml(question)}</div><div class="sim-ai-markdown" style="line-height:1.7;">🤖 ${A().renderMarkdown(d.reply)}</div>`;
    } catch (e) {
      item.innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:4px;">你追问：${A().escapeHtml(question)}</div><div>追问失败：${A().escapeHtml(e.message)}</div>`;
    }
  }

  async function analyzeCurrentHoldings() {
    const answers = document.getElementById('review-answers');
    const button = document.getElementById('holding-analysis-btn');
    if (!answers || button?.disabled) return;
    if (button) {
      button.disabled = true;
      button.textContent = '分析中…';
    }
    const item = document.createElement('div');
    item.style.cssText = 'margin-top:10px;padding:10px 12px;background:var(--bg-soft);border-radius:10px;font-size:13px;color:var(--text-2);';
    item.innerHTML = '<div class="muted" style="font-size:12px;margin-bottom:4px;">当前持仓分析</div><div>🤖 正在结合持仓、盈亏、动机、画像和市场行情分析…</div>';
    answers.appendChild(item);
    try {
      const d = await A().api('/api/simulate/holding-analysis', { method: 'POST', body: {} });
      const sourceLabel = d.source === 'ai' ? 'AI 分析' : '规则兜底分析';
      const marketDate = d.market?.date ? ` · 行情日期 ${A().escapeHtml(d.market.date)}` : '';
      item.innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:4px;">当前持仓分析 · ${sourceLabel}${marketDate}</div><div class="sim-ai-markdown" style="line-height:1.7;">${A().renderMarkdown(d.analysis || '暂无分析结果')}</div>`;
    } catch (e) {
      item.innerHTML = `<div class="muted" style="font-size:12px;margin-bottom:4px;">当前持仓分析</div><div>分析失败：${A().escapeHtml(e.message)}</div>`;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = '🧭 分析当前持仓';
      }
    }
  }

  function confirmTrade(type, fund, inputValue, holding) {
    const action = type === 'buy' ? '申购' : '赎回';
    const rule = tradingRule(fund);
    const actionLabel = rule.actionLabel(type);
    const useShares = rule.isRealtime || type === 'sell';
    const estimatedAmount = useShares ? inputValue * Number(fund.price || 0) : inputValue;
    const inputText = useShares ? `${A().fmtMoney(inputValue)} 份` : `${A().fmtMoney(inputValue)} 元`;
    const extra = type === 'sell' && holding
      ? rule.isRealtime
        ? `当前可赎回约 ${A().fmtMoney(Math.floor(Number(holding.shares) || 0))} 份，本次按 100 份整数倍赎回。`
        : `当前可赎回约 ${A().fmtMoney(Number(holding.shares) || 0)} 份，收盘后按价格快照计算实际赎回金额。`
      : '';
    return new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (settled) return;
        settled = true;
        A().closeModal();
        resolve(value);
      };
      A().showModal(`
        <div class="modal">
          <h3>确认${actionLabel}</h3>
          <div class="modal-body">
            <p>请确认你要${action}：</p>
            <p><strong>${A().escapeHtml(fund.name)}</strong>（${A().escapeHtml(fund.code)}）</p>
            <p style="font-size:22px;font-weight:800;color:var(--primary-dark);">${inputText}</p>
            <p class="muted" style="font-size:13px;">${extra || (rule.isRealtime ? `预计成交金额约 ${A().fmtMoney(estimatedAmount)} 元，将按实时参考价成交，并立即更新模拟仓余额、持仓和交易记录。` : type === 'buy' ? '本次不会按现价成交；申购金额会先冻结，收盘后按单位净值确认份额。' : '本次不会按现价成交；赎回份额会先挂单，收盘后按价格快照确认赎回金额。')}</p>
            <div class="field" style="margin-top:14px;text-align:left;">
              <label for="trade-reason">操作原因（可选，建议填写）</label>
              <textarea class="textarea" id="trade-reason" rows="3" maxlength="500" placeholder="记录当时的思考、策略或情绪，例如：按计划补仓，或因为短期下跌感到焦虑…"></textarea>
              <div class="muted" style="font-size:12px;margin-top:5px;">留下这句话，之后复盘时能更准确地看见自己当时的决策背景。</div>
            </div>
            ${type === 'buy' ? `
              <div class="field" style="margin-top:14px;text-align:left;">
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" id="trade-recurring" />
                  <span>将本次申购标记为定投</span>
                </label>
                <div id="recurring-options" hidden style="margin-top:9px;">
                  <select class="select" id="trade-frequency">
                    ${RECURRING_FREQUENCIES.map((frequency) => `<option value="${frequency}"${frequency === '每月' ? ' selected' : ''}>${frequency}</option>`).join('')}
                  </select>
                  <div class="muted" style="font-size:12px;margin-top:5px;">${rule.isRealtime ? '当前份额将作为每期定投份额，按执行日实时价格计算所需现金。' : '当前金额将作为单期定投金额。'}到期后模拟仓会自动申购；余额不足时本期顺延。</div>
                </div>
              </div>` : ''}
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" id="trade-cancel">返回修改</button>
            <button class="btn btn-primary" id="trade-confirm">确认${actionLabel}</button>
          </div>
        </div>`);
      const root = document.getElementById('modal-root');
      if (!root) return settle(false);
      root.querySelector('#trade-cancel').addEventListener('click', () => settle(false));
      const recurringToggle = root.querySelector('#trade-recurring');
      const recurringOptions = root.querySelector('#recurring-options');
      if (recurringToggle && recurringOptions) {
        recurringToggle.addEventListener('change', () => { recurringOptions.hidden = !recurringToggle.checked; });
      }
      root.querySelector('#trade-confirm').addEventListener('click', () => settle({
        confirmed: true,
        reason: (root.querySelector('#trade-reason')?.value || '').trim(),
        isRecurring: Boolean(root.querySelector('#trade-recurring')?.checked),
        recurringFrequency: root.querySelector('#trade-frequency')?.value || '',
      }));
      const backdrop = root.querySelector('.modal-backdrop');
      if (backdrop) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) settle(false); });
    });
  }

  async function trade(type) {
    const code = selectedCode;
    const inputValue = Number(document.getElementById('trade-amount').value);
    if (!code) { A().toast('请先选择一只基金'); return; }
    const fund = funds.find((f) => f.code === code);
    const holding = state && state.holdings ? state.holdings.find((h) => h.code === code) : null;
    if (!fund) { A().toast('基金信息不存在'); return; }
    const rule = tradingRule(fund);
    const useShares = rule.isRealtime || type === 'sell';
    updateTradeInput(fund, type);
    if (!inputValue || inputValue <= 0) { A().toast(useShares ? '请输入有效交易份额' : '请输入有效金额'); return; }
    if (type === 'sell' && !holding) { A().toast('当前模拟仓没有这只基金'); return; }
    if (rule.isRealtime && (!Number.isInteger(inputValue) || inputValue < 100 || inputValue % 100 !== 0)) {
      A().toast('ETF 交易份额必须是 100 的正整数倍');
      return;
    }
    const confirmation = await confirmTrade(type, fund, inputValue, holding);
    if (!confirmation || !confirmation.confirmed) return;
    try {
      const tradeBody = useShares ? { shares: inputValue } : { amount: inputValue };
      const d = await A().api(`/api/simulate/${type}`, {
        method: 'POST',
        body: {
          code,
          ...tradeBody,
          reason: confirmation.reason,
          isRecurring: type === 'buy' && confirmation.isRecurring === true,
          recurringFrequency: confirmation.recurringFrequency || '',
          personaId: A().state.personaId,
        },
      });
      if (d.pending) {
        const action = type === 'buy' ? '申购' : '赎回';
        showOrderNotice(d.message || `已挂单${action}，收盘后按净值确认。`);
        A().toast(`已挂单${action}，等待收盘确认`);
      } else {
        showReview(d.review, d.research);
        A().toast(type === 'buy' ? '申购成功' : '赎回成功');
      }
      document.getElementById('trade-amount').value = '';
      await refresh();
    } catch (e) {
      A().toast('操作失败：' + e.message);
    }
  }

  function showOrderNotice(message) {
    const box = document.getElementById('review-box');
    if (!box) return;
    latestReview = '';
    box.innerHTML = `<div style="padding:12px 14px;background:#fff7ed;border-radius:10px;color:#9a3412;line-height:1.7;font-size:14px;">🕒 ${A().escapeHtml(message)}</div>`;
  }

  function prepareQuickTrade(type, code) {
    const fund = funds.find((f) => f.code === code);
    if (!fund) return A().toast('基金信息不存在');
    const holding = state && state.holdings ? state.holdings.find((h) => h.code === code) : null;
    if (type === 'sell' && !holding) return A().toast('当前模拟仓没有这只基金');
    selectedCode = code;
    selectFund(code);
    updateTradeInput(fund, type);
    const amountInput = document.getElementById('trade-amount');
    const action = type === 'buy' ? '申购' : '赎回';
    const unit = tradingRule(fund).isRealtime || type === 'sell' ? '份额' : '金额';
    amountInput.placeholder = type === 'buy' ? `请输入申购${unit}` : `请输入赎回${unit}`;
    amountInput.focus();
    amountInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    A().toast(`已选中${fund.name}，请输入${unit}后点击“${action}”并确认`);
  }

  function openCapitalSettings() {
    const current = Number(state?.initialCapital || 100000);
    const hasHistory = Boolean(state?.holdings?.length || state?.transactions?.length);
    A().showModal(`
      <div class="modal">
        <h3>设置初始资金</h3>
        <div class="modal-body">
          <p class="muted">设置后，模拟收益率会以这笔金额作为计算基准。</p>
          <div class="field" style="margin-top:14px;text-align:left;">
            <label for="initial-capital-input">初始虚拟资金（元）</label>
            <input class="input" id="initial-capital-input" type="number" min="1000" max="100000000" step="100" value="${current}" />
            <div class="muted" style="font-size:12px;margin-top:5px;">可设置范围：1,000 至 100,000,000 元。</div>
          </div>
          ${hasHistory ? '<div style="margin-top:12px;padding:10px 12px;background:#fff7ed;color:#9a3412;border-radius:10px;font-size:13px;line-height:1.6;">当前模拟仓已有持仓或交易记录。保存新金额会清空当前模拟仓和交易记录，再用新金额重新开始。</div>' : ''}
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" id="capital-cancel">取消</button>
          <button class="btn btn-primary" id="capital-confirm">${hasHistory ? '确认重置并保存' : '保存设置'}</button>
        </div>
      </div>`);
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.querySelector('#capital-cancel').addEventListener('click', () => A().closeModal());
    root.querySelector('#capital-confirm').addEventListener('click', async () => {
      const input = root.querySelector('#initial-capital-input');
      const amount = Number(input.value);
      if (!Number.isFinite(amount) || amount < 1000 || amount > 100000000) {
        A().toast('请输入1000至100000000元之间的金额');
        return;
      }
      const button = root.querySelector('#capital-confirm');
      button.disabled = true;
      try {
        await A().api('/api/simulate/settings', { method: 'POST', body: { initialCapital: amount, reset: hasHistory } });
        A().closeModal();
        selectedCode = null;
        document.getElementById('fund-detail').style.display = 'none';
        A().toast(hasHistory ? '模拟仓已重置，初始资金设置成功' : '初始资金设置成功');
        await refresh();
      } catch (e) {
        button.disabled = false;
        A().toast('设置失败：' + e.message);
      }
    });
  }

  function bindEvents() {
    const search = document.getElementById('fund-search');
    search.addEventListener('input', () => renderFundResults(search.value));
    ['fund-type-filter', 'fund-risk-filter', 'fund-sort'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => renderFundResults(search.value));
    });
    document.getElementById('buy-btn').addEventListener('click', () => {
      const fund = funds.find((item) => item.code === selectedCode);
      if (fund) updateTradeInput(fund, 'buy');
      trade('buy');
    });
    document.getElementById('sell-btn').addEventListener('click', () => {
      const fund = funds.find((item) => item.code === selectedCode);
      if (fund) updateTradeInput(fund, 'sell');
      trade('sell');
    });
    document.getElementById('capital-settings').addEventListener('click', openCapitalSettings);
  }

  async function render(root) {
    root.innerHTML = layoutHtml();
    bindEvents();
    try {
      await loadFunds();
      renderFundResults('');
      document.getElementById('sim-loading').style.display = 'none';
      document.getElementById('sim-content').style.display = 'block';
      // 先让图表容器获得实际宽高，再初始化 ECharts；否则首次进入页面时
      // 容器仍是 display:none，饼图会以 0 宽度初始化，直到交易刷新才出现。
      await refresh();
    } catch (e) {
      document.getElementById('sim-loading').innerHTML = `<div class="card empty">加载失败：${A().escapeHtml(e.message)}</div>`;
    }
  }

  window.Pages = window.Pages || {};
  window.Pages.simulate = { render };
})();
