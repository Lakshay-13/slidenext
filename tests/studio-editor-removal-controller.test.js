const test = require('node:test');
const assert = require('node:assert/strict');
const removalController = require('../shared/studio-editor-removal-controller.js');

test('removal controller delegates the mutation, deselects, and finalizes', () => {
  const calls = [];
  let builderOptions = null;
  const sourceDocument = { id: 'source-doc' };
  let receivedDocument = null;
  const target = { dataset: { editorId: 'node-1' } };
  const controller = removalController.createStudioEditorRemovalController({
    canonicalDeckApi: {},
    canonicalRemovalApi: {
      createStudioCanonicalRemovalMutationBuilders(options) {
        builderOptions = options;
        return { buildCanonicalRemovalMutation: () => null };
      }
    },
    buildRemovalSelectionActionState: (doc) => {
      receivedDocument = doc;
      return {
        canRemove: true,
        selection: [target],
        doc
      };
    },
    getIframeDoc: () => ({ id: 'doc' }),
    assignElementId: (element) => element.dataset.editorId,
    buildCanonicalDeck: () => ({ slides: [] }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    applyRemovalMutation: (selection, options) => {
      calls.push(['remove', selection, options]);
      return { didRemove: true, transaction: { id: 'tx' } };
    },
    deselectElement: () => calls.push(['deselect']),
    finalizeDeckMutation: (label, options) => calls.push(['finalize', label, options])
  });

  assert.equal(controller.remove(sourceDocument), true);
  assert.equal(receivedDocument, sourceDocument);
  assert.equal(calls[0][0], 'remove');
  assert.deepEqual(calls[0][1], [target]);
  assert.equal(calls[1][0], 'deselect');
  assert.equal(calls[2][1], 'Auto: Deleted Element');
  assert.deepEqual(calls[2][2].transaction, { id: 'tx' });
  assert.equal(typeof builderOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof builderOptions.buildCanonicalDeckBaseline, 'function');
});

test('removal controller refreshes removal state when deletion is unavailable', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const controller = removalController.createStudioEditorRemovalController({
    buildRemovalSelectionActionState: () => ({ canRemove: false }),
    getIframeDoc: () => doc,
    finalizeRemovalActionResult: (result, currentDoc) => {
      calls.push([result, currentDoc]);
      return 'refreshed';
    }
  });

  assert.equal(controller.remove(), 'refreshed');
  assert.deepEqual(calls, [[false, doc]]);
});

test('removal controller fails closed before DOM mutation when canonical removal construction throws', () => {
  let removeCalls = 0;
  const doc = { id: 'doc' };
  const target = { dataset: { editorId: 'node-1' } };
  const controller = removalController.createStudioEditorRemovalController({
    canonicalRemovalApi: {
      createStudioCanonicalRemovalMutationBuilders() {
        return {
          buildCanonicalRemovalMutation() {
            throw new Error('canonical removal unavailable');
          }
        };
      }
    },
    buildRemovalSelectionActionState: () => ({
      canRemove: true,
      selection: [target]
    }),
    getIframeDoc: () => doc,
    applyRemovalMutation: () => {
      removeCalls += 1;
      return { didRemove: true, transaction: null };
    },
    finalizeRemovalActionResult: (result, currentDoc) => ({ result, currentDoc })
  });

  assert.deepEqual(controller.remove(), { result: false, currentDoc: doc });
  assert.equal(removeCalls, 0);
});

test('removal controller fails closed before DOM mutation when canonical removal sidecar is null', () => {
  let removeCalls = 0;
  const doc = { id: 'doc' };
  const target = { dataset: { editorId: 'node-1' } };
  const controller = removalController.createStudioEditorRemovalController({
    canonicalRemovalApi: {
      createStudioCanonicalRemovalMutationBuilders() {
        return {
          buildCanonicalRemovalBaseline() {
            return { slides: [{ id: 'slide-1', nodes: [] }] };
          },
          buildCanonicalRemovalMutation() {
            return null;
          }
        };
      }
    },
    buildRemovalSelectionActionState: () => ({
      canRemove: true,
      selection: [target]
    }),
    getIframeDoc: () => doc,
    applyRemovalMutation: () => {
      removeCalls += 1;
      return { didRemove: true, transaction: null };
    },
    finalizeRemovalActionResult: (result, currentDoc) => ({ result, currentDoc })
  });

  assert.deepEqual(controller.remove(), { result: false, currentDoc: doc });
  assert.equal(removeCalls, 0);
});

test('removal controller fails closed before mutation when finalization is unavailable', () => {
  let removeCalls = 0;
  const doc = { id: 'doc' };
  const controller = removalController.createStudioEditorRemovalController({
    buildRemovalSelectionActionState: () => ({
      canRemove: true,
      selection: [{ id: 'node-1' }]
    }),
    getIframeDoc: () => doc,
    applyRemovalMutation: () => {
      removeCalls += 1;
      return { didRemove: true, transaction: null };
    },
    finalizeRemovalActionResult: (result, currentDoc) => ({ result, currentDoc })
  });

  assert.deepEqual(controller.remove(), { result: false, currentDoc: doc });
  assert.equal(removeCalls, 0);
});

test('removal controller rolls back and restores selection when persistence rejects', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const target = { dataset: { editorId: 'node-1' } };
  const controller = removalController.createStudioEditorRemovalController({
    canonicalRemovalApi: {
      createStudioCanonicalRemovalMutationBuilders() {
        return {
          buildCanonicalRemovalMutation: () => ({ slides: [] })
        };
      }
    },
    buildRemovalSelectionActionState: () => ({
      canRemove: true,
      selection: [target]
    }),
    getIframeDoc: () => doc,
    assignElementId: (element) => element.dataset.editorId,
    applyRemovalMutation: () => ({ didRemove: true, transaction: { type: 'markup' } }),
    deselectElement: () => calls.push('deselect'),
    finalizeDeckMutation: () => false,
    rollbackMutation: (transaction, sourceDoc) => {
      assert.deepEqual(transaction, { type: 'markup' });
      assert.equal(sourceDoc, doc);
      calls.push('rollback');
    },
    restoreSelection: (selectedIds, sourceDoc) => {
      assert.deepEqual(selectedIds, ['node-1']);
      assert.equal(sourceDoc, doc);
      calls.push('restoreSelection');
    },
    finalizeRemovalActionResult: (result, sourceDoc) => {
      assert.equal(result, false);
      assert.equal(sourceDoc, doc);
      calls.push('finalizeAction');
      return false;
    }
  });

  assert.equal(controller.remove(), false);
  assert.deepEqual(calls, ['deselect', 'rollback', 'restoreSelection', 'finalizeAction']);
});
