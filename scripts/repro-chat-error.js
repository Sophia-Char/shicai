'use strict';
// 在 Node 中用最小 DOM 桩复现 chat.js renderMessages 调用链，定位 "t is not defined"
const fs = require('node:fs');
const vm = require('node:vm');

// —— 最小 DOM 桩 ——
function makeEl(id) {
  return {
    id,
    innerHTML: '',
    style: {},
    dataset: {},
    children: [],
    _listeners: {},
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    appendChild() {},
    remove() {},
    closest() { return null; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; },
    focus() {},
    scrollTop: 0,
    scrollHeight: 0,
  };
}
const els = {};
function getEl(id) { if (!els[id]) els[id] = makeEl(id); return els[id]; }
const chatBody = getEl('chat-body');
els['chat-body'] = chatBody;
// chat-body 需要支持 replaceChild/appendChild/contains（highlightTerms 用）
chatBody.replaceChild = (newNode, oldNode) => {};
chatBody.appendChild = (node) => { chatBody.children.push(node); return node; };
chatBody.contains = () => true;
// 让 textContent/innerText 可读
Object.defineProperty(chatBody, 'innerText', { get() { return '测试'; }, configurable: true });
Object.defineProperty(chatBody, 'textContent', { get() { return '测试'; }, set() {}, configurable: true });

const sandbox = {
  console,
  document: {
    getElementById: getEl,
    createElement: () => makeEl('dynamic'),
    createTreeWalker: (root, what) => {
      // 返回一个空 walker（无文本节点）
      return { nextNode: () => null };
    },
    addEventListener() {},
    body: makeEl('body'),
  },
  window: {
    addEventListener() {},
    getSelection: () => null,
    innerWidth: 1280,
    TERM_DICT: { 定投: 'x', 波动: 'y' },
  },
  location: { hash: '#/chat', pathname: '/', search: '' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  setTimeout: (fn) => { try { fn(); } catch (e) { console.error('SETTIMEOUT-ERR:', e.message); } return 1; },
  clearTimeout() {},
  NodeFilter: { SHOW_TEXT: 4 },
  history: { replaceState() {} },
  encodeURIComponent,
  decodeURIComponent,
};

// 加载 core.js + chat.js（去掉 IIFE 尾部的 window.Pages 赋值？不行，直接跑，捕获异常）
const coreSrc = fs.readFileSync('public/js/core.js', 'utf8');
const chatSrc = fs.readFileSync('public/js/pages/chat.js', 'utf8');

vm.createContext(sandbox);
try {
  vm.runInContext(coreSrc, sandbox, { filename: 'core.js' });
  console.log('core.js 加载 OK');
} catch (e) {
  console.error('core.js 异常:', e.message);
}
try {
  vm.runInContext(chatSrc, sandbox, { filename: 'chat.js' });
  console.log('chat.js 加载 OK');
} catch (e) {
  console.error('chat.js 加载异常:', e.message);
}

// 手动触发 renderMessages 流程：构造 messages 并调用 Pages.chat.render
// 用直接调用的方式，捕获运行时错误
try {
  const pages = sandbox.window.Pages;
  if (!pages || !pages.chat) { console.error('Pages.chat 未挂载'); process.exit(1); }
  // 直接调用内部不可达，改为调用 render（render 会走完整加载流程）
  console.log('Pages.chat 已挂载:', Object.keys(pages.chat));
} catch (e) {
  console.error('挂载检查异常:', e.message);
}
