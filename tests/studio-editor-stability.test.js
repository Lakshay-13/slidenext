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
  const controllerStart = fileContent.indexOf('const studioEditorHistoryControllerRuntime =');
  const controllerEnd = fileContent.indexOf('const studioEditorPersistenceController =', controllerStart);
  assert.notEqual(controllerStart, -1);
  assert.notEqual(controllerEnd, -1);

  const controllerSource = fileContent.slice(controllerStart, controllerEnd);
  assert.match(
    controllerSource,
    /resolveFallbackActiveSlideId:\s*resolveEditorFallbackActiveSlideId/
  );
  assert.match(
    controllerSource,
    /buildMutationCanonicalDeck:\s*buildEditorMutationCanonicalDeck/
  );
  assert.match(
    controllerSource,
    /getLiveCanonicalDeck: \(\) => \(/
  );
  assert.doesNotMatch(
    controllerSource,
    /resolveFallbackActiveSlideId,\s*getActiveSlideId/
  );
});

test('history restore wiring supplies a canonical rebuild fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerStart = fileContent.indexOf('const studioEditorHistoryControllerRuntime =');
  const controllerEnd = fileContent.indexOf('const studioEditorPersistenceController =', controllerStart);
  assert.notEqual(controllerStart, -1);
  assert.notEqual(controllerEnd, -1);

  const controllerSource = fileContent.slice(controllerStart, controllerEnd);
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-restore-options\.js"><\/script>/
  );
  assert.match(
    controllerSource,
    /restoreOptionsApi\.createStudioEditorHistoryRestoreOptions\(\{/
  );
  assert.match(
    controllerSource,
    /buildEditorCanonicalDeck,\s*\n\s+getEditorCanonicalDeckValidator,/
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

test('alignment wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLayoutRuntime =',
    'const studioEditorLockVisibilityController ='
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

test('group wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorLayoutRuntime =',
    'const studioEditorLockVisibilityController ='
  );
  const groupActionStateSource = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc, buildOptions\)/
  );
  assert.match(
    controllerSource,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.match(groupActionStateSource, /getFreeformPositioned\(sourceDoc\)/);
  assert.match(groupActionStateSource, /getEditorCanonicalFreeformReader\(/);
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

test('element removal wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorRemovalRuntime =',
    'const studioEditorRemovalController ='
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
    'const studioEditorStyleRuntime =',
    'const studioEditorStyleController ='
  );

  assert.match(
    controllerSource,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
  assert.match(
    controllerSource,
    /buildCanonicalDeck: \(sourceDoc, buildOptions\) => buildEditorCanonicalDeck\(sourceDoc, buildOptions\)/
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
    'const studioEditorClipboardRuntime =',
    'const studioEditorClipboardController ='
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
    'const studioEditorElementInsertionRuntime =',
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

test('transform wiring prefers live canonical state and keeps a legacy baseline fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorTransformRuntime =',
    'const studioEditorTransformController ='
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

test('nudge eligibility uses the canonical freeform reader with a legacy fallback', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSource = extractFunctionSource(
    fileContent,
    'function getNudgeSelectionState(elements = getStudioSelectedElements(), doc = getIframeDoc()) {',
    '\n\n    function isElementHidden'
  );

  assert.match(nudgeSource, /getEditorCanonicalFreeformReader\(/);
  assert.doesNotMatch(
    nudgeSource,
    /isFreeformPositioned: SlideNextStudioEditorTransform\.isStudioFreeformPositioned/
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

test('deck mutation finalizer wiring rebuilds canonical state from the mutated DOM', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    fileContent,
    'const studioEditorDeckMutationFinalizer =',
    'const studioEditorSlideMutationPersistenceFinalizer ='
  );

  assert.match(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => buildEditorMutationCanonicalDeck\(/
  );
  assert.match(
    controllerSource,
    /buildEditorMutationCanonicalDeck\(\s*sourceDoc \|\| getIframeDoc\(\)\s*\)/
  );
  assert.doesNotMatch(
    controllerSource,
    /buildCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\(/
  );
});

test('editor composes element selection through the shared selection module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementSelector =/);
  assert.match(source, /selectStudioElement/);
  assert.match(source, /if \(typeof studioEditorElementSelector !== 'function'\)/);
  assert.doesNotMatch(source, /selectElement\.selector/);
});

test('editor composes element deselection through the shared selection module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementDeselector =/);
  assert.match(source, /deselectStudioElement/);
  assert.match(source, /if \(typeof studioEditorElementDeselector !== 'function'\)/);
  assert.doesNotMatch(source, /deselectElement\.deselector/);
});

test('editor composes select-all through the shared selection module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectAllElements =/);
  assert.match(source, /selectAllStudioElementsOnActiveSlide/);
  assert.match(source, /if \(typeof studioEditorSelectAllElements !== 'function'\)/);
  assert.doesNotMatch(source, /selectAllElementsOnActiveSlide\.selector/);
});

test('editor composes selection overlay creation through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSelectionOverlayEnsurer =/);
  assert.match(source, /ensureStudioSelectionOverlay/);
  assert.match(source, /typeof studioEditorSelectionOverlayEnsurer === 'function'/);
  assert.doesNotMatch(source, /ensureSelectionOverlay\.ensurer/);
});

test('ensureSelectionOverlay passes the editor document, slide, and overlay options to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const ensureOverlaySource = extractFunctionSource(
    fileContent,
    'const studioEditorSelectionOverlayEnsurer =',
    '\n\n    function hideGuides() {'
  );
  const iframeDoc = { id: 'doc' };
  const slide = { id: 'slide' };
  const calls = [];
  const overlay = { id: 'overlay' };
  const context = {
    SlideNextStudioEditorOverlay: {
      ensureStudioSelectionOverlay(...args) {
        calls.push(args);
        return overlay;
      }
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(ensureOverlaySource, context);

  assert.equal(context.ensureSelectionOverlay(iframeDoc, slide), overlay);
  assert.deepEqual(calls, [[iframeDoc, slide, { marker: 'overlay-options' }]]);
});

test('editor composes guide clearing through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorGuidesHider =/);
  assert.match(source, /clearStudioGuidesForActiveSlide/);
  assert.match(source, /typeof studioEditorGuidesHider === 'function'/);
  assert.doesNotMatch(source, /hideGuides\.hider/);
});

test('hideGuides passes the editor document, active-slide resolver, and overlay options to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hideGuidesSource = extractFunctionSource(
    fileContent,
    'const studioEditorGuidesHider =',
    '\n\n    function hideDragHud() {'
  );
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    SlideNextStudioEditorOverlay: {
      clearStudioGuidesForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(hideGuidesSource, context);

  assert.equal(context.hideGuides(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, iframeDoc);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.deepEqual(calls[0].marker, 'overlay-options');
});

test('editor composes drag HUD hiding through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorDragHudHider =/);
  assert.match(source, /hideStudioDragHudForActiveSlide/);
  assert.match(source, /typeof studioEditorDragHudHider === 'function'/);
  assert.doesNotMatch(source, /hideDragHud\.hider/);
});

test('hideDragHud passes the editor document, active-slide resolver, and overlay options to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hideDragHudSource = extractFunctionSource(
    fileContent,
    'const studioEditorDragHudHider =',
    '\n\n    function updateDragHud(bounds) {'
  );
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    SlideNextStudioEditorOverlay: {
      hideStudioDragHudForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(hideDragHudSource, context);

  assert.equal(context.hideDragHud(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, iframeDoc);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.deepEqual(calls[0].marker, 'overlay-options');
});

test('editor composes drag HUD updates through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorDragHudUpdater =/);
  assert.match(source, /updateStudioDragHudForActiveSlide/);
  assert.match(source, /typeof studioEditorDragHudUpdater === 'function'/);
  assert.doesNotMatch(source, /updateDragHud\.updater/);
});

test('updateDragHud passes bounds and overlay context to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDragHudSource = extractFunctionSource(
    fileContent,
    'const studioEditorDragHudUpdater =',
    '\n\n    function renderGuides(guidesDef) {'
  );
  const iframeDoc = { id: 'doc' };
  const bounds = { left: 10, top: 20, width: 30, height: 40 };
  const calls = [];
  const context = {
    SlideNextStudioEditorOverlay: {
      updateStudioDragHudForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(updateDragHudSource, context);

  assert.equal(context.updateDragHud(bounds), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, iframeDoc);
  assert.equal(calls[0].bounds, bounds);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.deepEqual(calls[0].marker, 'overlay-options');
});

test('editor composes guide rendering through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorGuidesRenderer =/);
  assert.match(source, /renderStudioGuidesForActiveSlide/);
  assert.match(source, /typeof studioEditorGuidesRenderer === 'function'/);
  assert.doesNotMatch(source, /renderGuides\.renderer/);
});

test('renderGuides passes guide definitions and overlay context to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const renderGuidesSource = extractFunctionSource(
    fileContent,
    'const studioEditorGuidesRenderer =',
    '\n\n    function renderMarqueeSelection(rect) {'
  );
  const iframeDoc = { id: 'doc' };
  const guidesDef = [{ axis: 'vertical', position: 100 }];
  const calls = [];
  const context = {
    SlideNextStudioEditorOverlay: {
      renderStudioGuidesForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(renderGuidesSource, context);

  assert.equal(context.renderGuides(guidesDef), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, iframeDoc);
  assert.equal(calls[0].guidesDef, guidesDef);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.deepEqual(calls[0].marker, 'overlay-options');
});

test('editor composes marquee rendering through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorMarqueeRenderer =/);
  assert.match(source, /renderStudioMarqueeSelectionForActiveSlide/);
  assert.match(source, /typeof studioEditorMarqueeRenderer === 'function'/);
  assert.doesNotMatch(source, /renderMarqueeSelection\.renderer/);
});

test('renderMarqueeSelection passes the rectangle and overlay context to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const renderMarqueeSource = extractFunctionSource(
    fileContent,
    'const studioEditorMarqueeRenderer =',
    '\n\n    function clearMarqueeSelection() {'
  );
  const iframeDoc = { id: 'doc' };
  const rect = { left: 10, top: 20, right: 80, bottom: 90 };
  const calls = [];
  const context = {
    SlideNextStudioEditorOverlay: {
      renderStudioMarqueeSelectionForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(renderMarqueeSource, context);

  assert.equal(context.renderMarqueeSelection(rect), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, iframeDoc);
  assert.equal(calls[0].rect, rect);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.deepEqual(calls[0].marker, 'overlay-options');
});

test('editor composes marquee clearing through the shared overlay module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorMarqueeClearer =/);
  assert.match(source, /clearStudioMarqueeSelectionForActiveSlide/);
  assert.match(source, /typeof studioEditorMarqueeClearer === 'function'/);
  assert.doesNotMatch(source, /clearMarqueeSelection\.clearer/);
});

