const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalNodeAdapter = require('../shared/studio-editor-canonical-node-adapter.js');
const canonicalLayout = require('../shared/studio-editor-canonical-layout.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalReaderAdapter = require('../shared/studio-editor-canonical-reader-adapter.js');
const layerOrder = require('../shared/studio-editor-layer-order.js');
const layerOrderMutation = require('../shared/studio-editor-layer-order-mutation.js');
const layerOrderTransaction = require('../shared/studio-editor-layer-order-transaction.js');
const layerOrderRollback = require('../shared/studio-editor-layer-order-rollback.js');
const layerOrderRollbackAdapter = require('../shared/studio-editor-layer-order-rollback-adapter.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const deckMutation = require('../shared/studio-editor-deck-mutation.js');
const layerOrderController = require('../shared/studio-editor-layer-order-controller.js');
const layerController = require('../shared/studio-editor-layer-controller.js');
const layerAccessors = require('../shared/studio-editor-layer-accessors.js');
const selectionFixture = require('./helpers/studio-selection-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = selectionFixture.extractSelectionAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function loadFinalizeLayerOrderMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeLayerOrderMutation(versionLabel = \'Auto: Rearranged Layers\', options = {}) {',
    '\n\n    function syncLayerOrderZIndexInput(target) {'
  );
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(helperSource, context);
}

function loadSyncLayerOrderZIndexInput(fileContent, context) {
  context.SlideNextStudioEditorCanonicalReaderAdapter = canonicalReaderAdapter;
  const canonicalUiSource = fs.readFileSync(
    path.join(__dirname, '..', 'shared', 'studio-editor-canonical-ui.js'),
    'utf8'
  );
  const canonicalUiResolverSource = extractFunctionSource(
    fileContent,
    'function resolveEditorUiCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function buildEditorMutationCanonicalDeck'
  );
  const canonicalNodeResolverSource = extractFunctionSource(
    fileContent,
    'function resolveEditorCanonicalNodeForElement(element, canonicalDeck = null) {',
    '\n\n    function getLiveSelectedElements(elements = selectedElements, doc = getIframeDoc()) {'
  );
  const syncSource = extractFunctionSource(
    fileContent,
    'function syncLayerOrderZIndexInput(target) {',
    '\n\n    function refreshLayerOrderUi(options = {}) {'
  );
  context.SlideNextStudioEditorCanonicalNodeAdapter = canonicalNodeAdapter;
  vm.runInContext(
    `${canonicalUiSource}\n${canonicalUiResolverSource}\n${canonicalNodeResolverSource}\n${syncSource}`,
    context
  );
}

function loadRefreshLayerOrderUi(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function refreshLayerOrderUi(options = {}) {',
    '\n\n    // Rearrange Selected Element Layers'
  );
  vm.runInContext(helperSource, context);
}

function loadBuildLayerOrderSelectionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildLayerOrderSelectionActionState(elements, options = {}) {',
    '\n\n    function updateLayerOrderActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadReorderSlideLayers(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function reorderSlideLayers(action, targetElements = selectedElements, options = {}) {',
    '\n\n    function resolveEditableTarget(node) {'
  );
  vm.runInContext(helperSource, context);
}

function loadLayerOrderMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorLayerOrderMutationWithTransaction(slide, initialOrder, nextOrder, options = {}) {',
    'function reorderSlideLayers(action, targetElements = selectedElements, options = {}) {'
  );
  context.SlideNextStudioEditorLayerOrderMutation = layerOrderMutation;
  context.SlideNextStudioEditorLayerOrderTransaction = layerOrderTransaction;
  vm.runInContext(helperSource, context);
}

function loadLayerOrderRollbackHelper(fileContent, context) {
  context.SlideNextStudioEditorLayerOrderRollback = layerOrderRollback;
  context.SlideNextStudioEditorLayerOrderRollbackAdapter = layerOrderRollbackAdapter;
  const helperSource = extractFunctionSource(
    fileContent,
    'function rollbackEditorLayerOrderMutation(transaction, sourceDoc = getIframeDoc()) {',
    'function reorderSlideLayers(action, targetElements = selectedElements, options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function installLayerOrderController(context) {
  context.studioEditorLayerOrderController = layerOrderController.createStudioEditorLayerOrderController({
    layerOrderApi: context.SlideNextStudioEditorLayerOrder,
    canonicalLayoutApi: context.SlideNextStudioEditorCanonicalLayout,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    getActiveSlide: context.getActiveSlide,
    getIframeDoc: context.getIframeDoc,
    getNormalizedSlideLayerOrder: context.getNormalizedSlideLayerOrder,
    isElementLocked: context.isElementLocked,
    assignElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    applyLayerOrderMutation: context.applyEditorLayerOrderMutationWithTransaction,
    rollbackLayerOrderMutation: context.rollbackEditorLayerOrderMutation
  });
}

function createControls() {
  return {
    arrangeLayerFrontBtn: { disabled: true },
    arrangeLayerBackBtn: { disabled: true },
    arrangeLayerForwardBtn: { disabled: true },
    arrangeLayerBackwardBtn: { disabled: true },
    elZIndex: { disabled: true }
  };
}

function getDisabledStates(controls) {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, control.disabled]));
}

