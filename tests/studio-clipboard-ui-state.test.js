const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalInsertion = require('../shared/studio-editor-canonical-insertion.js');
const clipboardState = require('../shared/studio-editor-clipboard.js');
const clipboardMutation = require('../shared/studio-editor-clipboard-mutation.js');
const clipboardController = require('../shared/studio-editor-clipboard-controller.js');
const deckMutation = require('../shared/studio-editor-deck-mutation.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function extractClipboardMutationPlanBuilderSource(fileContent) {
  return extractFunctionSource(
    fileContent,
    'function buildClipboardSelectionMutationPlan(doc = null) {',
    '\n\n    function finalizeClipboardActionResult(result) {'
  );
}

function extractClipboardActionFinalizerSource(fileContent) {
  return extractFunctionSource(
    fileContent,
    'function finalizeClipboardActionResult(result) {',
    '\n\n    function finalizeInsertedElements(insertedElements, versionLabel, transaction = null) {'
  );
}

function loadClipboardInsertionHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorClipboardInsertionWithTransaction(insertionPlans, slide, options = {}) {',
    '\n\n    function insertClipboardPayload(items, offsetMultiplier = 1, options = {}) {'
  );
  context.SlideNextStudioEditorClipboardMutation = clipboardMutation;
  vm.runInContext(helperSource, context);
}

function installClipboardController(context) {
  context.studioEditorClipboardController = clipboardController.createStudioEditorClipboardController({
    clipboardApi: context.SlideNextStudioEditorClipboard,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    canonicalInsertionApi: context.SlideNextStudioEditorCanonicalInsertion,
    deckImportApi: context.SlideNextDeckImport,
    getClipboard: () => context.editorClipboard,
    setClipboard: (nextClipboard) => { context.editorClipboard = nextClipboard; },
    buildClipboardSelectionMutationPlan: context.buildClipboardSelectionMutationPlan,
    finalizeClipboardActionResult: context.finalizeClipboardActionResult,
    getIframeDoc: context.getIframeDoc,
    getActiveSlide: context.getActiveSlide,
    getEditorSlideId: context.getEditorSlideId,
    assignElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    insertClipboardPayload: context.insertClipboardPayload,
    finalizeInsertedElements: context.finalizeInsertedElements
  });
}

function createControls() {
  return {
    copySelectionBtn: { disabled: true },
    pasteClipboardBtn: { disabled: true },
    slidePasteClipboardBtn: { disabled: true }
  };
}

function getControlStates(controls) {
  return {
    copySelectionBtn: controls.copySelectionBtn.disabled,
    pasteClipboardBtn: controls.pasteClipboardBtn.disabled,
    slidePasteClipboardBtn: controls.slidePasteClipboardBtn.disabled
  };
}

test('buildClipboardSelectionMutationPlan reuses the current selection, clipboard, live slide guard, and payload viability', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);

  const selection = [{ id: 'node-1' }];
  const clipboard = { items: [{ id: 'clipboard-item' }], pasteCount: 0 };
  const payloadItems = [{ id: 'payload-item' }];
  const calls = [];
  const context = {
    selectedElements: selection,
    editorClipboard: clipboard,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements, nextClipboard, options = {}) {
        calls.push(['buildStudioClipboardMutationPlan', elements, nextClipboard]);
        return {
          canCopy: options.canMutateDeck(),
          canDuplicate: options.canMutateDeck(),
          selection: elements
        };
      }
    },
    buildClipboardPayload(elements, doc) {
      calls.push(['buildClipboardPayload', elements, doc]);
      return payloadItems;
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      const doc = { activeSlide: { id: 'slide-1' } };
      calls.push(['getIframeDoc', doc]);
      return doc;
    },
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildClipboardSelectionMutationPlanSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.buildClipboardSelectionMutationPlan())), {
    canCopy: true,
    canDuplicate: true,
    selection,
    payloadItems,
    canBuildPayload: true
  });
  assert.deepEqual(calls, [
    ['getIframeDoc', { activeSlide: { id: 'slide-1' } }],
    ['buildStudioClipboardMutationPlan', selection, clipboard],
    ['getActiveSlide', { activeSlide: { id: 'slide-1' } }],
    ['getActiveSlide', { activeSlide: { id: 'slide-1' } }],
    ['buildClipboardPayload', selection, { activeSlide: { id: 'slide-1' } }]
  ]);
});

