const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalReaderAdapter = require('../shared/studio-editor-canonical-reader-adapter.js');
const canonicalRemoval = require('../shared/studio-editor-canonical-removal.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const removalState = require('../shared/studio-editor-removal.js');
const removalEditorState = require('../shared/studio-editor-removal-state.js');
const removalMutation = require('../shared/studio-editor-removal-mutation.js');
const removalTransaction = require('../shared/studio-editor-removal-transaction.js');
const deckMutation = require('../shared/studio-editor-deck-mutation.js');
const removalController = require('../shared/studio-editor-removal-controller.js');
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

function loadBuildRemovalSelectionActionState(fileContent, context) {
  const visibilityReaderSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildRemovalSelectionActionState(doc = null) {',
    '\n\n    function updateRemovalActionState(doc = getIframeDoc()) {'
  );
  context.SlideNextStudioEditorCanonicalState = canonicalState;
  context.SlideNextStudioEditorCanonicalReaderAdapter = canonicalReaderAdapter;
  context.studioEditorRemovalStateController = removalEditorState.createStudioEditorRemovalStateController({
    removalView: context.SlideNextStudioEditorRemoval,
    getDocument: () => typeof context.getIframeDoc === 'function' ? context.getIframeDoc() : null,
    getSelectedElements: () => Array.isArray(context.selectedElements) ? context.selectedElements : [],
    getActiveSlide: (doc) => typeof context.getActiveSlide === 'function'
      ? context.getActiveSlide(doc)
      : null,
    getLockedState: (sourceDoc) => typeof context.getEditorCanonicalVisibilityReader === 'function'
      && typeof context.buildEditorCanonicalDeck === 'function'
      ? context.getEditorCanonicalVisibilityReader('locked', sourceDoc, context.isElementLocked)
      : context.isElementLocked,
    documentRef: context.document
  });
  vm.runInContext(`${visibilityReaderSource}\n${helperSource}`, context);
}

function runRemovalActionStateSource(source, context) {
  if (!context.studioEditorRemovalStateController) {
    context.studioEditorRemovalStateController = removalEditorState.createStudioEditorRemovalStateController({
      removalView: context.SlideNextStudioEditorRemoval,
      getDocument: () => typeof context.getIframeDoc === 'function' ? context.getIframeDoc() : null,
      getSelectedElements: () => Array.isArray(context.selectedElements) ? context.selectedElements : [],
      getActiveSlide: (doc) => typeof context.getActiveSlide === 'function'
        ? context.getActiveSlide(doc)
        : null,
      getLockedState: () => typeof context.isElementLocked === 'function'
        ? context.isElementLocked
        : () => false,
      documentRef: context.document
    });
  }
  vm.createContext(context);
  vm.runInContext(source, context);
}

function loadFinalizeRemovalActionResult(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeRemovalActionResult(result, doc = getIframeDoc()) {',
    '\n\n    function updateVisibilityActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadFinalizeEditorDeckMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(helperSource, context);
}

function loadRemovalTransactionModules(_fileContent, context) {
  context.SlideNextStudioEditorRemovalMutation = removalMutation;
  context.SlideNextStudioEditorRemovalTransaction = removalTransaction;
}

function installRemovalController(context) {
  context.studioEditorRemovalController = removalController.createStudioEditorRemovalController({
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    canonicalRemovalApi: context.SlideNextStudioEditorCanonicalRemoval,
    removalTransactionApi: context.SlideNextStudioEditorRemovalTransaction,
    removalMutationApi: context.SlideNextStudioEditorRemovalMutation,
    removalApi: context.SlideNextStudioEditorRemoval,
    transactionApi: context.SlideNextStudioEditorTransaction,
    buildRemovalSelectionActionState: context.buildRemovalSelectionActionState,
    finalizeRemovalActionResult: context.finalizeRemovalActionResult,
    getIframeDoc: context.getIframeDoc,
    assignElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    deselectElement: context.deselectElement,
    finalizeDeckMutation: context.finalizeEditorDeckMutation,
    rollbackMutation: context.rollbackEditorSlideMutation,
    restoreSelection: context.restoreCommittedSelectionByIdsOnActiveSlide
  });
}

test('buildRemovalSelectionActionState reuses the current selection and live slide guard', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selection = [{ id: 'selected' }];
  const doc = { activeSlide: { id: 'slide-1' } };
  const calls = [];
  const context = {
    selectedElements: selection,
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState(elements, options = {}) {
        calls.push(['buildStudioRemovalActionState', elements]);
        return {
          canRemove: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true,
          selection: elements
        };
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
      return currentDoc && currentDoc.activeSlide ? currentDoc.activeSlide : null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);

  assert.deepEqual(context.buildRemovalSelectionActionState(), {
    canRemove: true,
    selection
  });
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState', selection],
    ['getActiveSlide', doc]
  ]);
});

