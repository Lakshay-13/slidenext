const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalSlide = require('../shared/studio-editor-canonical-slide.js');
const slideCommands = require('../shared/studio-editor-slide-commands.js');
const slideDeletionMutation = require('../shared/studio-editor-slide-deletion-mutation.js');
const slideDeletionTransaction = require('../shared/studio-editor-slide-deletion-transaction.js');
const slideInsertionMutation = require('../shared/studio-editor-slide-insertion-mutation.js');
const slideInsertionTransaction = require('../shared/studio-editor-slide-insertion-transaction.js');
const slideReorderMutation = require('../shared/studio-editor-slide-reorder-mutation.js');
const slideReorderTransaction = require('../shared/studio-editor-slide-reorder-transaction.js');
const slideMutation = require('../shared/studio-editor-slide-mutation.js');
const slideMutationRollback = require('../shared/studio-editor-slide-mutation-rollback.js');
const slideMutationRollbackAdapter = require('../shared/studio-editor-slide-mutation-rollback-adapter.js');
const committedSelectionRestoreAdapter = require('../shared/studio-editor-committed-selection-restore-adapter.js');
const preservedSelectionRestoreAdapter = require('../shared/studio-editor-preserved-selection-restore-adapter.js');
const deckView = require('../shared/studio-deck-view.js');
const reorderController = require('../shared/studio-editor-slide-reorder-controller.js');
const insertionController = require('../shared/studio-editor-slide-insertion-controller.js');
const deletionController = require('../shared/studio-editor-slide-deletion-controller.js');
const duplicationController = require('../shared/studio-editor-slide-duplication-controller.js');
const routingController = require('../shared/studio-editor-slide-routing-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor composes committed selection restore through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorCommittedSelectionRestoreAdapter =/);
  assert.match(source, /restoreStudioEditorCommittedSelectionByIdsOnActiveSlide/);
  assert.match(source, /if \(!restoreSelection\) return false/);
  assert.doesNotMatch(source, /restoreCommittedSelectionByIdsOnActiveSlide\.restorer/);
});

test('editor composes preserved selection restore through the shared selection API', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorPreservedSelectionRestoreAdapter =/);
  assert.match(source, /restoreStudioEditorPreservedSelectionAfterSlideMutation/);
  assert.match(source, /if \(!restoreSelection\) return false/);
  assert.doesNotMatch(source, /restoreSelectionAfterPreservedSlideMutation\.restorer/);
});

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return `
function setStudioPreserveSelectionOnNextActiveSlideSync(nextValue) {
  preserveSelectionOnNextActiveSlideSync = !!nextValue;
  return preserveSelectionOnNextActiveSlideSync;
}
${fileContent.slice(start, end)}`;
}

function loadFinalizeSlideMutationPersistence(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorSlideMutationPersistenceFinalizer(options = {}) {',
    '\n\n    function captureSlideMutationRestoreState(iframeDoc) {'
  );
  context.SlideNextStudioEditorSlideMutation = slideMutation;
  vm.runInContext(helperSource, context);
}

function loadCaptureSlideMutationRestoreState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorSlideMutationRestoreStateCapturer(options = {}) {',
    '\n\n    function restoreDeckViewAfterSlideMutation(iframeDoc, preservedSelectionIds, options = {}) {'
  );
  context.SlideNextStudioEditorSlideMutation = slideMutation;
  vm.runInContext(helperSource, context);
}

function loadRestoreDeckViewAfterSlideMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function restoreDeckViewAfterSlideMutation(iframeDoc, preservedSelectionIds, options = {}) {',
    '\n\n    // Add Blank Slide Node'
  );
  context.SlideNextStudioEditorSlideMutation = slideMutation;
  vm.runInContext(helperSource, context);
}

function loadSlideInsertionTransactionModules(_fileContent, context) {
  context.SlideNextStudioEditorSlideInsertionMutation = slideInsertionMutation;
  context.SlideNextStudioEditorSlideInsertionTransaction = slideInsertionTransaction;
}

function loadApplyEditorSlideDeletionWithTransaction(_fileContent, context) {
  context.SlideNextStudioEditorSlideDeletionMutation = slideDeletionMutation;
  context.SlideNextStudioEditorSlideDeletionTransaction = slideDeletionTransaction;
}

function loadApplyEditorSlideReorderWithTransaction(_fileContent, context) {
  context.SlideNextStudioEditorSlideReorderMutation = slideReorderMutation;
  context.SlideNextStudioEditorSlideReorderTransaction = slideReorderTransaction;
}

function loadRollbackEditorSlideMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function rollbackEditorSlideMutation(transaction, sourceDoc = getIframeDoc()) {',
    '\n\n    // Swap node indices in iframe and re-render'
  );
  context.SlideNextStudioEditorTransaction = studioTransaction;
  context.SlideNextStudioEditorSlideMutationRollback = slideMutationRollback;
  context.SlideNextStudioEditorSlideMutationRollbackAdapter = slideMutationRollbackAdapter;
  vm.runInContext(helperSource, context);
}

function installSlideReorderController(context) {
  context.studioEditorSlideReorderController = reorderController.createStudioEditorSlideReorderController({
    slideCommandsApi: context.SlideNextStudioEditorSlideCommands,
    canonicalSlideApi: context.SlideNextStudioEditorCanonicalSlide,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    transactionApi: context.SlideNextStudioEditorTransaction,
    reorderMutationApi: context.SlideNextStudioEditorSlideReorderMutation,
    reorderTransactionApi: context.SlideNextStudioEditorSlideReorderTransaction,
    deckViewApi: context.SlideNextStudioDeckView,
    getIframeDoc: context.getIframeDoc,
    getSlides: context.getSlides,
    getSlideId: context.getEditorSlideId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    captureSlideMutationState: context.captureSlideMutationRestoreState,
    generateThumbnails: context.generateThumbnails,
    restoreDeckViewAfterSlideMutation: context.restoreDeckViewAfterSlideMutation,
    finalizeMutation: context.finalizeSlideMutationPersistence
  });
}

function installSlideInsertionController(context) {
  context.studioEditorSlideInsertionController = insertionController.createStudioEditorSlideInsertionController({
    slideCommandsApi: context.SlideNextStudioEditorSlideCommands,
    canonicalSlideApi: context.SlideNextStudioEditorCanonicalSlide,
    deckImportApi: context.SlideNextDeckImport,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    transactionApi: context.SlideNextStudioEditorTransaction,
    insertionMutationApi: context.SlideNextStudioEditorSlideInsertionMutation,
    insertionTransactionApi: context.SlideNextStudioEditorSlideInsertionTransaction,
    deckViewApi: context.SlideNextStudioDeckView,
    getIframeDoc: context.getIframeDoc,
    resolveInsertionActionState: context.resolveCurrentStudioInsertionActionState,
    getSlides: context.getSlides,
    createBlankSlide: (doc) => {
      const domApi = context.SlideNextStudioEditorDom;
      if (!domApi || typeof domApi.createStudioBlankSlide !== 'function') return null;
      return domApi.createStudioBlankSlide(doc, {
        ...(typeof context.getEditorDomOptions === 'function'
          ? context.getEditorDomOptions()
          : {}),
        assignSlideId: context.assignEditorSlideId,
        decorateSlide: context.makeElementsHoverable
      });
    },
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    getSlideId: context.getEditorSlideId,
    saveHistoryState: context.saveHistoryState,
    generateThumbnails: context.generateThumbnails,
    setActiveSlide: context.setActiveSlide,
    finalizeMutation: context.finalizeSlideMutationPersistence
  });
}

