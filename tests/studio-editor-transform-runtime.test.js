const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const transformRuntime = require('../shared/studio-editor-transform-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('transform runtime composes the full controller dependency bundle', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorTransformController(options) {
      calls.push(options);
      return { name: 'transform' };
    }
  };
  const options = {
    controllerApi,
    transformApi: null,
    canonicalTransformApi: {},
    canonicalDeckApi: {},
    transactionApi: {},
    domApi: {},
    interactionOptionsApi: {},
    interactionsApi: {},
    eventsApi: {},
    selectionBoundsApi: {},
    getActiveSlide: () => null,
    getTransformSelectionState: () => null,
    selectElement: () => {},
    resolveEditableTarget: () => null,
    getSlideMetrics: () => null,
    getPointerOnSlide: () => null,
    getSelectionBounds: () => null,
    getSlideEditableElements: () => [],
    getCanonicalVisibilityReader: () => null,
    isHidden: () => false,
    getRectOnSlide: () => null,
    ensureOverlay: () => {},
    getClosestPositionedAncestor: () => null,
    getSelectedElements: () => [],
    getMarqueeElements: () => [],
    commitSelectionState: () => {},
    updateDragHud: () => {},
    renderGuides: () => {},
    syncSelectionOverlay: () => {},
    hideGuides: () => {},
    hideDragHud: () => {},
    syncInspectorForSelection: () => {},
    renderMarqueeSelection: () => {},
    clearMarqueeSelection: () => {},
    saveHistoryState: () => {},
    triggerAutoSave: () => {},
    triggerAutoVersion: () => {},
    buildCanonicalDeck: () => null,
    buildCanonicalDeckBaseline: () => null,
    getCanonicalDeckBaseline: () => null,
    assignElementId: () => '',
    getGridSizePx: () => null,
    getIsDraggingElement: () => false,
    setIsDraggingElement: () => {},
    setSuppressNextFrameClick: () => {},
    dragStartThresholdPx: 4,
    minSizePx: 24,
    dragOverflowMarginPx: 280,
    snapDistancePx: 12
  };

  assert.deepEqual(
    transformRuntime.createStudioEditorTransformRuntime(options),
    { transformController: { name: 'transform' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].transformApi, null);
  assert.equal(calls[0].canonicalTransformApi, options.canonicalTransformApi);
  assert.equal(calls[0].getCanonicalVisibilityReader, options.getCanonicalVisibilityReader);
  assert.equal(calls[0].getClosestPositionedAncestor, options.getClosestPositionedAncestor);
  assert.equal(calls[0].buildCanonicalDeckBaseline, options.buildCanonicalDeckBaseline);
  assert.equal(calls[0].getCanonicalDeckBaseline, options.getCanonicalDeckBaseline);
  assert.equal(calls[0].snapDistancePx, options.snapDistancePx);
});

test('index wires transform behavior through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-transform-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorTransformRuntime\.createStudioEditorTransformRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorTransformController\.createStudioEditorTransformController\(/
  );
});
