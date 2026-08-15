const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const clipboardController = require('../shared/studio-editor-clipboard-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const CLIPBOARD_ACCESSORS_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-clipboard-accessors.js'
);
const CLIPBOARD_STATE_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-clipboard-state.js'
);

test('clipboard controller owns fallback clipboard state', () => {
  const initialClipboard = { items: [{ id: 'initial' }], pasteCount: 0 };
  const controller = clipboardController.createStudioEditorClipboardController({
    initialClipboard
  });
  const nextClipboard = { items: [{ id: 'next' }], pasteCount: 1 };

  assert.equal(controller.getClipboard(), initialClipboard);
  assert.equal(controller.setClipboard(nextClipboard), nextClipboard);
  assert.equal(controller.getClipboard(), nextClipboard);
  assert.equal(controller.clearClipboard(), null);
  assert.equal(controller.getClipboard(), null);
});

test('editor routes clipboard reads through the clipboard controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const stateSource = fs.readFileSync(CLIPBOARD_STATE_PATH, 'utf8');

  assert.match(source, /clipboardView,/);
  assert.match(source, /syncBlockState: \(sourceDoc\) => updateBlockActionState\(sourceDoc\)/);
  assert.match(stateSource, /getClipboard\(doc\)/);
  assert.match(source, /studioEditorClipboardSelectionController\.build\(doc\)/);
  assert.match(source, /studioEditorClipboardGlobalApi/);
  assert.match(source, /Object\.assign\(globalThis, studioEditorClipboardGlobalApi\)/);
  assert.match(
    fs.readFileSync(CLIPBOARD_ACCESSORS_PATH, 'utf8'),
    /getStudioEditorClipboard: \(\) => accessors\.getClipboard\(\)/
  );
  assert.doesNotMatch(source, /function getStudioEditorClipboard\(\)/);
  assert.doesNotMatch(source, /let editorClipboard = null/);
});

test('clipboard controller copies payload items and updates clipboard state', () => {
  const calls = [];
  const sourceDocument = { id: 'source-doc' };
  let receivedDocument = null;
  let clipboard = null;
  const controller = clipboardController.createStudioEditorClipboardController({
    clipboardApi: {
      createStudioClipboardState(items) {
        calls.push(['create', items]);
        return { items, pasteCount: 0 };
      }
    },
    buildClipboardSelectionMutationPlan: (doc) => {
      receivedDocument = doc;
      return {
        canCopy: true,
        payloadItems: [{ id: 'item-1' }]
      };
    },
    setClipboard: (value) => { clipboard = value; },
    finalizeClipboardActionResult: (result) => {
      calls.push(['finalize', result]);
      return result;
    }
  });

  assert.equal(controller.copy(sourceDocument), true);
  assert.equal(receivedDocument, sourceDocument);
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

test('clipboard controller removes pasted and duplicated nodes when persistence rejects', () => {
  let removed = 0;
  const controller = clipboardController.createStudioEditorClipboardController({
    clipboardApi: {
      buildStudioClipboardPastePlan: () => ({
        canPaste: true,
        items: [{ id: 'item-1' }],
        nextPasteCount: 1,
        nextClipboard: { items: [{ id: 'item-1' }], pasteCount: 1 }
      })
    },
    buildClipboardSelectionMutationPlan: () => ({
      canDuplicate: true,
      payloadItems: [{ id: 'item-1' }]
    }),
    getClipboard: () => ({ items: [{ id: 'item-1' }], pasteCount: 0 }),
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    insertClipboardPayload: () => [{
      remove() {
        removed += 1;
      }
    }],
    finalizeInsertedElements: () => false,
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), false);
  assert.equal(controller.duplicate(), false);
  assert.equal(removed, 2);
});

test('clipboard controller preserves transaction finalization when canonical reconstruction throws', () => {
  const calls = [];
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
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionSequence() {
            throw new Error('canonical clipboard reconstruction unavailable');
          }
        };
      }
    },
    getClipboard: () => ({ items: [{ id: 'item-1' }], pasteCount: 0 }),
    setClipboard: () => {},
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    insertClipboardPayload: (_items, _offset, options) => {
      options.onTransaction({ id: 'tx-1' });
      return [{ id: 'node-1' }];
    },
    finalizeInsertedElements: (items, label, transaction, canonicalDeck) => {
      calls.push([items, label, transaction, canonicalDeck]);
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.doesNotThrow(() => assert.equal(controller.paste(), true));
  assert.deepEqual(calls, [[
    [{ id: 'node-1' }],
    'Auto: Pasted Element',
    { id: 'tx-1' },
    null
  ]]);
});

test('clipboard controller removes inserted nodes when a canonical-backed insertion cannot rebuild', () => {
  const liveCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }] }]
  };
  let removed = 0;
  let finalizeCalls = 0;
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
    canonicalDeckApi: {
      isCanonicalDeck(value) {
        return value === liveCanonicalDeck;
      }
    },
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionSequence() {
            return null;
          }
        };
      }
    },
    getClipboard: () => clipboard,
    setClipboard: (value) => { clipboard = value; },
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    insertClipboardPayload: () => [{
      remove() {
        removed += 1;
      }
    }],
    finalizeInsertedElements: () => {
      finalizeCalls += 1;
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), false);
  assert.equal(removed, 1);
  assert.equal(finalizeCalls, 0);
  assert.equal(clipboard.pasteCount, 0);
});