function installSlideDeletionController(context) {
  context.studioEditorSlideDeletionController = deletionController.createStudioEditorSlideDeletionController({
    slideCommandsApi: context.SlideNextStudioEditorSlideCommands,
    canonicalSlideApi: context.SlideNextStudioEditorCanonicalSlide,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    transactionApi: context.SlideNextStudioEditorTransaction,
    deletionMutationApi: context.SlideNextStudioEditorSlideDeletionMutation,
    deletionTransactionApi: context.SlideNextStudioEditorSlideDeletionTransaction,
    deckViewApi: context.SlideNextStudioDeckView,
    getIframeDoc: context.getIframeDoc,
    getSlides: context.getSlides,
    alert: context.alert,
    captureSlideMutationState: context.captureSlideMutationRestoreState,
    getSlideId: context.getEditorSlideId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    generateThumbnails: context.generateThumbnails,
    restoreDeckViewAfterSlideMutation: context.restoreDeckViewAfterSlideMutation,
    finalizeMutation: context.finalizeSlideMutationPersistence
  });
}

function installSlideDuplicationController(context) {
  context.studioEditorSlideDuplicationController = duplicationController.createStudioEditorSlideDuplicationController({
    slideCommandsApi: context.SlideNextStudioEditorSlideCommands,
    canonicalSlideApi: context.SlideNextStudioEditorCanonicalSlide,
    deckImportApi: context.SlideNextDeckImport,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    transactionApi: context.SlideNextStudioEditorTransaction,
    insertionMutationApi: context.SlideNextStudioEditorSlideInsertionMutation,
    insertionTransactionApi: context.SlideNextStudioEditorSlideInsertionTransaction,
    deckViewApi: context.SlideNextStudioDeckView,
    getIframeDoc: context.getIframeDoc,
    resolveInsertionActionState: context.resolveCurrentStudioInsertionActionState,
    getSlides: context.getSlides,
    getActiveSlide: context.getActiveSlide,
    sanitizeDuplicatedSubtree: context.sanitizeDuplicatedSubtree,
    assignSlideId: context.assignEditorSlideId,
    makeElementsHoverable: context.makeElementsHoverable,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    saveHistoryState: context.saveHistoryState,
    generateThumbnails: context.generateThumbnails,
    setActiveSlide: context.setActiveSlide,
    finalizeMutation: context.finalizeSlideMutationPersistence
  });
}

function installSlideRoutingController(context) {
  context.studioEditorSlideRoutingController = routingController.createStudioEditorSlideRoutingController({
    deckViewApi: context.SlideNextStudioDeckView,
    getSlideIndexById: context.getSlideIndexById,
    activateSlideByIndex: (index, options) => {
      if (typeof context.setActiveSlide === 'function') {
        return context.setActiveSlide(index, options);
      }
      return false;
    },
    deleteSlideByIndex: context.deleteSlideNode,
    reorderSlidesByIndex: context.reorderSlides
  });
}

function loadRestoreSelectionAfterPreservedSlideMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorPreservedSelectionRestoreAdapter =',
    '\n\n    function ensureSelectionOverlay(doc, slide) {'
  );
  context.SlideNextStudioEditorPreservedSelectionRestoreAdapter = preservedSelectionRestoreAdapter;
  vm.runInContext(helperSource, context);
}

function loadRestoreCommittedSelectionByIdsOnActiveSlide(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'const studioEditorCommittedSelectionRestoreAdapter =',
    '\n\n    const studioEditorPreservedSelectionRestoreAdapter ='
  );
  context.SlideNextStudioEditorCommittedSelectionRestoreAdapter = committedSelectionRestoreAdapter;
  vm.runInContext(helperSource, context);
}

function loadResolveCurrentStudioInsertionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioInsertionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateInsertionActionState(doc = getIframeDoc()) {'
  );
  if (typeof context.SlideNextStudioDeckView === 'undefined') {
    context.SlideNextStudioDeckView = deckView;
  }
  vm.runInContext(helperSource, context);
}

test('finalizeSlideMutationPersistence saves, autosaves, and versions slide changes', () => {
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
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);

  const result = context.finalizeSlideMutationPersistence('Auto: Added Slide');

  assert.equal(result, 'Auto: Added Slide');
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Added Slide']
  ]);
});

test('rollbackEditorSlideMutation restores the slide container markup transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const container = { id: 'slidesContainer', innerHTML: '<div>after</div>' };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return container;
    }
  };
  const context = {
    getIframeDoc: () => iframeDoc,
    makeElementsHoverable(element) {
      element.hoverable = true;
    },
    getElementByEditorId() {
      return null;
    }
  };
  vm.createContext(context);
  loadRollbackEditorSlideMutation(fileContent, context);

  const transaction = studioTransaction.createStudioMarkupTransaction([{
    element: container,
    elementId: 'slides-container',
    before: '<div>before</div>',
    after: '<div>after</div>'
  }]);

  assert.equal(context.rollbackEditorSlideMutation(transaction, iframeDoc), true);
  assert.equal(container.innerHTML, '<div>before</div>');
  assert.equal(container.hoverable, true);
});

test('rollbackEditorSlideMutation resolves slide-prefixed metadata transactions', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slide = { dataset: { speakerNotes: 'after' } };
  const iframeDoc = { id: 'iframe-doc' };
  const context = {
    getIframeDoc: () => iframeDoc,
    getSlideById(id, doc) {
      assert.equal(id, 'slide-1');
      assert.equal(doc, iframeDoc);
      return slide;
    },
    getElementByEditorId() {
      return null;
    }
  };
  vm.createContext(context);
  loadRollbackEditorSlideMutation(fileContent, context);

  const transaction = studioTransaction.createStudioDatasetTransaction([{
    element: slide,
    elementId: 'slide:slide-1',
    property: 'speakerNotes',
    before: 'before',
    after: 'after'
  }]);

  assert.equal(context.rollbackEditorSlideMutation(transaction, iframeDoc), true);
  assert.equal(slide.dataset.speakerNotes, 'before');
});

