const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalLayout = require('../shared/studio-editor-canonical-layout.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const studioNudge = require('../shared/studio-editor-nudge.js');
const studioTransform = require('../shared/studio-editor-transform.js');
const liveSelection = require('../shared/studio-editor-live-selection.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const nudgeController = require('../shared/studio-editor-nudge-controller.js');
const positionLayoutMutation = require('../shared/studio-editor-position-layout-mutation.js');
const deckMutation = require('../shared/studio-editor-deck-mutation.js');
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

function loadFinalizeEditorDeckMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  context.SlideNextStudioEditorDeckMutation = deckMutation;
  vm.runInContext(helperSource, context);
}

function loadBuildMotionSelectionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildMotionSelectionActionState(doc = null) {',
    '\n\n    function updateMotionActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadGetNudgeSelectionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function getNudgeSelectionState(elements = selectedElements, doc = getIframeDoc()) {',
    '\n\n    function isElementHidden(el) {'
  );
  vm.runInContext(helperSource, context);
}

function loadCanonicalVisibilityReader(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function getEditorCanonicalVisibilityReader(property, doc = getIframeDoc(), fallbackReader = isElementHidden) {',
    '\n\n    function setElementHiddenState'
  );
  vm.runInContext(helperSource, context);
}

function loadGetTransformSelectionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function getTransformSelectionState(elements = selectedElements, doc = getIframeDoc()) {',
    '\n\n    function selectionHasLockedElements(elements = selectedElements, doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadSelectionHasLockedElements(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function selectionHasLockedElements(elements = selectedElements, doc = getIframeDoc()) {',
    '\n\n    function getNudgeSelectionState(elements = selectedElements, doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadPositionMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorPositionLayoutWithTransaction(nextItems, options = {}) {',
    'function alignSelectedElements(action = \'\') {'
  );
  if (!context.SlideNextStudioEditorTransaction) {
    context.SlideNextStudioEditorTransaction = studioTransaction;
  }
  context.SlideNextStudioEditorPositionLayoutMutation = positionLayoutMutation;
  vm.runInContext(helperSource, context);
}

function installNudgeController(context) {
  context.studioEditorNudgeController = nudgeController.createStudioEditorNudgeController({
    nudgeApi: context.SlideNextStudioEditorNudge,
    canonicalLayoutApi: context.SlideNextStudioEditorCanonicalLayout,
    canonicalDeckApi: context.SlideNextCanonicalDeck,
    buildMotionSelectionActionState: context.buildMotionSelectionActionState,
    updateMotionActionState: context.updateMotionActionState,
    assignElementId: context.assignEditorElementId,
    buildCanonicalDeck: context.buildEditorCanonicalDeck,
    applyPositionLayout: context.applyEditorPositionLayoutWithTransaction,
    finalizeDeckMutation: context.finalizeEditorDeckMutation
  });
}

function createControls() {
  return {
    nudgeSelectionUpBtn: { disabled: true },
    nudgeSelectionLeftBtn: { disabled: true },
    nudgeSelectionRightBtn: { disabled: true },
    nudgeSelectionDownBtn: { disabled: true }
  };
}

function getControlStates(controls) {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, control.disabled]));
}

test('getNudgeSelectionState prefers canonical hidden and locked state over stale DOM state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { id: 'iframe-doc' };
  const hiddenElement = { id: 'hidden', isConnected: true };
  const lockedElement = { id: 'locked', isConnected: true };
  const canonicalNodes = new Map([
    [hiddenElement, { visibility: { hidden: true, locked: false } }],
    [lockedElement, { visibility: { hidden: false, locked: true } }]
  ]);
  const context = {
    selectedElements: [hiddenElement, lockedElement],
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorNudge: studioNudge,
    SlideNextStudioEditorTransform: {
      isStudioFreeformPositioned() {
        return true;
      }
    },
    getIframeDoc() {
      return doc;
    },
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return { kind: 'slidenext.deck' };
    },
    resolveEditorCanonicalNodeForElement(element) {
      return canonicalNodes.get(element) || null;
    },
    isElementLocked() {
      return false;
    },
    isElementHidden() {
      return false;
    }
  };

  vm.createContext(context);
  loadCanonicalVisibilityReader(fileContent, context);
  loadGetNudgeSelectionState(fileContent, context);

  const result = context.getNudgeSelectionState(undefined, doc);

  assert.deepEqual(result.selection, [lockedElement]);
  assert.equal(result.canNudge, false);
});