test('buildRemovalSelectionActionState disables removal for canonical locked selections', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectedElement = { id: 'selected', isConnected: true };
  const doc = { activeSlide: { id: 'slide-1' } };
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorRemoval: removalState,
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return { kind: 'slidenext.deck' };
    },
    resolveEditorCanonicalNodeForElement(element) {
      return element === selectedElement
        ? { visibility: { locked: true } }
        : null;
    },
    getIframeDoc() {
      return doc;
    },
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return doc.activeSlide;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);

  assert.equal(context.buildRemovalSelectionActionState().canRemove, false);
});

test('buildRemovalSelectionActionState fails closed when the shared removal builder is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioEditorRemoval: {},
    getStudioSelectedElements() {
      throw new Error('selection should not be read without a removal builder');
    },
    getEditorCanonicalVisibilityReader() {
      throw new Error('canonical lock state should not be read without a removal builder');
    },
    isElementLocked() {
      throw new Error('fallback lock state should not be read without a removal builder');
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.buildRemovalSelectionActionState({ id: 'iframe-doc' }))),
    {
      selection: [],
      hasSelection: false,
      canRemove: false
    }
  );
});

test('updateRemovalActionState enables the delete control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function finalizeRemovalActionResult(result, doc = getIframeDoc()) {'
  );

  const removeSelectionBtn = { disabled: true };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorRemoval: {
      syncStudioRemovalToolbarState(options) {
        return removalState.syncStudioRemovalToolbarState(options);
      },
      buildStudioRemovalActionState(elements, options = {}) {
        return {
          canRemove: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      },
      renderStudioRemovalToolbarState(options) {
        return removalState.renderStudioRemovalToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  runRemovalActionStateSource(updateRemovalActionStateSource, context);

  context.updateRemovalActionState(null);
  assert.equal(removeSelectionBtn.disabled, true);

  context.updateRemovalActionState({
    getElementById() {
      return null;
    }
  });
  assert.equal(removeSelectionBtn.disabled, true);

  context.updateRemovalActionState({
    activeSlide: {}
  });
  assert.equal(removeSelectionBtn.disabled, false);
});

test('updateRemovalActionState reuses the shared removal toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function finalizeRemovalActionResult(result, doc = getIframeDoc()) {'
  );

  const calls = [];
  const removeSelectionBtn = { disabled: true };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorRemoval: {
      syncStudioRemovalToolbarState(options) {
        const actionState = this.buildStudioRemovalToolbarState(options.elements, {
          isLocked: options.isLocked,
          canMutateDeck: options.canMutateDeck
        });
        return this.renderStudioRemovalToolbarState({
          documentRef: options.documentRef,
          actionState
        });
      },
      buildStudioRemovalActionState() {
        throw new Error('buildStudioRemovalActionState should not be used when shared toolbar helper exists');
      },
      buildStudioRemovalToolbarState(elements, options = {}) {
        calls.push({
          elements,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canMutateDeck: options.canMutateDeck()
        });
        return {
          buttonStates: {
            removeSelectionBtn: true
          }
        };
      },
      renderStudioRemovalToolbarState(options) {
        return removalState.renderStudioRemovalToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  runRemovalActionStateSource(updateRemovalActionStateSource, context);

  context.updateRemovalActionState({
    activeSlide: {}
  });

  assert.equal(removeSelectionBtn.disabled, false);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    elements: [{ id: 'selected' }],
    hasCanMutateDeck: true,
    canMutateDeck: true
  }]);
});