test('rollbackEditorSlideMutation removes a scoped added slide-presence transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let present = true;
  const slide = {
    remove() {
      present = false;
    }
  };
  const container = { id: 'slidesContainer' };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return container;
    }
  };
  const context = {
    getIframeDoc: () => iframeDoc,
    getSlideById(id, doc) {
      assert.equal(id, 'slide-2');
      assert.equal(doc, iframeDoc);
      return present ? slide : null;
    },
    generateThumbnails() {},
    makeElementsHoverable() {},
    getElementByEditorId() {
      return null;
    }
  };
  vm.createContext(context);
  loadRollbackEditorSlideMutation(fileContent, context);

  const transaction = studioTransaction.createStudioSlidePresenceTransaction([{
    slideId: 'slide-2',
    before: { exists: false, index: 1, markup: '' },
    after: { exists: true, index: 1, markup: '<section id="slide-2"></section>' }
  }]);

  assert.equal(context.rollbackEditorSlideMutation(transaction, iframeDoc), true);
  assert.equal(present, false);
});

test('rollbackEditorSlideMutation removes a scoped inserted element-presence transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let present = true;
  const element = {
    remove() {
      present = false;
    }
  };
  const parent = { children: [element] };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return { id: 'slidesContainer' };
    }
  };
  const context = {
    getIframeDoc: () => iframeDoc,
    getSlideById(id, doc) {
      assert.equal(id, 'slide-1');
      assert.equal(doc, iframeDoc);
      return parent;
    },
    getElementByEditorId(id, doc) {
      assert.equal(doc, iframeDoc);
      assert.equal(id, 'node-2');
      return present ? element : null;
    },
    makeElementsHoverable() {},
    generateThumbnails() {}
  };
  vm.createContext(context);
  loadRollbackEditorSlideMutation(fileContent, context);

  const transaction = studioTransaction.createStudioElementPresenceTransaction([{
    elementId: 'node-2',
    parentId: 'slide:slide-1',
    before: { exists: false, index: 0, markup: '' },
    after: { exists: true, index: 0, markup: '<h2 data-editor-id="node-2"></h2>' }
  }]);

  assert.equal(context.rollbackEditorSlideMutation(transaction, iframeDoc), true);
  assert.equal(present, false);
});

test('finalizeSlideMutationPersistence delegates lifecycle ordering to the shared mutation module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const transaction = { kind: 'slidenext.editor.transaction' };
  let delegatedOptions = null;
  let delegatedArgs = null;
  const context = {
    SlideNextStudioEditorMutation: {
      finalizeStudioSlideMutation(options) {
        delegatedOptions = options;
        delegatedArgs = [options.versionLabel, options.transaction, options.canonicalDeck];
        return 'delegated';
      }
    },
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);

  assert.equal(context.finalizeSlideMutationPersistence('Auto: Added Slide', transaction), 'delegated');
  assert.deepEqual(delegatedArgs, ['Auto: Added Slide', transaction, null]);
  assert.equal(delegatedOptions.saveHistoryState, context.saveHistoryState);
  assert.equal(delegatedOptions.triggerAutoSave, context.triggerAutoSave);
  assert.equal(delegatedOptions.triggerAutoVersion, context.triggerAutoVersion);
});

test('finalizeSlideMutationPersistence uses a configured shared finalizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    studioEditorSlideMutationPersistenceFinalizer(...args) {
      calls.push(args);
      return 'configured';
    },
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);

  const transaction = { id: 'tx-1' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  assert.equal(
    context.finalizeSlideMutationPersistence('Auto: Added Slide', transaction, canonicalDeck),
    'configured'
  );
  assert.deepEqual(calls, [['Auto: Added Slide', transaction, canonicalDeck]]);
});

test('captureSlideMutationRestoreState snapshots the active slide id and committed selection after saving history', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-3';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return ['node-1', 'node-2'];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadCaptureSlideMutationRestoreState(fileContent, context);

  const result = context.captureSlideMutationRestoreState(iframeDoc);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    preservedActiveSlideId: 'slide-3',
    preservedSelectionIds: ['node-1', 'node-2']
  });
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['getActiveSlideId', iframeDoc],
    ['getCommittedSelectedEditorElementIds', iframeDoc]
  ]);
});

test('captureSlideMutationRestoreState prefers the live canonical deck before a slide mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const calls = [];
  const context = {
    resolveEditorUiCanonicalDeck(doc) {
      calls.push(['resolver', doc]);
      return canonicalDeck;
    },
    buildEditorCanonicalDeck() {
      throw new Error('pre-mutation capture should use live canonical state');
    },
    getActiveSlideId() {
      return 'slide-3';
    },
    getCommittedSelectedEditorElementIds() {
      return ['node-1'];
    },
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    }
  };

  vm.createContext(context);
  loadCaptureSlideMutationRestoreState(fileContent, context);

  assert.deepEqual(context.captureSlideMutationRestoreState(iframeDoc), {
    preservedActiveSlideId: 'slide-3',
    preservedSelectionIds: ['node-1']
  });
  assert.deepEqual(calls, [
    ['resolver', iframeDoc],
    ['history', false, null, canonicalDeck]
  ]);
});

test('captureSlideMutationRestoreState delegates the snapshot to the shared deck view module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      captureStudioDeckViewBeforeSlideMutation(options) {
        calls.push(['captureStudioDeckViewBeforeSlideMutation', options]);
        return { preservedActiveSlideId: 'slide-4', preservedSelectionIds: ['node-4'] };
      }
    },
    getActiveSlideId() {},
    getCommittedSelectedElementIds() {},
    saveHistoryState() {}
  };

  vm.createContext(context);
  loadCaptureSlideMutationRestoreState(fileContent, context);

  const result = context.captureSlideMutationRestoreState(iframeDoc);

  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    preservedActiveSlideId: 'slide-4',
    preservedSelectionIds: ['node-4']
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].doc, iframeDoc);
  assert.equal(calls[0][1].saveHistoryState, context.saveHistoryState);
  assert.equal(calls[0][1].getActiveSlideId, context.getActiveSlideId);
  assert.equal(calls[0][1].getCommittedSelectedElementIds, context.getCommittedSelectedElementIds);
});

