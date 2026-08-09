const test = require('node:test');
const assert = require('node:assert/strict');

const selection = require('../shared/studio-editor-selection.js');
const canonicalDeckModel = require('../shared/canonical-deck.js');
const canonicalTransform = require('../shared/studio-editor-canonical-transform.js');
const deckView = require('../shared/studio-deck-view.js');
const history = require('../shared/studio-history.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const transformState = require('../shared/studio-editor-transform.js');
const studioEvents = require('../shared/studio-editor-events.js');
const interactionOptions = require('../shared/studio-editor-interaction-options.js');
const transformController = require('../shared/studio-editor-transform-controller.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const selectionFixture = require('./helpers/studio-selection-state-fixture.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('main editor script parses without duplicate top-level bindings', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const inlineScripts = [...fileContent.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((source) => source.trim());
  assert.ok(inlineScripts.length > 0, 'Missing inline editor script');
  assert.doesNotThrow(
    () => new vm.Script(inlineScripts.at(-1), { filename: 'index.html:inline-editor-script' })
  );
});

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const source = selectionFixture.extractSelectionAwareFunctionSource(
    fileContent,
    startMarker,
    endMarker
  );
  assert.notEqual(source, null, `Missing function markers: ${startMarker}`);
  return source;
}

function loadTransformSessionFinalizer(fileContent, context) {
  context.SlideNextStudioEditorTransform = {
    createStudioTransformSessionFinalizer: transformState.createStudioTransformSessionFinalizer,
    ...(context.SlideNextStudioEditorTransform || {})
  };
  context.SlideNextStudioEditorCanonicalTransform = canonicalTransform;
  context.SlideNextStudioEditorInteractionOptions = interactionOptions;
}

function installTransformController(context) {
  context.studioEditorTransformController = transformController
    .createStudioEditorTransformController({
      transformApi: context.SlideNextStudioEditorTransform,
      canonicalTransformApi: context.SlideNextStudioEditorCanonicalTransform,
      canonicalDeckApi: context.SlideNextCanonicalDeck,
      transactionApi: context.SlideNextStudioEditorTransaction,
      domApi: context.SlideNextStudioEditorDom,
      interactionOptionsApi: context.SlideNextStudioEditorInteractionOptions,
      interactionsApi: context.SlideNextStudioEditorInteractions,
      eventsApi: context.SlideNextStudioEditorEvents,
      selectionBoundsApi: context.SlideNextStudioEditorSelectionBounds,
      getActiveSlide: context.getActiveSlide,
      getTransformSelectionState: context.getTransformSelectionState,
      selectElement: context.selectElement,
      resolveEditableTarget: context.resolveEditableTarget,
      getSlideMetrics: context.getSlideMetrics,
      getPointerOnSlide: context.getPointerOnSlide,
      getSelectionBounds: context.getSelectionBounds,
      getSlideEditableElements: context.getSlideEditableElements,
      isHidden: context.isElementHidden,
      getRectOnSlide: context.getRectOnSlide,
      ensureOverlay: context.ensureSelectionOverlay,
      getClosestPositionedAncestor: context.SlideNextStudioEditorDom
        && context.SlideNextStudioEditorDom.getStudioClosestPositionedAncestor,
      getSelectedElements: () => context.selectedElements || [],
      getMarqueeElements: context.getNormalizedSlideLayerOrder,
      commitSelectionState: context.commitEditorSelectionState,
      updateDragHud: context.updateDragHud,
      renderGuides: context.renderGuides,
      syncSelectionOverlay: context.syncSelectionOverlay,
      hideGuides: context.hideGuides,
      hideDragHud: context.hideDragHud,
      syncInspectorForSelection: context.syncInspectorForSelection,
      renderMarqueeSelection: context.renderMarqueeSelection,
      clearMarqueeSelection: context.clearMarqueeSelection,
      saveHistoryState: context.saveHistoryState,
      triggerAutoSave: context.triggerAutoSave,
      triggerAutoVersion: context.triggerAutoVersion,
      buildCanonicalDeck: context.buildEditorCanonicalDeck,
      assignElementId: context.assignEditorElementId,
      getGridSizePx: () => context.isGridSnapEnabled
        ? (context.GRID_SNAP_SIZE_PX || 20)
        : null,
      getIsDraggingElement: () => !!context.isDraggingElement,
      setIsDraggingElement: (nextValue) => { context.isDraggingElement = !!nextValue; },
      setSuppressNextFrameClick: (nextValue) => {
        context.suppressNextFrameClick = !!nextValue;
      },
      dragStartThresholdPx: context.DRAG_START_THRESHOLD_PX,
      minSizePx: context.MIN_ELEMENT_SIZE_PX,
      dragOverflowMarginPx: context.DRAG_OVERFLOW_MARGIN_PX,
      snapDistancePx: context.SNAP_THRESHOLD_PX
    });
}

test('transform controller thresholds are initialized before controller construction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerStart = fileContent.indexOf('const studioEditorTransformController =');
  assert.notEqual(controllerStart, -1);

  [
    'const DRAG_START_THRESHOLD_PX =',
    'const SNAP_THRESHOLD_PX =',
    'const MIN_ELEMENT_SIZE_PX =',
    'const DRAG_OVERFLOW_MARGIN_PX ='
  ].forEach((declaration) => {
    const declarationStart = fileContent.indexOf(declaration);
    assert.notEqual(declarationStart, -1, `Missing declaration: ${declaration}`);
    assert.ok(
      declarationStart < controllerStart,
      `${declaration} must be initialized before the transform controller`
    );
  });
});

