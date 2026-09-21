'use strict';

const { AsyncLocalStorage } = require('node:async_hooks');

const storage = new AsyncLocalStorage();

function runWithAiConfig(config, fn) {
  return storage.run(config || null, fn);
}

function getRequestAiConfig() {
  return storage.getStore() || null;
}

module.exports = { runWithAiConfig, getRequestAiConfig };