test('createEditorSlideMutationRestoreStateCapturer delegates construction to the shared mutation module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const delegatedOptions = [];
  const context = {
    SlideNextStudioEditorMutation: {
      createStudioSlideMutationRestoreStateCapturer(options) {
        delegatedOptions.push(options);
        return () => ({ preservedActiveSlideId: 'slide-5', preservedSelectionIds: ['node-5'] });
      }
    },
    SlideNextStudioDeckView: {
      captureStudioDeckViewBeforeSlideMutation() {}
    },
    getActiveSlideId() {},
    getCommittedSelectedElementIds() {},
    saveHistoryState() {}
  };

  vm.createContext(context);
  loadCaptureSlideMutationRestoreState(fileContent, context);

  const captureState = context.createEditorSlideMutationRestoreStateCapturer({
    saveHistoryState: context.saveHistoryState,
    getActiveSlideId: context.getActiveSlideId,
    getSelectedElementIds: context.getCommittedSelectedElementIds
  });

  assert.deepEqual(captureState({ id: 'doc' }), {
    preservedActiveSlideId: 'slide-5',
    preservedSelectionIds: ['node-5']
  });
  assert.equal(delegatedOptions.length, 1);
  assert.equal(delegatedOptions[0].saveHistoryState, context.saveHistoryState);
  assert.equal(delegatedOptions[0].getActiveSlideId, context.getActiveSlideId);
  assert.equal(delegatedOptions[0].getCommittedSelectedElementIds, context.getCommittedSelectedElementIds);
  assert.equal(typeof delegatedOptions[0].captureStudioDeckViewBeforeSlideMutation, 'function');
});

test('restoreSelectionAfterPreservedSlideMutation delegates preservation ordering to shared selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  let delegatedOptions = null;
  const selectionIds = ['node-1'];
  const context = {
    preserveSelectionOnNextActiveSlideSync: false,
    SlideNextStudioEditorSelection: {
      restoreStudioSelectionAfterSlideMutation(ids, doc, options) {
        delegatedOptions = { ids, doc, options };
        options.preserveSelection();
        return { restored: true };
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getEditorSelectionOptions(options) {
      return { selectionOptions: true, doc: options.doc };
    },
    applyEditorSelectionState() {},
    syncSelectionOverlay() {},
    hideDragHud() {},
    syncInspectorForSelection() {},
    updateLayersList() {}
  };

  vm.createContext(context);
  loadRestoreSelectionAfterPreservedSlideMutation(fileContent, context);

  assert.equal(context.restoreSelectionAfterPreservedSlideMutation(selectionIds, iframeDoc), true);
  assert.deepEqual(delegatedOptions.ids, selectionIds);
  assert.equal(delegatedOptions.doc, iframeDoc);
  assert.deepEqual(delegatedOptions.options.selectionOptions, true);
  assert.equal(delegatedOptions.options.doc, iframeDoc);
  assert.equal(context.preserveSelectionOnNextActiveSlideSync, true);
});

test('restoreSelectionAfterPreservedSlideMutation fails closed when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const restoreSelectionSource = extractFunctionSource(
    fileContent,
    'const studioEditorPreservedSelectionRestoreAdapter =',
    '\n\n    function ensureSelectionOverlay(doc, slide) {'
  );
  const context = {
    preserveSelectionOnNextActiveSlideSync: false,
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  context.SlideNextStudioEditorPreservedSelectionRestoreAdapter = preservedSelectionRestoreAdapter;
  vm.runInContext(restoreSelectionSource, context);

  assert.equal(context.restoreSelectionAfterPreservedSlideMutation(['node-1'], { id: 'doc' }), false);
  assert.equal(context.preserveSelectionOnNextActiveSlideSync, false);
});

test('restoreCommittedSelectionByIdsOnActiveSlide delegates to shared selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const selectionIds = ['node-1'];
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorSelection: {
      restoreCommittedStudioSelectionByIdsOnActiveSlide(ids, doc, options) {
        delegatedOptions = { ids, doc, options };
        return { restored: true };
      }
    },
    getEditorSelectionOptions(options) {
      return { selectionOptions: true, doc: options.doc };
    },
    applyEditorSelectionState() {},
    syncSelectionOverlay() {},
    hideDragHud() {},
    syncInspectorForSelection() {},
    updateLayersList() {}
  };

  vm.createContext(context);
  loadRestoreCommittedSelectionByIdsOnActiveSlide(fileContent, context);

  assert.equal(context.restoreCommittedSelectionByIdsOnActiveSlide(selectionIds, iframeDoc), true);
  assert.deepEqual(delegatedOptions.ids, selectionIds);
  assert.equal(delegatedOptions.doc, iframeDoc);
  assert.deepEqual(delegatedOptions.options.selectionOptions, true);
  assert.equal(delegatedOptions.options.doc, iframeDoc);
});

test('restoreCommittedSelectionByIdsOnActiveSlide fails closed when the shared selection API is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    SlideNextStudioEditorSelection: null
  };

  vm.createContext(context);
  loadRestoreCommittedSelectionByIdsOnActiveSlide(fileContent, context);

  assert.equal(context.restoreCommittedSelectionByIdsOnActiveSlide(['node-1'], { id: 'doc' }), false);
});

test('restoreDeckViewAfterSlideMutation delegates slide restore callbacks through shared selection and navigation helpers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const iframeDoc = { id: 'doc' };
  const selectionIds = ['node-1', 'node-2'];
  let restorePayload = null;
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      restoreStudioDeckViewAfterSlideMutation(payload) {
        restorePayload = payload;
        calls.push(['restoreStudioDeckViewAfterSlideMutation', payload]);
        return { restored: true };
      }
    },
    restoreSelectionAfterPreservedSlideMutation(ids, doc) {
      calls.push(['restoreSelectionAfterPreservedSlideMutation', ids, doc]);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    setActiveSlideById(slideId, doc, options) {
      calls.push(['setActiveSlideById', slideId, doc, options]);
    },
    Object
  };

  vm.createContext(context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);

  const result = context.restoreDeckViewAfterSlideMutation(iframeDoc, selectionIds, {
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-1',
    fallbackIndex: 1
  });

  assert.deepEqual(JSON.parse(JSON.stringify(result)), { restored: true });
  assert.equal(restorePayload.preservedActiveSlideId, 'slide-2');
  assert.equal(restorePayload.removedSlideId, 'slide-1');
  assert.equal(restorePayload.fallbackIndex, 1);

  restorePayload.restoreActiveSlideById('slide-2');
  restorePayload.restoreSelectionState();
  restorePayload.setActiveSlideByIndex(1);

  assert.deepEqual(calls.map(([name]) => name), [
    'restoreStudioDeckViewAfterSlideMutation',
    'setActiveSlideById',
    'restoreSelectionAfterPreservedSlideMutation',
    'setActiveSlide'
  ]);
  assert.equal(calls[1][1], 'slide-2');
  assert.equal(calls[1][2], iframeDoc);
  assert.equal(calls[1][3].preserveSelection, true);
  assert.deepEqual(calls[2][1], selectionIds);
  assert.equal(calls[2][2], iframeDoc);
  assert.equal(calls[3][1], 1);
});