test('history controller wires the named fallback active-slide resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerStart = fileContent.indexOf('const studioEditorHistoryController =');
  const controllerEnd = fileContent.indexOf('const studioEditorPersistenceController =', controllerStart);
  assert.notEqual(controllerStart, -1);
  assert.notEqual(controllerEnd, -1);

  const controllerSource = fileContent.slice(controllerStart, controllerEnd);
  assert.match(
    controllerSource,
    /resolveFallbackActiveSlideId:\s*resolveEditorFallbackActiveSlideId/
  );
  assert.doesNotMatch(
    controllerSource,
    /resolveFallbackActiveSlideId,\s*getActiveSlideId/
  );
});

test('DOM mutation canonical builder bypasses live canonical state', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildEditorMutationCanonicalDeck(sourceDoc) {',
    '\n\n    function resolveEditorCanonicalDeckOverride'
  );

  assert.match(
    helperSource,
    /studioEditorCanonicalBridge\.buildMutationCanonicalDeck\(sourceDoc\)/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-canonical-bridge\.js"><\/script>/
  );
});

test('nudge wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLayoutRuntime =',
    'const studioEditorLockVisibilityController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('alignment wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLayoutRuntime =',
    'const studioEditorLockVisibilityController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('group wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLayoutRuntime =',
    'const studioEditorLockVisibilityController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('lock and visibility wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLockVisibilityRuntime =',
    'const studioEditorLockVisibilityController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('element removal wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorRemovalRuntime =',
    'const studioEditorRemovalController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('layer order wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLayerOrderRuntime =',
    'const studioEditorLayerOrderController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('style wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorStyleController =',
    'const studioEditorClipboardController ='
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

test('clipboard wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorClipboardController =',
    'const studioEditorElementInsertionController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('element insertion wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementInsertionController =',
    'const studioEditorBlockController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('transform wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorTransformController =',
    'const studioEditorCanonicalState ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('slide reorder wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('slide insertion wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('slide deletion wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('slide duplication wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMutationRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('slide metadata wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMetadataRuntime =',
    'const studioEditorSlideMetadataController ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorCanonicalDeck\(sourceDoc\)/
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

test('deck mutation finalizer wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorDeckMutationFinalizer =',
    'const studioEditorSlideMutationPersistenceFinalizer ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.match(
    controllerSource,
    /buildEditorCanonicalDeck\(sourceDoc \|\| getIframeDoc\(\)\)/
  );
  assert.doesNotMatch(
    controllerSource,
    /buildCanonicalDeck: \(sourceDoc\) => buildEditorMutationCanonicalDeck\(sourceDoc\)/
  );
});

test('selectElement delegates selection orchestration to the shared selection module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectElementSource = extractFunctionSource(
    fileContent,
    'function selectElement(el, options = {}) {',
    '\n\n    function deselectElement() {'
  );
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];
  const context = {
    SlideNextStudioEditorSelection: {
      selectStudioElement(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    selectedElements,
    resolveEditableTarget() {},
    getEditorSelectionOptions() {
      return { marker: 'selection-options' };
    },
    commitEditorSelectionState() {}
  };

  vm.createContext(context);
  vm.runInContext(selectElementSource, context);

  assert.equal(context.selectElement({ id: 'raw-node' }, { additive: true, toggle: false }), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].element.id, 'raw-node');
  assert.equal(calls[0].selectedElements, selectedElements);
  assert.equal(calls[0].additive, true);
  assert.equal(calls[0].toggle, false);
});

test('selectElement fails closed when the shared selection module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectElementSource = extractFunctionSource(
    fileContent,
    'function selectElement(el, options = {}) {',
    '\n\n    function deselectElement() {'
  );

  const context = {
    selectedElements: [],
    SlideNextStudioEditorSelection: null
  };
  vm.createContext(context);
  vm.runInContext(selectElementSource, context);

  assert.equal(context.selectElement({ id: 'raw-node' }), false);
});

test('deselectElement delegates selection clearing to the shared selection module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deselectElementSource = extractFunctionSource(
    fileContent,
    'function deselectElement() {',
    '\n\n    function selectAllElementsOnActiveSlide() {'
  );
  const calls = [];
  const context = {
    SlideNextStudioEditorSelection: {
      deselectStudioElement(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    hideDragHud() {},
    commitEditorSelectionState() {}
  };

  vm.createContext(context);
  vm.runInContext(deselectElementSource, context);

  assert.equal(context.deselectElement(), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].hideDragHud, 'function');
  assert.equal(typeof calls[0].commitSelectionState, 'function');
});