test('getNudgeSelectionState fails closed when the shared nudge runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    selectedElements: [{ id: 'node-1' }],
    getIframeDoc() {
      return { id: 'iframe-doc' };
    }
  };

  vm.createContext(context);
  loadGetNudgeSelectionState(fileContent, context);

  const result = context.getNudgeSelectionState();
  assert.deepEqual(JSON.parse(JSON.stringify(result.selection)), []);
  assert.equal(result.canNudge, false);
});

test('getTransformSelectionState prefers canonical hidden and locked state over stale DOM state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { id: 'iframe-doc' };
  const hiddenElement = { id: 'hidden', isConnected: true };
  const lockedElement = { id: 'locked', isConnected: true };
  const canonicalNodes = new Map([
    [hiddenElement, { visibility: { hidden: true, locked: false } }],
    [lockedElement, { visibility: { hidden: false, locked: true } }]
  ]);
  const context = {
    selectedElements: [hiddenElement, lockedElement],
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorTransform: studioTransform,
    getIframeDoc() {
      return doc;
    },
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return { kind: 'slidenext.deck' };
    },
    resolveEditorCanonicalNodeForElement(element) {
      return canonicalNodes.get(element) || null;
    },
    isElementLocked() {
      return false;
    },
    isElementHidden() {
      return false;
    }
  };

  vm.createContext(context);
  loadCanonicalVisibilityReader(fileContent, context);
  loadGetTransformSelectionState(fileContent, context);

  const result = context.getTransformSelectionState(undefined);

  assert.deepEqual(result.selection, [lockedElement]);
  assert.equal(result.canTransform, false);
});

test('selectionHasLockedElements prefers canonical lock state over stale DOM state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { id: 'iframe-doc' };
  const selectedElement = { id: 'locked', isConnected: true };
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorCanonicalState: canonicalState,
    SlideNextStudioEditorLiveSelection: liveSelection,
    getIframeDoc() {
      throw new Error('explicit document should avoid the iframe fallback');
    },
    buildEditorCanonicalDeck(currentDoc) {
      assert.equal(currentDoc, doc);
      return { kind: 'slidenext.deck' };
    },
    resolveEditorCanonicalNodeForElement(element) {
      return element === selectedElement
        ? { visibility: { locked: true } }
        : null;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  loadCanonicalVisibilityReader(fileContent, context);
  loadSelectionHasLockedElements(fileContent, context);

  assert.equal(context.selectionHasLockedElements(undefined, doc), true);
});

test('selectionHasLockedElements fails closed when the live-selection runtime is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const context = {
    selectedElements: [{ id: 'node-1' }],
    SlideNextStudioEditorLiveSelection: {},
    getIframeDoc() {
      return { id: 'iframe-doc' };
    },
    getEditorCanonicalVisibilityReader() {
      throw new Error('canonical lock reader should not be evaluated without the live-selection runtime');
    },
    isElementLocked() {
      throw new Error('fallback lock reader should not be evaluated without the live-selection runtime');
    }
  };

  vm.createContext(context);
  loadSelectionHasLockedElements(fileContent, context);

  assert.equal(context.selectionHasLockedElements(), false);
});