test('addSlideNode uses the shared iframe accessor and appends a new blank slide before refreshing editor state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const existingSlide = { id: 'slide-1' };
  const newSlide = { id: 'slide-2' };
  const slides = [existingSlide];
  const slidesContainer = {
    innerHTML: '<section data-slide-id="slide-1"></section>',
    appendChild(node) {
      slides.push(node);
      this.innerHTML = '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>';
      return node;
    }
  };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalSlide: canonicalSlide,
    SlideNextStudioEditorSlideCommands: slideCommands,
    assignEditorSlideId() {},
    document: {
      getElementById(id) {
        if (id === 'addSlideBtn') {
          return { disabled: false };
        }
        return null;
      }
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getEditorDomOptions() {
      calls.push(['getEditorDomOptions']);
      return {};
    },
    getActiveSlide() {
      return null;
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({
        slides: [{ id: 'slide-1' }]
      });
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    makeElementsHoverable() {},
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    SlideNextStudioEditorDom: {
      createStudioBlankSlide(doc, options) {
        calls.push(['createStudioBlankSlide', doc, options]);
        assert.equal(doc, iframeDoc);
        assert.equal(options.decorateSlide, context.makeElementsHoverable);
        assert.equal(options.assignSlideId, context.assignEditorSlideId);
        return newSlide;
      }
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  loadSlideInsertionTransactionModules(fileContent, context);
  installSlideInsertionController(context);
  vm.runInContext(addSlideNodeSource, context);

  const result = context.addSlideNode();

  assert.equal(result, true);
  assert.deepEqual(slides, [existingSlide, newSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'getEditorDomOptions',
    'createStudioBlankSlide',
    'saveHistoryState',
    'generateThumbnails',
    'setActiveSlide',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[6][1], 1);
  assert.equal(calls[9][1], 'Auto: Added Slide');
  assert.deepEqual(calls[7][2], {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slides-container',
      before: '<section data-slide-id="slide-1"></section>',
      after: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>'
      }]
  });
  assert.deepEqual(calls[7][3].slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
});

test('addSlideNode delegates slide insertion and transaction capture to the shared deck view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );
  const existingSlide = { id: 'slide-1' };
  const newSlide = { id: 'slide-2' };
  const slides = [existingSlide];
  const slidesContainer = { id: 'slides-container' };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    SlideNextStudioEditorTransaction: {},
    SlideNextStudioDeckView: {
      resolveStudioInsertionActionState() {
        return { canAddSlide: true };
      },
      applyStudioSlideInsertionMutation(...args) {
        calls.push(['applyStudioSlideInsertionMutation', ...args]);
        return {
          didApply: true,
          transaction: { type: 'markup' }
        };
      }
    },
    SlideNextStudioEditorDom: {
      createStudioBlankSlide() {
        return newSlide;
      }
    },
    assignEditorSlideId() {},
    getActiveSlide() {
      return null;
    },
    getEditorDomOptions() {
      return {};
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides() {
      calls.push(['getSlides']);
      return slides;
    },
    makeElementsHoverable() {},
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  loadSlideInsertionTransactionModules(fileContent, context);
  installSlideInsertionController(context);
  vm.runInContext(addSlideNodeSource, context);

  assert.equal(context.addSlideNode(), true);
  const delegation = calls.find(([name]) => name === 'applyStudioSlideInsertionMutation');
  assert.equal(delegation[1], slidesContainer);
  assert.equal(delegation[2], newSlide);
  assert.equal(delegation[3].createMarkupTransactionCapture, null);
  const finalize = calls.find(([name]) => name === 'triggerAutoVersion');
  assert.equal(finalize[1], 'Auto: Added Slide');
});

test('addSlideNode no-ops when insertion state or the iframe document disallows adding slides', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    getActiveSlide() {
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  loadSlideInsertionTransactionModules(fileContent, context);
  installSlideInsertionController(context);
  vm.runInContext(addSlideNodeSource, context);

  assert.equal(context.addSlideNode(), false);
  assert.deepEqual(calls, [['getIframeDoc']]);

  context.getIframeDoc = () => {
    calls.push(['getIframeDoc']);
    return {
      getElementById(id) {
        assert.equal(id, 'slidesContainer');
        return null;
      }
    };
  };
  assert.equal(context.addSlideNode(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getIframeDoc']
  ]);
});

test('addSlideNode skips history when blank slide creation fails', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const addSlideNodeSource = extractFunctionSource(
    fileContent,
    'function addSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );

  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    assignEditorSlideId() {},
    document: {
      getElementById(id) {
        if (id === 'addSlideBtn') {
          return { disabled: false };
        }
        return null;
      }
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getEditorDomOptions() {
      calls.push(['getEditorDomOptions']);
      return {};
    },
    getActiveSlide() {
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [{ id: 'slide-1' }];
    },
    makeElementsHoverable() {},
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    SlideNextStudioEditorDom: {
      createStudioBlankSlide(doc, options) {
        calls.push(['createStudioBlankSlide', doc, options]);
        return null;
      }
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  loadSlideInsertionTransactionModules(fileContent, context);
  installSlideInsertionController(context);
  vm.runInContext(addSlideNodeSource, context);

  assert.equal(context.addSlideNode(), false);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'getEditorDomOptions',
    'createStudioBlankSlide'
  ]);
});

test('duplicateSlideNode clones the active slide, inserts it next to the source, and persists canonical order', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const duplicateSlideNodeSource = extractFunctionSource(
    fileContent,
    'function duplicateSlideNode() {',
    '\n\n    // Delete Active Slide Node'
  );
  const sourceSlide = {
    classList: {
      remove(className) {
        assert.equal(className, 'slide-active');
      }
    },
    cloneNode(deep) {
      assert.equal(deep, true);
      return duplicateSlide;
    }
  };
  const targetSlide = { id: 'slide-3' };
  const duplicateSlide = {
    classList: {
      remove(className) {
        assert.equal(className, 'slide-active');
      }
    }
  };
  const slides = [sourceSlide, targetSlide];
  const slidesContainer = {
    id: 'slides-container',
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-3"></section>',
    insertBefore(node, beforeNode) {
      assert.equal(node, duplicateSlide);
      assert.equal(beforeNode, targetSlide);
      slides.splice(1, 0, node);
      this.innerHTML = '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section>';
      return node;
    }
  };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const calls = [];
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalSlide: canonicalSlide,
    SlideNextDeckImport: {
      importSlideToCanonicalSlide(slide, index, options) {
        calls.push(['importSlideToCanonicalSlide', slide, index]);
        return { id: options.getSlideId(), title: 'Source' };
      }
    },
    SlideNextStudioEditorSlideCommands: slideCommands,
    SlideNextStudioEditorTransaction: studioTransaction,
    assignEditorSlideId(slide, options) {
      assert.equal(slide, duplicateSlide);
      assert.equal(options.forceNew, true);
      return 'slide-2';
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({
        slides: [{ id: 'slide-1' }, { id: 'slide-3' }]
      });
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide(doc) {
      assert.equal(doc, iframeDoc);
      return sourceSlide;
    },
    getEditorDomOptions() {
      return {};
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      assert.equal(doc, iframeDoc);
      calls.push(['getSlides']);
      return slides;
    },
    makeElementsHoverable(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push(['makeElementsHoverable']);
    },
    resolveCurrentStudioInsertionActionState() {
      return { canDuplicateSlide: true };
    },
    sanitizeDuplicatedSubtree(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push(['sanitizeDuplicatedSubtree']);
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadSlideInsertionTransactionModules(fileContent, context);
  installSlideDuplicationController(context);
  vm.runInContext(duplicateSlideNodeSource, context);

  assert.equal(context.duplicateSlideNode(), true);
  assert.deepEqual(slides, [sourceSlide, duplicateSlide, targetSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'sanitizeDuplicatedSubtree',
    'makeElementsHoverable',
    'importSlideToCanonicalSlide',
    'saveHistoryState',
    'generateThumbnails',
    'setActiveSlide',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[6][0], 'generateThumbnails');
  assert.equal(calls[7][1], 1);
  assert.equal(calls[10][1], 'Auto: Duplicated Slide');
  assert.deepEqual(calls[8][3].slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
});

test('reorderSlides uses the shared iframe accessor and restores editor state after moving a slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const selectionIds = ['element-1'];
  let slides = [];
  const createSlide = (id) => ({
    id,
    get nextSibling() {
      const index = slides.indexOf(this);
      return index === -1 ? null : slides[index + 1] || null;
    }
  });
  const firstSlide = createSlide('slide-1');
  const secondSlide = createSlide('slide-2');
  const thirdSlide = createSlide('slide-3');
  slides = [firstSlide, secondSlide, thirdSlide];

  const calls = [];
  let restorePayload = null;
  const slidesContainer = {
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section>',
    insertBefore(node, beforeNode) {
      calls.push(['insertBefore', node, beforeNode]);
      const currentIndex = slides.indexOf(node);
      slides.splice(currentIndex, 1);
      const targetIndex = beforeNode ? slides.indexOf(beforeNode) : slides.length;
      slides.splice(targetIndex, 0, node);
      this.innerHTML = '<section data-slide-id="slide-2"></section><section data-slide-id="slide-3"></section><section data-slide-id="slide-1"></section>';
      return node;
    }
  };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalSlide: canonicalSlide,
    SlideNextStudioEditorSlideCommands: slideCommands,
    SlideNextStudioDeckView: {
      restoreStudioDeckViewAfterSlideMutation(payload) {
        restorePayload = payload;
        calls.push(['restoreStudioDeckViewAfterSlideMutation', payload]);
      }
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-2';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return selectionIds;
    },
    getEditorSlideId(slide) {
      return slide.id;
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({
        slides: [
          { id: 'slide-1' },
          { id: 'slide-2' },
          { id: 'slide-3' }
        ]
      });
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    restoreSelectionAfterPreservedSlideMutation(ids, doc) {
      calls.push(['restoreSelectionAfterPreservedSlideMutation', ids, doc]);
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    setActiveSlideById(slideId, doc, options) {
      calls.push(['setActiveSlideById', slideId, doc, options]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideReorderWithTransaction(fileContent, context);
  installSlideReorderController(context);
  vm.runInContext(reorderSlidesSource, context);

  context.reorderSlides(0, 2);

  assert.deepEqual(slides, [secondSlide, thirdSlide, firstSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'saveHistoryState',
    'getActiveSlideId',
    'getCommittedSelectedEditorElementIds',
    'insertBefore',
    'generateThumbnails',
    'getSlides',
    'restoreStudioDeckViewAfterSlideMutation',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[4][1], iframeDoc);
  assert.equal(calls[5][1], firstSlide);
  assert.equal(calls[5][2], null);
  assert.equal(calls[11][1], 'Auto: Reordered Slides');
  assert.deepEqual(calls[9][2], {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'slide-order',
      before: ['slide-1', 'slide-2', 'slide-3'],
      after: ['slide-2', 'slide-3', 'slide-1']
    }]
  });
  assert.deepEqual(calls[9][3].slides.map((slide) => slide.id), ['slide-2', 'slide-3', 'slide-1']);
  assert.equal(restorePayload.preservedActiveSlideId, 'slide-2');
  assert.equal(restorePayload.fallbackIndex, 2);

  restorePayload.restoreActiveSlideById('slide-2');
  restorePayload.restoreSelectionState();
  restorePayload.setActiveSlideByIndex(2);

  assert.deepEqual(calls.slice(12).map(([name]) => name), [
    'setActiveSlideById',
    'restoreSelectionAfterPreservedSlideMutation',
    'setActiveSlide'
  ]);
  assert.equal(calls[12][1], 'slide-2');
  assert.equal(calls[12][2], iframeDoc);
  assert.equal(calls[12][3].preserveSelection, true);
  assert.equal(calls[13][1], selectionIds);
  assert.equal(calls[13][2], iframeDoc);
  assert.equal(calls[14][1], 2);
});

test('slide reorder wiring uses a dedicated canonical baseline builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc, buildOptions\)/
  );
  assert.match(
    controllerSource,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.doesNotMatch(
    controllerSource,
    /buildCanonicalDeck: \(sourceDoc\) => buildEditorMutationCanonicalDeck\(sourceDoc\)/
  );
});

test('slide insertion wiring uses a dedicated canonical baseline builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc, buildOptions\)/
  );
  assert.match(
    controllerSource,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.doesNotMatch(
    controllerSource,
    /buildCanonicalDeck: \(sourceDoc\) => buildEditorMutationCanonicalDeck\(sourceDoc\)/
  );
});

test('slide deletion wiring uses a dedicated canonical baseline builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc, buildOptions\)/
  );
  assert.match(
    controllerSource,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.doesNotMatch(
    controllerSource,
    /buildCanonicalDeck: \(sourceDoc\) => buildEditorMutationCanonicalDeck\(sourceDoc\)/
  );
});

test('slide duplication wiring uses a dedicated canonical baseline builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc, buildOptions\)/
  );
  assert.match(
    controllerSource,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.doesNotMatch(
    controllerSource,
    /buildCanonicalDeck: \(sourceDoc\) => buildEditorMutationCanonicalDeck\(sourceDoc\)/
  );
});

test('reorderSlides delegates DOM ordering and transaction capture to the shared deck view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );
  const firstSlide = { id: 'slide-1' };
  const secondSlide = { id: 'slide-2', nextSibling: null };
  const slides = [firstSlide, secondSlide];
  const container = { id: 'slides-container' };
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    SlideNextStudioDeckView: {
      applyStudioSlideReorderMutation(...args) {
        calls.push(['applyStudioSlideReorderMutation', ...args]);
        return {
          didApply: true,
          transaction: { type: 'markup' }
        };
      }
    },
    captureSlideMutationRestoreState(doc) {
      calls.push(['captureSlideMutationRestoreState', doc]);
      return {
        preservedActiveSlideId: 'slide-1',
        preservedSelectionIds: ['element-1']
      };
    },
    finalizeSlideMutationPersistence(...args) {
      calls.push(['finalizeSlideMutationPersistence', ...args]);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides() {
      calls.push(['getSlides']);
      return slides;
    },
    restoreDeckViewAfterSlideMutation(...args) {
      calls.push(['restoreDeckViewAfterSlideMutation', ...args]);
    }
  };
  iframeDoc.getElementById = (id) => id === 'slidesContainer' ? container : null;

  vm.createContext(context);
  loadApplyEditorSlideReorderWithTransaction(fileContent, context);
  installSlideReorderController(context);
  vm.runInContext(reorderSlidesSource, context);

  assert.equal(context.reorderSlides(0, 1), true);
  const delegation = calls.find(([name]) => name === 'applyStudioSlideReorderMutation');
  assert.equal(delegation[1], container);
  assert.equal(delegation[2], firstSlide);
  assert.equal(delegation[3], secondSlide.nextSibling);
  const finalize = calls.find(([name]) => name === 'finalizeSlideMutationPersistence');
  assert.deepEqual(finalize, [
    'finalizeSlideMutationPersistence',
    'Auto: Reordered Slides',
    { type: 'markup' }
  ]);
});

test('reorderSlides no-ops when the iframe document is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideReorderWithTransaction(fileContent, context);
  installSlideReorderController(context);
  vm.runInContext(reorderSlidesSource, context);

  assert.equal(context.reorderSlides(0, 1), false);

  assert.deepEqual(calls, [['getIframeDoc']]);
});

test('reorderSlides no-ops when the slide container is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      calls.push(['getElementById', id]);
      return null;
    }
  };
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideReorderWithTransaction(fileContent, context);
  installSlideReorderController(context);
  vm.runInContext(reorderSlidesSource, context);

  assert.equal(context.reorderSlides(0, 1), false);

  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getElementById', 'slidesContainer']
  ]);
});