test('buildLayerOrderSelectionActionState reuses the current slide ordering and live deck guard', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selection = [{ id: 'selected' }];
  const slide = { id: 'slide-1' };
  const orderedElements = [{ id: 'selected' }, { id: 'other' }];
  const calls = [];
  const context = {
    selectedElements: selection,
    SlideNextStudioEditorLayerOrder: {
      buildStudioLayerOrderActionState(elements, options = {}) {
        calls.push(['buildStudioLayerOrderActionState', elements, options.orderedElements]);
        return {
          canBringToFront: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true,
          canSendToBack: false,
          canBringForward: true,
          canSendBackward: false
        };
      }
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return slide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { activeSlide: slide };
    },
    getNormalizedSlideLayerOrder(currentSlide) {
      calls.push(['getNormalizedSlideLayerOrder', currentSlide]);
      return orderedElements;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    }
  };

  vm.createContext(context);
  loadBuildLayerOrderSelectionActionState(fileContent, context);

  const actionState = context.buildLayerOrderSelectionActionState();

  assert.equal(actionState.canBringToFront, true);
  assert.equal(actionState.canBringForward, true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', { activeSlide: slide }],
    ['getNormalizedSlideLayerOrder', slide],
    ['buildStudioLayerOrderActionState', selection, orderedElements]
  ]);
});

test('buildLayerOrderSelectionActionState fails closed when all shared layer-order builders are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioEditorLayerOrder: {},
    getIframeDoc() {
      throw new Error('document should not be read without a layer-order builder');
    },
    getStudioSelectedElements() {
      throw new Error('selection should not be read without a layer-order builder');
    }
  };

  vm.createContext(context);
  loadBuildLayerOrderSelectionActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildLayerOrderSelectionActionState([]))),
    {
      selection: [],
      hasSelection: false,
      hasLockedSelection: false,
      canReorder: false,
      canBringToFront: false,
      canSendToBack: false,
      canBringForward: false,
      canSendBackward: false
    }
  );
});

test('reorderSlideLayers forwards a reversible z-index transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const first = {
    isConnected: true,
    dataset: { editorId: 'node-1' },
    style: { zIndex: '0' }
  };
  const second = {
    isConnected: true,
    dataset: { editorId: 'node-2' },
    style: { zIndex: '1' }
  };
  const slide = { id: 'slide-1' };
  slide.contains = (element) => element === first || element === second;
  const transactions = [];
  const context = {
    selectedElements: [first],
    SlideNextStudioEditorLayerOrder: layerOrder,
    SlideNextStudioEditorTransaction: studioTransaction,
    getActiveSlide() {
      return slide;
    },
    getNormalizedSlideLayerOrder() {
      return [first, second];
    },
    isElementLocked() {
      return false;
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    applySlideLayerOrder(currentSlide, orderedElements) {
      assert.equal(currentSlide, slide);
      orderedElements.forEach((element, index) => {
        element.style.zIndex = String(index);
      });
      return orderedElements;
    }
  };

  vm.createContext(context);
  loadLayerOrderMutationHelper(fileContent, context);
  installLayerOrderController(context);
  loadReorderSlideLayers(fileContent, context);

  assert.equal(context.reorderSlideLayers('front', [first], {
    onTransaction(transaction) {
      transactions.push(transaction);
    }
  }), true);
  assert.deepEqual(transactions, [{
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [
      {
        type: 'style',
        elementId: 'node-1',
        before: { zIndex: '0' },
        after: { zIndex: '1' }
      },
      {
        type: 'style',
        elementId: 'node-2',
        before: { zIndex: '1' },
        after: { zIndex: '0' }
      }
    ]
  }]);
});