test('deselectElement fails closed when the shared selection module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const deselectElementSource = extractFunctionSource(
    fileContent,
    'function deselectElement() {',
    '\n\n    function selectAllElementsOnActiveSlide() {'
  );

  const context = {
    SlideNextStudioEditorSelection: null
  };
  vm.createContext(context);
  vm.runInContext(deselectElementSource, context);

  assert.equal(context.deselectElement(), false);
});

test('selectAllElementsOnActiveSlide delegates selection orchestration to the shared module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectAllSource = extractFunctionSource(
    fileContent,
    'function selectAllElementsOnActiveSlide() {',
    '\n\n    function isElementLocked(el) {'
  );
  const calls = [];
  const context = {
    SlideNextStudioEditorSelection: {
      selectAllStudioElementsOnActiveSlide(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    getActiveSlide() {},
    getNormalizedSlideLayerOrder() {},
    getEditorSelectionOptions() {},
    commitEditorSelectionState() {}
  };

  vm.createContext(context);
  vm.runInContext(selectAllSource, context);

  assert.equal(context.selectAllElementsOnActiveSlide(), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.equal(typeof calls[0].getElements, 'function');
  assert.equal(typeof calls[0].getSelectionOptions, 'function');
  assert.equal(typeof calls[0].commitSelectionState, 'function');
});

test('selectAllElementsOnActiveSlide fails closed when the shared selection module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectAllSource = extractFunctionSource(
    fileContent,
    'function selectAllElementsOnActiveSlide() {',
    '\n\n    function isElementLocked(el) {'
  );

  const context = {
    SlideNextStudioEditorSelection: null
  };
  vm.createContext(context);
  vm.runInContext(selectAllSource, context);

  assert.equal(context.selectAllElementsOnActiveSlide(), false);
});

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createElement(id, options = {}) {
  return {
    editorId: id,
    isConnected: options.isConnected !== false,
    classList: createClassList(options.classNames || []),
    ineligible: !!options.ineligible
  };
}

function createSlide(elements = []) {
  const elementSet = new Set(elements);
  return {
    contains(element) {
      return elementSet.has(element);
    }
  };
}

function createSelectionDoc(elements = []) {
  return {
    querySelectorAll(selector) {
      if (selector !== '.editor-selected') {
        return [];
      }
      return elements.filter((element) => element.classList.contains('editor-selected'));
    }
  };
}

function createSelectionOptions(activeSlide, elementsById) {
  return {
    selectionClassName: 'editor-selected',
    isEligibleElement: (element) => !element.ineligible,
    getElementId: (element) => element.editorId,
    getActiveSlide: () => activeSlide,
    getElementById: (id) => elementsById.get(id) || null
  };
}

test('restoreStudioSelectionByIdsOnActiveSlide restores only connected elements on the active slide', () => {
  const activeElement = createElement('active');
  const offSlideElement = createElement('off-slide', { classNames: ['editor-selected'] });
  const disconnectedElement = createElement('disconnected', { isConnected: false });
  const activeSlide = createSlide([activeElement, disconnectedElement]);
  const otherSlide = createSlide([offSlideElement]);
  const doc = createSelectionDoc([activeElement, offSlideElement, disconnectedElement]);
  const elementsById = new Map([
    ['active', activeElement],
    ['off-slide', offSlideElement],
    ['disconnected', disconnectedElement]
  ]);

  assert.equal(otherSlide.contains(offSlideElement), true);

  const result = selection.restoreStudioSelectionByIdsOnActiveSlide(
    ['active', 'off-slide', 'disconnected'],
    doc,
    createSelectionOptions(activeSlide, elementsById)
  );

  assert.equal(result.restored, true);
  assert.deepEqual(result.selectedElements, [activeElement]);
  assert.equal(result.selectedElement, activeElement);
  assert.equal(activeElement.classList.contains('editor-selected'), true);
  assert.equal(offSlideElement.classList.contains('editor-selected'), false);
  assert.equal(disconnectedElement.classList.contains('editor-selected'), false);
});

test('getStudioCommittedSelectedElements falls back to committed DOM selection when in-memory selection is empty', () => {
  const committedElement = createElement('committed', { classNames: ['editor-selected'] });
  const staleElement = createElement('stale', { classNames: ['editor-selected'], isConnected: false });
  const doc = createSelectionDoc([committedElement, staleElement]);

  const result = selection.getStudioCommittedSelectedElements([], doc, {
    selectionClassName: 'editor-selected',
    isEligibleElement: (element) => !element.ineligible
  });

  assert.deepEqual(result, [committedElement]);
});

test('getStudioCommittedSelectedElementIds returns ids from the committed DOM selection fallback', () => {
  const committedElement = createElement('committed', { classNames: ['editor-selected'] });
  const ineligibleElement = createElement('ignored', {
    classNames: ['editor-selected'],
    ineligible: true
  });
  const doc = createSelectionDoc([committedElement, ineligibleElement]);

  const result = selection.getStudioCommittedSelectedElementIds([], doc, {
    selectionClassName: 'editor-selected',
    isEligibleElement: (element) => !element.ineligible,
    getElementId: (element) => element.editorId
  });

  assert.deepEqual(result, ['committed']);
});

