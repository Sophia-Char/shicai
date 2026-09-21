'use strict';
// 单测 highlightTerms 的核心算法（从 core.js 提取，模拟文本节点处理）
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapText(text, dict) {
  const terms = Object.keys(dict).filter((t) => t && t.length >= 2).sort((a, b) => b.length - a.length);
  if (!terms.length) return text;
  if (!terms.some((t) => text.includes(t))) return null; // 无命中
  let rest = text;
  let out = '';
  while (rest) {
    let hit = null;
    let hitIdx = Infinity;
    for (const t of terms) {
      const idx = rest.indexOf(t);
      if (idx >= 0 && idx < hitIdx) { hit = t; hitIdx = idx; }
    }
    if (!hit) { out += escapeHtml(rest); break; }
    out += escapeHtml(rest.slice(0, hitIdx));
    out += `<span class="term" data-term="${hit.replace(/"/g, '&quot;')}">${hit}</span>`;
    rest = rest.slice(hitIdx + hit.length);
  }
  return out;
}

const dict = { 市盈率: 'x', 波动: 'y', 基金: 'z', 定投: 'w' };
const cases = [
  ['市盈率是估值指标', true],
  ['今天波动很大，别慌', true],
  ['成本<10元买入基金', true],        // 含 HTML 特殊字符，必须被转义
  ['普通聊天没有术语', false],
  ['买基金和定投都要懂', true],
  ['价格是 5 > 3 元', false],          // 无术语但含特殊字符
];
let failed = 0;
for (const [input, expectHit] of cases) {
  const out = wrapText(input, dict);
  const hit = out !== null;
  const okHit = hit === expectHit;
  let okSafe = true;
  if (hit) {
    // 转义安全：普通文本部分不得出现裸 < > & （除非是我们生成的标签）
    const stripped = out.replace(/<span class="term"[^>]*>[\s\S]*?<\/span>/g, '');
    if (/<|>|&(?!amp;|lt;|gt;|quot;|#)/.test(stripped)) okSafe = false;
  }
  const ok = okHit && okSafe;
  if (!ok) failed++;
  console.log((ok ? '✅' : '❌') + ` "${input}" -> 命中=${hit} 期望=${expectHit} 安全=${okSafe}${hit ? ' | ' + out : ''}`);
}
console.log(failed ? `\n${failed} 用例失败` : '\n全部用例通过');
process.exit(failed ? 1 : 0);
