(function () {
  'use strict';

  const A = () => window.App;
  const TAGS = ['#持仓分享', '#学习笔记', '#踩坑记录', '#情绪树洞', '#热点讨论'];

  function layoutHtml() {
    return `
      <div class="container">
        <div class="page-head">
          <h1 class="page-title">💬 社区</h1>
          <p class="page-sub">匿名聊聊你的投资心情。小拾会给你一条温和的补充观点，不评判对错。</p>
        </div>

        <div class="card" style="margin-bottom:18px;">
          <div class="card-title">发个帖子</div>
          <div class="field">
            <textarea class="textarea" id="post-content" placeholder="分享你的持仓、踩坑、学习心得或此刻心情…"></textarea>
          </div>
          <div class="field">
            <label>选择标签</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="tag-select">
              ${TAGS.map((t, i) => `<button class="chip ${i === 0 ? 'tag-active' : ''}" data-tag="${t}">${t}</button>`).join('')}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="btn btn-primary" id="publish-btn">发布</button>
            <span class="muted" style="font-size:12px;">系统会自动模糊处理基金代码和金额，防止荐股。</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title">帖子流</div>
          <div id="posts-list"><div class="empty">加载中…</div></div>
        </div>
      </div>
    `;
  }

  let selectedTag = TAGS[0];

  function renderComment(c) {
    if (Number(c.is_ai) === 1) {
      const pending = c.ai_pending || c.content === '小拾正在补充这条帖子的观点…';
      return `<div class="ai-comment">
        <span class="label">${pending ? '🤖 小拾正在补充：' : '🤖 小拾补充：'}</span>
        <div class="comment-markdown">${pending ? '<span class="muted">内容生成中，帖子已成功发布。</span>' : A().renderMarkdown(c.content || '')}</div>
      </div>`;
    }
    return `<div class="community-comment">
      <div class="comment-head">
        <span class="comment-name">${A().escapeHtml(c.anonymous_name || '匿名')}</span>
        <span class="comment-time">${A().escapeHtml(c.created_at || '')}</span>
      </div>
      <div class="comment-content">${A().escapeHtml(c.content || '')}</div>
    </div>`;
  }

  function renderPosts(posts) {
    const box = document.getElementById('posts-list');
    if (!posts || !posts.length) {
      box.innerHTML = '<div class="empty">还没有帖子，来发第一帖吧。</div>';
      return;
    }
    box.innerHTML = posts.map((p) => {
      const comments = p.comments || [];
      return `
        <div class="post" data-id="${p.id}">
          <div class="post-head">
            <div class="post-avatar">${A().escapeHtml((p.anonymous_name || '匿')[0])}</div>
            <span class="post-name">${A().escapeHtml(p.anonymous_name || '匿名')}</span>
            <span class="badge gray">${A().escapeHtml(p.tag || '')}</span>
            <span class="post-time">${A().escapeHtml(p.created_at || '')}</span>
          </div>
          <div class="post-content">${A().escapeHtml(p.content || '')}</div>
          <div class="post-actions">
            <button class="like-btn${p.liked ? ' liked' : ''}" aria-pressed="${p.liked ? 'true' : 'false'}">
              <span class="like-label">${p.liked ? '❤️ 已赞' : '♡ 点赞'}</span>
              <span class="like-count">${p.likes || 0}</span>
            </button>
            <button class="reply-toggle">💬 回复 <span>${comments.length}</span></button>
          </div>
          ${comments.length ? `<div class="post-comments">${comments.map(renderComment).join('')}</div>` : ''}
          <div class="reply-composer" hidden>
            <textarea class="textarea reply-input" rows="2" maxlength="1000" placeholder="写下你的回复…"></textarea>
            <div class="reply-composer-actions">
              <span class="muted">友善交流，回复也会自动模糊基金代码和金额。</span>
              <button class="btn btn-primary btn-sm reply-submit">回复</button>
            </div>
          </div>
        </div>`;
    }).join('');

    box.querySelectorAll('.like-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('.post').dataset.id;
        btn.disabled = true;
        try {
          const d = await A().api('/api/community/like', { method: 'POST', body: { id: Number(id) } });
          btn.classList.toggle('liked', d.liked);
          btn.setAttribute('aria-pressed', d.liked ? 'true' : 'false');
          btn.querySelector('.like-label').textContent = d.liked ? '❤️ 已赞' : '♡ 点赞';
          btn.querySelector('.like-count').textContent = d.likes;
        } catch (e) {
          A().toast('操作失败：' + e.message);
        } finally {
          btn.disabled = false;
        }
      });
    });

    box.querySelectorAll('.reply-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const composer = btn.closest('.post').querySelector('.reply-composer');
        composer.hidden = !composer.hidden;
        if (!composer.hidden) composer.querySelector('.reply-input').focus();
      });
    });

    box.querySelectorAll('.reply-submit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const post = btn.closest('.post');
        const input = post.querySelector('.reply-input');
        const content = input.value.trim();
        if (!content) {
          A().toast('先写点回复吧');
          input.focus();
          return;
        }
        btn.disabled = true;
        try {
          await A().api('/api/community/comment', {
            method: 'POST',
            body: { postId: Number(post.dataset.id), content },
          });
          A().toast('回复成功');
          await refresh();
        } catch (e) {
          A().toast('回复失败：' + e.message);
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  async function refresh() {
    const d = await A().api('/api/community/posts');
    if (document.getElementById('posts-list')) renderPosts(d.posts);
    return d.posts || [];
  }

  async function pollAiSupplement(postId) {
    for (let i = 0; i < 8; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      try {
        const posts = await refresh();
        const post = posts.find((item) => Number(item.id) === postId);
        const pending = post && (post.comments || []).some((comment) => comment.ai_pending);
        if (!pending) return;
      } catch {
        return;
      }
    }
  }

  let publishing = false;
  async function publish() {
    if (publishing) return;
    const input = document.getElementById('post-content');
    const button = document.getElementById('publish-btn');
    const content = input.value.trim();
    if (!content) {
      A().toast('先写点内容吧');
      return;
    }
    publishing = true;
    button.disabled = true;
    button.textContent = '发布中…';
    try {
      const result = await A().api('/api/community/post', { method: 'POST', body: { content, tag: selectedTag } });
      input.value = '';
      A().toast('发布成功');
      await refresh();
      if (result.ai_comment_pending && result.id) void pollAiSupplement(Number(result.id));
    } catch (e) {
      A().toast('发布失败：' + e.message);
    } finally {
      publishing = false;
      if (button) {
        button.disabled = false;
        button.textContent = '发布';
      }
    }
  }

  function bindEvents() {
    document.querySelectorAll('#tag-select .chip').forEach((b) => {
      b.addEventListener('click', () => {
        selectedTag = b.dataset.tag;
        document.querySelectorAll('#tag-select .chip').forEach((x) => x.classList.remove('tag-active'));
        b.classList.add('tag-active');
      });
    });
    document.getElementById('publish-btn').addEventListener('click', publish);
  }

  async function render(root) {
    root.innerHTML = layoutHtml();
    bindEvents();
    try {
      await refresh();
    } catch (e) {
      document.getElementById('posts-list').innerHTML = `<div class="empty">加载失败：${A().escapeHtml(e.message)}</div>`;
    }
  }

  window.Pages = window.Pages || {};
  window.Pages.community = { render };
})();