test('reorderSlideLayers forwards canonical z-index updates after applying layer order', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const first = {
    isConnected: true,
    dataset: { editorId: 'node-1' },
    style: { zIndex: '0' }
  };
  const second = {
    isConnected: true,
    dataset: { editorId: 'node-2' },
    style: { zIndex: '1' }
  };
  const slide = { id: 'slide-1' };
  slide.contains = (element) => element === first || element === second;
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'node-1', layout: { zIndex: 0 } },
        { id: 'node-2', layout: { zIndex: 1 } }
      ]
    }]
  });
  let nextCanonicalDeck = null;
  const context = {
    selectedElements: [first],
    SlideNextCanonicalDeck: canonicalDeck,
    SlideNextStudioEditorCanonicalLayout: canonicalLayout,
    SlideNextStudioEditorLayerOrder: layerOrder,
    SlideNextStudioEditorTransaction: studioTransaction,
    getActiveSlide() {
      return slide;
    },
    getNormalizedSlideLayerOrder() {
      return [first, second];
    },
    buildEditorCanonicalDeck() {
      return sourceDeck;
    },
    isElementLocked() {
      return false;
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    applySlideLayerOrder(currentSlide, orderedElements) {
      assert.equal(currentSlide, slide);
      orderedElements.forEach((element, index) => {
        element.style.zIndex = String(index);
      });
      return orderedElements;
    }
  };

  vm.createContext(context);
  loadLayerOrderMutationHelper(fileContent, context);
  installLayerOrderController(context);
  loadReorderSlideLayers(fileContent, context);

  assert.equal(context.reorderSlideLayers('front', [first], {
    onCanonicalDeck(deck) {
      nextCanonicalDeck = deck;
    }
  }), true);
  assert.equal(nextCanonicalDeck.slides[0].nodes[0].layout.zIndex, 1);
  assert.equal(nextCanonicalDeck.slides[0].nodes[1].layout.zIndex, 0);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 0);
});

test('finalizeLayerOrderMutation refreshes layer chrome before versioning', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);

  const result = context.finalizeLayerOrderMutation();

  assert.equal(result, 'Auto: Rearranged Layers');
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['updateLayersList'],
    ['updateLayerOrderActionState'],
    ['triggerAutoVersion', 'Auto: Rearranged Layers']
  ]);
});

test('finalizeLayerOrderMutation reuses the shared deck mutation lifecycle when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { id: 'layer-order-tx' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegatedOptions = null;
  const calls = [];
  const context = {
    finalizeEditorDeckMutation(label, options) {
      delegatedOptions = { label, options };
      return 'delegated';
    },
    updateLayerOrderActionState() {
      calls.push('updateLayerOrderActionState');
    },
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {},
    updateLayersList() {}
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);

  assert.equal(context.finalizeLayerOrderMutation('Auto: Layer Order', {
    transaction,
    canonicalDeck
  }), 'delegated');
  assert.equal(delegatedOptions.label, 'Auto: Layer Order');
  assert.equal(delegatedOptions.options.refreshThumbnails, false);
  assert.equal(delegatedOptions.options.refreshLayersList, true);
  assert.equal(delegatedOptions.options.transaction.id, transaction.id);
  assert.equal(delegatedOptions.options.canonicalDeck, canonicalDeck);
  assert.deepEqual(calls, ['updateLayerOrderActionState']);
});

test('finalizeLayerOrderMutation delegates its lifecycle adapter to shared mutation state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { id: 'layer-order-tx' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorMutation: {
      finalizeStudioLayerOrderMutation(options) {
        delegatedOptions = options;
        return 'shared-layer-order';
      }
    },
    finalizeEditorDeckMutation() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    updateLayersList() {},
    updateLayerOrderActionState() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);

  assert.equal(context.finalizeLayerOrderMutation('Auto: Layer Order', {
    transaction,
    canonicalDeck
  }), 'shared-layer-order');
  assert.equal(delegatedOptions.versionLabel, 'Auto: Layer Order');
  assert.equal(delegatedOptions.transaction.id, transaction.id);
  assert.equal(delegatedOptions.canonicalDeck, canonicalDeck);
  assert.equal(delegatedOptions.finalizeMutation, context.finalizeEditorDeckMutation);
  assert.equal(delegatedOptions.updateLayerOrderActionState, context.updateLayerOrderActionState);
});

test('syncLayerOrderZIndexInput updates the z-index inspector only when a target and input are available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const zIndexInput = { value: '' };
  const calls = [];
  const context = {
    SlideNextStudioEditorLayerController: layerController,
    SlideNextStudioEditorLayerOrder: layerOrder,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return id === 'elZIndex' ? zIndexInput : null;
      }
    }
  };

  vm.createContext(context);
  loadSyncLayerOrderZIndexInput(fileContent, context);

  assert.equal(context.syncLayerOrderZIndexInput(null), null);
  const result = context.syncLayerOrderZIndexInput({ style: { zIndex: '12' } });

  assert.equal(result, zIndexInput);
  assert.equal(zIndexInput.value, '12');
  assert.deepEqual(calls, [['getElementById', 'elZIndex']]);
});

