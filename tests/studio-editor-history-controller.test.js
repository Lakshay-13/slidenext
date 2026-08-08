const test = require('node:test');
const assert = require('node:assert/strict');
const historyState = require('../shared/studio-editor-history-state.js');
const historyController = require('../shared/studio-editor-history-controller.js');

test('history controller preserves optional canonical deck arguments and reuses adapters', () => {
  const calls = [];
  let createCalls = 0;
  const historyApi = {
    createStudioHistorySaveHandler(options) {
      createCalls += 1;
      return (...args) => {
        calls.push({ args, options });
        return { didCapture: true };
      };
    }
  };
  const controller = historyController.createStudioEditorHistoryController({
    historyApi,
    historyStateApi: historyState
  });
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  assert.deepEqual(controller.save(true, { id: 'transaction' }), { didCapture: true });
  assert.deepEqual(controller.save(false, null, canonicalDeck), { didCapture: true });
  assert.equal(createCalls, 1);
  assert.deepEqual(calls.map(({ args }) => args), [
    [true, { id: 'transaction' }],
    [false, null, canonicalDeck]
  ]);
});

test('history controller flushes pending state through the shared save adapter', () => {
  let pendingTransaction = { id: 'pending' };
  const saves = [];
  const historyApi = {
    createStudioHistorySaveHandler() {
      return (...args) => {
        saves.push(args);
        pendingTransaction = null;
        return { didCapture: true };
      };
    }
  };
  const controller = historyController.createStudioEditorHistoryController({
    historyApi,
    historyStateApi: historyState,
    getPendingTransaction: () => pendingTransaction,
    getPendingCanonicalDeck: () => null
  });

  assert.equal(controller.flushPending(), true);
  assert.deepEqual(saves, [[false, null]]);
  assert.equal(controller.flushPending(), false);
});

test('history controller forwards history steps and restore entries', () => {
  const steps = [];
  const restores = [];
  const historyApi = {
    createStudioHistoryStepRunner(options) {
      return () => {
        steps.push(options.didStepKey);
        options.restoreHistoryEntry({ id: options.didStepKey }, { id: 'step' });
        return { [options.didStepKey]: true };
      };
    }
  };
  const restoreApi = {
    createStudioEditorHistoryRestoreStateAdapter(options) {
      return (entry, historyStep) => {
        restores.push([entry, historyStep, options.marker]);
        return { didRestore: true };
      };
    }
  };
  const controller = historyController.createStudioEditorHistoryController({
    historyApi,
    historyStateApi: historyState,
    restoreApi,
    restoreHandlerOptions: { marker: 'restore-options' }
  });

  assert.deepEqual(controller.undo(), { didUndo: true });
  assert.deepEqual(controller.redo(), { didRedo: true });
  assert.deepEqual(steps, ['didUndo', 'didRedo']);
  assert.deepEqual(restores, [
    [{ id: 'didUndo' }, { id: 'step' }, 'restore-options'],
    [{ id: 'didRedo' }, { id: 'step' }, 'restore-options']
  ]);
});

test('history controller forwards canonical state to history entry builders', () => {
  const canonicalStateApi = { id: 'canonical-state-api' };
  let capturedOptions = null;
  const historyStateApi = {
    createStudioEditorHistoryEntryAdapter(options) {
      capturedOptions = options;
      return () => ({ id: 'entry' });
    }
  };
  const controller = historyController.createStudioEditorHistoryController({
    historyApi: {},
    historyStateApi,
    canonicalStateApi
  });

  assert.deepEqual(controller.createEntry({ id: 'document' }), { id: 'entry' });
  assert.equal(capturedOptions.canonicalStateApi, canonicalStateApi);
});