test('clearMarqueeSelection passes overlay context to the shared overlay module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const clearMarqueeSource = extractFunctionSource(
    fileContent,
    'const studioEditorMarqueeClearer =',
    '\n\n    function getSlideMetrics(slide) {'
  );
  const iframeDoc = { id: 'doc' };
  const calls = [];
  const context = {
    SlideNextStudioEditorOverlay: {
      clearStudioMarqueeSelectionForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDoc() {
      return iframeDoc;
    },
    getActiveSlide() {
      return { id: 'active-slide' };
    },
    getEditorOverlayOptions() {
      return { marker: 'overlay-options' };
    }
  };

  vm.createContext(context);
  vm.runInContext(clearMarqueeSource, context);

  assert.equal(context.clearMarqueeSelection(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, iframeDoc);
  assert.equal(typeof calls[0].getActiveSlide, 'function');
  assert.deepEqual(calls[0].marker, 'overlay-options');
});

test('editor composes slide metrics through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSlideMetricsReader =/);
  assert.match(source, /getStudioSlideMetrics/);
  assert.match(source, /typeof studioEditorSlideMetricsReader === 'function'/);
  assert.doesNotMatch(source, /getSlideMetrics\.reader/);
});

test('getSlideMetrics delegates the slide to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideMetricsSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMetricsReader =',
    '\n\n    function getRectOnSlide(rect, slideMetrics) {'
  );
  const slide = { id: 'slide-1' };
  const calls = [];
  const metrics = { logicalWidth: 1280, logicalHeight: 720 };
  const context = {
    SlideNextStudioEditorTransform: {
      getStudioSlideMetrics(value) {
        calls.push(value);
        return metrics;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(slideMetricsSource, context);

  assert.equal(context.getSlideMetrics(slide), metrics);
  assert.deepEqual(calls, [slide]);
});

test('getSlideMetrics fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideMetricsSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideMetricsReader =',
    '\n\n    function getRectOnSlide(rect, slideMetrics) {'
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(slideMetricsSource, context);

  assert.equal(context.getSlideMetrics({ id: 'slide-1' }), null);
});

test('editor composes rectangle conversion through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorRectOnSlideReader =/);
  assert.match(source, /getStudioRectOnSlide/);
  assert.match(source, /typeof studioEditorRectOnSlideReader === 'function'/);
  assert.doesNotMatch(source, /getRectOnSlide\.reader/);
});

test('getRectOnSlide delegates rectangle and metrics to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const rectOnSlideSource = extractFunctionSource(
    fileContent,
    'const studioEditorRectOnSlideReader =',
    '\n\n    function getPointerOnSlide(e, slideMetrics) {'
  );
  const rect = { left: 10, top: 20, width: 40, height: 30 };
  const slideMetrics = { scaleX: 2, scaleY: 3 };
  const calls = [];
  const converted = { left: 5, top: 7, width: 20, height: 10 };
  const context = {
    SlideNextStudioEditorTransform: {
      getStudioRectOnSlide(rectValue, metricsValue) {
        calls.push([rectValue, metricsValue]);
        return converted;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(rectOnSlideSource, context);

  assert.equal(context.getRectOnSlide(rect, slideMetrics), converted);
  assert.deepEqual(calls, [[rect, slideMetrics]]);
});

test('getRectOnSlide fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const rectOnSlideSource = extractFunctionSource(
    fileContent,
    'const studioEditorRectOnSlideReader =',
    '\n\n    function getPointerOnSlide(e, slideMetrics) {'
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(rectOnSlideSource, context);

  assert.equal(context.getRectOnSlide({}, {}), null);
});

test('editor composes pointer conversion through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorPointerOnSlideReader =/);
  assert.match(source, /getStudioPointerOnSlide/);
  assert.match(source, /typeof studioEditorPointerOnSlideReader === 'function'/);
  assert.doesNotMatch(source, /getPointerOnSlide\.reader/);
});

test('getPointerOnSlide delegates the event and metrics to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const pointerOnSlideSource = extractFunctionSource(
    fileContent,
    'const studioEditorPointerOnSlideReader =',
    '\n\n    const studioEditorSelectionBoundsResolver ='
  );
  const event = { clientX: 110, clientY: 220 };
  const slideMetrics = { scaleX: 2, scaleY: 3 };
  const calls = [];
  const pointer = { x: 55, y: 73 };
  const context = {
    SlideNextStudioEditorTransform: {
      getStudioPointerOnSlide(eventValue, metricsValue) {
        calls.push([eventValue, metricsValue]);
        return pointer;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(pointerOnSlideSource, context);

  assert.equal(context.getPointerOnSlide(event, slideMetrics), pointer);
  assert.deepEqual(calls, [[event, slideMetrics]]);
});

test('getPointerOnSlide fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const pointerOnSlideSource = extractFunctionSource(
    fileContent,
    'const studioEditorPointerOnSlideReader =',
    '\n\n    const studioEditorSelectionBoundsResolver ='
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(pointerOnSlideSource, context);

  assert.equal(context.getPointerOnSlide({}, {}), null);
});

test('editor composes freeform-position reads through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorFreeformPositionReader =/);
  assert.match(source, /isStudioFreeformPositioned/);
  assert.match(source, /typeof studioEditorFreeformPositionReader === 'function'/);
  assert.doesNotMatch(source, /isElementFreeformPositioned\.reader/);
});

test('isElementFreeformPositioned delegates the element and options to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const freeformReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorFreeformPositionReader =',
    'const studioEditorTransformRuntime ='
  );
  const element = { id: 'element-1' };
  const options = { view: { id: 'view-1' } };
  const calls = [];
  const context = {
    SlideNextStudioEditorTransform: {
      isStudioFreeformPositioned(elementValue, optionsValue) {
        calls.push([elementValue, optionsValue]);
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(freeformReaderSource, context);

  assert.equal(context.isElementFreeformPositioned(element, options), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], element);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { view: { id: 'view-1' } });
});

test('isElementFreeformPositioned fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const freeformReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorFreeformPositionReader =',
    'const studioEditorTransformRuntime ='
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(freeformReaderSource, context);

  assert.equal(context.isElementFreeformPositioned({ id: 'element-1' }), false);
});

test('editor composes transform selection-state building through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorTransformSelectionStateBuilder =/);
  assert.match(source, /buildStudioTransformSelectionState/);
  assert.match(source, /typeof studioEditorTransformSelectionStateBuilder === 'function'/);
  assert.doesNotMatch(source, /getTransformSelectionState\.builder/);
});