test('syncLayerOrderZIndexInput resolves the canonical node for the selected target', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const zIndexInput = { value: '' };
  const canonicalTarget = { id: 'node-1', layout: { zIndex: 7 } };
  const context = {
    SlideNextStudioEditorLayerOrder: layerOrder,
    SlideNextCanonicalDeck: canonicalDeck,
    document: {
      getElementById(id) {
        return id === 'elZIndex' ? zIndexInput : null;
      }
    },
    getIframeDoc() {
      return { id: 'iframe-document' };
    },
    buildEditorCanonicalDeck() {
      return {
        slides: [{ nodes: [canonicalTarget] }]
      };
    }
  };

  vm.createContext(context);
  loadSyncLayerOrderZIndexInput(fileContent, context);

  assert.equal(context.syncLayerOrderZIndexInput({
    dataset: { editorId: 'node-1' },
    style: { zIndex: '12' }
  }), zIndexInput);
  assert.equal(zIndexInput.value, '7');
});

test('syncLayerOrderZIndexInput prefers the live canonical deck before rebuilding the frame', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const zIndexInput = { value: '' };
  const liveCanonicalTarget = { id: 'node-1', layout: { zIndex: 19 } };
  const targetDocument = { id: 'target-document' };
  let buildCalls = 0;
  const context = {
    SlideNextStudioEditorLayerOrder: layerOrder,
    SlideNextCanonicalDeck: canonicalDeck,
    document: {
      getElementById(id) {
        return id === 'elZIndex' ? zIndexInput : null;
      }
    },
    getIframeDoc() {
      throw new Error('target document should avoid the global iframe fallback');
    },
    getStudioEditorSessionToken() {
      return 41;
    },
    resolveEditorLiveCanonicalDeck(sourceDoc, sessionToken) {
      assert.equal(sourceDoc, targetDocument);
      assert.equal(sessionToken, 41);
      return { slides: [{ nodes: [liveCanonicalTarget] }] };
    },
    buildEditorCanonicalDeck() {
      buildCalls += 1;
      throw new Error('DOM rebuild should not run when live layer metadata is available');
    }
  };

  vm.createContext(context);
  loadSyncLayerOrderZIndexInput(fileContent, context);

  assert.equal(context.syncLayerOrderZIndexInput({
    dataset: { editorId: 'node-1' },
    ownerDocument: targetDocument,
    style: { zIndex: '12' }
  }), zIndexInput);
  assert.equal(zIndexInput.value, '19');
  assert.equal(buildCalls, 0);
});

test('refreshLayerOrderUi refreshes layer state and optionally the layer list', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    SlideNextStudioEditorLayerController: layerController,
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadRefreshLayerOrderUi(fileContent, context);

  assert.equal(context.refreshLayerOrderUi(), false);
  assert.equal(context.refreshLayerOrderUi({ refreshLayersList: true, result: null }), null);
  assert.deepEqual(calls, [
    ['updateLayerOrderActionState'],
    ['updateLayersList'],
    ['updateLayerOrderActionState']
  ]);
});

test('refreshLayerOrderUi delegates its refresh contract to the shared layer controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorLayerController: {
      refreshStudioLayerOrderUi(options) {
        delegatedOptions = options;
        return 'shared-refresh';
      }
    },
    updateLayersList() {},
    updateLayerOrderActionState() {}
  };

  vm.createContext(context);
  loadRefreshLayerOrderUi(fileContent, context);

  assert.equal(context.refreshLayerOrderUi({ refreshLayersList: true, result: null }), 'shared-refresh');
  assert.equal(delegatedOptions.refreshLayersList, true);
  assert.equal(delegatedOptions.result, null);
  assert.equal(delegatedOptions.updateLayersList, context.updateLayersList);
  assert.equal(delegatedOptions.updateLayerOrderActionState, context.updateLayerOrderActionState);
});

