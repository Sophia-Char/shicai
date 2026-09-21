(function () {
  'use strict';

  const A = () => window.App;
  let mode = 'login';

  function render(root) {
    root.innerHTML = `
      <div class="login-wrap">
        <div class="login-card">
          <div class="logo" style="justify-content:center;margin-bottom:18px;">
            <img class="logo-image logo-image--login" src="/assets/shicai-logo.jpg" alt="拾财" />
          </div>
          <h2 class="login-title">${mode === 'login' ? '欢迎回来' : '创建账号'}</h2>
          <p class="login-sub">你的理财学习伙伴，帮你理解，不帮你决策。</p>

          <div class="field">
            <label>用户名</label>
            <input class="input" id="lg-username" placeholder="请输入用户名" autocomplete="username" />
          </div>
          <div class="field">
            <label>密码</label>
            <input class="input" id="lg-password" type="password" placeholder="${mode === 'login' ? '请输入密码' : '至少6位'}" autocomplete="current-password" />
          </div>

          <button class="btn btn-primary btn-block" id="lg-submit" style="margin-top:8px;">${mode === 'login' ? '登录' : '注册并登录'}</button>
          <div class="login-foot">
            <span>${mode === 'login' ? '还没有账号？' : '已有账号？'}</span>
            <a href="#" id="lg-toggle">${mode === 'login' ? '去注册' : '去登录'}</a>
          </div>
          <div class="login-hint">演示账号：拾光者 / 123456</div>
        </div>
      </div>
    `;
    bind();
  }

  function bind() {
    const submit = document.getElementById('lg-submit');
    const username = document.getElementById('lg-username');
    const password = document.getElementById('lg-password');
    const toggle = document.getElementById('lg-toggle');

    const doSubmit = async () => {
      const u = username.value.trim();
      const p = password.value;
      if (!u) return A().toast('请输入用户名');
      if (!p) return A().toast('请输入密码');
      submit.disabled = true;
      try {
        const d = await A().api(`/api/auth/${mode}`, { method: 'POST', body: { username: u, password: p } });
        A().setAuth(d.token, d.user);
        A().toast(mode === 'login' ? '登录成功' : '注册成功');
        location.hash = d.onboardingRequired ? '#/chat?onboarding=1' : '#/';
      } catch (e) {
        A().toast(e.message);
      } finally {
        submit.disabled = false;
      }
    };

    submit.addEventListener('click', doSubmit);
    password.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSubmit();
    });
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      mode = mode === 'login' ? 'register' : 'login';
      render(document.getElementById('app'));
    });
  }

  window.Pages = window.Pages || {};
  window.Pages.login = { render };
})();