test('buildClipboardSelectionMutationPlan reuses the shared clipboard selection helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);

  const selection = [{ id: 'node-1' }];
  const clipboard = { items: [{ id: 'clipboard-item' }], pasteCount: 0 };
  const payloadItems = [{ id: 'payload-item' }];
  const calls = [];
  const context = {
    selectedElements: selection,
    editorClipboard: clipboard,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardSelectionMutationPlan(elements, nextClipboard, options = {}) {
        calls.push({
          elements,
          nextClipboard,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canMutateDeck: options.canMutateDeck(),
          payloadItems: options.buildPayloadItems(elements)
        });
        return {
          selection: elements,
          canCopy: true,
          canDuplicate: true,
          canPaste: false,
          payloadItems,
          canBuildPayload: true
        };
      }
    },
    buildClipboardPayload(elements, doc) {
      calls.push(['buildClipboardPayload', elements, doc]);
      return payloadItems;
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      const doc = { activeSlide: { id: 'slide-1' } };
      calls.push(['getIframeDoc', doc]);
      return doc;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildClipboardSelectionMutationPlanSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.buildClipboardSelectionMutationPlan())), {
    selection,
    canCopy: true,
    canDuplicate: true,
    canPaste: false,
    payloadItems,
    canBuildPayload: true
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['getIframeDoc', { activeSlide: { id: 'slide-1' } }],
    ['getActiveSlide', { activeSlide: { id: 'slide-1' } }],
    ['buildClipboardPayload', selection, { activeSlide: { id: 'slide-1' } }],
    {
      elements: selection,
      nextClipboard: clipboard,
      hasCanMutateDeck: true,
      canMutateDeck: true,
      payloadItems
    }
  ]);
});

test('buildClipboardSelectionMutationPlan fails closed when the shared clipboard module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const context = {};

  vm.createContext(context);
  vm.runInContext(buildClipboardSelectionMutationPlanSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(
    context.buildClipboardSelectionMutationPlan({})
  )), {
    selection: [],
    canCopy: false,
    canDuplicate: false,
    canPaste: false,
    payloadItems: [],
    canBuildPayload: false
  });
});

test('buildClipboardPayload returns no payload when the shared clipboard module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardPayloadSource = extractFunctionSource(
    fileContent,
    'function buildClipboardPayload(elements = selectedElements, doc = getIframeDoc()) {',
    '\n\n    function applyEditorClipboardInsertionWithTransaction'
  );
  const activeSlide = {};
  const documentRef = {
    defaultView: {
      getComputedStyle() {
        return {};
      }
    }
  };
  const context = {
    selectedElements: [{}],
    getIframeDoc() {
      return documentRef;
    },
    getActiveSlide() {
      return activeSlide;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildClipboardPayloadSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(
    context.buildClipboardPayload(context.selectedElements, documentRef)
  )), []);
});

test('finalizeClipboardActionResult refreshes clipboard controls and preserves the action result', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);

  const calls = [];
  const context = {
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(finalizeClipboardActionResultSource, context);

  assert.equal(context.finalizeClipboardActionResult(false), false);
  assert.equal(context.finalizeClipboardActionResult(true), true);
  assert.deepEqual(calls, [
    ['updateClipboardActionState'],
    ['updateClipboardActionState']
  ]);
});

test('finalizeClipboardActionResult delegates result refresh to the shared clipboard module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  let delegated = null;
  const context = {
    SlideNextStudioEditorClipboard: {
      finalizeStudioClipboardActionResult(result, options) {
        delegated = { result, options };
        return 'delegated';
      }
    },
    updateClipboardActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(extractClipboardActionFinalizerSource(fileContent), context);

  assert.equal(context.finalizeClipboardActionResult(false), 'delegated');
  assert.equal(delegated.result, false);
  assert.equal(delegated.options.updateClipboardActionState, context.updateClipboardActionState);
});