test('buildMotionSelectionActionState resolves nudge geometry from the current doc and slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { activeSlide: { id: 'slide-1' } };
  const selectedElement = { id: 'node-1' };
  const nudgeSelectionState = {
    canNudge: true,
    selection: [selectedElement]
  };
  const slideMetrics = {
    logicalWidth: 1920,
    logicalHeight: 1080
  };
  const nudgeLayoutItems = [{ element: selectedElement }];
  const calls = [];
  const context = {
    SlideNextStudioEditorNudge: studioNudge,
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        return doc.activeSlide;
      }
    },
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems(selection, options) {
        calls.push(['buildStudioPositionedLayoutItems', selection, Object.keys(options).sort()]);
        return nudgeLayoutItems;
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
    getNudgeSelectionState() {
      calls.push(['getNudgeSelectionState']);
      return nudgeSelectionState;
    },
    getRectOnSlide() {
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getSlideMetrics(currentSlide) {
      calls.push(['getSlideMetrics', currentSlide]);
      return slideMetrics;
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);

  const motionActionState = context.buildMotionSelectionActionState();

  assert.equal(motionActionState.doc, doc);
  assert.equal(motionActionState.slide, doc.activeSlide);
  assert.equal(motionActionState.slideMetrics, slideMetrics);
  assert.deepEqual(JSON.parse(JSON.stringify(motionActionState.slideBounds)), {
    width: 1920,
    height: 1080
  });
  assert.equal(motionActionState.nudgeSelectionState, nudgeSelectionState);
  assert.equal(motionActionState.nudgeLayoutItems, nudgeLayoutItems);
  assert.equal(motionActionState.canResolveNudgeLayout, true);
  assert.equal(motionActionState.canNudge, true);
  assert.match(
    fileContent,
    /getNudgeSelectionState\(\s*getStudioSelectedElements\(resolvedDoc\),\s*resolvedDoc\s*\)/
  );
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', doc],
    ['getNudgeSelectionState'],
    ['getSlideMetrics', doc.activeSlide],
    ['buildStudioPositionedLayoutItems', [selectedElement], ['getClosestPositionedAncestor', 'getRectOnSlide', 'slideMetrics']]
  ]);
});

test('buildMotionSelectionActionState reuses the shared nudge action helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { activeSlide: { id: 'slide-1' } };
  const selectedElement = { id: 'node-1' };
  const nudgeSelectionState = {
    canNudge: true,
    selection: [selectedElement]
  };
  const slideMetrics = {
    logicalWidth: 1920,
    logicalHeight: 1080
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        return doc.activeSlide;
      }
    },
    SlideNextStudioEditorNudge: {
      buildStudioNudgeActionState(selectionState, options = {}) {
        calls.push([
          'buildStudioNudgeActionState',
          selectionState,
          {
            doc: options.doc,
            slide: options.slide,
            slideMetrics: options.slideMetrics,
            layoutItems: options.buildPositionedLayoutItems(selectionState.selection, options.slideMetrics)
          }
        ]);
        return {
          doc: options.doc,
          slide: options.slide,
          slideMetrics: options.slideMetrics,
          slideBounds: { width: 1920, height: 1080 },
          nudgeSelectionState: selectionState,
          nudgeLayoutItems: [{ element: selectedElement }],
          canResolveNudgeLayout: true,
          canNudge: true
        };
      }
    },
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems(selection, options) {
        calls.push(['buildStudioPositionedLayoutItems', selection, Object.keys(options).sort()]);
        return [{ element: selectedElement }];
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
    getNudgeSelectionState() {
      calls.push(['getNudgeSelectionState']);
      return nudgeSelectionState;
    },
    getRectOnSlide() {
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getSlideMetrics(currentSlide) {
      calls.push(['getSlideMetrics', currentSlide]);
      return slideMetrics;
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);

  const motionActionState = context.buildMotionSelectionActionState();

  assert.equal(motionActionState.doc, doc);
  assert.equal(motionActionState.slide, doc.activeSlide);
  assert.equal(motionActionState.slideMetrics, slideMetrics);
  assert.equal(motionActionState.canNudge, true);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', doc],
    ['getNudgeSelectionState'],
    ['getSlideMetrics', doc.activeSlide],
    ['buildStudioPositionedLayoutItems', [selectedElement], ['getClosestPositionedAncestor', 'getRectOnSlide', 'slideMetrics']],
    [
      'buildStudioNudgeActionState',
      nudgeSelectionState,
      {
        doc,
        slide: doc.activeSlide,
        slideMetrics,
        layoutItems: [{ element: selectedElement }]
      }
    ]
  ]);
});

test('buildMotionSelectionActionState fails closed when the shared nudge helper is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { activeSlide: { id: 'slide-1' } };
  const context = {
    SlideNextStudioEditorNudge: {},
    getActiveSlide(currentDoc) {
      return currentDoc && currentDoc.activeSlide ? currentDoc.activeSlide : null;
    },
    getIframeDoc() {
      return doc;
    },
    getNudgeSelectionState() {
      return {
        canNudge: true,
        selection: [{ id: 'node-1' }]
      };
    },
    getSlideMetrics() {
      return {
        logicalWidth: 1920,
        logicalHeight: 1080
      };
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);

  const motionActionState = context.buildMotionSelectionActionState();

  assert.equal(motionActionState.doc, doc);
  assert.equal(motionActionState.slide, doc.activeSlide);
  assert.equal(motionActionState.canNudge, false);
  assert.equal(motionActionState.canResolveNudgeLayout, false);
  assert.deepEqual(JSON.parse(JSON.stringify(motionActionState.nudgeLayoutItems)), []);
});