test('transform selection-state building delegates elements and options to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectionStateSource = extractFunctionSource(
    fileContent,
    'const studioEditorTransformSelectionStateBuilder =',
    'const studioEditorTransformRuntime ='
  );
  const elements = [{ id: 'element-1' }];
  const options = { isLocked: () => false };
  const calls = [];
  const state = { canTransform: true, selection: elements };
  const context = {
    SlideNextStudioEditorTransform: {
      buildStudioTransformSelectionState(elementsValue, optionsValue) {
        calls.push([elementsValue, optionsValue]);
        return state;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(selectionStateSource, context);

  const builder = vm.runInContext('studioEditorTransformSelectionStateBuilder', context);
  assert.equal(builder(elements, options), state);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], elements);
  assert.equal(calls[0][1].isLocked, options.isLocked);
});

test('transform selection-state building fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectionStateSource = extractFunctionSource(
    fileContent,
    'const studioEditorTransformSelectionStateBuilder =',
    'const studioEditorTransformRuntime ='
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(selectionStateSource, context);

  assert.equal(vm.runInContext('studioEditorTransformSelectionStateBuilder', context), null);
});

test('editor composes positioned-layout-items building through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorPositionedLayoutItemsBuilder =/);
  assert.match(source, /buildStudioPositionedLayoutItems/);
  assert.match(source, /typeof studioEditorPositionedLayoutItemsBuilder === 'function'/);
  assert.doesNotMatch(source, /buildEditorPositionedLayoutItems\.builder/);
});

test('positioned-layout-items building delegates elements and options to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const positionedItemsSource = extractFunctionSource(
    fileContent,
    'const studioEditorPositionedLayoutItemsBuilder =',
    'const studioEditorTransformRuntime ='
  );
  const elements = [{ id: 'element-1' }, { id: 'element-2' }];
  const options = { slideMetrics: { scaleX: 2 } };
  const calls = [];
  const layoutItems = [{ element: elements[0] }, { element: elements[1] }];
  const context = {
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItems(elementsValue, optionsValue) {
        calls.push([elementsValue, optionsValue]);
        return layoutItems;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(positionedItemsSource, context);

  const builder = vm.runInContext('studioEditorPositionedLayoutItemsBuilder', context);
  assert.equal(builder(elements, options), layoutItems);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], elements);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { slideMetrics: { scaleX: 2 } });
});

test('positioned-layout-items building fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const positionedItemsSource = extractFunctionSource(
    fileContent,
    'const studioEditorPositionedLayoutItemsBuilder =',
    'const studioEditorTransformRuntime ='
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(positionedItemsSource, context);

  assert.equal(vm.runInContext('studioEditorPositionedLayoutItemsBuilder', context), null);
});

test('selectElement delegates selection orchestration to the shared selection module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectElementSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementSelector =',
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
    'const studioEditorElementSelector =',
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
    'const studioEditorElementDeselector =',
    '\n\n    const studioEditorSelectAllElements ='
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
    'const studioEditorElementDeselector =',
    '\n\n    const studioEditorSelectAllElements ='
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
    'const studioEditorSelectAllElements =',
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
    'const studioEditorSelectAllElements =',
    '\n\n    function isElementLocked(el) {'
  );

  const context = {
    SlideNextStudioEditorSelection: null
  };
  vm.createContext(context);
  vm.runInContext(selectAllSource, context);

  assert.equal(context.selectAllElementsOnActiveSlide(), false);
});

test('editor composes element lock reads through the shared element state module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementLockReader =/);
  assert.match(source, /isStudioElementLocked/);
  assert.match(source, /typeof studioEditorElementLockReader === 'function'/);
  assert.doesNotMatch(source, /isElementLocked\.reader/);
});

test('isElementLocked delegates the element to the shared element state module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const lockReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementLockReader =',
    '\n\n    function resolveEditorCanonicalNodeForElement('
  );
  const element = { id: 'element-1' };
  const calls = [];
  const context = {
    SlideNextStudioElementState: {
      isStudioElementLocked(value) {
        calls.push(value);
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(lockReaderSource, context);

  assert.equal(context.isElementLocked(element), true);
  assert.deepEqual(calls, [element]);
});

test('isElementLocked fails closed when the shared element state module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const lockReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementLockReader =',
    '\n\n    function resolveEditorCanonicalNodeForElement('
  );
  const context = { SlideNextStudioElementState: null };

  vm.createContext(context);
  vm.runInContext(lockReaderSource, context);

  assert.equal(context.isElementLocked({ id: 'element-1' }), false);
});

test('editor composes element hidden reads through the shared element state module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementHiddenReader =/);
  assert.match(source, /isStudioElementHidden/);
  assert.match(source, /typeof studioEditorElementHiddenReader === 'function'/);
  assert.doesNotMatch(source, /isElementHidden\.reader/);
});

test('isElementHidden delegates the element to the shared element state module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hiddenReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementHiddenReader =',
    '\n\n    function getEditorCanonicalVisibilityReader('
  );
  const element = { id: 'element-1' };
  const calls = [];
  const context = {
    SlideNextStudioElementState: {
      isStudioElementHidden(value) {
        calls.push(value);
        return true;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(hiddenReaderSource, context);

  assert.equal(context.isElementHidden(element), true);
  assert.deepEqual(calls, [element]);
});

test('isElementHidden fails closed when the shared element state module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hiddenReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementHiddenReader =',
    '\n\n    function getEditorCanonicalVisibilityReader('
  );
  const context = { SlideNextStudioElementState: null };

  vm.createContext(context);
  vm.runInContext(hiddenReaderSource, context);

  assert.equal(context.isElementHidden({ id: 'element-1' }), false);
});

test('editor composes element hidden writes through the shared element state module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementHiddenWriter =/);
  assert.match(source, /setStudioElementHiddenState/);
  assert.match(source, /typeof studioEditorElementHiddenWriter !== 'function'/);
  assert.doesNotMatch(source, /setElementHiddenState\.writer/);
});

test('setElementHiddenState delegates connected elements and preserves its void contract', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hiddenWriterSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementHiddenWriter =',
    '\n\n    function updateLockActionState('
  );
  const element = { id: 'element-1', isConnected: true };
  const calls = [];
  const context = {
    SlideNextStudioElementState: {
      setStudioElementHiddenState(elementValue, hiddenValue) {
        calls.push([elementValue, hiddenValue]);
        return 'ignored';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(hiddenWriterSource, context);

  assert.equal(context.setElementHiddenState(element, true), undefined);
  assert.deepEqual(calls, [[element, true]]);
});

test('setElementHiddenState ignores connected elements when the shared module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hiddenWriterSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementHiddenWriter =',
    '\n\n    function updateLockActionState('
  );
  const context = { SlideNextStudioElementState: null };

  vm.createContext(context);
  vm.runInContext(hiddenWriterSource, context);

  assert.equal(context.setElementHiddenState({ id: 'element-1', isConnected: true }, true), undefined);
});

test('editor composes visibility snapshots through the shared element state module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementVisibilityStateReader =/);
  assert.match(source, /getStudioElementVisibilityState/);
  assert.match(source, /getVisibilityState: \(\.\.\.args\) => getElementVisibilityState\(\.\.\.args\)/);
  assert.match(source, /typeof studioEditorElementVisibilityStateReader === 'function'/);
  assert.doesNotMatch(source, /getElementVisibilityState\.reader/);
});

test('getElementVisibilityState delegates the element to the shared element state module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityStateSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementVisibilityStateReader =',
    'const studioEditorLockVisibilityRuntime ='
  );
  const element = { id: 'element-1' };
  const calls = [];
  const state = { hidden: false, display: '', ariaHidden: null };
  const context = {
    SlideNextStudioElementState: {
      getStudioElementVisibilityState(value) {
        calls.push(value);
        return state;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(visibilityStateSource, context);

  assert.equal(context.getElementVisibilityState(element), state);
  assert.deepEqual(calls, [element]);
});

test('getElementVisibilityState fails closed when the shared element state module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const visibilityStateSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementVisibilityStateReader =',
    'const studioEditorLockVisibilityRuntime ='
  );
  const context = { SlideNextStudioElementState: null };

  vm.createContext(context);
  vm.runInContext(visibilityStateSource, context);

  assert.equal(context.getElementVisibilityState({ id: 'element-1' }), null);
});

test('editor composes element lock writes through the shared element state module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorElementLockWriter =/);
  assert.match(source, /setStudioElementLockedState/);
  assert.match(source, /setLocked: \(\.\.\.args\) => setElementLockedState\(\.\.\.args\)/);
  assert.match(source, /typeof studioEditorElementLockWriter !== 'function'/);
  assert.doesNotMatch(source, /setElementLockedState\.writer/);
});

