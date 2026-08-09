const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const clipboardController = require('../shared/studio-editor-clipboard-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

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

  assert.match(source, /clipboard: getStudioEditorClipboard\(\)/);
  assert.match(source, /buildStudioClipboardSelectionMutationPlan\(getStudioSelectedElements\(\), getStudioEditorClipboard\(\)/);
  assert.doesNotMatch(source, /let editorClipboard = null/);
});

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
    buildCanonicalDeck: (doc, options) => {
      assert.equal(doc, sourceDocument);
      assert.deepEqual(options, { preferLiveCanonicalDeck: false });
      return insertionCompleted ? liveCanonicalDeck : null;
    },
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
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

test('clipboard controller applies inserted nodes to a validated live canonical baseline first', () => {
  const liveCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [{ id: 'existing' }] }]
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
        return value === liveCanonicalDeck;
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
  assert.equal(baselineUsed, liveCanonicalDeck);
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
    buildCanonicalDeck(_document, options) {
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
    buildCanonicalDeck: () => fallbackCanonicalDeck,
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
