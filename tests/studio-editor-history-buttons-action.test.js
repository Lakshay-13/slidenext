const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyButtonsAction = require('../shared/studio-editor-history-buttons-action.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('history buttons action prefers the live controller', () => {
  let calls = 0;
  const updateHistoryButtons = historyButtonsAction.createStudioEditorHistoryButtonsAction({
    getHistoryController: () => ({
      updateButtons() {
        calls += 1;
        return 'controller-buttons';
      }
    }),
    historyApi: {
      syncStudioHistoryButtons() {
        throw new Error('fallback button sync should not run');
      }
    }
  });

  assert.equal(updateHistoryButtons(), 'controller-buttons');
  assert.equal(calls, 1);
});

test('history buttons action delegates direct synchronization when no shared synchronizer exists', () => {
  const documentRef = { id: 'editor-shell' };
  let capturedOptions = null;
  const updateHistoryButtons = historyButtonsAction.createStudioEditorHistoryButtonsAction({
    historyApi: {
      syncStudioHistoryButtons(options) {
        capturedOptions = options;
        return { undoDisabled: true, redoDisabled: false };
      }
    },
    getDocument: () => documentRef,
    getUndoStack: () => ['undo-entry'],
    getRedoStack: () => ['redo-entry']
  });

  assert.deepEqual(updateHistoryButtons(), {
    undoDisabled: true,
    redoDisabled: false
  });
  assert.equal(capturedOptions.documentRef, documentRef);
  assert.deepEqual(capturedOptions.undoStack, ['undo-entry']);
  assert.deepEqual(capturedOptions.redoStack, ['redo-entry']);
});

test('history buttons action caches the shared synchronizer', () => {
  const calls = [];
  const documentRef = { id: 'editor-shell' };
  const updateHistoryButtons = historyButtonsAction.createStudioEditorHistoryButtonsAction({
    historyApi: {
      syncStudioHistoryButtons() {
        throw new Error('direct button sync should not run');
      },
      createStudioHistoryButtonStateSync(options) {
        calls.push(['factory', options]);
        return () => {
          calls.push(['sync', options.getDocument(), options.getUndoStack(), options.getRedoStack()]);
          return true;
        };
      }
    },
    getDocument: () => documentRef,
    getUndoStack: () => ['undo-entry'],
    getRedoStack: () => ['redo-entry']
  });

  assert.equal(updateHistoryButtons(), true);
  assert.equal(updateHistoryButtons(), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync'), [
    ['sync', documentRef, ['undo-entry'], ['redo-entry']],
    ['sync', documentRef, ['undo-entry'], ['redo-entry']]
  ]);
});

test('history buttons action returns false without the shared history runtime', () => {
  const updateHistoryButtons = historyButtonsAction.createStudioEditorHistoryButtonsAction({});
  assert.equal(updateHistoryButtons(), false);
});

test('history buttons global API preserves the editor handler name', () => {
  const calls = [];
  const api = historyButtonsAction.createStudioEditorHistoryButtonsGlobalApi({
    updateHistoryButtons: (...args) => {
      calls.push(args);
      return 'buttons';
    }
  });

  assert.equal(api.updateHistoryButtons({ mode: 'history' }), 'buttons');
  assert.deepEqual(calls, [[{ mode: 'history' }]]);
});

test('index loads and installs the shared history buttons action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-history-buttons-action\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryButtonsGlobalApi\);/);
  assert.match(fileContent, /getDocument: \(\) => document/);
});