test('updateMotionActionState enables nudge controls only when the iframe has a live active slide and resolvable geometry', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateMotionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateMotionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState(doc = getIframeDoc()) {'
  );

  const controls = createControls();
  const activeSlide = { id: 'slide-1' };
  let layoutItems = [];
  const context = {
    SlideNextStudioEditorNudge: studioNudge,
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        return activeSlide;
      }
    },
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems() {
        return layoutItems;
      }
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getNudgeSelectionState() {
      return { canNudge: true, selection: [{ id: 'node-1' }] };
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    },
    getRectOnSlide() {
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getSlideMetrics(slide) {
      return slide === activeSlide
        ? { logicalWidth: 1920, logicalHeight: 1080 }
        : null;
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);
  vm.runInContext(updateMotionActionStateSource, context);

  context.updateMotionActionState(null);
  assert.deepEqual(getControlStates(controls), {
    nudgeSelectionUpBtn: true,
    nudgeSelectionLeftBtn: true,
    nudgeSelectionRightBtn: true,
    nudgeSelectionDownBtn: true
  });

  context.updateMotionActionState({
    getElementById() {
      return null;
    }
  });
  assert.deepEqual(getControlStates(controls), {
    nudgeSelectionUpBtn: true,
    nudgeSelectionLeftBtn: true,
    nudgeSelectionRightBtn: true,
    nudgeSelectionDownBtn: true
  });

  context.updateMotionActionState({
    activeSlide
  });
  assert.deepEqual(getControlStates(controls), {
    nudgeSelectionUpBtn: true,
    nudgeSelectionLeftBtn: true,
    nudgeSelectionRightBtn: true,
    nudgeSelectionDownBtn: true
  });

  layoutItems = [{ element: { id: 'node-1' } }];
  context.updateMotionActionState({
    activeSlide
  });
  assert.deepEqual(getControlStates(controls), {
    nudgeSelectionUpBtn: false,
    nudgeSelectionLeftBtn: false,
    nudgeSelectionRightBtn: false,
    nudgeSelectionDownBtn: false
  });
});

test('updateMotionActionState delegates toolbar state assembly to the shared nudge view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateMotionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateMotionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState(doc = getIframeDoc()) {'
  );
  const doc = { activeSlide: {} };
  const calls = [];
  const context = {
    buildMotionSelectionActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return { canNudge: true };
    },
    SlideNextStudioEditorNudge: {
      syncStudioNudgeToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateMotionActionStateSource, context);

  assert.equal(context.updateMotionActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.equal(calls[0].canNudge, true);
});

test('updateMotionActionState caches the shared nudge toolbar synchronizer when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateMotionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateMotionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState(doc = getIframeDoc()) {'
  );
  const doc = { id: 'iframe-doc' };
  const calls = [];
  const context = {
    buildMotionSelectionActionState(currentDoc) {
      calls.push(['action-state', currentDoc]);
      return { canNudge: true };
    },
    SlideNextStudioEditorNudge: {
      syncStudioNudgeToolbarState() {
        throw new Error('direct nudge sync should not run');
      },
      createStudioNudgeToolbarStateSync(options) {
        calls.push(['factory', options]);
        return (currentDoc) => {
          calls.push(['sync', currentDoc]);
          const actionState = options.getActionState(currentDoc);
          return actionState.canNudge;
        };
      }
    },
    document: {},
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateMotionActionStateSource, context);

  assert.equal(context.updateMotionActionState(doc), true);
  assert.equal(context.updateMotionActionState(doc), true);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(calls.filter(([name]) => name === 'action-state').map(([, currentDoc]) => currentDoc), [doc, doc]);
  assert.deepEqual(calls.filter(([name]) => name === 'sync').map(([, currentDoc]) => currentDoc), [doc, doc]);
});