test('finalizeInsertedElements commits the new selection and delegates persistence through the shared mutation helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeInsertedElementsSource = extractFunctionSource(
    fileContent,
    'function finalizeInsertedElements(insertedElements, versionLabel, transaction = null) {',
    '\n\n    function copySelectedElements() {'
  );

  const insertedElements = [{ id: 'node-1' }, { id: 'node-2' }];
  const nextSelectionState = {
    selectedElement: insertedElements[0],
    selectedElements: insertedElements
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorSelection: {
      selectAllStudioElements(elements) {
        calls.push(['selectAllStudioElements', elements]);
        return nextSelectionState;
      }
    },
    commitEditorSelectionState(selectionState) {
      calls.push(['commitEditorSelectionState', selectionState]);
    },
    finalizeEditorDeckMutation(versionLabel) {
      calls.push(['finalizeEditorDeckMutation', versionLabel]);
    }
  };

  vm.createContext(context);
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(finalizeInsertedElementsSource, context);

  assert.equal(context.finalizeInsertedElements(insertedElements, 'Auto: Pasted Element'), true);
  assert.equal(context.finalizeInsertedElements([], 'Auto: Pasted Element'), false);
  assert.deepEqual(calls, [
    ['selectAllStudioElements', insertedElements],
    ['commitEditorSelectionState', nextSelectionState],
    ['finalizeEditorDeckMutation', 'Auto: Pasted Element']
  ]);
});

test('finalizeInsertedElements fails closed when shared selection is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeInsertedElementsSource = extractFunctionSource(
    fileContent,
    'function finalizeInsertedElements(insertedElements, versionLabel, transaction = null) {',
    '\n\n    function copySelectedElements() {'
  );
  let finalized = false;
  const context = {
    SlideNextStudioEditorSelection: null,
    finalizeEditorDeckMutation() {
      finalized = true;
    }
  };

  vm.createContext(context);
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(finalizeInsertedElementsSource, context);

  assert.equal(context.finalizeInsertedElements([{ id: 'node-1' }], 'Auto: Pasted Element'), false);
  assert.equal(finalized, false);
});

test('finalizeInsertedElements delegates selection and persistence ordering to shared mutation', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeInsertedElementsSource = extractFunctionSource(
    fileContent,
    'function finalizeInsertedElements(insertedElements, versionLabel, transaction = null) {',
    '\n\n    function copySelectedElements() {'
  );
  const insertedElements = [{ id: 'node-1' }];
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorMutation: {
      finalizeStudioInsertedElements(options) {
        delegatedOptions = options;
        return true;
      }
    },
    SlideNextStudioEditorSelection: {
      selectAllStudioElements() {}
    },
    commitEditorSelectionState() {},
    finalizeEditorDeckMutation() {}
  };

  vm.createContext(context);
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(finalizeInsertedElementsSource, context);

  assert.equal(context.finalizeInsertedElements(insertedElements, 'Auto: Pasted Element', { id: 'tx-1' }), true);
  assert.equal(delegatedOptions.insertedElements, insertedElements);
  assert.equal(delegatedOptions.versionLabel, 'Auto: Pasted Element');
  assert.deepEqual(delegatedOptions.transaction, { id: 'tx-1' });
  assert.equal(delegatedOptions.selectAllElements, context.SlideNextStudioEditorSelection.selectAllStudioElements);
  assert.equal(delegatedOptions.commitSelectionState, context.commitEditorSelectionState);
  assert.equal(delegatedOptions.finalizeMutation, context.finalizeEditorDeckMutation);
});

test('duplicateSelectedElements forwards the insertion markup transaction to history', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const finalizeInsertedElementsSource = extractFunctionSource(
    fileContent,
    'function finalizeInsertedElements(insertedElements, versionLabel, transaction = null) {',
    '\n\n    function copySelectedElements() {'
  );
  const duplicateSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function duplicateSelectedElements() {',
    '\n\n    function nudgeSelectedElements(dx, dy) {'
  );
  const insertedElement = { id: 'node-2' };
  const markupTransaction = studioTransaction.createStudioMarkupTransaction([{
    elementId: 'slide-1',
    before: '<div data-editor-id="node-1">A</div>',
    after: '<div data-editor-id="node-1">A</div><div data-editor-id="node-2">B</div>'
  }]);
  let finalized = null;
  const context = {
    editorClipboard: null,
    selectedElements: [{ id: 'node-1', isConnected: true }],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardSelectionMutationPlan() {
        return {
          canDuplicate: true,
          selection: [{ id: 'node-1', isConnected: true }],
          payloadItems: [{ id: 'clipboard-item' }],
          canBuildPayload: true
        };
      }
    },
    SlideNextStudioEditorSelection: {
      selectAllStudioElements(elements) {
        return {
          selectedElement: elements[0],
          selectedElements: elements
        };
      }
    },
    buildClipboardPayload() {
      return [{ id: 'clipboard-item' }];
    },
    commitEditorSelectionState() {},
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    insertClipboardPayload(items, offsetMultiplier, options) {
      assert.deepEqual(items, [{ id: 'clipboard-item' }]);
      assert.equal(offsetMultiplier, 1);
      options.onTransaction(markupTransaction);
      return [insertedElement];
    },
    isElementLocked() {
      return false;
    },
    updateClipboardActionState() {}
  };

  vm.createContext(context);
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(
    `${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${finalizeInsertedElementsSource}\n${duplicateSelectedElementsSource}`,
    context
  );
  installClipboardController(context);

  assert.equal(context.duplicateSelectedElements(), true);
  assert.equal(finalized.versionLabel, 'Auto: Duplicated Element');
  assert.deepEqual(JSON.parse(JSON.stringify(finalized.options.transaction)), markupTransaction);
});

