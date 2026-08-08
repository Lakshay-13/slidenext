const test = require('node:test');
const assert = require('node:assert/strict');

const historyRestore = require('../shared/studio-editor-history-restore.js');

test('createStudioEditorHistoryRestoreStateAdapter delegates restore handler construction', () => {
  let createCalls = 0;
  let capturedOptions = null;
  const adapter = historyRestore.createStudioEditorHistoryRestoreStateAdapter({
    restoreApi: {
      createStudioEditorHistoryRestoreHandler(options) {
        createCalls += 1;
        capturedOptions = options;
        return entry => ({ entry, restored: true });
      }
    },
    historyApi: { id: 'history-api' },
    getIframeDoc: () => ({ id: 'iframe-doc' })
  });

  assert.deepEqual(adapter({ id: 'entry-1' }), {
    entry: { id: 'entry-1' },
    restored: true
  });
  assert.equal(createCalls, 1);
  assert.equal(capturedOptions.historyApi.id, 'history-api');
  assert.deepEqual(capturedOptions.getIframeDoc(), { id: 'iframe-doc' });
  assert.equal('restoreApi' in capturedOptions, false);
});

test('createStudioEditorHistoryRestoreStateAdapter fails closed without a shared handler', () => {
  assert.equal(historyRestore.createStudioEditorHistoryRestoreStateAdapter(), null);
});
