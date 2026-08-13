const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyRestoreAction = require('../shared/studio-editor-history-restore-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history restore action delegates to the controller when available', () => {
  const calls = [];
  const restoreFrameFromHistoryEntry = historyRestoreAction.createStudioEditorHistoryRestoreAction({
    getHistoryController: () => ({
      restore(...args) {
        calls.push(args);
        return 'controller-result';
      }
    })
  });

  assert.equal(
    restoreFrameFromHistoryEntry({ id: 'entry-1' }, { direction: 'undo' }),
    'controller-result'
  );
  assert.deepEqual(calls, [[{ id: 'entry-1' }, { direction: 'undo' }]]);
});

test('history restore action lazily caches the shared restore adapter', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const restoreApi = {
    createStudioEditorHistoryRestoreStateAdapter(options) {
      createCalls += 1;
      capturedOptions = options;
      return (entry, historyStep) => ({ entry, historyStep });
    }
  };
  const restoreFrameFromHistoryEntry = historyRestoreAction.createStudioEditorHistoryRestoreAction({
    restoreApi,
    historyApi: { id: 'history-api' },
    getIframeDoc: () => ({ id: 'iframe-doc' })
  });

  assert.deepEqual(
    restoreFrameFromHistoryEntry({ id: 'entry-1' }, { direction: 'undo' }),
    { entry: { id: 'entry-1' }, historyStep: { direction: 'undo' } }
  );
  assert.deepEqual(
    restoreFrameFromHistoryEntry({ id: 'entry-2' }),
    { entry: { id: 'entry-2' }, historyStep: null }
  );
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.restoreApi, restoreApi);
  assert.deepEqual(capturedOptions.historyApi, { id: 'history-api' });
  assert.equal(typeof capturedOptions.getIframeDoc, 'function');
});

test('history restore action returns false when no restore runtime is available', () => {
  const restoreFrameFromHistoryEntry = historyRestoreAction.createStudioEditorHistoryRestoreAction({});

  assert.equal(restoreFrameFromHistoryEntry({ id: 'entry-1' }), false);
});

test('history restore global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyRestoreAction.createStudioEditorHistoryRestoreGlobalApi({
    restoreFrameFromHistoryEntry: (...args) => {
      calls.push(args);
      return 'restore-result';
    }
  });

  assert.equal(api.restoreFrameFromHistoryEntry({ id: 'entry-1' }), 'restore-result');
  assert.deepEqual(calls, [[{ id: 'entry-1' }]]);
});

test('index loads the shared history restore action instead of defining the handler inline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-restore-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryRestoreGlobalApi\);/);
  assert.doesNotMatch(fileContent, /function restoreFrameFromHistoryEntry\(entry\) \{/);
});