test('setElementLockedState delegates the element and preserves its void contract', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const lockWriterSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementLockWriter =',
    'const studioEditorLockVisibilityRuntime ='
  );
  const element = { id: 'element-1' };
  const calls = [];
  const context = {
    SlideNextStudioElementState: {
      setStudioElementLockedState(elementValue, lockedValue) {
        calls.push([elementValue, lockedValue]);
        return 'ignored';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(lockWriterSource, context);

  assert.equal(context.setElementLockedState(element, true), undefined);
  assert.deepEqual(calls, [[element, true]]);
});

test('setElementLockedState ignores writes when the shared element state module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const lockWriterSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementLockWriter =',
    'const studioEditorLockVisibilityRuntime ='
  );
  const context = { SlideNextStudioElementState: null };

  vm.createContext(context);
  vm.runInContext(lockWriterSource, context);

  assert.equal(context.setElementLockedState({ id: 'element-1' }, true), undefined);
});

test('editor composes duplicated-subtree sanitization through the shared element state module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorDuplicatedSubtreeSanitizer =/);
  assert.match(source, /sanitizeStudioDuplicatedSubtree/);
  assert.match(source, /typeof studioEditorDuplicatedSubtreeSanitizer !== 'function'/);
  assert.doesNotMatch(source, /sanitizeDuplicatedSubtree\.sanitizer/);
});

test('sanitizeDuplicatedSubtree delegates the root and stable sanitization options', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sanitizerSource = extractFunctionSource(
    fileContent,
    'const studioEditorDuplicatedSubtreeSanitizer =',
    '\n\n    function buildClipboardPayload('
  );
  const root = { id: 'root-1' };
  const calls = [];
  const context = {
    EDITOR_ELEMENT_ID_ATTR: 'data-editor-id',
    SlideNextStudioElementState: {
      sanitizeStudioDuplicatedSubtree(rootValue, options) {
        calls.push([rootValue, options]);
        return 'ignored';
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(sanitizerSource, context);

  assert.equal(context.sanitizeDuplicatedSubtree(root), undefined);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], root);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), {
    editorElementIdAttr: 'data-editor-id',
    transientClassNames: ['editor-selected', 'editor-dragging']
  });
});

test('sanitizeDuplicatedSubtree fails closed when the shared element state module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const sanitizerSource = extractFunctionSource(
    fileContent,
    'const studioEditorDuplicatedSubtreeSanitizer =',
    '\n\n    function buildClipboardPayload('
  );
  const context = { EDITOR_ELEMENT_ID_ATTR: 'data-editor-id', SlideNextStudioElementState: null };

  vm.createContext(context);
  vm.runInContext(sanitizerSource, context);

  assert.equal(context.sanitizeDuplicatedSubtree({ id: 'root-1' }), undefined);
});

test('editor composes clipboard positioned-item building through the shared transform module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorPositionedLayoutItemBuilder =/);
  assert.match(source, /buildStudioPositionedLayoutItem/);
  assert.match(source, /buildPositionedLayoutItem: buildEditorPositionedLayoutItem/);
  assert.match(source, /typeof studioEditorPositionedLayoutItemBuilder === 'function'/);
  assert.doesNotMatch(source, /buildEditorPositionedLayoutItem\.builder/);
});

test('buildEditorPositionedLayoutItem delegates the element and options to the shared transform module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const positionedItemSource = extractFunctionSource(
    fileContent,
    'const studioEditorPositionedLayoutItemBuilder =',
    '\n\n    function buildClipboardPayload('
  );
  const element = { id: 'element-1' };
  const options = { slideMetrics: { scaleX: 2 } };
  const calls = [];
  const layoutItem = { element, absLeft: 10, absTop: 20 };
  const context = {
    SlideNextStudioEditorTransform: {
      buildStudioPositionedLayoutItem(elementValue, optionsValue) {
        calls.push([elementValue, optionsValue]);
        return layoutItem;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(positionedItemSource, context);

  assert.equal(context.buildEditorPositionedLayoutItem(element, options), layoutItem);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], element);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { slideMetrics: { scaleX: 2 } });
});

test('buildEditorPositionedLayoutItem fails closed when the shared transform module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const positionedItemSource = extractFunctionSource(
    fileContent,
    'const studioEditorPositionedLayoutItemBuilder =',
    '\n\n    function buildClipboardPayload('
  );
  const context = { SlideNextStudioEditorTransform: null };

  vm.createContext(context);
  vm.runInContext(positionedItemSource, context);

  assert.equal(context.buildEditorPositionedLayoutItem({ id: 'element-1' }, {}), null);
});

test('clipboard payload runtime composes positioned-item building through the editor adapter', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeSource = extractFunctionSource(
    fileContent,
    'const studioEditorClipboardPayloadRuntime =',
    'const studioEditorClipboardPayloadController ='
  );

  assert.match(runtimeSource, /buildPositionedLayoutItem: buildEditorPositionedLayoutItem/);
  assert.doesNotMatch(
    runtimeSource,
    /buildPositionedLayoutItem: typeof SlideNextStudioEditorTransform/
  );
});

test('editor composes positioned-ancestor lookup through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorClosestPositionedAncestorResolver =/);
  assert.match(source, /getStudioClosestPositionedAncestor/);
  assert.match(source, /typeof studioEditorClosestPositionedAncestorResolver === 'function'/);
  assert.doesNotMatch(source, /getEditorClosestPositionedAncestor\.resolver/);
});

test('getEditorClosestPositionedAncestor delegates the element to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const ancestorSource = extractFunctionSource(
    fileContent,
    'const studioEditorClosestPositionedAncestorResolver =',
    'const studioEditorTransformRuntime ='
  );
  const element = { id: 'element-1' };
  const ancestor = { id: 'parent-1' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioClosestPositionedAncestor(value) {
        calls.push(value);
        return ancestor;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(ancestorSource, context);

  assert.equal(context.getEditorClosestPositionedAncestor(element), ancestor);
  assert.deepEqual(calls, [element]);
});

test('getEditorClosestPositionedAncestor fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const ancestorSource = extractFunctionSource(
    fileContent,
    'const studioEditorClosestPositionedAncestorResolver =',
    'const studioEditorTransformRuntime ='
  );
  const context = { SlideNextStudioEditorDom: null };

  vm.createContext(context);
  vm.runInContext(ancestorSource, context);

  assert.equal(context.getEditorClosestPositionedAncestor({ id: 'element-1' }), null);
});

test('clipboard payload construction uses the composed positioned-ancestor resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const payloadSource = extractFunctionSource(
    fileContent,
    'function buildClipboardPayload(elements = getStudioSelectedElements(), doc = getIframeDoc()) {',
    '\n\n    function applyEditorClipboardInsertionWithTransaction'
  );

  assert.match(payloadSource, /getClosestPositionedAncestor: getEditorClosestPositionedAncestor/);
  assert.doesNotMatch(
    payloadSource,
    /getClosestPositionedAncestor: SlideNextStudioEditorDom\.getStudioClosestPositionedAncestor/
  );
});

test('editor runtime wiring uses the composed positioned-ancestor resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeSource = extractFunctionSource(
    fileContent,
    'const studioEditorTransformRuntime =',
    'const studioEditorTransformController ='
  );

  assert.match(
    runtimeSource,
    /getClosestPositionedAncestor: \(\.\.\.args\) => getEditorClosestPositionedAncestor\(\.\.\.args\)/
  );
  assert.doesNotMatch(
    runtimeSource,
    /getClosestPositionedAncestor: \(\.\.\.args\) => SlideNextStudioEditorDom/
  );
});

test('motion and group action-state builders reuse the composed positioned-ancestor resolver', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const motionSource = extractFunctionSource(
    fileContent,
    'function buildMotionSelectionActionState(doc = null) {',
    '\n\n    function buildAlignmentActionState'
  );
  const groupSource = extractFunctionSource(
    fileContent,
    'function buildGroupSelectionActionState(doc = null) {',
    '\n\n    function updateGroupActionState'
  );

  for (const source of [motionSource, groupSource]) {
    assert.match(source, /const closestPositionedAncestorResolver = typeof getEditorClosestPositionedAncestor === 'function'/);
    assert.doesNotMatch(source, /SlideNextStudioEditorDom\.getStudioClosestPositionedAncestor/);
  }
});