test('updateLayerOrderActionState enables layer order controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayerOrderActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLayerOrderActionState(doc = getIframeDoc()) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );

  const controls = createControls();
  const activeSlide = { id: 'slide-1' };
  const context = {
    selectedElements: [{ id: 'selected', isConnected: true }],
    SlideNextStudioEditorLayerOrder: {
      buildStudioLayerOrderActionState(elements, options = {}) {
        const canReorder = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canBringToFront: canReorder,
          canSendToBack: canReorder,
          canBringForward: canReorder,
          canSendBackward: canReorder
        };
      },
      syncStudioLayerOrderToolbarState(options = {}) {
        const actionState = this.buildStudioLayerOrderActionState(options.elements, options);
        const zIndexMutationPlan = options.buildZIndexMutationPlan(options.elements, options);
        return layerOrder.renderStudioLayerOrderToolbarState({
          documentRef: options.documentRef,
          actionState,
          zIndexCanApply: !!zIndexMutationPlan.canApply
        });
      },
      renderStudioLayerOrderToolbarState(options) {
        return layerOrder.renderStudioLayerOrderToolbarState(options);
      }
    },
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan(elements, prop, value, options = {}) {
        return {
          canApply: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      }
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getNormalizedSlideLayerOrder(slide) {
      return slide === activeSlide ? [{ id: 'selected' }] : [];
    },
    getIframeDoc() {
      return null;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  loadBuildLayerOrderSelectionActionState(fileContent, context);
  vm.runInContext(updateLayerOrderActionStateSource, context);

  context.updateLayerOrderActionState(null);
  assert.deepEqual(getDisabledStates(controls), {
    arrangeLayerFrontBtn: true,
    arrangeLayerBackBtn: true,
    arrangeLayerForwardBtn: true,
    arrangeLayerBackwardBtn: true,
    elZIndex: true
  });

  context.updateLayerOrderActionState({
    activeSlide
  });
  assert.deepEqual(getDisabledStates(controls), {
    arrangeLayerFrontBtn: false,
    arrangeLayerBackBtn: false,
    arrangeLayerForwardBtn: false,
    arrangeLayerBackwardBtn: false,
    elZIndex: false
  });
});

test('reorderSlideLayers delegates order application to the shared layer-order module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function reorderSlideLayers(action, targetElements = selectedElements, options = {}) {',
    '\n\n    function resolveEditableTarget(node) {'
  );
  const first = { isConnected: true, dataset: {}, style: { zIndex: '0' } };
  const second = { isConnected: true, dataset: {}, style: { zIndex: '1' } };
  const slide = { contains: () => true };
  const calls = [];
  const context = {
    selectedElements: [first],
    SlideNextStudioEditorLayerOrder: {
      buildStudioLayerOrderMutationPlan() {
        return {
          didChange: true,
          nextOrder: [second, first]
        };
      },
      applyStudioLayerOrderWithTransaction(currentSlide, initialOrder, nextOrder, options) {
        calls.push(['applyStudioLayerOrderWithTransaction', currentSlide, initialOrder, nextOrder, options]);
        return { didApply: true, transaction: { type: 'style' } };
      }
    },
    getActiveSlide() {
      return slide;
    },
    getNormalizedSlideLayerOrder() {
      return [first, second];
    },
    isElementLocked() {
      return false;
    },
    applySlideLayerOrder() {},
    finalizeEditorDeckMutation() {}
  };

  vm.createContext(context);
  loadLayerOrderMutationHelper(fileContent, context);
  installLayerOrderController(context);
  vm.runInContext(source, context);

  let captured = null;
  assert.equal(context.reorderSlideLayers('front', [first], {
    onTransaction(transaction) {
      captured = transaction;
    }
  }), true);
  assert.equal(calls[0][0], 'applyStudioLayerOrderWithTransaction');
  assert.equal(calls[0][1], slide);
  assert.deepEqual(captured, { type: 'style' });
});

test('applyEditorLayerOrderMutationWithTransaction delegates to the shared transaction adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slide = { id: 'slide-1' };
  const initialOrder = [{ id: 'node-1' }];
  const nextOrder = [{ id: 'node-2' }];
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorLayerOrder: {
      applyStudioLayerOrderWithTransaction(currentSlide, currentInitialOrder, currentNextOrder, options) {
        delegatedOptions = { currentSlide, currentInitialOrder, currentNextOrder, options };
        return { didApply: true, transaction: { type: 'style' } };
      }
    },
    SlideNextStudioEditorTransaction: {
      createStudioStyleTransaction() {}
    },
    applySlideLayerOrder() {},
    assignEditorElementId() {
      return 'assigned-node';
    }
  };

  vm.createContext(context);
  loadLayerOrderMutationHelper(fileContent, context);

  const result = context.applyEditorLayerOrderMutationWithTransaction(slide, initialOrder, nextOrder);

  assert.deepEqual(result, { didApply: true, transaction: { type: 'style' } });
  assert.equal(delegatedOptions.currentSlide, slide);
  assert.equal(delegatedOptions.currentInitialOrder, initialOrder);
  assert.equal(delegatedOptions.currentNextOrder, nextOrder);
  assert.equal(typeof delegatedOptions.options.getElementId, 'function');
  assert.equal(typeof delegatedOptions.options.applyLayerOrder, 'function');
});