test('duplicateSelectedElements forwards a canonical deck sidecar for cloned nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const finalizeInsertedElementsSource = extractFunctionSource(
    fileContent,
    'function finalizeInsertedElements(insertedElements, versionLabel, transaction = null) {',
    '\n\n    function copySelectedElements() {'
  );
  const duplicateSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function duplicateSelectedElements() {',
    '\n\n    function nudgeSelectedElements(dx, dy) {'
  );
  const sourceDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', text: 'Original' }] }]
  });
  const duplicate = { dataset: { editorId: 'node-2' } };
  const activeSlide = { id: 'slide-1' };
  let finalized = null;
  const context = {
    editorClipboard: null,
    selectedElements: [{ id: 'node-1', isConnected: true }],
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalInsertion: canonicalInsertion,
    SlideNextDeckImport: {
      importElementToCanonicalNode(element, options) {
        assert.equal(element, duplicate);
        assert.equal(options.getNodeId(element), 'node-2');
        return { id: 'node-2', tagName: 'p', text: 'Duplicate' };
      }
    },
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardSelectionMutationPlan() {
        return {
          canDuplicate: true,
          selection: [{ id: 'node-1', isConnected: true }],
          payloadItems: [{ id: 'clipboard-item' }],
          canBuildPayload: true
        };
      }
    },
    SlideNextStudioEditorSelection: {
      selectAllStudioElements(elements) {
        return { selectedElements: elements, selectedElement: elements[0] };
      }
    },
    buildEditorCanonicalDeck(doc) {
      assert.equal(doc.label, 'iframe-doc');
      return sourceDeck;
    },
    buildClipboardPayload() {
      return [{ id: 'clipboard-item' }];
    },
    commitEditorSelectionState() {},
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    },
    getActiveSlide(doc) {
      assert.equal(doc.label, 'iframe-doc');
      return activeSlide;
    },
    getEditorSlideId(slide) {
      assert.equal(slide, activeSlide);
      return 'slide-1';
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    insertClipboardPayload(items, offsetMultiplier, options) {
      assert.deepEqual(items, [{ id: 'clipboard-item' }]);
      assert.equal(offsetMultiplier, 1);
      options.onTransaction({ id: 'tx-duplicate' });
      return [duplicate];
    },
    isElementLocked() {
      return false;
    },
    updateClipboardActionState() {}
  };

  vm.createContext(context);
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(
    `${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${finalizeInsertedElementsSource}\n${duplicateSelectedElementsSource}`,
    context
  );
  installClipboardController(context);

  assert.equal(context.duplicateSelectedElements(), true);
  assert.equal(finalized.versionLabel, 'Auto: Duplicated Element');
  assert.deepEqual(finalized.options.transaction, { id: 'tx-duplicate' });
  assert.deepEqual(finalized.options.canonicalDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2']);
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[1].text, 'Duplicate');
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1']);
});