test('editor composes active-slide lookup through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorActiveSlideResolver =/);
  assert.match(source, /getStudioActiveSlide/);
  assert.match(source, /typeof studioEditorActiveSlideResolver === 'function'/);
  assert.doesNotMatch(source, /getActiveSlide\.resolver/);
  const getActiveSlideSource = extractFunctionSource(
    source,
    'function getActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function getActiveSlideId'
  );
  assert.doesNotMatch(getActiveSlideSource, /SlideNextStudioEditorDom\.getStudioActiveSlide/);
});

test('getActiveSlide delegates the document and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const activeSlideSource = extractFunctionSource(
    fileContent,
    'const studioEditorActiveSlideResolver =',
    'const studioEditorTransformRuntime ='
  );
  const getActiveSlideSource = extractFunctionSource(
    fileContent,
    'function getActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function getActiveSlideId'
  );
  const doc = { id: 'iframe-doc' };
  const options = { editorElementIdAttr: 'data-editor-id' };
  const calls = [];
  const activeSlide = { id: 'slide-1' };
  const context = {
    SlideNextStudioEditorDom: {
      getStudioActiveSlide(docValue, optionsValue) {
        calls.push([docValue, optionsValue]);
        return activeSlide;
      }
    },
    getEditorDomOptions() {
      return options;
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${activeSlideSource}\n${getActiveSlideSource}`, context);

  assert.equal(context.getActiveSlide(), activeSlide);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], doc);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('getActiveSlide fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const activeSlideSource = extractFunctionSource(
    fileContent,
    'const studioEditorActiveSlideResolver =',
    'const studioEditorTransformRuntime ='
  );
  const getActiveSlideSource = extractFunctionSource(
    fileContent,
    'function getActiveSlide(doc = getIframeDoc()) {',
    '\n\n    function getActiveSlideId'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    },
    getIframeDoc() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${activeSlideSource}\n${getActiveSlideSource}`, context);

  assert.equal(context.getActiveSlide(), null);
});

test('editor composes active-slide ID lookup through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorActiveSlideIdResolver =/);
  assert.match(source, /getStudioActiveSlideId/);
  assert.match(source, /typeof studioEditorActiveSlideIdResolver === 'function'/);
  assert.doesNotMatch(source, /getActiveSlideId\.resolver/);
  const getActiveSlideIdSource = extractFunctionSource(
    source,
    'function getActiveSlideId(doc = getIframeDoc()) {',
    '\n\n    function applyActiveSlideMetadataEdit'
  );
  assert.doesNotMatch(getActiveSlideIdSource, /SlideNextStudioEditorDom\.getStudioActiveSlideId/);
});

test('getActiveSlideId delegates the document and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const activeSlideIdSource = extractFunctionSource(
    fileContent,
    'const studioEditorActiveSlideIdResolver =',
    'const studioEditorTransformRuntime ='
  );
  const getActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getActiveSlideId(doc = getIframeDoc()) {',
    '\n\n    function applyActiveSlideMetadataEdit'
  );
  const doc = { id: 'iframe-doc' };
  const options = { editorElementIdAttr: 'data-editor-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioActiveSlideId(docValue, optionsValue) {
        calls.push([docValue, optionsValue]);
        return 'slide-1';
      }
    },
    getEditorDomOptions() {
      return options;
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${activeSlideIdSource}\n${getActiveSlideIdSource}`, context);

  assert.equal(context.getActiveSlideId(), 'slide-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], doc);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('getActiveSlideId fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const activeSlideIdSource = extractFunctionSource(
    fileContent,
    'const studioEditorActiveSlideIdResolver =',
    'const studioEditorTransformRuntime ='
  );
  const getActiveSlideIdSource = extractFunctionSource(
    fileContent,
    'function getActiveSlideId(doc = getIframeDoc()) {',
    '\n\n    function applyActiveSlideMetadataEdit'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    },
    getIframeDoc() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${activeSlideIdSource}\n${getActiveSlideIdSource}`, context);

  assert.equal(context.getActiveSlideId(), '');
});

test('editor composes chrome-node pruning through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorChromeNodePruner =/);
  assert.match(source, /typeof studioEditorChromeNodePruner === 'function'/);
  const pruneEditorChromeNodesSource = extractFunctionSource(
    source,
    'function pruneEditorChromeNodes(doc = getIframeDoc(), activeSlide = getActiveSlide(doc)) {',
    '\n\n    function setActiveSlideById'
  );
  assert.doesNotMatch(pruneEditorChromeNodesSource, /SlideNextStudioEditorDom\.pruneStudioChromeNodes/);
});

test('pruneEditorChromeNodes delegates the document and chrome options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const chromeNodePrunerSource = extractFunctionSource(
    fileContent,
    'const studioEditorChromeNodePruner =',
    'const studioEditorTransformRuntime ='
  );
  const pruneEditorChromeNodesSource = extractFunctionSource(
    fileContent,
    'function pruneEditorChromeNodes(doc = getIframeDoc(), activeSlide = getActiveSlide(doc)) {',
    '\n\n    function setActiveSlideById'
  );
  const doc = { id: 'iframe-doc' };
  const activeSlide = { id: 'slide-1' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      pruneStudioChromeNodes(docValue, optionsValue) {
        calls.push([docValue, optionsValue]);
      }
    },
    getIframeDoc() {
      return doc;
    },
    getActiveSlide() {
      return activeSlide;
    },
    EDITOR_CHROME_NODE_IDS: ['editor-chrome']
  };

  vm.createContext(context);
  vm.runInContext(`${chromeNodePrunerSource}\n${pruneEditorChromeNodesSource}`, context);

  assert.equal(context.pruneEditorChromeNodes(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], doc);
  assert.equal(calls[0][1].activeSlide, activeSlide);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1].chromeNodeIds)), ['editor-chrome']);
});

test('pruneEditorChromeNodes fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const chromeNodePrunerSource = extractFunctionSource(
    fileContent,
    'const studioEditorChromeNodePruner =',
    'const studioEditorTransformRuntime ='
  );
  const pruneEditorChromeNodesSource = extractFunctionSource(
    fileContent,
    'function pruneEditorChromeNodes(doc = getIframeDoc(), activeSlide = getActiveSlide(doc)) {',
    '\n\n    function setActiveSlideById'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getIframeDoc() {
      return {};
    },
    getActiveSlide() {
      return null;
    },
    EDITOR_CHROME_NODE_IDS: []
  };

  vm.createContext(context);
  vm.runInContext(`${chromeNodePrunerSource}\n${pruneEditorChromeNodesSource}`, context);

  assert.equal(context.pruneEditorChromeNodes(), false);
});

test('editor composes slide-ID assignment through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSlideIdAssigner =/);
  assert.match(source, /typeof slideIdAssigner === 'function'/);
  const assignEditorSlideIdSource = extractFunctionSource(
    source,
    'function assignEditorSlideId(slide, options = {}) {',
    '\n\n    function getEditorSlideId'
  );
  assert.doesNotMatch(assignEditorSlideIdSource, /SlideNextStudioEditorDom\.assignStudioSlideId/);
});

test('assignEditorSlideId delegates the slide and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideIdAssignerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideIdAssigner =',
    'const studioEditorTransformRuntime ='
  );
  const assignEditorSlideIdSource = extractFunctionSource(
    fileContent,
    'function assignEditorSlideId(slide, options = {}) {',
    '\n\n    function getEditorSlideId'
  );
  const slide = { id: 'slide-node' };
  const options = { editorSlideIdAttr: 'data-slide-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      assignStudioSlideId(slideValue, optionsValue) {
        calls.push([slideValue, optionsValue]);
        return 'slide-1';
      }
    },
    getEditorDomOptions(optionsValue) {
      assert.deepEqual(JSON.parse(JSON.stringify(optionsValue)), options);
      return optionsValue;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideIdAssignerSource}\n${assignEditorSlideIdSource}`, context);

  assert.equal(context.assignEditorSlideId(slide, options), 'slide-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], slide);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('assignEditorSlideId fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideIdAssignerSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideIdAssigner =',
    'const studioEditorTransformRuntime ='
  );
  const assignEditorSlideIdSource = extractFunctionSource(
    fileContent,
    'function assignEditorSlideId(slide, options = {}) {',
    '\n\n    function getEditorSlideId'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideIdAssignerSource}\n${assignEditorSlideIdSource}`, context);

  assert.equal(context.assignEditorSlideId({}), '');
});

test('editor composes slide-ID reads through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSlideIdReader =/);
  assert.match(source, /typeof slideIdReader === 'function'/);
  const getEditorSlideIdSource = extractFunctionSource(
    source,
    'function getEditorSlideId(slide, options = {}) {',
    '\n\n    function getSlides'
  );
  assert.doesNotMatch(getEditorSlideIdSource, /SlideNextStudioEditorDom\.getStudioSlideId/);
});

