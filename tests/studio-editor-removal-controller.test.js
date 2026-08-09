const test = require('node:test');
const assert = require('node:assert/strict');
const removalController = require('../shared/studio-editor-removal-controller.js');

test('removal controller delegates the mutation, deselects, and finalizes', () => {
  const calls = [];
  let builderOptions = null;
  const target = { dataset: { editorId: 'node-1' } };
  const controller = removalController.createStudioEditorRemovalController({
    canonicalDeckApi: {},
    canonicalRemovalApi: {
      createStudioCanonicalRemovalMutationBuilders(options) {
        builderOptions = options;
        return { buildCanonicalRemovalMutation: () => null };
      }
    },
    buildRemovalSelectionActionState: (doc) => ({
      canRemove: true,
      selection: [target],
      doc
    }),
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

  assert.equal(controller.remove(), true);
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