test('insertClipboardPayload captures each insertion parent once through the shared markup adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertClipboardPayloadSource = extractFunctionSource(
    fileContent,
    'function insertClipboardPayload(items, offsetMultiplier = 1, options = {}) {',
    '\n\n    function buildClipboardSelectionMutationPlan'
  );
  const parent = {
    dataset: { editorId: 'parent-1' },
    innerHTML: '<div data-editor-id="source"></div>',
    appended: [],
    appendChild(element) {
      this.appended.push(element);
      this.innerHTML = `<div data-editor-id="source"></div>${this.appended.map((item) => `<div>${item.id}</div>`).join('')}`;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, right: 500, bottom: 400 };
    }
  };
  const slide = {
    contains() {
      return true;
    },
    appendChild(element) {
      parent.appendChild(element);
    }
  };
  const doc = { id: 'iframe-doc' };
  const firstClone = { id: 'clone-1', style: {} };
  const secondClone = { id: 'clone-2', style: {} };
  let capturedTransaction = null;
  const context = {
    DUPLICATE_OFFSET_PX: 24,
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorClipboard: {
      applyStudioClipboardInsertion: clipboardState.applyStudioClipboardInsertion,
      buildStudioClipboardInsertionPlan() {
        return [
          {
            clone: firstClone,
            insertionTarget: { mode: 'absolute', parent },
            absolutePlacement: { nextLeft: 10, nextTop: 20 }
          },
          {
            clone: secondClone,
            insertionTarget: { mode: 'absolute', parent },
            absolutePlacement: { nextLeft: 30, nextTop: 40 }
          }
        ];
      }
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getIframeDoc() {
      return doc;
    },
    getRectOnSlide(rect) {
      return rect;
    },
    getSlideMetrics() {
      return { logicalWidth: 500, logicalHeight: 400 };
    },
    makeElementsHoverable() {}
  };

  vm.createContext(context);
  loadClipboardInsertionHelper(fileContent, context);
  vm.runInContext(insertClipboardPayloadSource, context);

  const inserted = context.insertClipboardPayload([{ id: 'source-1' }, { id: 'source-2' }], 1, {
    onTransaction(transaction) {
      capturedTransaction = transaction;
    }
  });

  assert.equal(inserted.length, 2);
  assert.equal(inserted[0].id, 'clone-1');
  assert.equal(inserted[1].id, 'clone-2');
  assert.deepEqual(JSON.parse(JSON.stringify(capturedTransaction)), {
    kind: 'slidenext.editor.transaction',
    version: 1,
    operations: [{
      type: 'markup',
      elementId: 'parent-1',
      before: '<div data-editor-id="source"></div>',
      after: '<div data-editor-id="source"></div><div>clone-1</div><div>clone-2</div>'
    }]
  });
  assert.deepEqual(firstClone.style, {
    position: 'absolute',
    margin: '0',
    left: '10px',
    top: '20px'
  });
  assert.deepEqual(secondClone.style, {
    position: 'absolute',
    margin: '0',
    left: '30px',
    top: '40px'
  });
});

test('insertClipboardPayload delegates insertion application to the shared clipboard module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertClipboardPayloadSource = extractFunctionSource(
    fileContent,
    'function insertClipboardPayload(items, offsetMultiplier = 1, options = {}) {',
    '\n\n    function buildClipboardSelectionMutationPlan'
  );
  const doc = { id: 'iframe-doc' };
  const slide = { contains() { return true; } };
  const inserted = [{ id: 'clone-1' }];
  let capturedTransaction = null;
  const calls = [];
  const context = {
    DUPLICATE_OFFSET_PX: 24,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardInsertionPlan() {
        return [{
          clone: { id: 'plan-clone', style: {} },
          insertionTarget: { mode: 'append-to-slide' },
          absolutePlacement: null
        }];
      },
      applyStudioClipboardInsertion(plans, options) {
        calls.push(['applyStudioClipboardInsertion', plans, options]);
        return { inserted, transaction: { type: 'markup' } };
      }
    },
    getActiveSlide(currentDoc) {
      assert.equal(currentDoc, doc);
      return slide;
    },
    getIframeDoc() {
      return doc;
    },
    getRectOnSlide(rect) {
      return rect;
    },
    getSlideMetrics() {
      return { logicalWidth: 500, logicalHeight: 400 };
    },
    makeElementsHoverable() {}
  };

  vm.createContext(context);
  loadClipboardInsertionHelper(fileContent, context);
  vm.runInContext(insertClipboardPayloadSource, context);

  const result = context.insertClipboardPayload([{ id: 'source-1' }], 1, {
    onTransaction(transaction) {
      capturedTransaction = transaction;
    }
  });

  assert.deepEqual(result, inserted);
  assert.equal(calls[0][0], 'applyStudioClipboardInsertion');
  assert.equal(calls[0][1].length, 1);
  assert.equal(calls[0][2].slide, slide);
  assert.equal(typeof calls[0][2].getElementId, 'function');
  assert.deepEqual(capturedTransaction, { type: 'markup' });
});