test('nudgeSelectedElements returns false and refreshes motion controls when selection geometry cannot be resolved', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );

  const doc = { label: 'iframe-doc' };
  const slide = { id: 'slide-1' };
  const calls = [];
  const context = {
    SlideNextStudioEditorNudge: {
      buildStudioNudgeActionState: studioNudge.buildStudioNudgeActionState
    },
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        return slide;
      }
    },
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems(selection, options) {
        calls.push(['buildStudioPositionedLayoutItems', selection, Object.keys(options).sort()]);
        return [];
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
      return slide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    getNudgeSelectionState() {
      calls.push(['getNudgeSelectionState']);
      return {
        canNudge: true,
        selection: [{ id: 'node-1' }]
      };
    },
    getRectOnSlide() {
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getSlideMetrics(currentSlide) {
      calls.push(['getSlideMetrics', currentSlide]);
      return {
        logicalWidth: 1920,
        logicalHeight: 1080
      };
    },
    updateMotionActionState(currentDoc) {
      calls.push(['updateMotionActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadPositionMutationHelper(fileContent, context);
  installNudgeController(context);
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(1, 0), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', doc],
    ['getNudgeSelectionState'],
    ['getSlideMetrics', slide],
    ['buildStudioPositionedLayoutItems', [{ id: 'node-1' }], ['getClosestPositionedAncestor', 'getRectOnSlide', 'slideMetrics']],
    ['updateMotionActionState', doc]
  ]);
});

test('nudgeSelectedElements returns false and refreshes motion controls when nudging is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    getNudgeSelectionState() {
      calls.push(['getNudgeSelectionState']);
      return {
        canNudge: false,
        selection: []
      };
    },
    updateMotionActionState(currentDoc) {
      calls.push(['updateMotionActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadPositionMutationHelper(fileContent, context);
  installNudgeController(context);
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(1, 0), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', doc],
    ['getNudgeSelectionState'],
    ['updateMotionActionState', doc]
  ]);
});

test('nudgeSelectedElements persists the moved selection through the shared mutation helper without refreshing thumbnails or layers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );

  const movedElement = {
    style: {}
  };
  const doc = { label: 'iframe-doc' };
  const slide = { id: 'slide-1' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        calls.push(['getStudioClosestPositionedAncestor']);
        return slide;
      }
    },
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems(selection, options) {
        calls.push(['buildStudioPositionedLayoutItems', selection, Object.keys(options).sort()]);
        return [
          {
            element: movedElement
          }
        ];
      }
    },
    SlideNextStudioEditorNudge: {
      buildStudioNudgeActionState: studioNudge.buildStudioNudgeActionState,
      buildStudioNudgedLayout(layoutItems, delta, slideBounds) {
        calls.push(['buildStudioNudgedLayout', layoutItems, delta, slideBounds]);
        return {
          didChange: true,
          nextItems: [
            {
              element: movedElement,
              nextLeft: 120,
              nextTop: 80
            }
          ]
        };
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
      return slide;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    getNudgeSelectionState() {
      calls.push(['getNudgeSelectionState']);
      return {
        canNudge: true,
        selection: [movedElement]
      };
    },
    getRectOnSlide() {
      calls.push(['getRectOnSlide']);
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getSlideMetrics(currentSlide) {
      calls.push(['getSlideMetrics', currentSlide]);
      return {
        logicalWidth: 1920,
        logicalHeight: 1080
      };
    },
    syncSelectionOverlay() {
      calls.push(['syncSelectionOverlay']);
    },
    saveHistoryState(immediate) {
      calls.push(['saveHistoryState', immediate]);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateMotionActionState(currentDoc) {
      calls.push(['updateMotionActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadBuildMotionSelectionActionState(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadPositionMutationHelper(fileContent, context);
  installNudgeController(context);
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(5, -3), true);
  assert.equal(movedElement.style.left, '120px');
  assert.equal(movedElement.style.top, '80px');
  assert.deepEqual(calls.map(([name]) => name), [
    'getIframeDoc',
    'getActiveSlide',
    'getNudgeSelectionState',
    'getSlideMetrics',
    'buildStudioPositionedLayoutItems',
    'buildStudioNudgedLayout',
    'syncSelectionOverlay',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[1][1], doc);
  assert.equal(calls[3][1], slide);
  assert.equal(calls[4][1][0], movedElement);
  assert.deepEqual(calls[4][2], ['getClosestPositionedAncestor', 'getRectOnSlide', 'slideMetrics']);
  assert.equal(calls[5][1][0].element, movedElement);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[5][2])), { dx: 5, dy: -3 });
  assert.deepEqual(JSON.parse(JSON.stringify(calls[5][3])), { width: 1920, height: 1080 });
  assert.deepEqual(calls[7], ['saveHistoryState', true]);
  assert.deepEqual(calls[9], ['triggerAutoVersion', 'Auto: Nudged Element']);
});

test('nudgeSelectedElements forwards an immutable canonical layout sidecar', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const movedElement = {
    dataset: { editorId: 'node-1' },
    style: { left: '10px', top: '20px' }
  };
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        layout: { mode: 'absolute', x: 10, y: 20 }
      }]
    }]
  });
  let finalized = null;
  const context = {
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorCanonicalLayout: canonicalLayout,
    SlideNextStudioEditorNudge: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{
            element: movedElement,
            nextLeft: 120,
            nextTop: 80,
            nextAbsLeft: 120,
            nextAbsTop: 80
          }]
        };
      },
      applyStudioNudgedLayout: studioNudge.applyStudioNudgedLayout
    },
    buildEditorCanonicalDeck() {
      return canonicalDeckBefore;
    },
    buildMotionSelectionActionState() {
      return {
        canNudge: true,
        doc: { id: 'iframe-doc' },
        nudgeLayoutItems: [{ element: movedElement }],
        slideBounds: { width: 1920, height: 1080 }
      };
    },
    assignEditorElementId() {
      return 'node-1';
    },
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installNudgeController(context);
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(1, 1), true);
  assert.equal(movedElement.style.left, '120px');
  assert.equal(movedElement.style.top, '80px');
  assert.equal(canonicalDeckBefore.slides[0].nodes[0].layout.x, 10);
  assert.equal(finalized.versionLabel, 'Auto: Nudged Element');
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[0].layout.x, 120);
  assert.equal(finalized.options.canonicalDeck.slides[0].nodes[0].layout.y, 80);
});

