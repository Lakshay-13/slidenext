const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalInsertion = require('../shared/studio-editor-canonical-insertion.js');
const studioInsertion = require('../shared/studio-editor-insertion.js');
const elementInsertionMutation = require('../shared/studio-editor-element-insertion-mutation.js');
const elementInsertionController = require('../shared/studio-editor-element-insertion-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createControls() {
  return {
    addSlideBtn: { disabled: true },
    duplicateSlideBtn: { disabled: true },
    toolbarInsertHeadingBtn: { disabled: true },
    toolbarInsertParagraphBtn: { disabled: true },
    toolbarInsertImageBtn: { disabled: true },
    toolbarInsertShapeBtn: { disabled: true },
    insertHeadingBtn: { disabled: true },
    insertParagraphBtn: { disabled: true },
    insertImageBtn: { disabled: true },
    insertShapeBtn: { disabled: true },
    insertTableBtn: { disabled: true },
    insertCodeBtn: { disabled: true },
    insertEmbedBtn: { disabled: true }
  };
}

function getDisabledStates(controls) {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, control.disabled]));
}

function loadResolveCurrentStudioInsertionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function resolveCurrentStudioInsertionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateInsertionActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadElementInsertionMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorElementInsertionWithTransaction(type, options = {}) {',
    'function insertElement(type) {'
  );
  context.SlideNextStudioEditorElementInsertionMutation = elementInsertionMutation;
  vm.runInContext(helperSource, context);
}

function loadInsertElement(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function insertElement(type) {',
    '\n\n    function finalizeLayerOrderMutation'
  );
  vm.runInContext(helperSource, context);
}

function installElementInsertionController(context) {
  context.studioEditorElementInsertionController = elementInsertionController
    .createStudioEditorElementInsertionController({
      canonicalDeckApi: context.SlideNextCanonicalDeck,
      canonicalInsertionApi: context.SlideNextStudioEditorCanonicalInsertion,
      deckImportApi: context.SlideNextDeckImport,
      getIframeDoc: context.getIframeDoc,
      getActiveSlide: context.getActiveSlide,
      getEditorSlideId: context.getEditorSlideId,
      buildCanonicalDeck: context.buildEditorCanonicalDeck,
      applyElementInsertion: context.applyEditorElementInsertionWithTransaction,
      makeElementsHoverable: context.makeElementsHoverable,
      assignElementId: context.assignEditorElementId,
      finalizeInsertedElements: context.finalizeInsertedElements,
      selectElement: context.selectElement,
      generateThumbnails: context.generateThumbnails,
      saveHistoryState: context.saveHistoryState,
      triggerAutoSave: context.triggerAutoSave,
      triggerAutoVersion: context.triggerAutoVersion,
      updateInsertionActionState: context.updateInsertionActionState
    });
}

test('applyEditorElementInsertionWithTransaction delegates element creation and transaction capture to the shared insertion module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slide = { appendChild() {} };
  const calls = [];
  const element = { id: 'inserted-element' };
  const context = {
    SlideNextStudioEditorInsertion: {
      ...studioInsertion,
      applyStudioElementInsertion(type, options) {
        calls.push([type, options]);
        return { element, transaction: { type: 'markup' } };
      }
    }
  };

  vm.createContext(context);
  loadElementInsertionMutationHelper(fileContent, context);

  const result = context.applyEditorElementInsertionWithTransaction('h2', {
    documentRef: { id: 'document' },
    slide,
    offset: 15,
    transactionElementId: 'slide:slide-1'
  });

  assert.equal(result.element, element);
  assert.deepEqual(result.transaction, { type: 'markup' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'h2');
  assert.equal(calls[0][1].slide, slide);
  assert.equal(calls[0][1].offset, 15);
  assert.equal(calls[0][1].transactionElementId, 'slide:slide-1');
});

test('insertElement forwards an immutable canonical node sidecar after insertion', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [] }]
  });
  const activeSlide = { children: [] };
  const insertedElement = { dataset: { editorId: 'node-1' } };
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeck,
    SlideNextStudioEditorCanonicalInsertion: canonicalInsertion,
    SlideNextDeckImport: {
      importElementToCanonicalNode(element, options) {
        return { id: options.getNodeId(element), type: 'heading' };
      }
    },
    SlideNextStudioEditorInsertion: {
      applyStudioElementInsertion() {
        return { element: insertedElement, transaction: { id: 'tx-insert' } };
      }
    },
    getIframeDoc() {
      return { id: 'iframe-doc' };
    },
    getActiveSlide() {
      return activeSlide;
    },
    getEditorSlideId() {
      return 'slide-1';
    },
    buildEditorCanonicalDeck() {
      return sourceDeck;
    },
    finalizeInsertedElements(elements, versionLabel, transaction, canonicalDeckValue) {
      finalized = { elements, versionLabel, transaction, canonicalDeck: canonicalDeckValue };
      return true;
    },
    updateInsertionActionState() {}
  };

  vm.createContext(context);
  loadElementInsertionMutationHelper(fileContent, context);
  loadInsertElement(fileContent, context);
  installElementInsertionController(context);

  assert.equal(context.insertElement('h2'), true);
  assert.equal(finalized.transaction.id, 'tx-insert');
  assert.deepEqual(finalized.canonicalDeck.slides[0].nodes.map((node) => node.id), ['node-1']);
  assert.equal(sourceDeck.slides[0].nodes.length, 0);
});