test('restoreStudioSelectionByIdsOnActiveSlide clears stale selection when there is nothing to restore', () => {
  const staleElement = createElement('stale', { classNames: ['editor-selected'] });
  const activeSlide = createSlide([]);
  const doc = createSelectionDoc([staleElement]);
  const elementsById = new Map([['stale', staleElement]]);

  const result = selection.restoreStudioSelectionByIdsOnActiveSlide(
    ['stale'],
    doc,
    createSelectionOptions(activeSlide, elementsById)
  );

  assert.equal(result.restored, false);
  assert.deepEqual(result.selectedElements, []);
  assert.equal(result.selectedElement, null);
  assert.equal(staleElement.classList.contains('editor-selected'), false);
});

test('commitStudioSelectionState triggers the expected UI sync hooks', () => {
  const selectedElement = createElement('selected');
  const staleSelectedElement = createElement('stale', { isConnected: false });
  const fallbackSelectedElement = createElement('fallback');
  const calls = {
    applySelectionState: 0,
    refreshSelectionClasses: 0,
    syncSelectionOverlay: 0,
    hideDragHud: 0,
    syncInspectorForSelection: 0,
    updateLayersList: 0
  };
  let appliedState = null;

  const result = selection.commitStudioSelectionState(
    {
      selectedElements: [],
      selectedElement: null
    },
    {
      applySelectionState(nextState) {
        calls.applySelectionState += 1;
        appliedState = nextState;
      },
      refreshSelectionClasses() {
        calls.refreshSelectionClasses += 1;
      },
      syncSelectionOverlay() {
        calls.syncSelectionOverlay += 1;
      },
      hideDragHud() {
        calls.hideDragHud += 1;
      },
      hideDragHudOnClear: true,
      syncInspectorForSelection() {
        calls.syncInspectorForSelection += 1;
      },
      updateLayersList() {
        calls.updateLayersList += 1;
      }
    }
  );

  assert.deepEqual(result, { selectedElements: [], selectedElement: null });
  assert.deepEqual(appliedState, { selectedElements: [], selectedElement: null });
  assert.deepEqual(calls, {
    applySelectionState: 1,
    refreshSelectionClasses: 1,
    syncSelectionOverlay: 1,
    hideDragHud: 1,
    syncInspectorForSelection: 1,
    updateLayersList: 1
  });

  const retainedSelectionResult = selection.commitStudioSelectionState(
    {
      selectedElements: [selectedElement],
      selectedElement
    },
    {
      hideDragHud() {
        calls.hideDragHud += 1;
      },
      hideDragHudOnClear: true
    }
  );

  assert.deepEqual(retainedSelectionResult, {
    selectedElements: [selectedElement],
    selectedElement
  });
  assert.equal(calls.hideDragHud, 1);

  const normalizedSelectionResult = selection.commitStudioSelectionState(
    {
      selectedElements: [staleSelectedElement, fallbackSelectedElement],
      selectedElement: staleSelectedElement
    },
    {
      applySelectionState(nextState) {
        appliedState = nextState;
      }
    }
  );

  assert.deepEqual(normalizedSelectionResult, {
    selectedElements: [fallbackSelectedElement],
    selectedElement: fallbackSelectedElement
  });
  assert.deepEqual(appliedState, {
    selectedElements: [fallbackSelectedElement],
    selectedElement: fallbackSelectedElement
  });
});

test('normalizeStudioSelectionState removes stale and ineligible elements and normalizes primary selection', () => {
  const staleSelectedElement = createElement('stale', { isConnected: false });
  const fallbackSelectedElement = createElement('fallback');
  const ineligibleSelectedElement = createElement('ineligible', { ineligible: true });

  assert.deepEqual(selection.normalizeStudioSelectionState({
    selectedElements: [staleSelectedElement, fallbackSelectedElement],
    selectedElement: staleSelectedElement
  }), {
    selectedElements: [fallbackSelectedElement],
    selectedElement: fallbackSelectedElement
  });

  assert.deepEqual(selection.normalizeStudioSelectionState({
    selectedElements: [],
    selectedElement: staleSelectedElement
  }), {
    selectedElements: [],
    selectedElement: null
  });

  assert.deepEqual(selection.normalizeStudioSelectionState({
    selectedElements: [ineligibleSelectedElement, fallbackSelectedElement],
    selectedElement: ineligibleSelectedElement
  }, {
    isEligibleElement: (element) => !element.ineligible
  }), {
    selectedElements: [fallbackSelectedElement],
    selectedElement: fallbackSelectedElement
  });
});