test('insertClipboardPayload returns no insertions when the shared clipboard module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const insertClipboardPayloadSource = extractFunctionSource(
    fileContent,
    'function insertClipboardPayload(items, offsetMultiplier = 1, options = {}) {',
    '\n\n    function buildClipboardSelectionMutationPlan'
  );
  const doc = {};
  const context = {
    getIframeDoc() {
      return doc;
    },
    getActiveSlide() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(insertClipboardPayloadSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(
    context.insertClipboardPayload([{ id: 'source-1' }])
  )), []);
});

test('updateClipboardActionState enables paste on a live slide and enables copy only when clipboard payloads can be built', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );

  const controls = createControls();
  const activeSlide = { id: 'slide-1' };
  let payloadItems = [];
  const context = {
    selectedElements: [{ id: 'selected' }],
    editorClipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 0 },
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements, clipboard, options = {}) {
        return {
          canCopy: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true,
          canPaste: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      },
      syncStudioClipboardToolbarState(options = {}) {
        const canMutateDeck = typeof options.canMutateDeck === 'function'
          ? options.canMutateDeck()
          : true;
        return clipboardState.renderStudioClipboardToolbarState({
          documentRef: options.documentRef,
          actionState: {
            buttonStates: {
              copySelectionBtn: canMutateDeck && payloadItems.length > 0,
              pasteClipboardBtn: canMutateDeck,
              slidePasteClipboardBtn: canMutateDeck
            }
          }
        });
      }
    },
    buildClipboardPayload() {
      return payloadItems;
    },
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
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${updateClipboardActionStateSource}`, context);

  context.updateClipboardActionState(null);
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });

  context.updateClipboardActionState({
    getElementById() {
      return null;
    }
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });

  context.updateClipboardActionState({
    activeSlide
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: false,
    slidePasteClipboardBtn: false
  });

  payloadItems = [{ id: 'payload-item' }];
  context.updateClipboardActionState({
    activeSlide
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: false,
    pasteClipboardBtn: false,
    slidePasteClipboardBtn: false
  });
});

test('updateClipboardActionState reuses the shared clipboard toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );

  const controls = createControls();
  const calls = [];
  const context = {
    selectedElements: [{ id: 'selected' }],
    editorClipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 0 },
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        throw new Error('buildStudioClipboardMutationPlan should not be used when shared toolbar helper exists');
      },
      buildStudioClipboardToolbarState(elements, clipboard, options = {}) {
        calls.push({
          elements,
          clipboard,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canMutateDeck: options.canMutateDeck()
        });
        return {
          buttonStates: {
            copySelectionBtn: true,
            pasteClipboardBtn: false,
            slidePasteClipboardBtn: false
          }
        };
      },
      syncStudioClipboardToolbarState(options = {}) {
        const actionState = this.buildStudioClipboardToolbarState(
          options.elements,
          options.clipboard,
          options
        );
        return clipboardState.renderStudioClipboardToolbarState({
          documentRef: options.documentRef,
          actionState
        });
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
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateClipboardActionStateSource, context);

  context.updateClipboardActionState({
    activeSlide: {}
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: false,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    elements: [{ id: 'selected' }],
    clipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 0 },
    hasCanMutateDeck: true,
    canMutateDeck: true
  }]);
});

test('updateClipboardActionState delegates toolbar state assembly to the shared clipboard view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );
  const selectedElement = { id: 'selected' };
  const clipboard = { items: [{ id: 'clipboard-item' }], pasteCount: 0 };
  const calls = [];
  const context = {
    selectedElements: [selectedElement],
    editorClipboard: clipboard,
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorClipboard: {
      syncStudioClipboardToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    document: {},
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateClipboardActionStateSource, context);

  const doc = { activeSlide: {} };
  assert.equal(context.updateClipboardActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.deepEqual(calls[0].elements, [selectedElement]);
  assert.equal(calls[0].clipboard, clipboard);
  assert.equal(calls[0].isLocked, context.isElementLocked);
  assert.equal(calls[0].canMutateDeck(), true);
});

test('updateClipboardActionState fails closed when the shared clipboard view is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );
  const controls = createControls();
  const context = {
    selectedElements: [],
    buildClipboardSelectionMutationPlan() {
      throw new Error('legacy clipboard toolbar fallback should not run');
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide() {
      return null;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateClipboardActionStateSource, context);

  assert.equal(context.updateClipboardActionState({}), false);
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });
});

test('copySelectedElements returns false and refreshes clipboard controls when payload build yields no items', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const copySelectedElementsSource = extractFunctionSource(
    fileContent,
    'function copySelectedElements() {',
    '\n\n    function pasteClipboardElements() {'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [liveTarget],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canCopy: true,
          selection: [liveTarget],
          payloadItems: [],
          canBuildPayload: false
        };
      },
      createStudioClipboardState() {
        calls.push(['createStudioClipboardState']);
        return { items: [{ id: 'clipboard-item' }], pasteCount: 0 };
      }
    },
    buildClipboardPayload(selection) {
      calls.push(['buildClipboardPayload', selection]);
      return [];
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
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${copySelectedElementsSource}`, context);
  installClipboardController(context);

  assert.equal(context.copySelectedElements(), false);
  assert.equal(context.editorClipboard, null);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['updateClipboardActionState']
  ]);
});

