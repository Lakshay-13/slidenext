const test = require('node:test');
const assert = require('node:assert/strict');
const historyState = require('../shared/studio-editor-history-state.js');

test('createStudioEditorHistorySaveAdapter lazily creates and reuses the shared history handler', () => {
  let createCalls = 0;
  const delegatedCalls = [];
  const historyApi = {
    createStudioHistorySaveHandler(options) {
      createCalls += 1;
      return (...args) => {
        delegatedCalls.push([args, options]);
        return { didCapture: true };
      };
    }
  };
  const adapter = historyState.createStudioEditorHistorySaveAdapter({ historyApi });

  assert.deepEqual(adapter(true, { id: 'first' }), { didCapture: true });
  assert.deepEqual(adapter(false, { id: 'second' }, { kind: 'deck' }), { didCapture: true });
  assert.equal(createCalls, 1);
  assert.deepEqual(delegatedCalls.map(([args]) => args), [
    [true, { id: 'first' }],
    [false, { id: 'second' }, { kind: 'deck' }]
  ]);
});

test('createStudioEditorHistorySaveAdapter fails closed when shared history is unavailable', () => {
  const adapter = historyState.createStudioEditorHistorySaveAdapter({
    getTimer() {
      return 'existing-timer';
    }
  });

  assert.deepEqual(adapter(), {
    didCapture: false,
    nextTimer: 'existing-timer'
  });
});