test('resolveCurrentStudioInsertionActionState reports add-slide and insertion readiness from the live deck document', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioInsertionActionState(null))),
    {
      canAddSlide: false,
      canDuplicateSlide: false,
      canInsertElements: false
    }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioInsertionActionState({
      getElementById(id) {
        return id === 'slidesContainer' ? {} : null;
      }
    }))),
    {
      canAddSlide: true,
      canDuplicateSlide: false,
      canInsertElements: false
    }
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioInsertionActionState({
      activeSlide: {},
      getElementById(id) {
        return id === 'slidesContainer' ? {} : null;
      }
    }))),
    {
      canAddSlide: true,
      canDuplicateSlide: true,
      canInsertElements: true
    }
  );
});

test('resolveCurrentStudioInsertionActionState reuses the shared deck-view insertion helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = {
    activeSlide: { id: 'slide-1' },
    getElementById(id) {
      return id === 'slidesContainer' ? { id: 'slides-container' } : null;
    }
  };
  const calls = [];
  const context = {
    SlideNextStudioDeckView: {
      resolveStudioInsertionActionState(sourceDoc, options = {}) {
        calls.push({
          sourceDoc,
          hasGetActiveSlide: typeof options.getActiveSlide === 'function',
          hasGetSlideContainer: typeof options.getSlideContainer === 'function',
          activeSlideId: options.getActiveSlide(sourceDoc)?.id || '',
          hasSlideContainer: !!options.getSlideContainer(sourceDoc)
        });
        return {
          canAddSlide: true,
          canDuplicateSlide: true,
          canInsertElements: true
        };
      }
    },
    getActiveSlide(sourceDoc) {
      return sourceDoc && sourceDoc.activeSlide ? sourceDoc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadResolveCurrentStudioInsertionActionState(fileContent, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.resolveCurrentStudioInsertionActionState(doc))),
    {
      canAddSlide: true,
      canDuplicateSlide: true,
      canInsertElements: true
    }
  );
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    sourceDoc: {
      activeSlide: { id: 'slide-1' }
    },
    hasGetActiveSlide: true,
    hasGetSlideContainer: true,
    activeSlideId: 'slide-1',
    hasSlideContainer: true
  }]);
});

test('updateInsertionActionState enables deck-ready insert controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateInsertionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateInsertionActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const controls = createControls();
  const context = {
    document: {
      getElementById(id) {
        return controls[id] || null;
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
  loadResolveCurrentStudioInsertionActionState(fileContent, context);
  vm.runInContext(updateInsertionActionStateSource, context);

  context.updateInsertionActionState(null);
  assert.deepEqual(getDisabledStates(controls), {
    addSlideBtn: true,
    duplicateSlideBtn: true,
    toolbarInsertHeadingBtn: true,
    toolbarInsertParagraphBtn: true,
    toolbarInsertImageBtn: true,
    toolbarInsertShapeBtn: true,
    insertHeadingBtn: true,
    insertParagraphBtn: true,
    insertImageBtn: true,
    insertShapeBtn: true,
    insertTableBtn: true,
    insertCodeBtn: true,
    insertEmbedBtn: true
  });

  context.updateInsertionActionState({
    getElementById(id) {
      return id === 'slidesContainer' ? {} : null;
    }
  });
  assert.deepEqual(getDisabledStates(controls), {
    addSlideBtn: false,
    duplicateSlideBtn: true,
    toolbarInsertHeadingBtn: true,
    toolbarInsertParagraphBtn: true,
    toolbarInsertImageBtn: true,
    toolbarInsertShapeBtn: true,
    insertHeadingBtn: true,
    insertParagraphBtn: true,
    insertImageBtn: true,
    insertShapeBtn: true,
    insertTableBtn: true,
    insertCodeBtn: true,
    insertEmbedBtn: true
  });

  const readyDoc = {
    activeSlide: {},
    getElementById(id) {
      return id === 'slidesContainer' ? {} : null;
    }
  };
  context.updateInsertionActionState(readyDoc);
  assert.deepEqual(getDisabledStates(controls), {
    addSlideBtn: false,
    duplicateSlideBtn: false,
    toolbarInsertHeadingBtn: false,
    toolbarInsertParagraphBtn: false,
    toolbarInsertImageBtn: false,
    toolbarInsertShapeBtn: false,
    insertHeadingBtn: false,
    insertParagraphBtn: false,
    insertImageBtn: false,
    insertShapeBtn: false,
    insertTableBtn: false,
    insertCodeBtn: false,
    insertEmbedBtn: false
  });
});

test('updateInsertionActionState delegates toolbar rendering to the shared deck view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateInsertionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateInsertionActionState(doc = getIframeDoc()) {',
    '\n\n    function resolveCurrentStudioZoomActionState(doc = getIframeDoc()) {'
  );
  const slideContainer = { id: 'slides-container' };
  const doc = {
    activeSlide: {},
    getElementById(id) {
      assert.equal(id, 'slidesContainer');
      return slideContainer;
    }
  };
  const calls = [];
  const context = {
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return currentDoc.activeSlide;
    },
    SlideNextStudioDeckView: {
      syncStudioInsertionToolbarActionState(options) {
        calls.push(options);
        assert.equal(options.doc, doc);
        assert.equal(options.getActiveSlide(doc), doc.activeSlide);
        assert.equal(options.getSlideContainer(doc), slideContainer);
        return 'delegated';
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateInsertionActionStateSource, context);

  assert.equal(context.updateInsertionActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].doc, doc);
  assert.equal(calls[0].getActiveSlide, context.getActiveSlide);
});