test('copySelectedElements returns true after creating clipboard state from copied items', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const copySelectedElementsSource = extractFunctionSource(
    fileContent,
    'function copySelectedElements() {',
    '\n\n    function pasteClipboardElements() {'
  );

  const liveTarget = { isConnected: true };
  const copiedItems = [{ id: 'clipboard-item' }];
  const nextClipboard = { items: copiedItems, pasteCount: 0 };
  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [liveTarget],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canCopy: true,
          selection: [liveTarget],
          payloadItems: copiedItems,
          canBuildPayload: true
        };
      },
      createStudioClipboardState(items) {
        calls.push(['createStudioClipboardState', items]);
        return nextClipboard;
      }
    },
    buildClipboardPayload(selection) {
      calls.push(['buildClipboardPayload', selection]);
      return copiedItems;
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
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${copySelectedElementsSource}`, context);
  installClipboardController(context);

  assert.equal(context.copySelectedElements(), true);
  assert.equal(context.editorClipboard, nextClipboard);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['createStudioClipboardState', copiedItems],
    ['updateClipboardActionState']
  ]);
});

test('duplicateSelectedElements returns false and refreshes clipboard controls when duplication is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const duplicateSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function duplicateSelectedElements() {',
    '\n\n    function nudgeSelectedElements(dx, dy) {'
  );

  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [{ isConnected: true }],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canDuplicate: false,
          selection: [],
          payloadItems: [],
          canBuildPayload: false
        };
      }
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
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${duplicateSelectedElementsSource}`, context);
  installClipboardController(context);

  assert.equal(context.duplicateSelectedElements(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['updateClipboardActionState']
  ]);
});

test('duplicateSelectedElements returns false and refreshes clipboard controls when insertion yields no duplicates', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const duplicateSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function duplicateSelectedElements() {',
    '\n\n    function nudgeSelectedElements(dx, dy) {'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [liveTarget],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canDuplicate: true,
          selection: [liveTarget],
          payloadItems: [{ id: 'clipboard-item' }],
          canBuildPayload: true
        };
      }
    },
    buildClipboardPayload(selection) {
      calls.push(['buildClipboardPayload', selection]);
      return [{ id: 'clipboard-item' }];
    },
    finalizeInsertedElements() {
      calls.push(['finalizeInsertedElements']);
      return true;
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    insertClipboardPayload(items, offsetMultiplier) {
      calls.push(['insertClipboardPayload', items, offsetMultiplier]);
      return [];
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${duplicateSelectedElementsSource}`, context);
  installClipboardController(context);

  assert.equal(context.duplicateSelectedElements(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['insertClipboardPayload', [{ id: 'clipboard-item' }], 1],
    ['updateClipboardActionState']
  ]);
});

test('buildClipboardSelectionMutationPlan disables copy and duplicate when the selection cannot build a clipboard payload', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);

  const selection = [{ id: 'node-1' }];
  const calls = [];
  const context = {
    selectedElements: selection,
    editorClipboard: null,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements) {
        calls.push(['buildStudioClipboardMutationPlan', elements]);
        return {
          canCopy: true,
          canDuplicate: true,
          canPaste: false,
          selection: elements
        };
      }
    },
    buildClipboardPayload(elements, doc) {
      calls.push(['buildClipboardPayload', elements, doc]);
      return [];
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      const doc = { activeSlide: { id: 'slide-1' } };
      calls.push(['getIframeDoc', doc]);
      return doc;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildClipboardSelectionMutationPlanSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.buildClipboardSelectionMutationPlan())), {
    canCopy: false,
    canDuplicate: false,
    canPaste: false,
    selection,
    payloadItems: [],
    canBuildPayload: false
  });
  assert.deepEqual(calls, [
    ['getIframeDoc', { activeSlide: { id: 'slide-1' } }],
    ['buildStudioClipboardMutationPlan', selection],
    ['buildClipboardPayload', selection, { activeSlide: { id: 'slide-1' } }]
  ]);
});

test('pasteClipboardElements returns false and refreshes clipboard controls when paste is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const pasteClipboardElementsSource = extractFunctionSource(
    fileContent,
    'function pasteClipboardElements() {',
    '\n\n    function duplicateSelectedElements() {'
  );

  const calls = [];
  const context = {
    editorClipboard: null,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardPastePlan() {
        calls.push(['buildStudioClipboardPastePlan']);
        return {
          canPaste: false,
          items: [],
          nextPasteCount: 1,
          nextClipboard: null
        };
      }
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${finalizeClipboardActionResultSource}\n${pasteClipboardElementsSource}`, context);
  installClipboardController(context);

  assert.equal(context.pasteClipboardElements(), false);
  assert.equal(context.editorClipboard, null);
  assert.deepEqual(calls, [
    ['buildStudioClipboardPastePlan'],
    ['updateClipboardActionState']
  ]);
});

