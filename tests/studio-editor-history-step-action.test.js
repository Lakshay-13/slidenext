const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyStepAction = require('../shared/studio-editor-history-step-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history step action prefers a controller with undo support', () => {
  const controller = { undo() {}, redo() {} };
  const getEditorHistoryStepAdapter = historyStepAction.createStudioEditorHistoryStepAction({
    getHistoryController: () => controller,
    historyStateApi: {
      createStudioEditorHistoryStepStateAdapter() {
        throw new Error('fallback step adapter should not be created');
      }
    }
  });

  assert.equal(getEditorHistoryStepAdapter(), controller);
});

test('history step action lazily creates and reuses the shared step adapter', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const historyStateApi = {
    createStudioEditorHistoryStepStateAdapter(options) {
      createCalls += 1;
      capturedOptions = options;
      return { undo: () => 'undo', redo: () => 'redo' };
    }
  };
  const getEditorHistoryStepAdapter = historyStepAction.createStudioEditorHistoryStepAction({
    historyStateApi,
    historyApi: { name: 'history' },
    getUndoStack: () => ['undo-entry'],
    getRedoStack: () => ['redo-entry'],
    restoreHistoryEntry: () => {},
    updateHistoryButtons: () => {},
    triggerAutoSave: () => {},
    flushPendingHistory: () => false,
    hasPendingHistory: () => false
  });

  const adapter = getEditorHistoryStepAdapter();
  assert.equal(getEditorHistoryStepAdapter(), adapter);
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.name, 'history');
  assert.deepEqual(capturedOptions.getUndoStack(), ['undo-entry']);
  assert.deepEqual(capturedOptions.getRedoStack(), ['redo-entry']);
  assert.equal(typeof capturedOptions.flushPendingHistory, 'function');
  assert.equal(typeof capturedOptions.hasPendingHistory, 'function');
});

test('history step action returns null without the shared step adapter', () => {
  const getEditorHistoryStepAdapter = historyStepAction.createStudioEditorHistoryStepAction({});
  assert.equal(getEditorHistoryStepAdapter(), null);
});

test('history step global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyStepAction.createStudioEditorHistoryStepGlobalApi({
    getEditorHistoryStepAdapter: (...args) => {
      calls.push(args);
      return 'adapter';
    }
  });

  assert.equal(api.getEditorHistoryStepAdapter({ mode: 'history' }), 'adapter');
  assert.deepEqual(calls, [[{ mode: 'history' }]]);
});

test('index loads and installs the shared history step action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-step-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryStepGlobalApi\);/);
  assert.match(fileContent, /flushPendingHistory: typeof flushPendingEditorHistory === 'function'/);
});
