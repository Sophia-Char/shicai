'use strict';
// 清理验证脚本产生的临时测试账号（仅删 测试用户* 开头的账号及其关联数据）
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/shicai.db');
const rows = db.prepare("SELECT id FROM users WHERE username LIKE '测试用户%'").all();
for (const r of rows) {
  db.prepare('DELETE FROM user_memories WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM user_knowledge WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM conversations WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM simulation WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM user_profile WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(r.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(r.id);
}
console.log('已清理测试用户:', rows.length);
console.log('当前用户:', JSON.stringify(db.prepare('SELECT id, username FROM users').all()));