test('updateRemovalActionState delegates toolbar state assembly to the shared removal view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function finalizeRemovalActionResult(result, doc = getIframeDoc()) {'
  );
  const selectedElement = { id: 'selected' };
  const calls = [];
  const context = {
    selectedElements: [selectedElement],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorRemoval: {
      syncStudioRemovalToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    document: {},
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  };

  runRemovalActionStateSource(updateRemovalActionStateSource, context);

  const doc = { activeSlide: {} };
  assert.equal(context.updateRemovalActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.match(updateRemovalActionStateSource, /studioEditorRemovalStateController\.sync/);
  assert.equal(calls[0].documentRef, context.document);
  assert.deepEqual(calls[0].elements, [selectedElement]);
  assert.equal(calls[0].isLocked, context.isElementLocked);
  assert.equal(calls[0].canMutateDeck(), true);
});

test('updateRemovalActionState caches the shared removal toolbar synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function finalizeRemovalActionResult(result, doc = getIframeDoc()) {'
  );
  const doc = { id: 'doc' };
  const calls = [];
  const context = {
    buildRemovalSelectionActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { canRemove: true };
    },
    SlideNextStudioEditorRemoval: {
      syncStudioRemovalToolbarState() {
        throw new Error('direct removal sync should not run');
      },
      buildStudioRemovalActionState() {
        return { canRemove: true };
      },
      createStudioRemovalToolbarStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          return options.getActionState(currentDoc).canRemove;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  runRemovalActionStateSource(updateRemovalActionStateSource, context);

  assert.equal(context.updateRemovalActionState(doc), true);
  assert.equal(context.updateRemovalActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('finalizeRemovalActionResult refreshes removal controls and preserves the action result', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    updateRemovalActionState(currentDoc) {
      calls.push(['updateRemovalActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadFinalizeRemovalActionResult(fileContent, context);

  assert.equal(context.finalizeRemovalActionResult(false, doc), false);
  assert.equal(context.finalizeRemovalActionResult(true), true);
  assert.deepEqual(calls, [
    ['updateRemovalActionState', doc],
    ['getIframeDoc'],
    ['updateRemovalActionState', doc]
  ]);
});

test('finalizeRemovalActionResult delegates result refresh to the shared removal module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { label: 'iframe-doc' };
  let delegated = null;
  const context = {
    SlideNextStudioEditorRemoval: {
      finalizeStudioRemovalActionResult(result, options) {
        delegated = { result, options };
        return 'delegated';
      }
    },
    getIframeDoc() {
      return doc;
    },
    updateRemovalActionState() {}
  };

  vm.createContext(context);
  loadFinalizeRemovalActionResult(fileContent, context);

  assert.equal(context.finalizeRemovalActionResult(true, doc), 'delegated');
  assert.equal(delegated.result, true);
  assert.equal(delegated.options.doc, doc);
  assert.equal(delegated.options.updateRemovalActionState, context.updateRemovalActionState);
});

test('removeSelectedElement returns false and skips persistence when planned targets disconnect before removal', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement(doc) {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const disconnectedTarget = {
    isConnected: false,
    remove() {
      throw new Error('remove should not run for disconnected targets');
    }
  };
  const calls = [];
  const context = {
    selectedElements: [disconnectedTarget],
    SlideNextStudioEditorRemoval: {
      removeStudioElements: removalState.removeStudioElements,
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: true,
          selection: [disconnectedTarget]
        };
      }
    },
    deselectElement() {
      calls.push(['deselectElement']);
      context.updateLayersList();
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateRemovalActionState(doc) {
      calls.push(['updateRemovalActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadFinalizeRemovalActionResult(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadRemovalTransactionModules(fileContent, context);
  installRemovalController(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['updateRemovalActionState', { label: 'iframe-doc' }]
  ]);
});

test('removeSelectedElement returns false and refreshes removal controls when deletion is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement(doc) {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    selectedElements: [],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: false,
          selection: []
        };
      }
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    updateRemovalActionState(currentDoc) {
      calls.push(['updateRemovalActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadFinalizeRemovalActionResult(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadRemovalTransactionModules(fileContent, context);
  installRemovalController(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['updateRemovalActionState', doc]
  ]);
});

test('removeSelectedElement returns true after removing live targets and persisting the change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement(doc) {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const liveTarget = {
    dataset: { editorId: 'node-1' },
    isConnected: true,
    removeCalls: 0,
    remove() {
      this.removeCalls += 1;
      this.isConnected = false;
    }
  };
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Removed' }]
    }]
  });
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextCanonicalDeck: canonicalDeck,
    SlideNextStudioEditorCanonicalRemoval: canonicalRemoval,
    SlideNextStudioEditorRemoval: {
      removeStudioElements: removalState.removeStudioElements,
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      }
    },
    deselectElement() {
      calls.push(['deselectElement']);
      context.updateLayersList();
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    buildEditorCanonicalDeck() {
      return sourceDeck;
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateRemovalActionState(doc) {
      calls.push(['updateRemovalActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadFinalizeRemovalActionResult(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadRemovalTransactionModules(fileContent, context);
  installRemovalController(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(liveTarget.removeCalls, 1);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['deselectElement'],
    ['updateLayersList'],
    ['generateThumbnails'],
    ['saveHistoryState', false, null, {
      ...sourceDeck,
      slides: [{
        ...sourceDeck.slides[0],
        nodes: []
      }]
    }],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Deleted Element']
  ]);
});

test('removeSelectedElement captures a scoped parent markup transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement(doc) {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );
  const parent = {
    dataset: { editorId: 'slide-1' },
    innerHTML: '<div data-editor-id="node-1">A</div>'
  };
  const liveTarget = {
    isConnected: true,
    parentElement: parent,
    remove() {
      this.isConnected = false;
      parent.innerHTML = '';
    }
  };
  let finalized = null;
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorRemoval: {
      removeStudioElements: removalState.removeStudioElements,
      buildStudioRemovalActionState() {
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      }
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    deselectElement() {},
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      return false;
    },
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadRemovalTransactionModules(fileContent, context);
  installRemovalController(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(parent.innerHTML, '');
  assert.deepEqual(JSON.parse(JSON.stringify(finalized)), {
    versionLabel: 'Auto: Deleted Element',
    options: {
      transaction: {
        kind: 'slidenext.editor.transaction',
        version: 1,
        operations: [{
          type: 'markup',
          elementId: 'slide-1',
          before: '<div data-editor-id="node-1">A</div>',
          after: ''
        }]
      }
    }
  });
});

test('removeSelectedElement delegates removal and markup capture to the shared removal module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement(doc) {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );
  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      },
      removeStudioElements(selection, options) {
        calls.push(['removeStudioElements', selection, options]);
        return { didRemove: true, transaction: { type: 'markup' } };
      }
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return {};
    },
    isElementLocked() {
      return false;
    },
    deselectElement() {
      calls.push(['deselectElement']);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadRemovalTransactionModules(fileContent, context);
  installRemovalController(context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(calls[0][0], 'removeStudioElements');
  assert.equal(calls[0][1][0], liveTarget);
  assert.equal(typeof calls[0][2].getElementId, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.slice(1))), [
    ['deselectElement'],
    ['finalizeEditorDeckMutation', 'Auto: Deleted Element', {
      transaction: { type: 'markup' }
    }]
  ]);
});
