const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const blockController = require('../shared/studio-editor-block-controller.js');

test('block controller saves the active selection and finalizes persistence hooks', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  const calls = [];
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onBlocksChanged(blocks, nextDeck) {
      calls.push(['blocks', blocks.map((block) => block.id), nextDeck]);
    }
  });

  const result = controller.saveSelection({ id: 'intro', name: 'Intro Block' });

  assert.equal(result.blocks[0].name, 'Intro Block');
  assert.deepEqual(sourceDeck.blocks, undefined);
  assert.equal(calls[0][0], 'history');
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], result);
  assert.deepEqual(calls.slice(1, 3), [['save'], ['version', 'Auto: Saved Block "Intro Block"']]);
  assert.deepEqual(calls[3][0], 'blocks');
  assert.deepEqual(calls[3][1], ['intro']);
});

test('block mutations prefer a valid live canonical baseline', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  let didBuildFromDocument = false;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => liveDeck,
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    },
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1']
  });

  const result = controller.saveSelection({ id: 'live-block', name: 'Live Block' });

  assert.equal(result.blocks[0].id, 'live-block');
  assert.equal(didBuildFromDocument, false);
});

test('block controller delegates canonical deck resolution to shared state', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', text: 'Shared' }] }]
  });
  let resolverOptions = null;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: {
      createStudioEditorCanonicalDeckResolver(options) {
        resolverOptions = options;
        return () => deck;
      }
    },
    getCanonicalDeckBaseline() {
      throw new Error('shared resolver should own baseline resolution');
    },
    getCanonicalDeck() {
      throw new Error('shared resolver should own fallback resolution');
    },
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1']
  });

  const result = controller.saveSelection({ id: 'shared-block', name: 'Shared Block' });

  assert.equal(result.blocks[0].nodes[0].text, 'Shared');
  assert.equal(typeof resolverOptions.getCanonicalDeck, 'function');
  assert.equal(typeof resolverOptions.getCanonicalDeckBaseline, 'function');
  assert.equal(resolverOptions.isCanonicalDeck, canonicalDeck.isCanonicalDeck);
});

test('block mutations fall back when the live canonical baseline is invalid', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', text: 'Fallback' }] }]
  });
  let didBuildFromDocument = false;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didBuildFromDocument = true;
      return fallbackDeck;
    },
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1']
  });

  const result = controller.saveSelection({ id: 'fallback-block', name: 'Fallback Block' });

  assert.equal(result.blocks[0].id, 'fallback-block');
  assert.equal(result.blocks[0].nodes[0].text, 'Fallback');
  assert.equal(didBuildFromDocument, true);
});

test('block mutations require strict canonical baseline validation', () => {
  const fallbackDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', text: 'Fallback' }] }]
  });
  let didUseFallback = false;
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: (value) => (
      value
        && value.kind === 'slidenext.deck'
        && Array.isArray(value.slides)
        ? true
        : 1
    )
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => {
      didUseFallback = true;
      return fallbackDeck;
    },
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1']
  });

  const result = controller.saveSelection({ id: 'strict-block', name: 'Strict Block' });

  assert.equal(result.blocks[0].id, 'strict-block');
  assert.equal(didUseFallback, true);
});

test('block mutations reject malformed fallback state without a canonical validator', () => {
  const canonicalDeckApi = {
    ...canonicalDeck,
    isCanonicalDeck: undefined
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    getCanonicalDeck: () => ({ invalid: true }),
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1']
  });

  assert.equal(controller.saveSelection({ id: 'invalid-block' }), null);
});

test('block controller fails closed when saving a block canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  const calls = [];
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: {
      ...canonicalDeck,
      saveCanonicalBlockFromNodeIds() {
        throw new Error('canonical block save failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onBlocksChanged() {
      calls.push('blocks');
    }
  });

  assert.equal(controller.saveSelection({ id: 'broken-block' }), null);
  assert.deepEqual(calls, []);
});

test('block controller fails closed when selection or dependencies are unavailable', () => {
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] }),
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => []
  });

  assert.equal(controller.saveSelection({ name: 'Empty' }), null);
  assert.equal(blockController.createStudioEditorBlockController().saveSelection(), null);
});

test('block controller reports rejected canonical save without publishing block state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', text: 'Heading' }] }]
  });
  let blocksChanged = 0;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    finalizeMutation: () => false,
    onBlocksChanged: () => { blocksChanged += 1; }
  });

  assert.equal(controller.saveSelection({ id: 'rejected-block' }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(sourceDeck, 'blocks'), false);
  assert.equal(blocksChanged, 0);
});

