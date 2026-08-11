const test = require('node:test');
const assert = require('node:assert/strict');
const elementInsertionController = require('../shared/studio-editor-element-insertion-controller.js');

test('element insertion controller preserves insertion finalization and version labeling', () => {
  const calls = [];
  const slide = { children: [{}, {}] };
  const doc = { id: 'doc' };
  const element = { id: 'element-1' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    getIframeDoc: () => doc,
    getActiveSlide: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (type, options) => {
      calls.push(['apply', type, options]);
      return { element, transaction: { id: 'tx-1' } };
    },
    finalizeInsertedElements: (...args) => {
      calls.push(['finalize', ...args]);
      return true;
    }
  });

  assert.equal(controller.insert('h2'), true);
  assert.equal(calls[0][0], 'apply');
  assert.equal(calls[0][1], 'h2');
  assert.equal(calls[0][2].offset, 30);
  assert.equal(calls[0][2].layoutMode, 'absolute');
  assert.equal(calls[0][2].transactionElementId, 'slide:slide-1');
  assert.deepEqual(calls[1], [
    'finalize',
    [element],
    'Auto: Added H2',
    { id: 'tx-1' },
    null
  ]);
});

test('element insertion controller composes custom preparation into the canonical transaction', () => {
  const calls = [];
  const element = {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
  };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    getIframeDoc: () => ({}),
    getActiveSlide: () => ({ children: [] }),
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (type, options) => {
      calls.push(['apply', type]);
      options.prepareElement(element);
      return { element, transaction: null };
    },
    finalizeInsertedElements: (...args) => {
      calls.push(['finalize', ...args]);
      return true;
    }
  });

  assert.equal(controller.insert('img', {
    versionLabel: 'Auto: Inserted Asset "Hero"',
    prepareElement(nextElement) {
      nextElement.setAttribute('data-asset-id', 'hero');
    }
  }), true);
  assert.deepEqual(calls, [
    ['apply', 'img'],
    ['finalize', [element], 'Auto: Inserted Asset "Hero"', null, null]
  ]);
  assert.equal(element.attributes['data-asset-id'], 'hero');
});

test('element insertion controller selects flow mode for a flow-only canonical slide', () => {
  const calls = [];
  let builderOptions = null;
  const slide = { children: [] };
  const element = { id: 'element-1' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders(options) {
        builderOptions = options;
        return {
          buildCanonicalInsertionBaseline() {
            return {
              kind: 'slidenext.deck',
              layout: { mode: 'flow' },
              slides: [{ id: 'slide-1', layout: { mode: 'flow' }, nodes: [] }]
            };
          }
        };
      }
    },
    buildCanonicalDeck: () => ({ slides: [] }),
    buildCanonicalDeckBaseline: () => ({ slides: [] }),
    getCanonicalDeckBaseline: () => ({ id: 'live-baseline' }),
    getIframeDoc: () => ({}),
    getActiveSlide: () => slide,
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (type, options) => {
      calls.push(options);
      return { element, transaction: null };
    },
    finalizeInsertedElements: () => true
  });

  assert.equal(controller.insert('h2'), true);
  assert.equal(calls[0].layoutMode, 'flow');
  assert.equal(typeof builderOptions.buildCanonicalDeck, 'function');
  assert.equal(typeof builderOptions.buildCanonicalDeckBaseline, 'function');
  assert.deepEqual(builderOptions.getCanonicalDeckBaseline(), { id: 'live-baseline' });
});

test('element insertion controller honors an explicit layout mode override', () => {
  const calls = [];
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionBaseline() {
            return {
              layout: { mode: 'absolute' },
              slides: [{ id: 'slide-1', layout: { mode: 'absolute' }, nodes: [] }]
            };
          }
        };
      }
    },
    getIframeDoc: () => ({}),
    getActiveSlide: () => ({ children: [] }),
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (_type, options) => {
      calls.push(options.layoutMode);
      return { element: { id: 'inserted' }, transaction: null };
    },
    finalizeInsertedElements: () => true
  });

  assert.equal(controller.insert('h2', { layoutMode: 'flow' }), true);
  assert.equal(controller.insert('h2', { layoutMode: 'freeform' }), true);
  assert.equal(controller.insert('h2', { layoutMode: 'unsupported' }), true);
  assert.deepEqual(calls, ['flow', 'absolute', 'absolute']);
});

