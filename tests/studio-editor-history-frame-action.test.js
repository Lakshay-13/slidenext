const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyFrameAction = require('../shared/studio-editor-history-frame-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history frame action prefers the live controller', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const controller = {
    buildFrameHtml(...args) {
      calls.push(args);
      return 'controller-html';
    }
  };
  const buildHistoryFrameHtml = historyFrameAction.createStudioEditorHistoryFrameAction({
    getHistoryController: () => controller,
    getDocument: () => documentRef,
    historyStateApi: {
      createStudioEditorHistoryFrameHtmlStateAdapter() {
        throw new Error('fallback frame builder should not be created');
      }
    }
  });

  assert.equal(buildHistoryFrameHtml(), 'controller-html');
  assert.deepEqual(calls, [[documentRef, {}]]);
});

test('history frame action lazily creates and reuses the shared frame builder', () => {
  let createCalls = 0;
  const calls = [];
  const historyStateApi = {
    createStudioEditorHistoryFrameHtmlStateAdapter(options) {
      createCalls += 1;
      assert.equal(options.historyApi.name, 'history');
      return (doc, buildOptions) => {
        calls.push([doc, buildOptions]);
        return 'shared-html';
      };
    }
  };
  const documentRef = { id: 'editor-document' };
  const buildHistoryFrameHtml = historyFrameAction.createStudioEditorHistoryFrameAction({
    historyStateApi,
    historyApi: { name: 'history' },
    getDocument: () => documentRef,
    getHistoryOptions: () => ({ chromeNodeIds: [] }),
    buildPersistableDeckHtml: () => '<html />'
  });

  assert.equal(buildHistoryFrameHtml(), 'shared-html');
  assert.equal(buildHistoryFrameHtml(documentRef, { canonicalDeck: { slides: [] } }), 'shared-html');
  assert.equal(createCalls, 1);
  assert.deepEqual(calls, [
    [documentRef, {}],
    [documentRef, { canonicalDeck: { slides: [] } }]
  ]);
});

test('history frame action fails closed without a shared builder', () => {
  const buildHistoryFrameHtml = historyFrameAction.createStudioEditorHistoryFrameAction({});
  assert.equal(buildHistoryFrameHtml({ id: 'document' }), '');
});

test('history frame global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyFrameAction.createStudioEditorHistoryFrameGlobalApi({
    buildHistoryFrameHtml: (...args) => {
      calls.push(args);
      return 'html';
    }
  });

  assert.equal(api.buildHistoryFrameHtml({ id: 'doc' }, { mode: 'history' }), 'html');
  assert.deepEqual(calls, [[{ id: 'doc' }, { mode: 'history' }]]);
});

test('index loads and installs the shared history frame action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-frame-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryFrameGlobalApi\);/);
  assert.match(fileContent, /getHistoryOptions: \(options\) => getEditorHistoryOptions\(options\)/);
});