test('block controller does not publish a saved block when history capture fails', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  let blocksChanged = 0;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    saveHistoryState: () => false,
    onBlocksChanged: () => { blocksChanged += 1; }
  });

  assert.equal(controller.saveSelection({ id: 'rejected-block' }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(sourceDeck, 'blocks'), false);
  assert.equal(blocksChanged, 0);
});

test('block controller does not publish a saved block when history capture throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  let blocksChanged = 0;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    saveHistoryState: () => {
      throw new Error('history unavailable');
    },
    onBlocksChanged: () => { blocksChanged += 1; }
  });

  assert.equal(controller.saveSelection({ id: 'rejected-block' }), null);
  assert.equal(Object.prototype.hasOwnProperty.call(sourceDeck, 'blocks'), false);
  assert.equal(blocksChanged, 0);
});

test('block controller rejects object-form history capture failures', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  let blocksChanged = 0;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    saveHistoryState: () => ({ didCapture: false }),
    onBlocksChanged: () => { blocksChanged += 1; }
  });

  assert.equal(controller.saveSelection({ id: 'rejected-block' }), null);
  assert.equal(blocksChanged, 0);
});

test('block controller removes a saved block and finalizes persistence hooks', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [
      { id: 'hero', name: 'Hero' },
      { id: 'stats', name: 'Stats' }
    ],
    slides: [{ id: 'slide-1' }]
  });
  const calls = [];
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onBlocksChanged(blocks, nextDeck) {
      calls.push(['blocks', blocks.map((block) => block.id), nextDeck]);
    }
  });

  const result = controller.removeBlock('hero');

  assert.deepEqual(sourceDeck.blocks.map((block) => block.id), ['hero', 'stats']);
  assert.deepEqual(result.blocks.map((block) => block.id), ['stats']);
  assert.equal(calls[0][0], 'history');
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], result);
  assert.deepEqual(calls.slice(1, 3), [['save'], ['version', 'Auto: Removed Block "Hero"']]);
  assert.deepEqual(calls[3][0], 'blocks');
  assert.deepEqual(calls[3][1], ['stats']);
});

test('block controller reports rejected canonical removal without publishing block state', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{ id: 'hero', name: 'Hero' }],
    slides: [{ id: 'slide-1' }]
  });
  let blocksChanged = 0;
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    finalizeMutation: () => false,
    onBlocksChanged: () => { blocksChanged += 1; }
  });

  assert.equal(controller.removeBlock('hero'), null);
  assert.deepEqual(sourceDeck.blocks.map((block) => block.id), ['hero']);
  assert.equal(blocksChanged, 0);
});

test('block controller fails closed when removing a block canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{ id: 'hero', name: 'Hero' }],
    slides: [{ id: 'slide-1' }]
  });
  const calls = [];
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: {
      ...canonicalDeck,
      removeCanonicalBlock() {
        throw new Error('canonical block removal failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    saveHistoryState() {
      calls.push('history');
    },
    triggerAutoSave() {
      calls.push('save');
    },
    triggerAutoVersion() {
      calls.push('version');
    },
    onBlocksChanged() {
      calls.push('blocks');
    }
  });

  assert.equal(controller.removeBlock('hero'), null);
  assert.deepEqual(calls, []);
});

test('block controller fails closed when inserting a block canonical mutation throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{ id: 'hero', nodes: [{ id: 'heading', tagName: 'h2', text: 'Hero' }] }],
    slides: [{ id: 'slide-1' }]
  });
  let appendCount = 0;
  const activeSlide = {
    appendChild() {
      appendCount += 1;
    }
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: {
      ...canonicalDeck,
      insertCanonicalBlockInstance() {
        throw new Error('canonical block insertion failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getDocument: () => ({}),
    getActiveSlide: () => activeSlide,
    getActiveSlideId: () => 'slide-1'
  });

  assert.equal(controller.insertBlock('hero'), false);
  assert.equal(appendCount, 0);
});

test('block controller fails closed when rendering an inserted block node throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{ id: 'hero', nodes: [{ id: 'heading', tagName: 'h2', text: 'Hero' }] }],
    slides: [{ id: 'slide-1' }]
  });
  let appendCount = 0;
  const activeSlide = {
    appendChild() {
      appendCount += 1;
    }
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalNode() {
        throw new Error('block node rendering failed');
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getDocument: () => ({
      createElement() {
        return {};
      }
    }),
    getActiveSlide: () => activeSlide,
    getActiveSlideId: () => 'slide-1'
  });

  assert.equal(controller.insertBlock('hero'), false);
  assert.equal(appendCount, 0);
});

