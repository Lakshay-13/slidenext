const test = require('node:test');
const assert = require('node:assert/strict');
const clipboardController = require('../shared/studio-editor-clipboard-controller.js');

test('clipboard controller copies payload items and updates clipboard state', () => {
  const calls = [];
  let clipboard = null;
  const controller = clipboardController.createStudioEditorClipboardController({
    clipboardApi: {
      createStudioClipboardState(items) {
        calls.push(['create', items]);
        return { items, pasteCount: 0 };
      }
    },
    buildClipboardSelectionMutationPlan: () => ({
      canCopy: true,
      payloadItems: [{ id: 'item-1' }]
    }),
    setClipboard: (value) => { clipboard = value; },
    finalizeClipboardActionResult: (result) => {
      calls.push(['finalize', result]);
      return result;
    }
  });

  assert.equal(controller.copy(), true);
  assert.deepEqual(clipboard, { items: [{ id: 'item-1' }], pasteCount: 0 });
  assert.deepEqual(calls, [
    ['create', [{ id: 'item-1' }]],
    ['finalize', true]
  ]);
});

test('clipboard controller routes paste and duplicate through the insertion contract', () => {
  const calls = [];
  let clipboard = { items: [{ id: 'item-1' }], pasteCount: 0 };
  const controller = clipboardController.createStudioEditorClipboardController({
    clipboardApi: {
      buildStudioClipboardPastePlan() {
        return {
          canPaste: true,
          items: [{ id: 'item-1' }],
          nextPasteCount: 1,
          nextClipboard: { items: [{ id: 'item-1' }], pasteCount: 1 }
        };
      }
    },
    buildClipboardSelectionMutationPlan: () => ({
      canDuplicate: true,
      payloadItems: [{ id: 'item-1' }]
    }),
    getClipboard: () => clipboard,
    setClipboard: (value) => { clipboard = value; },
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    insertClipboardPayload: (items, offset, options) => {
      calls.push(['insert', items, offset]);
      options.onTransaction({ id: `tx-${offset}` });
      return [{ id: `node-${offset}` }];
    },
    finalizeInsertedElements: (items, label, transaction) => {
      calls.push(['finalizeInserted', items, label, transaction]);
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), true);
  assert.equal(controller.duplicate(), true);
  assert.deepEqual(calls, [
    ['insert', [{ id: 'item-1' }], 1],
    ['finalizeInserted', [{ id: 'node-1' }], 'Auto: Pasted Element', { id: 'tx-1' }],
    ['insert', [{ id: 'item-1' }], 1],
    ['finalizeInserted', [{ id: 'node-1' }], 'Auto: Duplicated Element', { id: 'tx-1' }]
  ]);
});

test('clipboard controller rebuilds canonical state from the live post-insertion document', () => {
  const sourceDocument = { id: 'editor-document' };
  const liveCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'flow-before' },
        { id: 'pasted-flow-node' },
        { id: 'flow-after' }
      ]
    }]
  };
  let finalizedCanonicalDeck = null;
  let insertionCompleted = false;
  const controller = clipboardController.createStudioEditorClipboardController({
    clipboardApi: {
      buildStudioClipboardPastePlan() {
        return {
          canPaste: true,
          items: [{ id: 'clipboard-item' }],
          nextPasteCount: 1,
          nextClipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 1 }
        };
      }
    },
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionSequence() {
            return {
              slides: [{
                id: 'slide-1',
                nodes: [
                  { id: 'flow-before' },
                  { id: 'flow-after' },
                  { id: 'pasted-flow-node' }
                ]
              }]
            };
          }
        };
      }
    },
    getClipboard: () => ({ items: [{ id: 'clipboard-item' }], pasteCount: 0 }),
    setClipboard: () => {},
    getIframeDoc: () => sourceDocument,
    getActiveSlide: () => ({ id: 'slide-1' }),
    buildCanonicalDeck: (doc) => {
      assert.equal(doc, sourceDocument);
      return insertionCompleted ? liveCanonicalDeck : null;
    },
    insertClipboardPayload: () => {
      insertionCompleted = true;
      return [{ id: 'pasted-flow-node' }];
    },
    finalizeInsertedElements: (_items, _label, _transaction, canonicalDeck) => {
      finalizedCanonicalDeck = canonicalDeck;
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), true);
  assert.deepEqual(
    finalizedCanonicalDeck.slides[0].nodes.map((node) => node.id),
    ['flow-before', 'pasted-flow-node', 'flow-after']
  );
});
