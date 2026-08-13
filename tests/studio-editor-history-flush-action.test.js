const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyFlushAction = require('../shared/studio-editor-history-flush-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history flush action prefers the live controller', () => {
  let calls = 0;
  const flushPendingEditorHistory = historyFlushAction.createStudioEditorHistoryFlushAction({
    getHistoryController: () => ({
      flushPending() {
        calls += 1;
        return 'controller-flush';
      }
    }),
    saveHistoryState() {
      throw new Error('fallback flush should not save directly');
    }
  });

  assert.equal(flushPendingEditorHistory(), 'controller-flush');
  assert.equal(calls, 1);
});

test('history flush action saves pending canonical edits with their transaction', () => {
  const calls = [];
  const transaction = { id: 'transaction' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const flushPendingEditorHistory = historyFlushAction.createStudioEditorHistoryFlushAction({
    getPendingTransaction: () => transaction,
    getPendingCanonicalDeck: () => canonicalDeck,
    saveHistoryState(...args) {
      calls.push(args);
      return { didCapture: true };
    }
  });

  assert.equal(flushPendingEditorHistory(), true);
  assert.deepEqual(calls, [[false, transaction, canonicalDeck]]);
});

test('history flush action saves transaction-only edits and reports capture failure', () => {
  const transaction = { id: 'transaction' };
  const calls = [];
  const flushPendingEditorHistory = historyFlushAction.createStudioEditorHistoryFlushAction({
    getPendingTransaction: () => transaction,
    saveHistoryState(...args) {
      calls.push(args);
      return { didCapture: false };
    }
  });

  assert.equal(flushPendingEditorHistory(), false);
  assert.deepEqual(calls, [[false, transaction]]);
});

test('history flush action returns false when there is no pending history', () => {
  let saveCalls = 0;
  const flushPendingEditorHistory = historyFlushAction.createStudioEditorHistoryFlushAction({
    saveHistoryState() {
      saveCalls += 1;
      return { didCapture: true };
    }
  });

  assert.equal(flushPendingEditorHistory(), false);
  assert.equal(saveCalls, 0);
});

test('history flush action treats undefined pending state as empty', () => {
  let saveCalls = 0;
  const flushPendingEditorHistory = historyFlushAction.createStudioEditorHistoryFlushAction({
    getPendingTransaction: () => undefined,
    getPendingCanonicalDeck: () => undefined,
    saveHistoryState() {
      saveCalls += 1;
      return { didCapture: true };
    }
  });

  assert.equal(flushPendingEditorHistory(), false);
  assert.equal(saveCalls, 0);
});

test('history flush global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyFlushAction.createStudioEditorHistoryFlushGlobalApi({
    flushPendingEditorHistory: (...args) => {
      calls.push(args);
      return 'flushed';
    }
  });

  assert.equal(api.flushPendingEditorHistory({ mode: 'history' }), 'flushed');
  assert.deepEqual(calls, [[{ mode: 'history' }]]);
});

test('index loads and installs the shared history flush action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-flush-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryFlushGlobalApi\);/);
  assert.match(fileContent, /getPendingCanonicalDeck: getStudioPendingEditorCanonicalDeck/);
});