test('updateStudioSelection and selectAllStudioElements normalize stale and ineligible inputs before building selection state', () => {
  const staleSelectedElement = createElement('stale', { isConnected: false });
  const liveSelectedElement = createElement('live');
  const targetElement = createElement('target');
  const offSlideSelectedElement = createElement('off-slide', { ineligible: true });

  assert.deepEqual(selection.updateStudioSelection(
    [staleSelectedElement, liveSelectedElement],
    null
  ), {
    selectedElements: [liveSelectedElement],
    selectedElement: liveSelectedElement
  });

  assert.deepEqual(selection.updateStudioSelection(
    [staleSelectedElement, liveSelectedElement],
    targetElement,
    { additive: true }
  ), {
    selectedElements: [liveSelectedElement, targetElement],
    selectedElement: liveSelectedElement
  });

  assert.deepEqual(selection.updateStudioSelection(
    [offSlideSelectedElement, liveSelectedElement],
    targetElement,
    {
      additive: true,
      isEligibleElement: (element) => !element.ineligible
    }
  ), {
    selectedElements: [liveSelectedElement, targetElement],
    selectedElement: liveSelectedElement
  });

  assert.deepEqual(selection.selectAllStudioElements([
    staleSelectedElement,
    liveSelectedElement
  ]), {
    selectedElements: [liveSelectedElement],
    selectedElement: liveSelectedElement
  });

  assert.deepEqual(selection.selectAllStudioElements([
    offSlideSelectedElement,
    liveSelectedElement
  ], {
    isEligibleElement: (element) => !element.ineligible
  }), {
    selectedElements: [liveSelectedElement],
    selectedElement: liveSelectedElement
  });
});

test('restoreCommittedStudioSelectionByIdsOnActiveSlide applies selection state and syncs UI hooks', () => {
  const activeElement = createElement('active');
  const activeSlide = createSlide([activeElement]);
  const doc = createSelectionDoc([activeElement]);
  const elementsById = new Map([['active', activeElement]]);
  const calls = {
    applySelectionState: 0,
    syncSelectionOverlay: 0,
    hideDragHud: 0,
    syncInspectorForSelection: 0,
    updateLayersList: 0
  };
  let appliedState = null;

  const result = selection.restoreCommittedStudioSelectionByIdsOnActiveSlide(
    ['active'],
    doc,
    {
      ...createSelectionOptions(activeSlide, elementsById),
      applySelectionState(nextState) {
        calls.applySelectionState += 1;
        appliedState = nextState;
      },
      syncSelectionOverlay() {
        calls.syncSelectionOverlay += 1;
      },
      hideDragHud() {
        calls.hideDragHud += 1;
      },
      hideDragHudOnClear: true,
      syncInspectorForSelection() {
        calls.syncInspectorForSelection += 1;
      },
      updateLayersList() {
        calls.updateLayersList += 1;
      }
    }
  );

  assert.equal(result.restored, true);
  assert.deepEqual(appliedState, {
    selectedElements: [activeElement],
    selectedElement: activeElement
  });
  assert.deepEqual(calls, {
    applySelectionState: 1,
    syncSelectionOverlay: 1,
    hideDragHud: 0,
    syncInspectorForSelection: 1,
    updateLayersList: 1
  });
  assert.equal(activeElement.classList.contains('editor-selected'), true);
});

test('restoreStudioDeckViewAfterSlideMutation prefers the preserved active slide before falling back', () => {
  const calls = {
    restoreActiveSlideById: [],
    restoreSelectionState: 0,
    setActiveSlideByIndex: []
  };

  const restored = deckView.restoreStudioDeckViewAfterSlideMutation({
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-3',
    restoreActiveSlideById(slideId) {
      calls.restoreActiveSlideById.push(slideId);
      return slideId === 'slide-2';
    },
    restoreSelectionState() {
      calls.restoreSelectionState += 1;
    },
    fallbackIndex: 0,
    setActiveSlideByIndex(index) {
      calls.setActiveSlideByIndex.push(index);
    }
  });

  assert.deepEqual(restored, {
    didRestorePreservedActiveSlide: true,
    activeSlideId: 'slide-2',
    fallbackIndex: null
  });
  assert.deepEqual(calls, {
    restoreActiveSlideById: ['slide-2'],
    restoreSelectionState: 1,
    setActiveSlideByIndex: []
  });

  const fellBack = deckView.restoreStudioDeckViewAfterSlideMutation({
    preservedActiveSlideId: 'slide-2',
    removedSlideId: 'slide-2',
    restoreActiveSlideById(slideId) {
      calls.restoreActiveSlideById.push(slideId);
      return true;
    },
    restoreSelectionState() {
      calls.restoreSelectionState += 1;
    },
    fallbackIndex: 4,
    setActiveSlideByIndex(index) {
      calls.setActiveSlideByIndex.push(index);
    }
  });

  assert.deepEqual(fellBack, {
    didRestorePreservedActiveSlide: false,
    activeSlideId: '',
    fallbackIndex: 4
  });
  assert.deepEqual(calls, {
    restoreActiveSlideById: ['slide-2'],
    restoreSelectionState: 1,
    setActiveSlideByIndex: [4]
  });
});