test('reorderSlides no-ops when the requested slide indexes are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const slides = [{ id: 'slide-1' }, { id: 'slide-2' }];
  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideReorderWithTransaction(fileContent, context);
  installSlideReorderController(context);
  vm.runInContext(reorderSlidesSource, context);

  const result = context.reorderSlides(0, 9);

  assert.equal(result, false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});

test('reorderSlides no-ops when the requested slide indexes are unchanged', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesSource = extractFunctionSource(
    fileContent,
    'function reorderSlides(fromIdx, toIdx) {',
    '\n\n    function updateActiveThumbnailCardState(activeSlideId) {'
  );

  const firstSlide = { id: 'slide-1', nextSibling: null };
  const secondSlide = { id: 'slide-2', nextSibling: null };
  const slides = [firstSlide, secondSlide];
  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideReorderWithTransaction(fileContent, context);
  installSlideReorderController(context);
  vm.runInContext(reorderSlidesSource, context);

  const result = context.reorderSlides(1, 1);

  assert.equal(result, false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});

test('deleteSlideNodeById returns delegated deletion results', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeByIdSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNodeById(slideId, doc = getIframeDoc()) {',
    '\n\n    function reorderSlidesById(sourceSlideId, targetSlideId, doc = getIframeDoc()) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    deleteSlideNode(index) {
      calls.push(['deleteSlideNode', index]);
      return index === 2;
    },
    getSlideIndexById(slideId, doc) {
      calls.push(['getSlideIndexById', slideId, doc]);
      if (slideId === 'slide-3') return 2;
      if (slideId === 'slide-4') return 3;
      return -1;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    }
  };

  vm.createContext(context);
  installSlideRoutingController(context);
  vm.runInContext(deleteSlideNodeByIdSource, context);

  assert.equal(context.deleteSlideNodeById('missing'), false);
  assert.equal(context.deleteSlideNodeById('slide-3'), true);
  assert.equal(context.deleteSlideNodeById('slide-4'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlideIndexById', 'missing', iframeDoc],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-3', iframeDoc],
    ['deleteSlideNode', 2],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-4', iframeDoc],
    ['deleteSlideNode', 3]
  ]);
});