test('updateLayerOrderActionState reuses the shared layer-order toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayerOrderActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLayerOrderActionState(doc = getIframeDoc()) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );

  const controls = createControls();
  const activeSlide = { id: 'slide-1' };
  const calls = [];
  const context = {
    selectedElements: [{ id: 'selected', isConnected: true }],
    SlideNextStudioEditorLayerOrder: {
      buildStudioLayerOrderActionState() {
        throw new Error('buildStudioLayerOrderActionState should not be used when shared toolbar helper exists');
      },
      buildStudioLayerOrderToolbarState(elements, options = {}) {
        calls.push({
          elements,
          orderedElements: options.orderedElements,
          zIndexMutationPlan: options.buildZIndexMutationPlan(elements, options),
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canMutateDeck: options.canMutateDeck()
        });
        return {
          buttonStates: {
            arrangeLayerFrontBtn: true,
            arrangeLayerBackBtn: false,
            arrangeLayerForwardBtn: true,
            arrangeLayerBackwardBtn: false
          },
          controlStates: {
            elZIndex: true
          }
        };
      },
      syncStudioLayerOrderToolbarState(options = {}) {
        const actionState = this.buildStudioLayerOrderToolbarState(options.elements, options);
        return layerOrder.renderStudioLayerOrderToolbarState({
          documentRef: options.documentRef,
          actionState
        });
      },
      renderStudioLayerOrderToolbarState(options) {
        return layerOrder.renderStudioLayerOrderToolbarState(options);
      }
    },
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan(elements, prop, value, options = {}) {
        return {
          canApply: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      }
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getNormalizedSlideLayerOrder(slide) {
      return slide === activeSlide ? [{ id: 'selected' }] : [];
    },
    getIframeDoc() {
      return null;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  loadBuildLayerOrderSelectionActionState(fileContent, context);
  vm.runInContext(updateLayerOrderActionStateSource, context);

  context.updateLayerOrderActionState({
    activeSlide
  });
  assert.deepEqual(getDisabledStates(controls), {
    arrangeLayerFrontBtn: false,
    arrangeLayerBackBtn: true,
    arrangeLayerForwardBtn: false,
    arrangeLayerBackwardBtn: true,
    elZIndex: false
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    elements: [{ id: 'selected', isConnected: true }],
    orderedElements: [{ id: 'selected' }],
    zIndexMutationPlan: {
      canApply: true
    },
    hasCanMutateDeck: true,
    canMutateDeck: true
  }]);
});

test('updateLayerOrderActionState delegates toolbar state assembly to the shared layer-order view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayerOrderActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLayerOrderActionState(doc = getIframeDoc()) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );
  const selectedElement = { id: 'selected', isConnected: true, locked: false };
  const activeSlide = { id: 'slide-1' };
  const calls = [];
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorLayerOrder: {
      syncStudioLayerOrderToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        return { canApply: true };
      }
    },
    document: {},
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getNormalizedSlideLayerOrder(slide) {
      return slide === activeSlide ? [selectedElement] : [];
    },
    isElementLocked(element) {
      return !!element.locked;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLayerOrderActionStateSource, context);

  const doc = { activeSlide };
  assert.equal(context.updateLayerOrderActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.match(
    updateLayerOrderActionStateSource,
    /selectedElements: getStudioSelectedElements\(doc\)/
  );
  assert.match(
    updateLayerOrderActionStateSource,
    /elements: getStudioSelectedElements\(doc\)/
  );
  assert.equal(calls[0].documentRef, context.document);
  assert.deepEqual(calls[0].elements, [selectedElement]);
  assert.deepEqual(calls[0].orderedElements, [selectedElement]);
  assert.equal(calls[0].isLocked(selectedElement), false);
  assert.equal(calls[0].canMutateDeck(), true);
  assert.equal(calls[0].buildZIndexMutationPlan([selectedElement]).canApply, true);
});