test('getEditorSlideId delegates the slide and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getEditorSlideIdSource = extractFunctionSource(
    fileContent,
    'function getEditorSlideId(slide, options = {}) {',
    '\n\n    function getSlides'
  );
  const slide = { id: 'slide-node' };
  const options = { editorSlideIdAttr: 'data-slide-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioSlideId(slideValue, optionsValue) {
        calls.push([slideValue, optionsValue]);
        return 'slide-1';
      }
    },
    getEditorDomOptions(optionsValue) {
      assert.deepEqual(JSON.parse(JSON.stringify(optionsValue)), options);
      return optionsValue;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideIdReaderSource}\n${getEditorSlideIdSource}`, context);

  assert.equal(context.getEditorSlideId(slide, options), 'slide-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], slide);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('getEditorSlideId fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getEditorSlideIdSource = extractFunctionSource(
    fileContent,
    'function getEditorSlideId(slide, options = {}) {',
    '\n\n    function getSlides'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideIdReaderSource}\n${getEditorSlideIdSource}`, context);

  assert.equal(context.getEditorSlideId({}), '');
});

test('editor composes slide collection reads through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSlidesReader =/);
  assert.match(source, /typeof slidesReader === 'function'/);
  const getSlidesSource = extractFunctionSource(
    source,
    'function getSlides(doc = getIframeDoc()) {',
    '\n\n    function getSlideById'
  );
  assert.doesNotMatch(getSlidesSource, /SlideNextStudioEditorDom\.getStudioSlides/);
});

test('getSlides delegates the document and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slidesReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlidesReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlidesSource = extractFunctionSource(
    fileContent,
    'function getSlides(doc = getIframeDoc()) {',
    '\n\n    function getSlideById'
  );
  const doc = { id: 'iframe-doc' };
  const options = { editorSlideIdAttr: 'data-slide-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioSlides(docValue, optionsValue) {
        calls.push([docValue, optionsValue]);
        return ['slide-1'];
      }
    },
    getIframeDoc() {
      return doc;
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slidesReaderSource}\n${getSlidesSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getSlides())), ['slide-1']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], doc);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('getSlides fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slidesReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlidesReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlidesSource = extractFunctionSource(
    fileContent,
    'function getSlides(doc = getIframeDoc()) {',
    '\n\n    function getSlideById'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getIframeDoc() {
      return {};
    },
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slidesReaderSource}\n${getSlidesSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getSlides())), []);
});

test('editor composes slide-by-ID lookup through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSlideByIdReader =/);
  assert.match(source, /typeof slideByIdReader === 'function'/);
  const getSlideByIdSource = extractFunctionSource(
    source,
    'function getSlideById(slideId, doc = getIframeDoc()) {',
    '\n\n    function getSlideIndexById'
  );
  assert.doesNotMatch(getSlideByIdSource, /SlideNextStudioEditorDom\.getStudioSlideById/);
});

test('getSlideById delegates the slide ID, document, and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideByIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideByIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlideByIdSource = extractFunctionSource(
    fileContent,
    'function getSlideById(slideId, doc = getIframeDoc()) {',
    '\n\n    function getSlideIndexById'
  );
  const doc = { id: 'iframe-doc' };
  const slide = { id: 'slide-node' };
  const options = { editorSlideIdAttr: 'data-slide-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioSlideById(slideId, docValue, optionsValue) {
        calls.push([slideId, docValue, optionsValue]);
        return slide;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideByIdReaderSource}\n${getSlideByIdSource}`, context);

  assert.equal(context.getSlideById('slide-1'), slide);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'slide-1');
  assert.equal(calls[0][1], doc);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2])), options);
});

test('getSlideById fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideByIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideByIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlideByIdSource = extractFunctionSource(
    fileContent,
    'function getSlideById(slideId, doc = getIframeDoc()) {',
    '\n\n    function getSlideIndexById'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getIframeDoc() {
      return {};
    },
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideByIdReaderSource}\n${getSlideByIdSource}`, context);

  assert.equal(context.getSlideById('slide-1'), null);
});

test('editor composes slide-index lookup through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorSlideIndexByIdReader =/);
  assert.match(source, /typeof slideIndexByIdReader === 'function'/);
  const getSlideIndexByIdSource = extractFunctionSource(
    source,
    'function getSlideIndexById(slideId, doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshotFromDom'
  );
  assert.doesNotMatch(getSlideIndexByIdSource, /SlideNextStudioEditorDom\.getStudioSlideIndexById/);
});

test('getSlideIndexById delegates the slide ID, document, and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideIndexByIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideIndexByIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlideIndexByIdSource = extractFunctionSource(
    fileContent,
    'function getSlideIndexById(slideId, doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshotFromDom'
  );
  const doc = { id: 'iframe-doc' };
  const options = { editorSlideIdAttr: 'data-slide-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioSlideIndexById(slideId, docValue, optionsValue) {
        calls.push([slideId, docValue, optionsValue]);
        return 2;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideIndexByIdReaderSource}\n${getSlideIndexByIdSource}`, context);

  assert.equal(context.getSlideIndexById('slide-3'), 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'slide-3');
  assert.equal(calls[0][1], doc);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2])), options);
});

test('getSlideIndexById fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideIndexByIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideIndexByIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlideIndexByIdSource = extractFunctionSource(
    fileContent,
    'function getSlideIndexById(slideId, doc = getIframeDoc()) {',
    '\n\n    function buildEditorDeckSnapshotFromDom'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getIframeDoc() {
      return {};
    },
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideIndexByIdReaderSource}\n${getSlideIndexByIdSource}`, context);

  assert.equal(context.getSlideIndexById('slide-1'), -1);
});

test('editor composes hoverable-element decoration through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorHoverableElementDecorator =/);
  assert.match(source, /typeof hoverableElementDecorator === 'function'/);
  const makeElementsHoverableSource = extractFunctionSource(
    source,
    'function makeElementsHoverable(root) {',
    '\n\n    // Render visual Slide Organizer thumbnails'
  );
  assert.doesNotMatch(makeElementsHoverableSource, /SlideNextStudioEditorDom\.makeStudioElementsHoverable/);
});

test('makeElementsHoverable delegates the root and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hoverableElementDecoratorSource = extractFunctionSource(
    fileContent,
    'const studioEditorHoverableElementDecorator =',
    'const studioEditorTransformRuntime ='
  );
  const makeElementsHoverableSource = extractFunctionSource(
    fileContent,
    'function makeElementsHoverable(root) {',
    '\n\n    // Render visual Slide Organizer thumbnails'
  );
  const root = { id: 'iframe-document' };
  const options = { selectableSelector: '[data-editor-id]' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      makeStudioElementsHoverable(rootValue, optionsValue) {
        calls.push([rootValue, optionsValue]);
        return ['element-1'];
      }
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${hoverableElementDecoratorSource}\n${makeElementsHoverableSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.makeElementsHoverable(root))), ['element-1']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], root);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('makeElementsHoverable fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const hoverableElementDecoratorSource = extractFunctionSource(
    fileContent,
    'const studioEditorHoverableElementDecorator =',
    'const studioEditorTransformRuntime ='
  );
  const makeElementsHoverableSource = extractFunctionSource(
    fileContent,
    'function makeElementsHoverable(root) {',
    '\n\n    // Render visual Slide Organizer thumbnails'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${hoverableElementDecoratorSource}\n${makeElementsHoverableSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.makeElementsHoverable({}))), []);
});

test('editor composes editable-element eligibility through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorEditableElementEligibilityReader =/);
  assert.match(source, /typeof editableElementEligibilityReader === 'function'/);
  const isEligibleEditableElementSource = extractFunctionSource(
    source,
    'function isEligibleEditableElement(el) {',
    '\n\n    function assignEditorElementId'
  );
  assert.doesNotMatch(isEligibleEditableElementSource, /SlideNextStudioEditorDom\.isEligibleEditableElement/);
});

test('isEligibleEditableElement delegates the element and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const editableElementEligibilityReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorEditableElementEligibilityReader =',
    'const studioEditorTransformRuntime ='
  );
  const isEligibleEditableElementSource = extractFunctionSource(
    fileContent,
    'function isEligibleEditableElement(el) {',
    '\n\n    function assignEditorElementId'
  );
  const element = { id: 'element-1' };
  const options = { blockedIds: ['editor-overlay'] };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      isEligibleEditableElement(elementValue, optionsValue) {
        calls.push([elementValue, optionsValue]);
        return true;
      }
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${editableElementEligibilityReaderSource}\n${isEligibleEditableElementSource}`, context);

  assert.equal(context.isEligibleEditableElement(element), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], element);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('isEligibleEditableElement fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const editableElementEligibilityReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorEditableElementEligibilityReader =',
    'const studioEditorTransformRuntime ='
  );
  const isEligibleEditableElementSource = extractFunctionSource(
    fileContent,
    'function isEligibleEditableElement(el) {',
    '\n\n    function assignEditorElementId'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${editableElementEligibilityReaderSource}\n${isEligibleEditableElementSource}`, context);

  assert.equal(context.isEligibleEditableElement({}), false);
});