test('syncStudioActiveSlideView preserves selection only when explicitly requested', () => {
  const activeSlide = {
    classList: createClassList(['slide-active'])
  };
  const inactiveSlide = {
    classList: createClassList([])
  };
  const selectionPreservedCalls = {
    deselectElement: 0,
    setCurrentSlideIndex: []
  };

  const preservedResult = deckView.syncStudioActiveSlideView(
    {},
    {
      preserveSelection: true,
      getSlides: () => [activeSlide, inactiveSlide],
      setCurrentSlideIndex(nextIndex) {
        selectionPreservedCalls.setCurrentSlideIndex.push(nextIndex);
      },
      updateActiveThumbnailCardState() {},
      setSlideCountLabel() {},
      deselectElement() {
        selectionPreservedCalls.deselectElement += 1;
      },
      applyViewportTransform() {},
      pruneEditorChromeNodes() {},
      getSlideId: () => 'slide-1',
      updateIframeNavigationUI() {}
    }
  );

  assert.deepEqual(preservedResult, {
    didSync: true,
    activeIndex: 0,
    activeSlideId: 'slide-1',
    slideCount: 2
  });
  assert.deepEqual(selectionPreservedCalls, {
    deselectElement: 0,
    setCurrentSlideIndex: [0]
  });

  const deselectCalls = {
    deselectElement: 0
  };

  deckView.syncStudioActiveSlideView(
    {},
    {
      getSlides: () => [activeSlide],
      setCurrentSlideIndex() {},
      updateActiveThumbnailCardState() {},
      setSlideCountLabel() {},
      deselectElement() {
        deselectCalls.deselectElement += 1;
      },
      applyViewportTransform() {},
      pruneEditorChromeNodes() {},
      getSlideId: () => 'slide-1',
      updateIframeNavigationUI() {}
    }
  );

  assert.equal(deselectCalls.deselectElement, 1);
});

test('restoreStudioHistorySelectionState uses committed-selection restore callback when provided', () => {
  const calls = {
    restoreCommittedSelectionState: [],
    restoreSelectionByIds: 0,
    syncSelectionOverlay: 0,
    syncInspectorForSelection: 0,
    updateLayersList: 0,
    observeDeckActiveSlideState: []
  };
  const doc = { label: 'doc' };

  const result = history.restoreStudioHistorySelectionState(
    {
      selectedElementIds: ['el-1', '', null, 'el-2']
    },
    {
      doc,
      restoreCommittedSelectionState(selectedIds, nextDoc) {
        calls.restoreCommittedSelectionState.push({
          selectedIds,
          doc: nextDoc
        });
      },
      restoreSelectionByIds() {
        calls.restoreSelectionByIds += 1;
      },
      syncSelectionOverlay() {
        calls.syncSelectionOverlay += 1;
      },
      syncInspectorForSelection() {
        calls.syncInspectorForSelection += 1;
      },
      updateLayersList() {
        calls.updateLayersList += 1;
      },
      observeDeckActiveSlideState(nextDoc) {
        calls.observeDeckActiveSlideState.push(nextDoc);
      }
    }
  );

  assert.deepEqual(result, {
    restoredSelectionIds: ['el-1', 'el-2'],
    restoredSelectionCount: 2
  });
  assert.deepEqual(calls, {
    restoreCommittedSelectionState: [
      {
        selectedIds: ['el-1', 'el-2'],
        doc
      }
    ],
    restoreSelectionByIds: 0,
    syncSelectionOverlay: 0,
    syncInspectorForSelection: 0,
    updateLayersList: 0,
    observeDeckActiveSlideState: [doc]
  });
});