test('block controller renders and inserts canonical block nodes through a markup transaction', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{
      id: 'hero',
      nodes: [{ id: 'heading', tagName: 'h2', text: 'Hero' }]
    }],
    slides: [{ id: 'slide-1' }]
  });
  const slide = {
    children: [],
    innerHTML: '',
    appendChild(element) {
      this.children.push(element);
      this.innerHTML = this.children.map((child) => child.outerHTML).join('');
    }
  };
  const documentRef = {
    createElement(tagName) {
      if (tagName !== 'template') return null;
      let markup = '';
      const rootElement = {
        dataset: {},
        children: [],
        get outerHTML() {
          return `<h2 data-editor-id="${this.dataset.editorId}">${this.textContent}</h2>`;
        },
        textContent: 'Hero'
      };
      return {
        set innerHTML(value) {
          markup = value;
        },
        get innerHTML() {
          return markup;
        },
        content: { get firstElementChild() { return rootElement; } }
      };
    }
  };
  const calls = [];
  const lookupCalls = [];
  const canonicalDeckApi = {
    ...canonicalDeck,
    findCanonicalSlideById(deck, slideId) {
      lookupCalls.push([deck, slideId]);
      return canonicalDeck.findCanonicalSlideById(deck, slideId);
    }
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi,
    renderApi: {
      renderCanonicalNode(node) {
        return `<h2>${node.text}</h2>`;
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getDocument: () => documentRef,
    getActiveSlide: () => slide,
    getActiveSlideId(currentDocument) {
      assert.equal(currentDocument, documentRef);
      return 'slide-1';
    },
    createMarkupTransactionCapture() {
      return {
        createTransaction() {
          return { kind: 'markup-transaction' };
        }
      };
    },
    finalizeInsertedElements(elements, versionLabel, transaction, nextDeck) {
      calls.push({ elements, versionLabel, transaction, nextDeck });
      return true;
    }
  });

  assert.equal(controller.insertBlock('hero'), true);
  assert.equal(slide.children.length, 1);
  assert.equal(slide.children[0].dataset.editorId, 'hero-heading');
  assert.equal(calls[0].versionLabel, 'Auto: Inserted Block "hero"');
  assert.equal(calls[0].transaction.kind, 'markup-transaction');
  assert.equal(calls[0].nextDeck.slides[0].nodes[0].id, 'hero-heading');
  assert.deepEqual(lookupCalls.map(([, slideId]) => slideId), ['slide-1', 'slide-1']);
});

test('block controller removes inserted nodes when history capture fails', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{
      id: 'hero',
      nodes: [{ id: 'heading', tagName: 'h2', text: 'Hero' }]
    }],
    slides: [{ id: 'slide-1' }]
  });
  const slide = {
    children: [],
    appendChild(element) {
      element.parentNode = this;
      this.children.push(element);
    },
    removeChild(element) {
      const index = this.children.indexOf(element);
      if (index < 0) throw new Error('missing child');
      this.children.splice(index, 1);
      element.parentNode = null;
    }
  };
  const documentRef = {
    createElement() {
      const element = { dataset: {}, children: [] };
      return {
        content: { firstElementChild: element },
        set innerHTML(value) {
          this.markup = value;
        }
      };
    }
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalNode() {
        return '<h2>Hero</h2>';
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getDocument: () => documentRef,
    getActiveSlide: () => slide,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState: () => ({ didCapture: false })
  });

  assert.equal(controller.insertBlock('hero'), false);
  assert.deepEqual(slide.children, []);
});

test('block controller removes inserted nodes when history capture throws', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    blocks: [{
      id: 'hero',
      nodes: [{ id: 'heading', tagName: 'h2', text: 'Hero' }]
    }],
    slides: [{ id: 'slide-1' }]
  });
  const slide = {
    children: [],
    appendChild(element) {
      element.parentNode = this;
      this.children.push(element);
    },
    removeChild(element) {
      const index = this.children.indexOf(element);
      if (index < 0) throw new Error('missing child');
      this.children.splice(index, 1);
      element.parentNode = null;
    }
  };
  const documentRef = {
    createElement() {
      const element = { dataset: {}, children: [] };
      return {
        content: { firstElementChild: element },
        set innerHTML(value) {
          this.markup = value;
        }
      };
    }
  };
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    renderApi: {
      renderCanonicalNode() {
        return '<h2>Hero</h2>';
      }
    },
    getCanonicalDeck: () => sourceDeck,
    getDocument: () => documentRef,
    getActiveSlide: () => slide,
    getActiveSlideId: () => 'slide-1',
    saveHistoryState: () => {
      throw new Error('history unavailable');
    }
  });

  assert.equal(controller.insertBlock('hero'), false);
  assert.deepEqual(slide.children, []);
});