test('nudgeSelectedElements delegates position application to the shared nudge module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const movedElement = {
    dataset: { editorId: 'node-1' },
    style: { left: '10px', top: '20px' }
  };
  let finalized = null;
  const context = {
    SlideNextStudioEditorNudge: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: movedElement, nextLeft: 120, nextTop: 80 }]
        };
      },
      applyStudioNudgedLayout: studioNudge.applyStudioNudgedLayout
    },
    SlideNextStudioEditorTransaction: studioTransaction,
    buildMotionSelectionActionState() {
      return {
        canNudge: true,
        doc: {},
        nudgeLayoutItems: [{ element: movedElement }],
        slideBounds: { width: 1920, height: 1080 }
      };
    },
    assignEditorElementId() {
      return 'node-1';
    },
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadPositionMutationHelper(fileContent, context);
  installNudgeController(context);
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(1, 1), true);
  assert.deepEqual(movedElement.style, { left: '120px', top: '80px' });
  assert.equal(finalized.versionLabel, 'Auto: Nudged Element');
  assert.equal(finalized.options.transaction.operations[0].elementId, 'node-1');
});

test('nudgeSelectedElements forwards a reversible style transaction to history', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  const movedElement = {
    dataset: { editorId: 'node-1' },
    style: { left: '10px', top: '20px' }
  };
  const historyCalls = [];
  const context = {
    SlideNextStudioEditorNudge: {
      buildStudioNudgedLayout() {
        return {
          didChange: true,
          nextItems: [{ element: movedElement, nextLeft: 120, nextTop: 80 }]
        };
      }
    },
    SlideNextStudioEditorMutation: require('../shared/studio-editor-mutation.js'),
    SlideNextStudioEditorTransaction: studioTransaction,
    buildMotionSelectionActionState() {
      return {
        canNudge: true,
        doc: {},
        nudgeLayoutItems: [{ element: movedElement }],
        slideBounds: { width: 1920, height: 1080 }
      };
    },
    assignEditorElementId() {
      return 'node-1';
    },
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState(...args) {
      historyCalls.push(args);
    },
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadPositionMutationHelper(fileContent, context);
  installNudgeController(context);
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(1, 1), true);
  assert.deepEqual(historyCalls, [[true, {
    kind: studioTransaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: studioTransaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { left: '10px', top: '20px' },
      after: { left: '120px', top: '80px' }
    }]
  }]]);
});
