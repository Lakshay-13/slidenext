const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyCaptureAction = require('../shared/studio-editor-history-capture-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history capture action prefers the live controller', () => {
  let calls = 0;
  const createCaptureState = historyCaptureAction.createStudioEditorHistoryCaptureAction({
    getHistoryController: () => ({
      capture() {
        calls += 1;
        return 'controller-capture';
      }
    }),
    historyStateApi: {
      createStudioEditorHistoryCaptureStateAdapter() {
        throw new Error('fallback capture adapter should not be created');
      }
    }
  });

  assert.equal(createCaptureState(), 'controller-capture');
  assert.equal(calls, 1);
});

test('history capture action lazily creates and reuses the shared capture adapter', () => {
  let createCalls = 0;
  let adapterCalls = 0;
  const undoStack = ['undo'];
  const redoStack = ['redo'];
  const historyStateApi = {
    createStudioEditorHistoryCaptureStateAdapter(options) {
      createCalls += 1;
      assert.equal(options.historyApi.name, 'history');
      assert.equal(options.createHistoryEntry.name, 'createHistoryEntry');
      assert.deepEqual(options.getUndoStack(), undoStack);
      return () => {
        adapterCalls += 1;
        return { didCapture: true, historyEntry: { id: 'entry' } };
      };
    }
  };
  function createHistoryEntry() {
    return { id: 'entry' };
  }
  const captureState = historyCaptureAction.createStudioEditorHistoryCaptureAction({
    historyStateApi,
    historyApi: { name: 'history' },
    createHistoryEntry,
    getUndoStack: () => undoStack,
    getRedoStack: () => redoStack,
    getHistoryStateOptions: () => ({ limit: 50 })
  });

  assert.deepEqual(captureState(), { didCapture: true, historyEntry: { id: 'entry' } });
  assert.deepEqual(captureState(), { didCapture: true, historyEntry: { id: 'entry' } });
  assert.equal(createCalls, 1);
  assert.equal(adapterCalls, 2);
});

test('history capture action fails closed without a shared adapter', () => {
  let clearCalls = 0;
  const captureState = historyCaptureAction.createStudioEditorHistoryCaptureAction({
    getUndoStack: () => ['undo'],
    getRedoStack: () => ['redo'],
    clearPendingState: () => {
      clearCalls += 1;
    }
  });

  assert.deepEqual(captureState(), {
    didCapture: false,
    undoStack: ['undo'],
    redoStack: ['redo'],
    historyEntry: null
  });
  assert.equal(clearCalls, 1);
});

test('history capture global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyCaptureAction.createStudioEditorHistoryCaptureGlobalApi({
    captureState: (...args) => {
      calls.push(args);
      return 'capture';
    }
  });

  assert.equal(api.captureState({ mode: 'history' }), 'capture');
  assert.deepEqual(calls, [[{ mode: 'history' }]]);
});

test('index loads and installs the shared history capture action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-capture-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryCaptureGlobalApi\);/);
  assert.match(fileContent, /getHistoryStateOptions: typeof getEditorHistoryStackOptions === 'function'/);
});