test('updateLayerOrderActionState prefers canonical lock metadata for toolbar actions', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityReaderSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  const updateLayerOrderActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLayerOrderActionState(doc = getIframeDoc()) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );
  const selectedElement = { id: 'selected', isConnected: true, locked: false };
  const activeSlide = { id: 'slide-1' };
  let receivedOptions = null;
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorCanonicalReaderAdapter: canonicalReaderAdapter,
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorLayerOrder: {
      syncStudioLayerOrderToolbarState(options) {
        receivedOptions = options;
        return 'delegated';
      }
    },
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        return { canApply: true };
      }
    },
    document: {},
    buildEditorCanonicalDeck() {
      return { kind: 'slidenext.deck' };
    },
    resolveEditorCanonicalNodeForElement(element) {
      return element === selectedElement
        ? { visibility: { locked: true } }
        : null;
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getNormalizedSlideLayerOrder() {
      return [selectedElement];
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${visibilityReaderSource}\n${updateLayerOrderActionStateSource}`, context);

  assert.equal(context.updateLayerOrderActionState({ activeSlide }), 'delegated');
  assert.equal(receivedOptions.isLocked(selectedElement), true);
});

test('updateLayerOrderActionState delegates state assembly to the shared layer controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectedElement = { id: 'selected', isConnected: true };
  const activeSlide = { id: 'slide-1' };
  let delegatedOptions = null;
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorLayerController: {
      syncStudioLayerOrderActionState(options) {
        delegatedOptions = options;
        return 'shared-layer-controller';
      }
    },
    document: {},
    getActiveSlide() {
      return activeSlide;
    },
    getNormalizedSlideLayerOrder() {
      return [selectedElement];
    },
    isElementLocked() {},
    buildLayerOrderSelectionActionState() {}
  };

  vm.createContext(context);
  const updateLayerOrderActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLayerOrderActionState(doc = getIframeDoc()) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );
  vm.runInContext(updateLayerOrderActionStateSource, context);

  const doc = { id: 'iframe-doc' };
  assert.equal(context.updateLayerOrderActionState(doc), 'shared-layer-controller');
  assert.equal(delegatedOptions.documentRef, context.document);
  assert.equal(delegatedOptions.doc, doc);
  assert.deepEqual(delegatedOptions.selectedElements, [selectedElement]);
  assert.equal(delegatedOptions.getActiveSlide, context.getActiveSlide);
  assert.equal(delegatedOptions.buildLayerOrderSelectionActionState, context.buildLayerOrderSelectionActionState);
});

test('arrangeElementLayer returns false when there is no live reorder target or no layer change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action, doc) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );

  const calls = [];
  const context = {
    SlideNextStudioEditorLayerController: layerController,
    document: {
      getElementById(id) {
        if (id === 'elZIndex') {
          calls.push(['getElementById', id]);
          return { value: '' };
        }
        return null;
      }
    },
    getLiveSelectedElements() {
      calls.push(['getLiveSelectedElements']);
      return [];
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectionHasLockedElements() {
      calls.push(['selectionHasLockedElements']);
      return false;
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('front'), false);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['updateLayerOrderActionState']
  ]);

  const target = { style: { zIndex: '7' } };
  calls.length = 0;
  context.getLiveSelectedElements = () => {
    calls.push(['getLiveSelectedElements']);
    return [target];
  };
  context.reorderSlideLayers = (action, targets) => {
    calls.push(['reorderSlideLayers', action, targets]);
    return false;
  };

  assert.equal(context.arrangeElementLayer('front'), false);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['selectionHasLockedElements'],
    ['reorderSlideLayers', 'front', [target]],
    ['updateLayerOrderActionState']
  ]);
});

test('arrangeElementLayer returns false and refreshes layer controls when the live selection is locked', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action, doc) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );

  const lockedTarget = { style: { zIndex: '5' } };
  const calls = [];
  const context = {
    SlideNextStudioEditorLayerController: layerController,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    getLiveSelectedElements() {
      calls.push(['getLiveSelectedElements']);
      return [lockedTarget];
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectionHasLockedElements(targets) {
      calls.push(['selectionHasLockedElements', targets]);
      return true;
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('front'), false);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['selectionHasLockedElements', [lockedTarget]],
    ['updateLayerOrderActionState']
  ]);
});

test('arrangeElementLayer returns true and tolerates a missing z-index input when reordering succeeds', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action, doc) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );

  const target = { style: { zIndex: '9' } };
  const calls = [];
  const context = {
    SlideNextStudioEditorLayerController: layerController,
    SlideNextStudioEditorLayerOrder: layerOrder,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    getLiveSelectedElements() {
      calls.push(['getLiveSelectedElements']);
      return [target];
    },
    reorderSlideLayers(action, targets) {
      calls.push(['reorderSlideLayers', action, targets]);
      return true;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectionHasLockedElements(targets) {
      calls.push(['selectionHasLockedElements', targets]);
      return false;
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('front'), true);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['selectionHasLockedElements', [target]],
    ['reorderSlideLayers', 'front', [target]],
    ['getElementById', 'elZIndex'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['updateLayersList'],
    ['updateLayerOrderActionState'],
    ['triggerAutoVersion', 'Auto: Rearranged Layers']
  ]);
});

test('arrangeElementLayer delegates to the shared layer controller when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const documentRef = { id: 'editor-doc' };
  const rawSelection = [{ id: 'raw-selection' }];
  const liveSelection = [{ id: 'live-selection' }];
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorLayerController: {
      arrangeStudioElementLayer(options) {
        delegatedOptions = options;
        return 'shared-arrange';
      }
    },
    getIframeDoc() {
      return documentRef;
    },
    selectedElements: rawSelection,
    getLiveSelectedElements(elements, currentDoc) {
      assert.deepEqual(elements, rawSelection);
      assert.equal(currentDoc, documentRef);
      return liveSelection;
    },
    selectionHasLockedElements() {},
    refreshLayerOrderUi() {},
    reorderSlideLayers() {},
    syncLayerOrderZIndexInput() {},
    finalizeLayerOrderMutation() {}
  };

  vm.createContext(context);
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action, doc) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('backward'), 'shared-arrange');
  assert.equal(delegatedOptions.action, 'backward');
  assert.equal(delegatedOptions.getDocument(), documentRef);
  assert.deepEqual(delegatedOptions.getSelectedElements(documentRef), liveSelection);
  assert.notEqual(delegatedOptions.getSelectedElements, context.getLiveSelectedElements);
  assert.equal(delegatedOptions.selectionHasLockedElements, context.selectionHasLockedElements);
  assert.equal(delegatedOptions.finalizeLayerOrderMutation, context.finalizeLayerOrderMutation);
});

test('changeLayerZIndexByRef resolves selected elements from the iframe document', () => {
  const iframeDoc = { id: 'iframe-document' };
  const selectedElements = [{ id: 'selected' }];
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorLiveSelection: {},
    SlideNextStudioEditorLayerController: {
      changeStudioLayerZIndexByRef(options) {
        delegatedOptions = options;
        return 'delegated-change';
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getStudioSelectedElements(doc) {
      assert.equal(doc, iframeDoc);
      return selectedElements;
    },
    resolveLayerRowElement() {},
    refreshLayerOrderUi() {},
    isElementLocked() {},
    reorderSlideLayers() {},
    syncLayerOrderZIndexInput() {},
    finalizeLayerOrderMutation() {}
  };

  const event = { target: { id: 'layer-row' } };
  const accessors = layerAccessors.createStudioEditorLayerAccessors({
    controller: context.SlideNextStudioEditorLayerController,
    getIframeDoc: context.getIframeDoc,
    resolveLayerRowElement: context.resolveLayerRowElement,
    refreshLayerOrderUi: context.refreshLayerOrderUi,
    isElementLocked: context.isElementLocked,
    reorderSlideLayers: context.reorderSlideLayers,
    liveSelectionApi: context.SlideNextStudioEditorLiveSelection,
    getSelectedElements: context.getStudioSelectedElements,
    syncLayerOrderZIndexInput: context.syncLayerOrderZIndexInput,
    finalizeLayerOrderMutation: context.finalizeLayerOrderMutation
  });
  assert.equal(accessors.changeLayerZIndexByRef(event, 'front'), 'delegated-change');
  assert.equal(delegatedOptions.event, event);
  assert.equal(delegatedOptions.action, 'front');
  assert.deepEqual(delegatedOptions.selectedElements, selectedElements);
});

test('rollbackEditorLayerOrderMutation reverses a rejected z-index transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const documentRef = { id: 'iframe-doc' };
  const target = {
    dataset: { editorId: 'node-1' },
    style: { zIndex: '1' }
  };
  const context = {
    SlideNextStudioEditorTransaction: studioTransaction,
    getIframeDoc() {
      return documentRef;
    },
    getElementByEditorId(editorId, sourceDoc) {
      return editorId === 'node-1' && sourceDoc === documentRef ? target : null;
    }
  };

  vm.createContext(context);
  loadLayerOrderRollbackHelper(fileContent, context);
  const mutation = studioTransaction.createStudioStyleTransaction([{
    element: target,
    before: { zIndex: '0' },
    after: { zIndex: '1' }
  }]);

  assert.equal(context.rollbackEditorLayerOrderMutation(mutation, documentRef), true);
  assert.equal(target.style.zIndex, '0');
});
