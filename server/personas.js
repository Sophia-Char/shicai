'use strict';

// 预设人格已移除。保留此兼容模块，避免旧引用导致服务启动失败。
const PERSONAS = {
  custom: {
    id: 'custom',
    name: '自定义人格',
    emoji: '✍️',
    short: '自定义',
    style: '表达方式由用户自定义；未设置时使用统一基础表达。',
  },
};

function getPersona() {
  return PERSONAS.custom;
}

module.exports = { PERSONAS, getPersona };
