(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtMoney(n) {
    return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }

  function fmtChange(n) {
    const v = Number(n);
    return (v > 0 ? '+' : '') + v.toFixed(2) + '%';
  }

  function updownClass(n) {
    const v = Number(n);
    if (v > 0) return 'up';
    if (v < 0) return 'down';
    return '';
  }

  function renderMarkdown(text) {
    const src = escapeHtml(text || '').replace(/\r/g, '');
    const lines = src.split('\n');
    const out = [];
    let listType = null;
    let codeLines = null;
    let tableRows = [];
    const closeList = () => {
      if (listType) {
        out.push(`</${listType}>`);
        listType = null;
      }
    };
    const flushTable = () => {
      if (!tableRows.length) return;
      closeList();
      const cells = (row) => row.map((cell) => `<td>${inline(cell)}</td>`).join('');
      const head = tableRows[0];
      out.push(`<table class="md-table"><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>`);
      tableRows.slice(1).forEach((row) => out.push(`<tr>${cells(row)}</tr>`));
      out.push('</tbody></table>');
      tableRows = [];
    };
    const inline = (s) => String(s || '')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/~~(.+?)~~/g, '<del>$1</del>')
      .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>');
    for (const raw of lines) {
      const line = raw.trim();
      if (/^```/.test(line)) {
        flushTable();
        closeList();
        if (codeLines) {
          out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
          codeLines = null;
        } else {
          codeLines = [];
        }
        continue;
      }
      if (codeLines) {
        codeLines.push(raw);
        continue;
      }
      if (!line) {
        flushTable();
        closeList();
        continue;
      }
      if (/^\|?.+\|.+\|?$/.test(line)) {
        const row = line.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
        if (row.length > 1 && row.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
        tableRows.push(row);
        continue;
      }
      flushTable();
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      const quote = line.match(/^>\s?(.*)$/);
      const ul = line.match(/^[-*+]\s+(.*)$/);
      const ol = line.match(/^(\d+)[.、]\s*(.*)$/);
      if (/^(---+|\*\s*\*\s*\*|___+)$/.test(line)) {
        closeList();
        out.push('<hr>');
      } else if (quote) {
        closeList();
        out.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      } else if (h) {
        closeList();
        const level = Math.min(h[1].length + 1, 5);
        out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      } else if (ul) {
        if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
        out.push(`<li>${inline(ul[1])}</li>`);
      } else if (ol) {
        if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
        out.push(`<li>${inline(ol[2])}</li>`);
      } else {
        closeList();
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    if (codeLines) out.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
    flushTable();
    closeList();
    return out.join('');
  }

  const state = {
    token: localStorage.getItem('shicai_token') || '',
    user: (() => { try { return JSON.parse(localStorage.getItem('shicai_user') || 'null'); } catch { return null; } })(),
    personaId: 'custom',
  };

  function setAuth(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('shicai_token', token);
    localStorage.setItem('shicai_user', JSON.stringify(user));
  }

  function clearAuth() {
    state.token = '';
    state.user = null;
    localStorage.removeItem('shicai_token');
    localStorage.removeItem('shicai_user');
  }

  function setPersona() {
    state.personaId = 'custom';
    localStorage.setItem('shicai_persona', 'custom');
  }

  async function api(path, opts) {
    const options = Object.assign({ method: 'GET', headers: {} }, opts || {});
    const timeoutMs = Number(options.timeoutMs) || 0;
    delete options.timeoutMs;
    let timeoutId = null;
    if (timeoutMs && !options.signal && typeof AbortController !== 'undefined') {
      const controller = new AbortController();
      options.signal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    if (state.token) options.headers['Authorization'] = 'Bearer ' + state.token;
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
      options.headers['Content-Type'] = 'application/json';
    }
    let res;
    try {
      res = await fetch(path, options);
    } catch (err) {
      if (err && err.name === 'AbortError') throw new Error('请求超时，请稍后重试');
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
    if (res.status === 401) {
      clearAuth();
      if (location.hash !== '#/login') location.hash = '#/login';
      throw new Error('登录已过期，请重新登录');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  }

  function toast(msg) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s';
      setTimeout(() => el.remove(), 320);
    }, 2200);
  }

  function showModal(html) {
    closeModal();
    const root = document.getElementById('modal-root');
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = html;
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });
    root.appendChild(backdrop);
  }

  function closeModal() {
    const root = document.getElementById('modal-root');
    if (root) disposeCharts(root);
    if (root) root.innerHTML = '';
  }

  function showBoundaryModal() {
    const html = `
      <div class="modal">
        <div class="logo" style="margin-bottom:14px;">
          <img class="logo-image logo-image--modal" src="/assets/shicai-logo.jpg" alt="拾财" />
        </div>
        <h3>先和你说清楚一件事</h3>
        <div class="modal-body">
          拾财的AI是你的学习伙伴，不是投资顾问。我不会推荐具体基金，不会预测涨跌，不会承诺收益。
          我能做的是：帮你理解概念、分析风险、梳理逻辑、在波动中给你情绪支持。
          <strong>投资决策永远由你自己做出。</strong>
        </div>
        <div class="modal-foot">
          <label class="left"><input type="checkbox" id="no-prompt-cb" /> 不再提示</label>
          <button class="btn btn-primary" id="boundary-ok">我知道了</button>
        </div>
      </div>
    `;
    showModal(html);
    document.getElementById('boundary-ok').addEventListener('click', () => {
      if (document.getElementById('no-prompt-cb').checked) localStorage.setItem('shicai_no_prompt', '1');
      closeModal();
    });
  }

  function initChart(el, option) {
    if (!window.echarts || !el) return null;
    const chart = window.echarts.init(el);
    chart.setOption(option);
    return chart;
  }

  function disposeCharts(scope) {
    if (!window.echarts) return;
    const root = scope || document.getElementById('app');
    root.querySelectorAll('[data-chart]').forEach((el) => {
      const chart = window.echarts.getInstanceByDom(el);
      if (chart) chart.dispose();
    });
  }

  const routes = {
    '/': 'home',
    '/chat': 'chat',
    '/simulate': 'simulate',
    '/community': 'community',
    '/insights': 'insights',
    '/profile': 'profile',
    '/login': 'login',
  };

  function currentRoute() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const clean = hash.split('?')[0];
    return routes[clean] ? clean : '/';
  }

  function setActiveTab(route) {
    document.querySelectorAll('#nav-tabs a').forEach((a) => a.classList.toggle('active', a.dataset.route === route));
  }

  function renderRoute() {
    const route = currentRoute();
    const app = document.getElementById('app');

    if (route === '/login') {
      document.body.classList.add('auth-hidden');
      disposeCharts();
      app.innerHTML = '';
      const page = window.Pages && window.Pages.login;
      if (page) page.render(app);
      return;
    }

    if (!state.token) {
      location.hash = '#/login';
      return;
    }

    document.body.classList.remove('auth-hidden');
    setActiveTab(route);
    disposeCharts();
    app.innerHTML = '';
    const pageName = routes[route] || 'home';
    const page = window.Pages && window.Pages[pageName];
    if (page && typeof page.render === 'function') page.render(app);
    else app.innerHTML = '<div class="container empty">页面加载中…</div>';

    if (!sessionStorage.getItem('shicai_boundary_shown') && localStorage.getItem('shicai_no_prompt') !== '1') {
      sessionStorage.setItem('shicai_boundary_shown', '1');
      showBoundaryModal();
    }
  }

  window.addEventListener('hashchange', renderRoute);

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('avatar-btn').addEventListener('click', () => {
      location.hash = '#/profile';
    });
    document.getElementById('logout-btn').addEventListener('click', async () => {
      try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
      clearAuth();
      location.hash = '#/login';
    });
    renderRoute();
  });

  // —— 术语悬浮解释系统 ——
  // 将 scope 内文本节点中命中的术语包裹为 .term（悬浮显示解释，点击跳转搭子讲解）
  function highlightTerms(root) {
    if (!root || !document || !window.TERM_DICT) return;
    const terms = Object.keys(window.TERM_DICT).filter((t) => t && t.length >= 2).sort((a, b) => b.length - a.length);
    if (!terms.length) return;
    let walker;
    try {
      walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    } catch {
      return;
    }
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      if (!text || !terms.some((t) => text.includes(t))) continue;
      let rest = text;
      let out = '';
      while (rest) {
        let hit = null;
        let hitIdx = Infinity;
        for (const t of terms) {
          const idx = rest.indexOf(t);
          if (idx >= 0 && idx < hitIdx) {
            hit = t;
            hitIdx = idx;
          }
        }
        if (!hit) {
          out += escapeHtml(rest);
          break;
        }
        out += escapeHtml(rest.slice(0, hitIdx));
        out += `<span class="term" data-term="${hit.replace(/"/g, '&quot;')}">${hit}</span>`;
        rest = rest.slice(hitIdx + hit.length);
      }
      if (out !== text) {
        const span = document.createElement('span');
        span.innerHTML = out;
        node.parentNode.replaceChild(span, node);
      }
    }
  }

  let termTip = null;
  function hideTermTip() {
    if (termTip) {
      termTip.remove();
      termTip = null;
    }
  }

  function showTermTip(el, term, text) {
    hideTermTip();
    termTip = document.createElement('div');
    termTip.className = 'term-tooltip';
    termTip.innerHTML = `<div class="tt-term">${escapeHtml(term)}</div><div class="tt-body">${escapeHtml(text)}</div><div class="tt-hint">点击跳转 AI 搭子深入讲解 ↗</div>`;
    document.body.appendChild(termTip);
    const rect = el.getBoundingClientRect();
    const tw = termTip.offsetWidth;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    let top = rect.top - termTip.offsetHeight - 10;
    if (top < 8) top = rect.bottom + 10;
    termTip.style.left = left + 'px';
    termTip.style.top = top + 'px';
  }

  // 点击术语 → 跳转 AI 搭子页并自动发起讲解
  function askTerm(term) {
    if (!term) return;
    // 非聊天页面尚未挂载聊天 DOM，先通过路由带上术语参数，
    // 聊天页渲染完成后再自动发起讲解。
    if (currentRoute() !== '/chat') {
      location.hash = '#/chat?term=' + encodeURIComponent(term);
      return;
    }
    const page = window.Pages && window.Pages.chat;
    if (page && typeof page.askTerm === 'function') {
      page.askTerm(term);
      return;
    }
    location.hash = '#/chat?term=' + encodeURIComponent(term);
  }

  // 全站选中文字 → AI 搭子追问。
  // 选中文字不直接拼进 URL，避免特殊字符和过长文本破坏路由；通过 sessionStorage
  // 传递给聊天页，页面刷新后也不会长期保存用户选中的内容。
  let selectionFollowupBtn = null;
  function hideSelectionFollowup() {
    if (selectionFollowupBtn) {
      selectionFollowupBtn.remove();
      selectionFollowupBtn = null;
    }
  }

  function askSelectedText(text) {
    const selected = String(text || '').trim();
    if (!selected) return;
    const clipped = selected.length > 120 ? selected.slice(0, 120) + '…' : selected;
    if (currentRoute() === '/chat') {
      const page = window.Pages && window.Pages.chat;
      if (page && typeof page.askSelectedText === 'function') {
        page.askSelectedText(clipped);
        return;
      }
    }
    try {
      sessionStorage.setItem('shicai_selection_followup', JSON.stringify({ text: clipped, from: currentRoute() }));
    } catch {}
    location.hash = '#/chat?followup=1';
  }

  function bindGlobalSelectionFollowup() {
    if (bindGlobalSelectionFollowup.bound) return;
    bindGlobalSelectionFollowup.bound = true;
    document.addEventListener('mousedown', (e) => {
      if (selectionFollowupBtn && !selectionFollowupBtn.contains(e.target)) hideSelectionFollowup();
    }, true);
    document.addEventListener('mouseup', () => {
      setTimeout(() => {
        if (!state.token) {
          hideSelectionFollowup();
          return;
        }
        const selection = window.getSelection();
        const text = selection ? selection.toString().trim() : '';
        if (!text || text.length < 2 || !selection || !selection.rangeCount) {
          hideSelectionFollowup();
          return;
        }
        const range = selection.getRangeAt(0);
        const common = range.commonAncestorContainer;
        const element = common.nodeType === Node.ELEMENT_NODE ? common : common.parentElement;
        if (!element || !document.body.contains(element)) {
          hideSelectionFollowup();
          return;
        }
        const target = element.closest ? element.closest('input, textarea, select, [contenteditable="true"]') : null;
        if (target) {
          hideSelectionFollowup();
          return;
        }
        const rect = range.getBoundingClientRect();
        if (!rect || (!rect.width && !rect.height)) {
          hideSelectionFollowup();
          return;
        }
        hideSelectionFollowup();
        selectionFollowupBtn = document.createElement('button');
        selectionFollowupBtn.className = 'btn btn-primary btn-sm selection-followup-btn';
        selectionFollowupBtn.textContent = '❓ 追问这段';
        selectionFollowupBtn.style.cssText = `position:fixed;z-index:999;left:${Math.min(Math.max(rect.left, 8), Math.max(8, window.innerWidth - 120))}px;top:${Math.max(rect.top - 38, 8)}px;box-shadow:0 4px 16px rgba(0,0,0,.18);`;
        selectionFollowupBtn.addEventListener('mousedown', (e) => e.preventDefault());
        selectionFollowupBtn.addEventListener('click', () => {
          askSelectedText(text);
          hideSelectionFollowup();
          selection.removeAllRanges();
        });
        document.body.appendChild(selectionFollowupBtn);
      }, 10);
    });
    window.addEventListener('scroll', hideSelectionFollowup, true);
  }

  function renderFundNavChart(detail, periodKey = '1y') {
    const chartEl = document.getElementById('fund-nav-chart');
    const period = detail.periods[periodKey] || detail.periods['1y'];
    if (!chartEl || !window.echarts || !period) return;
    const old = window.echarts.getInstanceByDom(chartEl);
    if (old) old.dispose();
    const chart = window.echarts.init(chartEl);
    chart.setOption({
      tooltip: { trigger: 'axis', valueFormatter: (v) => Number(v).toFixed(4) },
      grid: { left: 48, right: 18, top: 20, bottom: 36 },
      xAxis: { type: 'category', data: period.labels, boundaryGap: false, axisLabel: { color: '#9a8f82', fontSize: 10 } },
      yAxis: { type: 'value', scale: true, axisLabel: { color: '#9a8f82', fontSize: 10 }, splitLine: { lineStyle: { color: '#f3ede4' } } },
      series: [{ type: 'line', data: period.values, smooth: true, symbol: 'none', lineStyle: { width: 2.5, color: '#f97316' }, areaStyle: { color: 'rgba(249,115,22,.12)' } }],
    });
  }

  function renderFundDetailModal(fund, detail, holding) {
    const number = (value, digits = 4) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '暂无';
    const percent = (value) => Number.isFinite(Number(value)) ? fmtChange(Number(value)) : '暂无';
    const fundPageUrl = detail.fundPageUrl || `https://fund.eastmoney.com/${encodeURIComponent(String(fund.code || ''))}.html`;
    const h = holding && Number(holding.value) > 0 ? `
      <div class="card" style="padding:12px 14px;margin:12px 0;background:var(--primary-soft-2);">
        <div style="font-weight:700;margin-bottom:6px;">当前模拟仓持有</div>
        <div style="display:flex;gap:18px;flex-wrap:wrap;font-size:13px;color:var(--text-2);">
          <span>份额：<b>${escapeHtml(String(holding.shares || 0))}</b></span>
          <span>成本：<b>${fmtMoney(holding.avg_cost || 0)}</b></span>
          <span>市值：<b>${fmtMoney(holding.value || 0)}</b></span>
        </div>
      </div>` : '';
    showModal(`
      <div class="modal modal-wide">
        <div class="fund-detail-head">
          <div>
            <h3 style="margin-bottom:5px;">${escapeHtml(fund.name || '')}</h3>
            <div class="muted" style="font-size:13px;">${escapeHtml(fund.code || '')} · ${escapeHtml(fund.type || '')} · 风险${escapeHtml(fund.risk || '未知')}</div>
          </div>
          <button class="btn btn-ghost btn-sm" id="fund-detail-close">关闭</button>
        </div>
        ${h}
        <div class="fund-detail-metrics">
          <div class="fund-detail-metric"><b>${number(detail.currentValue)}</b><span>${escapeHtml(detail.valueLabel || '单位净值')}</span></div>
          <div class="fund-detail-metric"><b>${percent(detail.periods?.['1y']?.change)}</b><span>近1年收益</span></div>
          <div class="fund-detail-metric"><b>${percent(detail.maxDrawdown)}</b><span>近1年最大回撤</span></div>
          <div class="fund-detail-metric"><b>${detail.sharpe == null ? '暂无' : number(detail.sharpe, 2)}</b><span>夏普率</span></div>
        </div>
        <div style="font-weight:700;">净值曲线</div>
        <div class="fund-periods">${Object.entries(detail.periods || {}).map(([key, p], i) => `<button class="chip fund-period-btn${i === 2 ? ' active' : ''}" data-period="${key}">${escapeHtml(p.label || key)} ${percent(p.change)}</button>`).join('')}</div>
        <div id="fund-nav-chart" data-chart style="height:300px;"></div>
        <div class="muted" style="font-size:12px;margin-top:8px;">数据源：${escapeHtml(detail.source || 'AKShare')} · 截止 ${escapeHtml(detail.dataAsOf || '未知')} · ${escapeHtml(detail.sourceDetail || '')}<br><a href="${escapeHtml(fundPageUrl)}" target="_blank" rel="noopener">打开基金详情页核查 ↗</a></div>
        <div class="muted" style="font-size:12px;margin-top:4px;">${escapeHtml(detail.note || '夏普率按日收益年化计算，仅用于风险收益比较，不构成投资建议。')}</div>
      </div>`);
    const root = document.getElementById('modal-root');
    const close = root && root.querySelector('#fund-detail-close');
    if (close) close.addEventListener('click', closeModal);
    if (root) root.querySelectorAll('.fund-period-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.fund-period-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderFundNavChart(detail, btn.dataset.period);
      });
    });
    const firstPeriod = detail.periods && detail.periods['1y'] ? '1y' : Object.keys(detail.periods || {})[0];
    renderFundNavChart(detail, firstPeriod);
  }

  async function openFundDetail(fund, holding) {
    if (!fund || !fund.code) return;
    const code = String(fund.code);
    showModal(`
      <div class="modal">
        <h3>正在读取基金数据</h3>
        <div class="modal-body">正在通过 AkShare 获取 ${escapeHtml(code)} 的真实历史数据，请稍候。</div>
      </div>`);
    try {
      const data = await api(`/api/funds/${encodeURIComponent(code)}/detail`);
      const resolvedFund = { ...fund, ...(data.fund || {}) };
      renderFundDetailModal(resolvedFund, data, holding);
    } catch (err) {
      const root = document.getElementById('modal-root');
      if (root) root.innerHTML = `<div class="modal-backdrop"><div class="modal"><h3>基金数据暂不可用</h3><div class="modal-body">${escapeHtml(err.message || 'AkShare 未返回数据')}</div><div class="modal-foot"><span></span><button class="btn btn-primary" id="fund-detail-close">关闭</button></div></div></div>`;
      const close = root && root.querySelector('#fund-detail-close');
      if (close) close.addEventListener('click', closeModal);
    }
  }

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest ? e.target.closest('.term') : null;
    if (!el) return;
    const term = el.dataset && el.dataset.term;
    const text = term && window.TERM_DICT ? window.TERM_DICT[term] : null;
    if (text) showTermTip(el, term, text);
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest ? e.target.closest('.term') : null;
    if (el) hideTermTip();
  });

  document.addEventListener('click', (e) => {
    const el = e.target.closest ? e.target.closest('.term') : null;
    if (el && el.dataset && el.dataset.term) {
      hideTermTip();
      askTerm(el.dataset.term);
    }
  });

  // —— 全局错误捕获（诊断辅助：把未捕获错误显示出来，便于定位） ——
  window.addEventListener('error', (e) => {
    try {
      const msg = (e && e.message) || 'unknown error';
      const stack = (e && e.error && e.error.stack) ? String(e.error.stack).split('\n').slice(0, 3).join(' | ') : '';
      if (window.App && typeof window.App.toast === 'function' && msg !== 'ResizeObserver loop limit exceeded') {
        window.App.toast('页面错误：' + msg + (stack ? '  [' + stack + ']' : ''));
      }
    } catch {}
  });

  window.App = {
    api,
    state,
    setAuth,
    clearAuth,
    setPersona,
    escapeHtml,
    renderMarkdown,
    fmtMoney,
    fmtChange,
    updownClass,
    toast,
    showModal,
    closeModal,
    openFundDetail,
    showBoundaryModal,
    initChart,
    disposeCharts,
    highlightTerms,
    askTerm,
    askSelectedText,
    currentRoute,
    navigate: (r) => { location.hash = r; },
  };
  bindGlobalSelectionFollowup();
})();