test('reorderSlidesById returns delegated reorder results', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const reorderSlidesByIdSource = extractFunctionSource(
    fileContent,
    'function reorderSlidesById(sourceSlideId, targetSlideId, doc = getIframeDoc()) {',
    '\n\n    function isEligibleEditableElement(el) {'
  );

  const iframeDoc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    getSlideIndexById(slideId, doc) {
      calls.push(['getSlideIndexById', slideId, doc]);
      if (slideId === 'slide-1') return 0;
      if (slideId === 'slide-2') return 1;
      return -1;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    reorderSlides(fromIdx, toIdx) {
      calls.push(['reorderSlides', fromIdx, toIdx]);
      return fromIdx !== toIdx;
    }
  };

  vm.createContext(context);
  installSlideRoutingController(context);
  vm.runInContext(reorderSlidesByIdSource, context);

  assert.equal(context.reorderSlidesById('missing', 'slide-2'), false);
  assert.equal(context.reorderSlidesById('slide-1', 'slide-2'), true);
  assert.equal(context.reorderSlidesById('slide-1', 'slide-1'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlideIndexById', 'missing', iframeDoc],
    ['getSlideIndexById', 'slide-2', iframeDoc],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-1', iframeDoc],
    ['getSlideIndexById', 'slide-2', iframeDoc],
    ['reorderSlides', 0, 1],
    ['getIframeDoc'],
    ['getSlideIndexById', 'slide-1', iframeDoc],
    ['getSlideIndexById', 'slide-1', iframeDoc],
    ['reorderSlides', 0, 0]
  ]);
});

