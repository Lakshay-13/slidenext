const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historySaveAction = require('../shared/studio-editor-history-save-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history save action prefers the live controller and preserves optional sidecars', () => {
  const calls = [];
  const controller = {
    save(...args) {
      calls.push(args);
      return 'controller-result';
    }
  };
  const save = historySaveAction.createStudioEditorHistorySaveAction({
    getHistoryController: () => controller,
    historyStateApi: {
      createStudioEditorHistorySaveAdapter() {
        throw new Error('fallback adapter should not be built');
      }
    }
  });
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  assert.equal(save(true, { id: 'tx-1' }, canonicalDeck), 'controller-result');
  assert.deepEqual(calls, [[true, { id: 'tx-1' }, canonicalDeck]]);
});

test('history save action lazily builds and reuses the shared save adapter', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const documentRef = { id: 'editor-document' };
  const delegated = [];
  const historyStateApi = {
    createStudioEditorHistorySaveAdapter(options) {
      createCalls += 1;
      capturedOptions = options;
      return (...args) => {
        delegated.push(args);
        return { didCapture: true };
      };
    }
  };
  const save = historySaveAction.createStudioEditorHistorySaveAction({
    historyStateApi,
    historyApi: { name: 'history' },
    transactionApi: { name: 'transaction' },
    getPendingTransaction: () => null,
    setPendingTransaction() {},
    setPendingCanonicalDeck() {},
    setLiveCanonicalDeck() {},
    getLiveCanonicalDeck: () => null,
    getDocument: () => documentRef,
    getTimer: () => 'timer',
    setTimer() {},
    captureState() {},
    scheduleOptions: { clearScheduledCapture() {}, scheduleCapture() {} }
  });
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  assert.deepEqual(save(true, { id: 'tx-1' }, canonicalDeck), { didCapture: true });
  assert.deepEqual(save(false, { id: 'tx-2' }), { didCapture: true });
  assert.equal(createCalls, 1);
  assert.deepEqual(delegated, [
    [true, { id: 'tx-1' }, canonicalDeck],
    [false, { id: 'tx-2' }]
  ]);
  assert.equal(capturedOptions.historyApi.name, 'history');
  assert.equal(capturedOptions.transactionApi.name, 'transaction');
  assert.equal(capturedOptions.getDocument(), documentRef);
});

test('history save action fails closed when the shared adapter is unavailable', () => {
  const save = historySaveAction.createStudioEditorHistorySaveAction({
    getTimer: () => 'current-timer'
  });

  assert.deepEqual(save(), { didCapture: false, nextTimer: 'current-timer' });
});

test('history save global API preserves the editor handler name', () => {
  const calls = [];
  const api = historySaveAction.createStudioEditorHistorySaveGlobalApi({
    saveHistoryState: (...args) => {
      calls.push(args);
      return 'saved';
    }
  });

  assert.equal(api.saveHistoryState(false, { id: 'tx' }), 'saved');
  assert.deepEqual(calls, [[false, { id: 'tx' }]]);
});

test('index loads and installs the shared history save action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-save-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistorySaveGlobalApi\);/);
  assert.match(fileContent, /getHistoryController: \(\) => studioEditorHistoryController/);
});