test('setupIframeDragging delegates the fallback drag lifecycle through shared pointer events', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setupIframeDraggingSource = extractFunctionSource(
    fileContent,
    'function setupIframeDragging(doc) {',
    '\n\n    // Insert New elements'
  );

  const calls = [];
  const bodyListeners = new Map();
  const windowListeners = new Map();
  let fallbackOptions = null;
  const slide = { id: 'slide-1' };
  const doc = {
    addEventListener(type, handler) {
      calls.push(['doc.addEventListener', type]);
    },
    body: {
      addEventListener(type, handler) {
        bodyListeners.set(type, handler);
      }
    },
    defaultView: {
      addEventListener(type, handler) {
        windowListeners.set(type, handler);
      }
    }
  };
  const context = {
    DRAG_OVERFLOW_MARGIN_PX: 24,
    DRAG_START_THRESHOLD_PX: 3,
    MIN_ELEMENT_SIZE_PX: 12,
    SNAP_THRESHOLD_PX: 12,
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {
        return null;
      }
    },
    SlideNextStudioEditorEvents: studioEvents,
    SlideNextStudioEditorTransform: {
      createStudioTransformFallbackPointerHandlers(options) {
        fallbackOptions = options;
        return {
          handlePointerDown(event) {
            calls.push(['fallbackPointerDown', event]);
            options.onSessionStart({ left: 0, top: 0, width: 100, height: 60 });
          },
          handlePointerMove() {},
          handlePointerUp(event) {
            calls.push(['fallbackPointerUp', event]);
            options.onSessionFinalize(
              { id: 'finalize-result' },
              { shouldPersist: true, versionLabel: 'Auto: Moved Element' }
            );
          },
          handlePointerCancel() {},
          handleWindowBlur() {}
        };
      },
      resolveStudioTransformSessionStart() {
        return {
          session: { slideMetrics: { logicalWidth: 1920, logicalHeight: 1080 } },
          startBounds: { left: 0, top: 0, width: 100, height: 60 }
        };
      },
      shouldHandleStudioTransformPointerEvent(session) {
        return !!session;
      },
      buildStudioTransformFrameState() {
        return {
          isActive: false
        };
      },
      applyStudioTransformBounds() {},
      finalizeStudioTransformSession(session) {
        calls.push(['finalizeStudioTransformSession', session]);
        return { id: 'finalize-result' };
      },
      buildStudioTransformCompletionPlan(result) {
        calls.push(['buildStudioTransformCompletionPlan', result]);
        return {
          shouldPersist: true,
          versionLabel: 'Auto: Moved Element'
        };
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
      return slide;
    },
    getRectOnSlide() {
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getPointerOnSlide() {
      return { x: 10, y: 20 };
    },
    getSelectionBounds() {
      return { left: 0, top: 0, width: 100, height: 60 };
    },
    getSlideMetrics() {
      return { logicalWidth: 1920, logicalHeight: 1080 };
    },
    getTransformSelectionState() {
      return { canTransform: true, selection: [] };
    },
    hideDragHud() {
      calls.push(['hideDragHud']);
    },
    hideGuides() {
      calls.push(['hideGuides']);
    },
    isDraggingElement: false,
    resolveEditableTarget() {
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectElement() {},
    ensureSelectionOverlay() {
      return {};
    },
    showGuides() {},
    showDragHud() {},
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
    },
    syncSelectionOverlay() {
      calls.push(['syncSelectionOverlay']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateDragHud(bounds) {
      calls.push(['updateDragHud', bounds]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadTransformSessionFinalizer(fileContent, context);
  vm.runInContext(setupIframeDraggingSource, context);
  installTransformController(context);

  context.setupIframeDragging(doc);

  bodyListeners.get('pointerdown')({
    preventDefault() {},
    stopPropagation() {}
  });
  bodyListeners.get('pointerup')({});

  assert.equal(typeof windowListeners.get('blur'), 'function');
  assert.equal(typeof fallbackOptions.onSessionStart, 'function');
  assert.equal(typeof fallbackOptions.onSessionFinalize, 'function');
  assert.deepEqual(calls.map(([name]) => name), [
    'doc.addEventListener',
    'fallbackPointerDown',
    'updateDragHud',
    'fallbackPointerUp',
    'hideGuides',
    'hideDragHud',
    'syncSelectionOverlay',
    'syncInspectorForSelection',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(context.isDraggingElement, false);
  assert.equal(calls.some(([name]) => name === 'updateLayersList'), false);
  assert.equal(calls[0][1], 'dragstart');
  assert.deepEqual(calls[2][1], { left: 0, top: 0, width: 100, height: 60 });
  assert.equal(calls[10][1], 'Auto: Moved Element');
});

test('setupIframeDragging delegates pointer binding to the shared transform handlers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setupIframeDraggingSource = extractFunctionSource(
    fileContent,
    'function setupIframeDragging(doc) {',
    '\n\n    // Insert New elements'
  );

  const calls = [];
  const bodyListeners = new Map();
  const windowListeners = new Map();
  let delegatedOptions = null;
  const canonicalDeckBefore = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', layout: { mode: 'absolute', x: 10, y: 20 } }]
    }]
  });
  const transformHandlers = {
    handlePointerDown() {},
    handlePointerMove() {},
    handlePointerUp() {},
    handlePointerCancel() {},
    handleWindowBlur() {}
  };
  const doc = {
    addEventListener(type) {
      calls.push(['doc.addEventListener', type]);
    },
    body: {
      addEventListener(type, handler) {
        bodyListeners.set(type, handler);
      }
    },
    defaultView: {
      addEventListener(type, handler) {
        windowListeners.set(type, handler);
      }
    }
  };
  const context = {
    DRAG_OVERFLOW_MARGIN_PX: 24,
    DRAG_START_THRESHOLD_PX: 3,
    MIN_ELEMENT_SIZE_PX: 12,
    SNAP_THRESHOLD_PX: 12,
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {}
    },
    SlideNextStudioEditorTransform: {
      buildStudioTransformCanonicalLayoutUpdates: transformState.buildStudioTransformCanonicalLayoutUpdates,
      buildStudioTransformStyleTransaction: transformState.buildStudioTransformStyleTransaction,
      attachStudioTransformPointerHandlers: transformState.attachStudioTransformPointerHandlers,
      createStudioTransformPointerHandlers(options) {
        delegatedOptions = options;
        return transformHandlers;
      }
    },
    getActiveSlide() {},
    buildEditorCanonicalDeck() {
      return canonicalDeckBefore;
    },
    getPointerOnSlide() {},
    getRectOnSlide() {},
    getSelectionBounds() {},
    getSlideMetrics() {},
    getTransformSelectionState() {},
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    hideDragHud() {
      calls.push(['hideDragHud']);
    },
    hideGuides() {
      calls.push(['hideGuides']);
    },
    isDraggingElement: false,
    resolveEditableTarget() {},
    renderGuides(guides) {
      calls.push(['renderGuides', guides]);
    },
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    selectElement() {},
    ensureSelectionOverlay() {},
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
    },
    syncSelectionOverlay() {
      calls.push(['syncSelectionOverlay']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateDragHud(bounds) {
      calls.push(['updateDragHud', bounds]);
    }
  };

  vm.createContext(context);
  loadTransformSessionFinalizer(fileContent, context);
  vm.runInContext(setupIframeDraggingSource, context);
  installTransformController(context);

  context.setupIframeDragging(doc);

  assert.equal(bodyListeners.get('pointerdown'), transformHandlers.handlePointerDown);
  assert.equal(bodyListeners.get('pointermove'), transformHandlers.handlePointerMove);
  assert.equal(bodyListeners.get('pointerup'), transformHandlers.handlePointerUp);
  assert.equal(bodyListeners.get('pointercancel'), transformHandlers.handlePointerCancel);
  assert.equal(windowListeners.get('blur'), transformHandlers.handleWindowBlur);
  assert.equal(typeof delegatedOptions.onSessionStart, 'function');
  assert.equal(typeof delegatedOptions.onSessionFrame, 'function');
  assert.equal(typeof delegatedOptions.onSessionFinalize, 'function');

  const startBounds = { left: 0, top: 0, width: 20, height: 20 };
  const movedElement = {
    dataset: { editorId: 'node-1' },
    style: {
      position: 'absolute',
      margin: '0',
      left: '20px',
      top: '30px',
      width: '120px',
      height: '80px'
    }
  };
  delegatedOptions.onSessionStart(startBounds);
  delegatedOptions.onSessionFrame(startBounds);
  delegatedOptions.onSessionFinalize({
    session: {
      items: [{
        element: movedElement,
        startStyle: {
          position: '',
          margin: '',
          left: '',
          top: '',
          width: '',
          height: ''
        }
      }]
    }
  }, {
    shouldPersist: true,
    versionLabel: 'Auto: Moved Element'
  });

  assert.equal(context.isDraggingElement, false);
  assert.deepEqual(calls.map(([name]) => name), [
    'doc.addEventListener',
    'updateDragHud',
    'renderGuides',
    'syncSelectionOverlay',
    'updateDragHud',
    'hideGuides',
    'hideDragHud',
    'syncSelectionOverlay',
    'syncInspectorForSelection',
    'saveHistoryState',
    'triggerAutoSave',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[9][1], false);
  assert.deepEqual(calls[9][2], {
    kind: studioTransaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: studioTransaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: {
        position: '',
        margin: '',
        left: '',
        top: '',
        width: '',
        height: ''
      },
      after: {
        position: 'absolute',
        margin: '0',
        left: '20px',
        top: '30px',
        width: '120px',
        height: '80px'
      }
    }]
  });
  assert.equal(calls[9][3].slides[0].nodes[0].layout.x, 20);
  assert.equal(calls[9][3].slides[0].nodes[0].layout.y, 30);
});

