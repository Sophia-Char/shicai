(function () {
  'use strict';

  const A = () => window.App;

  const TERM_HINTS = {
    降准: '降低存款准备金率，让银行有更多钱可以放贷，相当于给市场“松了松腰带”。',
    流动性: '市场上“能随时拿来用的钱”有多少。流动性宽松，钱就多、借起来便宜。',
    PMI: '采购经理人指数，经济的“体温计”。超过50代表扩张，低于50代表收缩。',
    经济周期: '经济像四季一样有冷有热，会在扩张与收缩之间循环往复。',
    渗透率: '一个新产品在目标人群中“被接受的占比”。渗透率越高，说明普及越广。',
    行业基金: '只投某一个行业的基金，涨跌都跟着这个行业走，弹性大、波动也大。',
    存款利率: '把钱存银行能拿到的利息。利率越低，存钱的吸引力越小。',
    通胀: '钱越来越“不经花”，同样的钱能买到的东西变少了。',
    降息: '借钱的成本变低了，对企业融资更友好，对存款的人利息更少。',
    风险资产: '价格波动较大的资产，比如股票、股票型基金，收益和风险都相对更高。',
  };
  const SIMPLE_TERMS = new Set(['基金', '波动', '降息', '通胀']);

  let list = [];
  let personalizedEnabled = true;
  let personalizationMode = '';
  let lastUpdate = '';
  let personalizationRequestToken = 0;

  function personalizationStateLabel() {
    if (!personalizedEnabled) return '当前：查看全部新闻';
    if (personalizationMode === 'initial' || personalizationMode === 'loading') return '正在加载 AI 个性化筛选…';
    return personalizationMode === 'ai' ? '当前：AI 个性化筛选' : '当前：个性化筛选（规则兜底）';
  }

  function personalizationActionLabel() {
    return personalizedEnabled ? '查看全部新闻' : '开启 AI 个性化筛选';
  }

  function updatePersonalizationControls() {
    const toggle = document.getElementById('news-personalized-toggle');
    if (toggle) {
      toggle.textContent = personalizationActionLabel();
      toggle.disabled = false;
    }
    const state = document.getElementById('news-personalized-state');
    if (state) state.textContent = personalizationStateLabel();
  }

  function termHtml(termsStr) {
    const terms = String(termsStr || '').split(/[,，]/).map((s) => s.trim()).filter((term) => term && !SIMPLE_TERMS.has(term));
    if (!terms.length) return '<span class="muted">无</span>';
    return terms.map((t) => {
      const hint = TERM_HINTS[t] || (window.TERM_DICT ? window.TERM_DICT[t] : '') || '';
      // .term 同时获得：悬浮解释 + 点击跳转 AI 搭子讲解
      return `<div style="margin-bottom:8px;"><span class="term badge" data-term="${A().escapeHtml(t)}">${A().escapeHtml(t)}</span>${hint ? `<span class="text-2" style="font-size:14px;">　${A().escapeHtml(hint)}</span>` : ''}</div>`;
    }).join('');
  }

  function analysisHtml(n) {
    if (!n.ai_summary) {
      return `
        <div class="news-block"><div class="v">${A().escapeHtml((n.content || '').slice(0, 300))}</div></div>
        <button class="btn btn-primary btn-sm" data-gen="${n.id}">✨ 生成 AI 解读</button>
        <div id="gen-${n.id}" style="margin-top:10px;"></div>
      `;
    }
    return `
      <div class="news-block"><div class="k">📰 发生了什么</div><div class="v">${A().escapeHtml(n.ai_summary || '')}</div></div>
      <div class="news-block"><div class="k">🔍 和你的关系</div><div class="v">${A().escapeHtml(n.ai_relevance || '')}</div></div>
      <div class="news-block"><div class="k">📖 涉及的术语</div><div class="v">${termHtml(n.ai_terms)}</div></div>
      <div class="news-block"><div class="k">💭 理性看待</div><div class="v">${A().escapeHtml(n.ai_rational_view || '')}</div></div>
    `;
  }

  function channelLabel(news) {
    if (news.channel) return news.channel;
    const url = String(news.url || '').toLowerCase();
    if (url.includes('cls.cn')) return '财联社电报';
    if (url.includes('chinanews.com.cn')) return '中国新闻网财经';
    if (url.includes('sohu.com')) return '搜狐财经';
    if (url.includes('infzm.com')) return '南方周末';
    return news.source || '公开渠道';
  }

  function sourceLabel(news) {
    const channel = channelLabel(news);
    return news.source && news.source !== channel ? `来源：${channel} · 发布方：${news.source}` : `来源：${channel}`;
  }

  function renderNews() {
    const box = document.getElementById('news-list');
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<div class="empty">暂无热点新闻。</div>';
      return;
    }
    box.innerHTML = list.map((n) => `
      <div class="news-item" data-id="${n.id}">
        <div class="news-head">
          <span id="chev-${n.id}" style="color:var(--muted);transition:transform .15s;">▶</span>
          <div class="news-title">
            ${n.url ? `<a href="${A().escapeHtml(n.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${A().escapeHtml(n.displayTitle || n.title)}</a>` : A().escapeHtml(n.displayTitle || n.title)}
            ${n.personalized ? `<div style="margin-top:4px;"><span class="badge gray">🎯 ${A().escapeHtml(n.personalizationReason || '画像相关')}</span></div>` : ''}
          </div>
           <div style="text-align:right;flex-shrink:0;">
              <div class="news-source">${A().escapeHtml(sourceLabel(n))}</div>
             <div class="news-source">${A().escapeHtml((n.published_at || '').slice(5, 16))}</div>
           </div>
        </div>
        <div class="news-body">${analysisHtml(n)}</div>
      </div>`).join('');

    box.querySelectorAll('.news-item').forEach((item) => {
      const head = item.querySelector('.news-head');
      const chev = item.querySelector('span[id^="chev-"]');
      head.addEventListener('click', () => {
        const open = item.classList.toggle('open');
        chev.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)';
      });
    });

    box.querySelectorAll('[data-gen]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.gen);
        btn.disabled = true;
        btn.textContent = '生成中…';
        try {
          const d = await A().api('/api/news/generate', { method: 'POST', body: { id } });
          if (d.generated && d.news) {
            const n = list.find((x) => x.id === id);
            Object.assign(n, d.news);
            document.getElementById('gen-' + id).innerHTML = `
              <div class="news-block"><div class="k">📰 发生了什么</div><div class="v">${A().escapeHtml(d.news.ai_summary || '')}</div></div>
              <div class="news-block"><div class="k">🔍 和你的关系</div><div class="v">${A().escapeHtml(d.news.ai_relevance || '')}</div></div>
              <div class="news-block"><div class="k">📖 涉及的术语</div><div class="v">${termHtml(d.news.ai_terms)}</div></div>
              <div class="news-block"><div class="k">💭 理性看待</div><div class="v">${A().escapeHtml(d.news.ai_rational_view || '')}</div></div>`;
            A().highlightTerms(document.getElementById('gen-' + id));
            btn.style.display = 'none';
          } else {
            A().toast('未配置 DeepSeek，暂无法生成 AI 解读');
            btn.textContent = '✨ 生成 AI 解读';
            btn.disabled = false;
          }
        } catch (e) {
          A().toast('生成失败：' + e.message);
          btn.textContent = '✨ 生成 AI 解读';
          btn.disabled = false;
        }
      });
    });
    // 只在新闻正文/解读区域高亮术语；标题保持原样，避免与新闻来源跳转链接发生嵌套冲突。
    box.querySelectorAll('.news-body').forEach((body) => A().highlightTerms(body));
  }

  function applyNewsResponse(d) {
    list = d.news || [];
    personalizedEnabled = d.personalizedNewsEnabled !== false;
    personalizationMode = d.personalizationMode || '';
    lastUpdate = d.lastUpdate || '';
  }

  async function loadNews(mode = '') {
    const d = await A().api(mode ? `/api/news?mode=${encodeURIComponent(mode)}` : '/api/news');
    applyNewsResponse(d);
    return d;
  }

  async function loadPersonalizedNews() {
    if (!personalizedEnabled) return;
    const requestToken = ++personalizationRequestToken;
    personalizationMode = 'loading';
    updatePersonalizationControls();
    try {
      const d = await A().api('/api/news');
      // 用户可能在 AI 请求期间切换了“查看全部新闻”，忽略过期结果。
      if (requestToken !== personalizationRequestToken) return;
      applyNewsResponse(d);
      renderNews();
      updatePersonalizationControls();
    } catch {}
  }

  async function render(root) {
    root.innerHTML = `
      <div class="container">
        <div class="page-head">
          <h1 class="page-title">🔥 热点解读</h1>
          <p class="page-sub" id="news-page-sub">当日财经热点，来源财联社、中国新闻网、搜狐、南方周末等公开渠道。小拾帮你翻译成“和你有关系”的话。</p>
        </div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
            <div>
              <div style="font-weight:700;">热点筛选</div>
              <div class="muted" style="font-size:12px;margin-top:4px;">开启后由 AI 结合个人画像和最新新闻标题筛选。</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <span class="muted" id="news-personalized-state" style="font-size:12px;">${personalizationStateLabel()}</span>
              <button class="btn btn-primary btn-sm" id="news-personalized-toggle">${personalizationActionLabel()}</button>
            </div>
          </div>
          <div id="news-list"><div class="empty">加载中…</div></div>
        </div>
      </div>
    `;
    try {
      // 首屏只等待本地新闻列表，不等待 AI 筛选。
      await loadNews('all');
    } catch {}
    const pageSub = document.getElementById('news-page-sub');
    if (pageSub) pageSub.textContent = `当日财经热点，来源财联社、中国新闻网、搜狐、南方周末等公开渠道${lastUpdate ? `，更新于 ${lastUpdate}` : ''}。小拾帮你翻译成“和你有关系”的话。`;
    renderNews();
    bindPersonalizationToggle();
    loadPersonalizedNews();
  }

  function bindPersonalizationToggle() {
    const toggle = document.getElementById('news-personalized-toggle');
    if (toggle) toggle.addEventListener('click', async () => {
      toggle.disabled = true;
      const nextEnabled = !personalizedEnabled;
      try {
        await A().api('/api/profile', { method: 'POST', body: { personalizedNewsEnabled: nextEnabled } });
        if (nextEnabled) {
          await loadNews('all');
          renderNews();
          updatePersonalizationControls();
          loadPersonalizedNews();
          A().toast('已切换为个性化热点筛选');
          return;
        }
        personalizationRequestToken += 1;
        await loadNews();
        renderNews();
        updatePersonalizationControls();
        A().toast('已切换为查看全部新闻');
      } catch (e) {
        toggle.disabled = false;
        A().toast('设置失败：' + e.message);
      }
    });
  }

  window.Pages = window.Pages || {};
  window.Pages.insights = { render };
})();