test('pasteClipboardElements forwards a canonical deck sidecar for pasted nodes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const pasteClipboardElementsSource = extractFunctionSource(
    fileContent,
    'function pasteClipboardElements() {',
    '\n\n    function duplicateSelectedElements() {'
  );
  const sourceDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', text: 'Original' }] }]
  });
  const pastedElement = { dataset: { editorId: 'node-3' } };
  const activeSlide = { id: 'slide-1' };
  const nextClipboard = { items: [{ id: 'clipboard-item' }], pasteCount: 1 };
  let finalized = null;
  const context = {
    editorClipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 0 },
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalInsertion: canonicalInsertion,
    SlideNextDeckImport: {
      importElementToCanonicalNode(element, options) {
        assert.equal(element, pastedElement);
        assert.equal(options.getNodeId(element), 'node-3');
        return { id: 'node-3', tagName: 'p', text: 'Pasted' };
      }
    },
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardPastePlan(clipboard, options) {
        assert.equal(clipboard.pasteCount, 0);
        assert.equal(options.canMutateDeck(), true);
        return {
          canPaste: true,
          items: [{ id: 'clipboard-item' }],
          nextPasteCount: 1,
          nextClipboard
        };
      }
    },
    buildEditorCanonicalDeck(doc) {
      assert.equal(doc.label, 'iframe-doc');
      return sourceDeck;
    },
    finalizeInsertedElements(elements, versionLabel, transaction, canonicalDeck) {
      finalized = { elements, versionLabel, transaction, canonicalDeck };
      return true;
    },
    getActiveSlide(doc) {
      assert.equal(doc.label, 'iframe-doc');
      return activeSlide;
    },
    getEditorSlideId(slide) {
      assert.equal(slide, activeSlide);
      return 'slide-1';
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    insertClipboardPayload(items, offsetMultiplier, options) {
      assert.deepEqual(items, [{ id: 'clipboard-item' }]);
      assert.equal(offsetMultiplier, 1);
      options.onTransaction({ id: 'tx-paste' });
      return [pastedElement];
    },
    updateClipboardActionState() {}
  };

  vm.createContext(context);
  vm.runInContext(`${finalizeClipboardActionResultSource}\n${pasteClipboardElementsSource}`, context);
  installClipboardController(context);

  assert.equal(context.pasteClipboardElements(), true);
  assert.equal(finalized.elements[0], pastedElement);
  assert.equal(finalized.versionLabel, 'Auto: Pasted Element');
  assert.deepEqual(finalized.transaction, { id: 'tx-paste' });
  assert.deepEqual(finalized.canonicalDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-3']);
  assert.equal(finalized.canonicalDeck.slides[0].nodes[1].text, 'Pasted');
  assert.equal(context.editorClipboard, nextClipboard);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1']);
});