test('editor composes element-ID assignment through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const assignEditorElementIdSource = extractFunctionSource(
    source,
    'function assignEditorElementId(el, options = {}) {',
    '\n\n    function getElementByEditorId'
  );

  assert.match(source, /const studioEditorElementIdAssigner =/);
  assert.match(source, /typeof elementIdAssigner === 'function'/);
  assert.doesNotMatch(assignEditorElementIdSource, /SlideNextStudioEditorDom\.assignStudioElementId/);
});

test('assignEditorElementId delegates the element and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const elementIdAssignerSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementIdAssigner =',
    'const studioEditorTransformRuntime ='
  );
  const assignEditorElementIdSource = extractFunctionSource(
    fileContent,
    'function assignEditorElementId(el, options = {}) {',
    '\n\n    function getElementByEditorId'
  );
  const element = { id: 'element-node' };
  const options = { elementAttrName: 'data-editor-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      assignStudioElementId(elementValue, optionsValue) {
        calls.push([elementValue, optionsValue]);
        return 'element-1';
      }
    },
    getEditorDomOptions(optionsValue) {
      assert.deepEqual(JSON.parse(JSON.stringify(optionsValue)), options);
      return optionsValue;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${elementIdAssignerSource}\n${assignEditorElementIdSource}`, context);

  assert.equal(context.assignEditorElementId(element, options), 'element-1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], element);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('assignEditorElementId fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const elementIdAssignerSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementIdAssigner =',
    'const studioEditorTransformRuntime ='
  );
  const assignEditorElementIdSource = extractFunctionSource(
    fileContent,
    'function assignEditorElementId(el, options = {}) {',
    '\n\n    function getElementByEditorId'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${elementIdAssignerSource}\n${assignEditorElementIdSource}`, context);

  assert.equal(context.assignEditorElementId({}), '');
});

test('editor composes editor-element lookup through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getElementByEditorIdSource = extractFunctionSource(
    source,
    'function getElementByEditorId(editorId, doc = getIframeDoc()) {',
    '\n\n    function getSlideEditableElements'
  );

  assert.match(source, /const studioEditorElementByIdReader =/);
  assert.match(source, /typeof elementByIdReader === 'function'/);
  assert.doesNotMatch(getElementByEditorIdSource, /SlideNextStudioEditorDom\.getElementByEditorId/);
});

test('getElementByEditorId delegates the ID, document, and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const elementByIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementByIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getElementByEditorIdSource = extractFunctionSource(
    fileContent,
    'function getElementByEditorId(editorId, doc = getIframeDoc()) {',
    '\n\n    function getSlideEditableElements'
  );
  const doc = { id: 'iframe-doc' };
  const element = { id: 'element-node' };
  const options = { elementAttrName: 'data-editor-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getElementByEditorId(editorId, docValue, optionsValue) {
        calls.push([editorId, docValue, optionsValue]);
        return element;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${elementByIdReaderSource}\n${getElementByEditorIdSource}`, context);

  assert.equal(context.getElementByEditorId('element-1'), element);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'element-1');
  assert.equal(calls[0][1], doc);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][2])), options);
});

test('getElementByEditorId fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const elementByIdReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorElementByIdReader =',
    'const studioEditorTransformRuntime ='
  );
  const getElementByEditorIdSource = extractFunctionSource(
    fileContent,
    'function getElementByEditorId(editorId, doc = getIframeDoc()) {',
    '\n\n    function getSlideEditableElements'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getIframeDoc() {
      return {};
    },
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${elementByIdReaderSource}\n${getElementByEditorIdSource}`, context);

  assert.equal(context.getElementByEditorId('element-1'), null);
});

test('editor composes slide editable-element collection through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getSlideEditableElementsSource = extractFunctionSource(
    source,
    'function getSlideEditableElements(slide) {',
    '\n\n    function getNormalizedSlideLayerOrder'
  );

  assert.match(source, /const studioEditorSlideEditableElementsReader =/);
  assert.match(source, /typeof slideEditableElementsReader === 'function'/);
  assert.doesNotMatch(getSlideEditableElementsSource, /SlideNextStudioEditorDom\.getStudioSlideEditableElements/);
});

test('getSlideEditableElements delegates the slide and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideEditableElementsReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideEditableElementsReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlideEditableElementsSource = extractFunctionSource(
    fileContent,
    'function getSlideEditableElements(slide) {',
    '\n\n    function getNormalizedSlideLayerOrder'
  );
  const slide = { id: 'slide-1' };
  const options = { selectableSelector: '[data-editor-id]' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getStudioSlideEditableElements(slideValue, optionsValue) {
        calls.push([slideValue, optionsValue]);
        return ['element-1'];
      }
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideEditableElementsReaderSource}\n${getSlideEditableElementsSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getSlideEditableElements(slide))), ['element-1']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], slide);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('getSlideEditableElements fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideEditableElementsReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideEditableElementsReader =',
    'const studioEditorTransformRuntime ='
  );
  const getSlideEditableElementsSource = extractFunctionSource(
    fileContent,
    'function getSlideEditableElements(slide) {',
    '\n\n    function getNormalizedSlideLayerOrder'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideEditableElementsReaderSource}\n${getSlideEditableElementsSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getSlideEditableElements({}))), []);
});

test('editor composes normalized slide layer order through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getNormalizedSlideLayerOrderSource = extractFunctionSource(
    source,
    'function getNormalizedSlideLayerOrder(slide) {',
    '\n\n    function applySlideLayerOrder'
  );

  assert.match(source, /const studioEditorNormalizedSlideLayerOrderReader =/);
  assert.match(source, /typeof normalizedSlideLayerOrderReader === 'function'/);
  assert.doesNotMatch(getNormalizedSlideLayerOrderSource, /SlideNextStudioEditorDom\.getNormalizedStudioSlideLayerOrder/);
});

test('getNormalizedSlideLayerOrder delegates the slide and composed DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const normalizedSlideLayerOrderReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorNormalizedSlideLayerOrderReader =',
    'const studioEditorTransformRuntime ='
  );
  const getNormalizedSlideLayerOrderSource = extractFunctionSource(
    fileContent,
    'function getNormalizedSlideLayerOrder(slide) {',
    '\n\n    function applySlideLayerOrder'
  );
  const slide = { id: 'slide-1' };
  const editorOptions = { editorSlideIdAttr: 'data-slide-id' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      getNormalizedStudioSlideLayerOrder(slideValue, optionsValue) {
        calls.push([slideValue, optionsValue]);
        return ['element-1'];
      }
    },
    getEditorDomOptions() {
      return editorOptions;
    },
    getSlideEditableElements() {
      return ['element-1'];
    }
  };

  vm.createContext(context);
  vm.runInContext(`${normalizedSlideLayerOrderReaderSource}\n${getNormalizedSlideLayerOrderSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getNormalizedSlideLayerOrder(slide))), ['element-1']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], slide);
  assert.equal(calls[0][1].editorSlideIdAttr, editorOptions.editorSlideIdAttr);
  assert.equal(typeof calls[0][1].getSlideEditableElements, 'function');
});

test('getNormalizedSlideLayerOrder fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const normalizedSlideLayerOrderReaderSource = extractFunctionSource(
    fileContent,
    'const studioEditorNormalizedSlideLayerOrderReader =',
    'const studioEditorTransformRuntime ='
  );
  const getNormalizedSlideLayerOrderSource = extractFunctionSource(
    fileContent,
    'function getNormalizedSlideLayerOrder(slide) {',
    '\n\n    function applySlideLayerOrder'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    },
    getSlideEditableElements() {
      return [];
    }
  };

  vm.createContext(context);
  vm.runInContext(`${normalizedSlideLayerOrderReaderSource}\n${getNormalizedSlideLayerOrderSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.getNormalizedSlideLayerOrder({}))), []);
});