test('setupIframeDragging delegates interaction binding to the shared interaction module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setupIframeDraggingSource = extractFunctionSource(
    fileContent,
    'function setupIframeDragging(doc) {',
    '\n\n    // Insert New elements'
  );

  const doc = { body: {} };
  let delegatedDoc = null;
  let delegatedOptions = null;
  const context = {
    DRAG_OVERFLOW_MARGIN_PX: 24,
    DRAG_START_THRESHOLD_PX: 3,
    MIN_ELEMENT_SIZE_PX: 12,
    SNAP_THRESHOLD_PX: 12,
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor() {}
    },
    SlideNextStudioEditorTransform: {},
    SlideNextStudioEditorInteractions: {
      attachStudioEditorInteractionHandlers(nextDoc, options) {
        delegatedDoc = nextDoc;
        delegatedOptions = options;
        return true;
      }
    },
    isGridSnapEnabled: false,
    getTransformSelectionState() {},
    selectElement() {},
    resolveEditableTarget() {},
    getSlideMetrics() {},
    getPointerOnSlide() {},
    getSelectionBounds() {},
    getRectOnSlide() {},
    ensureSelectionOverlay() {},
    renderGuides() {},
    syncSelectionOverlay() {},
    updateDragHud() {},
    hideGuides() {},
    hideDragHud() {},
    syncInspectorForSelection() {},
    saveHistoryState() {},
    triggerAutoSave() {},
    triggerAutoVersion() {},
    getNormalizedSlideLayerOrder() {},
    isElementHidden() {},
    renderMarqueeSelection() {},
    clearMarqueeSelection() {},
    commitEditorSelectionState() {}
  };

  vm.createContext(context);
  loadTransformSessionFinalizer(fileContent, context);
  vm.runInContext(setupIframeDraggingSource, context);
  installTransformController(context);

  context.setupIframeDragging(doc);

  assert.equal(delegatedDoc, doc);
  assert.equal(typeof delegatedOptions.transformOptions.onSessionStart, 'function');
  assert.equal(typeof delegatedOptions.transformOptions.onSessionFrame, 'function');
  assert.equal(typeof delegatedOptions.transformOptions.onSessionFinalize, 'function');
  assert.equal(typeof delegatedOptions.marqueeOptions.onSessionStart, 'function');
  assert.equal(typeof delegatedOptions.marqueeOptions.onSessionFrame, 'function');
  assert.equal(typeof delegatedOptions.marqueeOptions.commitSelectionState, 'function');
  assert.equal(typeof delegatedOptions.marqueeOptions.setSuppressNextFrameClick, 'function');
});