test('deleteSlideNode uses the shared iframe accessor and restores editor state after removing a slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    const studioEditorSelectionOptionsAdapter ='
  );

  const selectionIds = ['element-1', 'element-2'];
  const slidesContainer = {
    innerHTML: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>'
  };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  let slides = [];
  const firstSlide = {
    id: 'slide-1',
    remove() {
      slides = [secondSlide];
    }
  };
  const secondSlide = {
    id: 'slide-2',
    remove() {
      slides = [firstSlide];
      slidesContainer.innerHTML = '<section data-slide-id="slide-1"></section>';
    }
  };
  slides = [firstSlide, secondSlide];

  const calls = [];
  let restorePayload = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalSlide: canonicalSlide,
    SlideNextStudioEditorSlideCommands: slideCommands,
    SlideNextStudioDeckView: {
      restoreStudioDeckViewAfterSlideMutation(payload) {
        restorePayload = payload;
        calls.push(['restoreStudioDeckViewAfterSlideMutation', payload]);
      }
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    getActiveSlideId(doc) {
      calls.push(['getActiveSlideId', doc]);
      return 'slide-2';
    },
    getCommittedSelectedEditorElementIds(doc) {
      calls.push(['getCommittedSelectedEditorElementIds', doc]);
      return selectionIds;
    },
    getEditorSlideId(slide) {
      calls.push(['getEditorSlideId', slide]);
      return slide.id;
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckModel.createCanonicalDeck({
        slides: [
          { id: 'slide-1' },
          { id: 'slide-2' }
        ]
      });
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    restoreSelectionAfterPreservedSlideMutation(ids, doc) {
      calls.push(['restoreSelectionAfterPreservedSlideMutation', ids, doc]);
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    setActiveSlide(index) {
      calls.push(['setActiveSlide', index]);
    },
    setActiveSlideById(slideId, doc, options) {
      calls.push(['setActiveSlideById', slideId, doc, options]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideDeletionWithTransaction(fileContent, context);
  installSlideDeletionController(context);
  vm.runInContext(deleteSlideNodeSource, context);

  const result = context.deleteSlideNode(1);

  assert.equal(result, true);
  assert.deepEqual(slides, [firstSlide]);
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getSlides',
    'saveHistoryState',
    'getActiveSlideId',
    'getCommittedSelectedEditorElementIds',
    'getEditorSlideId',
    'generateThumbnails',
    'getSlides',
    'restoreStudioDeckViewAfterSlideMutation',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], iframeDoc);
  assert.equal(calls[3][1], iframeDoc);
  assert.equal(calls[4][1], iframeDoc);
  assert.equal(calls[5][1], secondSlide);
  assert.equal(calls[11][1], 'Auto: Deleted Slide');
  assert.deepEqual(calls[9][2], {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'slides-container',
      before: '<section data-slide-id="slide-1"></section><section data-slide-id="slide-2"></section>',
      after: '<section data-slide-id="slide-1"></section>'
      }]
  });
  assert.deepEqual(calls[9][3].slides.map((slide) => slide.id), ['slide-1']);
  assert.equal(restorePayload.preservedActiveSlideId, 'slide-2');
  assert.equal(restorePayload.removedSlideId, 'slide-2');
  assert.equal(restorePayload.fallbackIndex, 0);

  restorePayload.restoreActiveSlideById('slide-1');
  restorePayload.restoreSelectionState();
  restorePayload.setActiveSlideByIndex(0);

  assert.deepEqual(calls.slice(12).map(([name]) => name), [
    'setActiveSlideById',
    'restoreSelectionAfterPreservedSlideMutation',
    'setActiveSlide'
  ]);
  assert.equal(calls[12][1], 'slide-1');
  assert.equal(calls[12][2], iframeDoc);
  assert.equal(calls[12][3].preserveSelection, true);
  assert.equal(calls[13][1], selectionIds);
  assert.equal(calls[13][2], iframeDoc);
  assert.equal(calls[14][1], 0);
});

test('deleteSlideNode delegates slide removal and transaction capture to the shared deck view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    const studioEditorSelectionOptionsAdapter ='
  );
  const firstSlide = { id: 'slide-1' };
  const deletedSlide = { id: 'slide-2' };
  const slides = [firstSlide, deletedSlide];
  const slidesContainer = { id: 'slides-container' };
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slidesContainer;
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    SlideNextStudioDeckView: {
      applyStudioSlideDeletionMutation(...args) {
        calls.push(['applyStudioSlideDeletionMutation', ...args]);
        return {
          didApply: true,
          transaction: { type: 'markup' }
        };
      }
    },
    captureSlideMutationRestoreState(doc) {
      calls.push(['captureSlideMutationRestoreState', doc]);
      return {
        preservedActiveSlideId: 'slide-2',
        preservedSelectionIds: []
      };
    },
    finalizeSlideMutationPersistence(...args) {
      calls.push(['finalizeSlideMutationPersistence', ...args]);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getEditorSlideId(slide) {
      return slide.id;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides() {
      calls.push(['getSlides']);
      return slides;
    },
    restoreDeckViewAfterSlideMutation(...args) {
      calls.push(['restoreDeckViewAfterSlideMutation', ...args]);
    }
  };

  vm.createContext(context);
  loadApplyEditorSlideDeletionWithTransaction(fileContent, context);
  installSlideDeletionController(context);
  vm.runInContext(deleteSlideNodeSource, context);

  assert.equal(context.deleteSlideNode(1), true);
  const delegation = calls.find(([name]) => name === 'applyStudioSlideDeletionMutation');
  assert.equal(delegation[1], slidesContainer);
  assert.equal(delegation[2], deletedSlide);
  assert.equal(typeof delegation[3].createMarkupTransactionCapture, 'function');
  const finalize = calls.find(([name]) => name === 'finalizeSlideMutationPersistence');
  assert.deepEqual(finalize, [
    'finalizeSlideMutationPersistence',
    'Auto: Deleted Slide',
    { type: 'markup' }
  ]);
});

test('deleteSlideNode no-ops when the iframe document is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    const studioEditorSelectionOptionsAdapter ='
  );

  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideDeletionWithTransaction(fileContent, context);
  installSlideDeletionController(context);
  vm.runInContext(deleteSlideNodeSource, context);

  assert.equal(context.deleteSlideNode(0), false);

  assert.deepEqual(calls, [['getIframeDoc']]);
});

test('deleteSlideNode no-ops when the requested slide index is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    const studioEditorSelectionOptionsAdapter ='
  );

  const firstSlide = { id: 'slide-1', remove() {} };
  const secondSlide = { id: 'slide-2', remove() {} };
  const slides = [firstSlide, secondSlide];
  const calls = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return slides;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideDeletionWithTransaction(fileContent, context);
  installSlideDeletionController(context);
  vm.runInContext(deleteSlideNodeSource, context);

  const result = context.deleteSlideNode(9);

  assert.equal(result, false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});

test('deleteSlideNode refuses to remove the final remaining slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deleteSlideNodeSource = extractFunctionSource(
    fileContent,
    'function deleteSlideNode(idx) {',
    '\n\n    const studioEditorSelectionOptionsAdapter ='
  );

  const alerts = [];
  const iframeDoc = {
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return {};
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorSlideCommands: slideCommands,
    alert(message) {
      alerts.push(message);
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return iframeDoc;
    },
    getSlides(doc) {
      calls.push(['getSlides', doc]);
      return [{ id: 'slide-1', remove() {} }];
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    }
  };

  vm.createContext(context);
  loadFinalizeSlideMutationPersistence(fileContent, context);
  loadCaptureSlideMutationRestoreState(fileContent, context);
  loadRestoreDeckViewAfterSlideMutation(fileContent, context);
  loadApplyEditorSlideDeletionWithTransaction(fileContent, context);
  installSlideDeletionController(context);
  vm.runInContext(deleteSlideNodeSource, context);

  const result = context.deleteSlideNode(0);

  assert.equal(result, false);
  assert.deepEqual(alerts, ['Action aborted: presentation requires at least one slide.']);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getSlides', iframeDoc]
  ]);
});