test('editor composes slide layer-order writes through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySlideLayerOrderSource = extractFunctionSource(
    source,
    'function applySlideLayerOrder(slide, orderedElements) {',
    '\n\n    function applyEditorLayerOrderMutationWithTransaction'
  );

  assert.match(source, /const studioEditorSlideLayerOrderWriter =/);
  assert.match(source, /typeof slideLayerOrderWriter === 'function'/);
  assert.doesNotMatch(applySlideLayerOrderSource, /SlideNextStudioEditorDom\.applyStudioSlideLayerOrder/);
});

test('applySlideLayerOrder delegates the slide and ordered elements to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideLayerOrderWriterSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideLayerOrderWriter =',
    'const studioEditorTransformRuntime ='
  );
  const applySlideLayerOrderSource = extractFunctionSource(
    fileContent,
    'function applySlideLayerOrder(slide, orderedElements) {',
    '\n\n    function applyEditorLayerOrderMutationWithTransaction'
  );
  const slide = { id: 'slide-1' };
  const orderedElements = [{ id: 'element-1' }];
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      applyStudioSlideLayerOrder(slideValue, orderedElementsValue) {
        calls.push([slideValue, orderedElementsValue]);
        return orderedElementsValue;
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(`${slideLayerOrderWriterSource}\n${applySlideLayerOrderSource}`, context);

  assert.equal(context.applySlideLayerOrder(slide, orderedElements), orderedElements);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], slide);
  assert.equal(calls[0][1], orderedElements);
});

test('applySlideLayerOrder fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const slideLayerOrderWriterSource = extractFunctionSource(
    fileContent,
    'const studioEditorSlideLayerOrderWriter =',
    'const studioEditorTransformRuntime ='
  );
  const applySlideLayerOrderSource = extractFunctionSource(
    fileContent,
    'function applySlideLayerOrder(slide, orderedElements) {',
    '\n\n    function applyEditorLayerOrderMutationWithTransaction'
  );
  const context = {
    SlideNextStudioEditorDom: null
  };

  vm.createContext(context);
  vm.runInContext(`${slideLayerOrderWriterSource}\n${applySlideLayerOrderSource}`, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.applySlideLayerOrder({}, []))), []);
});

test('editor composes editable-target resolution through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const resolveEditableTargetSource = extractFunctionSource(
    source,
    'function resolveEditableTarget(node) {',
    '\n\n    function resolveInlineTextEditTarget'
  );

  assert.match(source, /const studioEditorEditableTargetResolver =/);
  assert.match(source, /typeof editableTargetResolver === 'function'/);
  assert.doesNotMatch(resolveEditableTargetSource, /SlideNextStudioEditorDom\.resolveStudioEditableTarget/);
});

test('resolveEditableTarget delegates the node and DOM options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const editableTargetResolverSource = extractFunctionSource(
    fileContent,
    'const studioEditorEditableTargetResolver =',
    'const studioEditorTransformRuntime ='
  );
  const resolveEditableTargetSource = extractFunctionSource(
    fileContent,
    'function resolveEditableTarget(node) {',
    '\n\n    function resolveInlineTextEditTarget'
  );
  const node = { id: 'event-target' };
  const target = { id: 'editable-target' };
  const options = { selectableSelector: '[data-editor-id]' };
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      resolveStudioEditableTarget(nodeValue, optionsValue) {
        calls.push([nodeValue, optionsValue]);
        return target;
      }
    },
    getEditorDomOptions() {
      return options;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${editableTargetResolverSource}\n${resolveEditableTargetSource}`, context);

  assert.equal(context.resolveEditableTarget(node), target);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], node);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), options);
});

test('resolveEditableTarget fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const editableTargetResolverSource = extractFunctionSource(
    fileContent,
    'const studioEditorEditableTargetResolver =',
    'const studioEditorTransformRuntime ='
  );
  const resolveEditableTargetSource = extractFunctionSource(
    fileContent,
    'function resolveEditableTarget(node) {',
    '\n\n    function resolveInlineTextEditTarget'
  );
  const context = {
    SlideNextStudioEditorDom: null,
    getEditorDomOptions() {
      return {};
    }
  };

  vm.createContext(context);
  vm.runInContext(`${editableTargetResolverSource}\n${resolveEditableTargetSource}`, context);

  assert.equal(context.resolveEditableTarget({}), null);
});

test('editor composes inline text-target resolution through the shared inline-edit module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorInlineTextEditTargetResolver =/);
  assert.match(source, /typeof studioEditorInlineTextEditTargetResolver !== 'function'/);
});

test('resolveInlineTextEditTarget delegates through the shared inline-edit module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const inlineTextEditResolverSource = extractFunctionSource(
    fileContent,
    'const studioEditorInlineTextEditTargetResolver =',
    '\n\n    function resolveInlineTextEditTarget(node, slide) {'
  );
  const resolveInlineTextEditTargetSource = extractFunctionSource(
    fileContent,
    'function resolveInlineTextEditTarget(node, slide) {',
    '\n\n    const studioEditorSelectionClassRefresher ='
  );
  const node = { id: 'event-target' };
  const slide = { id: 'slide-1' };
  const selectedElements = [{ id: 'selected-element' }];
  const target = { id: 'text-target' };
  let delegatedArgs = null;
  const textTagNames = new Set(['p', 'span']);
  const context = {
    selectedElements,
    SlideNextStudioEditorInlineEdit: {
      resolveStudioInlineTextEditTarget(...args) {
        delegatedArgs = args;
        return target;
      }
    },
    EDITOR_INLINE_EDIT_TEXT_TAGS: textTagNames,
    getStudioSelectedElements() {
      return selectedElements;
    },
    getIframeDoc() {
      return { id: 'iframe-doc' };
    },
    getLiveSelectedElements(elements) {
      return elements;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${inlineTextEditResolverSource}\n${resolveInlineTextEditTargetSource}`, context);

  assert.equal(context.resolveInlineTextEditTarget(node, slide), target);
  assert.equal(delegatedArgs[0], node);
  assert.equal(delegatedArgs[1], slide);
  assert.equal(delegatedArgs[2].selectedElements, selectedElements);
  assert.equal(delegatedArgs[2].textTagNames, textTagNames);
});

test('resolveInlineTextEditTarget fails closed when the shared inline-edit module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const inlineTextEditResolverSource = extractFunctionSource(
    fileContent,
    'const studioEditorInlineTextEditTargetResolver =',
    '\n\n    function resolveInlineTextEditTarget(node, slide) {'
  );
  const resolveInlineTextEditTargetSource = extractFunctionSource(
    fileContent,
    'function resolveInlineTextEditTarget(node, slide) {',
    '\n\n    const studioEditorSelectionClassRefresher ='
  );
  const context = {
    selectedElements: [],
    SlideNextStudioEditorInlineEdit: null,
    EDITOR_INLINE_EDIT_TEXT_TAGS: new Set(),
    getStudioSelectedElements() {
      return [];
    },
    getIframeDoc() {
      return {};
    },
    getLiveSelectedElements(elements) {
      return elements;
    }
  };

  vm.createContext(context);
  vm.runInContext(`${inlineTextEditResolverSource}\n${resolveInlineTextEditTargetSource}`, context);

  assert.equal(context.resolveInlineTextEditTarget({}, {}), null);
});

test('editor composes blank-slide creation through the shared DOM module', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /const studioEditorBlankSlideFactory =/);
  assert.match(source, /typeof studioEditorBlankSlideFactory === 'function'/);
  assert.doesNotMatch(source, /createBlankSlide: \(doc\) => SlideNextStudioEditorDom\.createStudioBlankSlide/);
});

test('blank-slide factory delegates the document and creation options to the shared DOM module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const blankSlideFactorySource = extractFunctionSource(
    fileContent,
    'const studioEditorBlankSlideFactory =',
    'const studioEditorTransformRuntime ='
  );
  const calls = [];
  const context = {
    SlideNextStudioEditorDom: {
      createStudioBlankSlide(docValue, optionsValue) {
        calls.push([docValue, optionsValue]);
        return { id: 'slide-1' };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(blankSlideFactorySource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(vm.runInContext(
      'studioEditorBlankSlideFactory({id: "iframe-doc"}, {slideClassName: "slide"})',
      context
    ))),
    { id: 'slide-1' }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].id, 'iframe-doc');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])), { slideClassName: 'slide' });
});

test('blank-slide factory fails closed when the shared DOM module is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const blankSlideFactorySource = extractFunctionSource(
    fileContent,
    'const studioEditorBlankSlideFactory =',
    'const studioEditorTransformRuntime ='
  );
  const context = {
    SlideNextStudioEditorDom: null
  };

  vm.createContext(context);
  vm.runInContext(blankSlideFactorySource, context);

  assert.equal(vm.runInContext('studioEditorBlankSlideFactory', context), null);
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
        },
        isPrePositioned: true
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
