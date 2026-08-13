const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyEntryAction = require('../shared/studio-editor-history-entry-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history entry action prefers the live controller', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const controller = {
    createEntry(...args) {
      calls.push(args);
      return 'controller-entry';
    }
  };
  const createHistoryEntry = historyEntryAction.createStudioEditorHistoryEntryAction({
    getHistoryController: () => controller,
    getDocument: () => documentRef,
    historyStateApi: {
      createStudioEditorHistoryEntryAdapter() {
        throw new Error('fallback entry builder should not be created');
      }
    }
  });

  assert.equal(createHistoryEntry(), 'controller-entry');
  assert.deepEqual(calls, [[undefined]]);
});

test('history entry action lazily creates and reuses the shared entry builder', () => {
  let createCalls = 0;
  const calls = [];
  const historyStateApi = {
    createStudioEditorHistoryEntryAdapter(options) {
      createCalls += 1;
      assert.equal(options.historyApi.name, 'history');
      assert.equal(options.preferCanonicalDeck, true);
      return (doc) => {
        calls.push(doc);
        return { doc, source: 'shared-entry' };
      };
    }
  };
  const createHistoryEntry = historyEntryAction.createStudioEditorHistoryEntryAction({
    historyStateApi,
    historyApi: { name: 'history' }
  });

  assert.deepEqual(createHistoryEntry('doc-1'), {
    doc: 'doc-1',
    source: 'shared-entry'
  });
  assert.deepEqual(createHistoryEntry('doc-2'), {
    doc: 'doc-2',
    source: 'shared-entry'
  });
  assert.equal(createCalls, 1);
  assert.deepEqual(calls, ['doc-1', 'doc-2']);
});

test('history entry action fails closed without a shared builder', () => {
  const createHistoryEntry = historyEntryAction.createStudioEditorHistoryEntryAction({});
  assert.equal(createHistoryEntry({ id: 'document' }), null);
});

test('history entry global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyEntryAction.createStudioEditorHistoryEntryGlobalApi({
    createHistoryEntry: (...args) => {
      calls.push(args);
      return 'entry';
    }
  });

  assert.equal(api.createHistoryEntry({ id: 'doc' }), 'entry');
  assert.deepEqual(calls, [[{ id: 'doc' }]]);
});

test('index loads and installs the shared history entry action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-entry-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryEntryGlobalApi\);/);
  assert.match(fileContent, /getPendingCanonicalDeck: getStudioPendingEditorCanonicalDeck/);
});