test('clipboard controller preserves paste history when canonical builder construction throws', () => {
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
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        throw new Error('canonical insertion builders unavailable');
      }
    },
    getClipboard: () => clipboard,
    setClipboard: (value) => { clipboard = value; },
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    insertClipboardPayload: (_items, _offset, options) => {
      options.onTransaction({ id: 'tx-1' });
      return [{ id: 'node-1' }];
    },
    finalizeInsertedElements: (items, label, transaction, canonicalDeck) => {
      calls.push([items, label, transaction, canonicalDeck]);
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.doesNotThrow(() => assert.equal(controller.paste(), true));
  assert.deepEqual(calls, [[
    [{ id: 'node-1' }],
    'Auto: Pasted Element',
    { id: 'tx-1' },
    null
  ]]);
  assert.equal(clipboard.pasteCount, 1);
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
  let insertionBuilderOptions = null;
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
      createStudioCanonicalInsertionMutationBuilders(options) {
        insertionBuilderOptions = options;
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
    buildCanonicalDeck: () => {
      throw new Error('The mutation-specific builder should not run');
    },
    buildCanonicalDeckBaseline: (doc, options) => {
      assert.equal(doc, sourceDocument);
      assert.deepEqual(options, { preferLiveCanonicalDeck: false });
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
  assert.equal(typeof insertionBuilderOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof insertionBuilderOptions.buildCanonicalDeckBaseline, 'function');
});

test('clipboard controller applies inserted nodes to a validated pending canonical baseline first', () => {
  const liveCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }] }]
  };
  const pendingCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [{ id: 'pending-existing' }] }]
  };
  let baselineUsed = null;
  let finalizedCanonicalDeck = null;
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
    canonicalDeckApi: {
      isCanonicalDeck(value) {
        return value === liveCanonicalDeck || value === pendingCanonicalDeck;
      }
    },
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionSequence(_items, options) {
            baselineUsed = options.canonicalDeckBeforeMutation;
            return { slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }, { id: 'pasted' }] }] };
          }
        };
      }
    },
    getClipboard: () => ({ items: [{ id: 'clipboard-item' }], pasteCount: 0 }),
    getIframeDoc: () => ({ id: 'editor-document' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    getEditorSlideId: (slide) => slide.id,
    getPendingCanonicalDeck: () => pendingCanonicalDeck,
    getCanonicalDeckBaseline: () => liveCanonicalDeck,
    buildCanonicalDeck() {
      throw new Error('The DOM fallback should not run when live canonical state is valid');
    },
    insertClipboardPayload: () => [{ id: 'pasted' }],
    finalizeInsertedElements: (_items, _label, _transaction, canonicalDeck) => {
      finalizedCanonicalDeck = canonicalDeck;
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), true);
  assert.equal(baselineUsed, pendingCanonicalDeck);
  assert.deepEqual(finalizedCanonicalDeck.slides[0].nodes.map((node) => node.id), [
    'existing',
    'pasted'
  ]);
});

test('clipboard controller falls back when live canonical validation throws', () => {
  const fallbackCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }, { id: 'pasted' }] }]
  };
  let buildCalls = 0;
  let finalizedCanonicalDeck = null;
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
    canonicalDeckApi: {
      isCanonicalDeck() {
        throw new Error('validator unavailable');
      }
    },
    getClipboard: () => ({ items: [{ id: 'clipboard-item' }], pasteCount: 0 }),
    setClipboard: () => {},
    getIframeDoc: () => ({ id: 'editor-document' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline(_document, options) {
      buildCalls += 1;
      assert.deepEqual(options, { preferLiveCanonicalDeck: false });
      return fallbackCanonicalDeck;
    },
    insertClipboardPayload: () => [{ id: 'pasted' }],
    finalizeInsertedElements: (_items, _label, _transaction, canonicalDeck) => {
      finalizedCanonicalDeck = canonicalDeck;
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), true);
  assert.equal(buildCalls, 1);
  assert.equal(finalizedCanonicalDeck, fallbackCanonicalDeck);
});

test('clipboard controller rejects malformed live baselines without a canonical validator', () => {
  const fallbackCanonicalDeck = {
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }, { id: 'pasted' }] }]
  };
  let baselineUsed = null;
  let finalizedCanonicalDeck = null;
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
    canonicalDeckApi: {
      isCanonicalDeck: undefined
    },
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionSequence(_items, options) {
            baselineUsed = options.canonicalDeckBeforeMutation;
            return null;
          }
        };
      }
    },
    getClipboard: () => ({ items: [{ id: 'clipboard-item' }], pasteCount: 0 }),
    setClipboard: () => {},
    getIframeDoc: () => ({ id: 'editor-document' }),
    getActiveSlide: () => ({ id: 'slide-1' }),
    getEditorSlideId: (slide) => slide.id,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeckBaseline: (_document, options) => {
      assert.deepEqual(options, { preferLiveCanonicalDeck: false });
      return fallbackCanonicalDeck;
    },
    insertClipboardPayload: () => [{ dataset: { editorId: 'pasted' } }],
    finalizeInsertedElements: (_items, _label, _transaction, canonicalDeck) => {
      finalizedCanonicalDeck = canonicalDeck;
      return true;
    },
    finalizeClipboardActionResult: (result) => result
  });

  assert.equal(controller.paste(), true);
  assert.equal(baselineUsed, null);
  assert.equal(finalizedCanonicalDeck, fallbackCanonicalDeck);
});