test('element insertion controller delegates canonical layout inference to the shared layout mode API', () => {
  const calls = [];
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    layoutModeApi: {
      resolveStudioCanonicalLayoutMode(deck, slideId) {
        calls.push([deck, slideId]);
        return 'flow';
      }
    },
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionBaseline() {
            return { slides: [{ id: 'slide-1', nodes: [] }] };
          }
        };
      }
    },
    getIframeDoc: () => ({}),
    getActiveSlide: () => ({ children: [] }),
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (_type, options) => {
      calls.push(options.layoutMode);
      return { element: { id: 'inserted' }, transaction: null };
    },
    finalizeInsertedElements: () => true
  });

  assert.equal(controller.insert('h2'), true);
  assert.deepEqual(calls, [
    [{ slides: [{ id: 'slide-1', nodes: [] }] }, 'slide-1'],
    'flow'
  ]);
});

test('element insertion controller delegates fallback slide lookup to the canonical deck API', () => {
  const calls = [];
  const canonicalDeck = {
    layout: { mode: 'flow' },
    slides: [{ id: 'slide-1', layout: { mode: 'flow' }, nodes: [] }]
  };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    canonicalDeckApi: {
      findCanonicalSlideById(deck, slideId) {
        calls.push([deck, slideId]);
        return deck.slides[0];
      }
    },
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionBaseline() {
            return canonicalDeck;
          }
        };
      }
    },
    getIframeDoc: () => ({}),
    getActiveSlide: () => ({ children: [] }),
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: (_type, options) => {
      calls.push(options.layoutMode);
      return { element: { id: 'inserted' }, transaction: null };
    },
    finalizeInsertedElements: () => true
  });

  assert.equal(controller.insert('h2'), true);
  assert.deepEqual(calls, [[canonicalDeck, 'slide-1'], 'flow']);
});

test('element insertion controller refreshes insertion state when no active slide exists', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    getIframeDoc: () => doc,
    getActiveSlide: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return null;
    },
    updateInsertionActionState: (currentDoc) => calls.push(currentDoc)
  });

  assert.equal(controller.insert('h2'), false);
  assert.deepEqual(calls, [doc]);
});

test('element insertion controller fails closed before DOM mutation when canonical baseline construction throws', () => {
  let insertionCalls = 0;
  const calls = [];
  const doc = { id: 'doc' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionBaseline() {
            throw new Error('canonical insertion unavailable');
          }
        };
      }
    },
    getIframeDoc: () => doc,
    getActiveSlide: () => ({ children: [] }),
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: () => {
      insertionCalls += 1;
      return { element: { id: 'inserted' }, transaction: null };
    },
    updateInsertionActionState: (currentDoc) => calls.push(currentDoc)
  });

  assert.equal(controller.insert('h2'), false);
  assert.equal(insertionCalls, 0);
  assert.deepEqual(calls, [doc]);
});

test('element insertion controller preserves transaction finalization when canonical sidecar construction throws', () => {
  const calls = [];
  const element = { id: 'element-1' };
  const transaction = { id: 'tx-1' };
  const controller = elementInsertionController.createStudioEditorElementInsertionController({
    canonicalInsertionApi: {
      createStudioCanonicalInsertionMutationBuilders() {
        return {
          buildCanonicalInsertionBaseline() {
            return {
              kind: 'slidenext.deck',
              slides: [{ id: 'slide-1', nodes: [] }]
            };
          },
          buildCanonicalInsertionDeck() {
            throw new Error('canonical insertion sidecar unavailable');
          }
        };
      }
    },
    getIframeDoc: () => ({ id: 'doc' }),
    getActiveSlide: () => ({ children: [] }),
    getEditorSlideId: () => 'slide-1',
    applyElementInsertion: () => ({ element, transaction }),
    finalizeInsertedElements: (...args) => {
      calls.push(args);
      return true;
    }
  });

  assert.doesNotThrow(() => assert.equal(controller.insert('h2'), true));
  assert.deepEqual(calls, [[[element], 'Auto: Added H2', transaction, null]]);
});
