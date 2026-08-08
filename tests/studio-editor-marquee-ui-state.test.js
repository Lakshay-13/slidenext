const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const editorEvents = require('../shared/studio-editor-events.js');
const canonicalTransform = require('../shared/studio-editor-canonical-transform.js');
const transformState = require('../shared/studio-editor-transform.js');
const interactionOptions = require('../shared/studio-editor-interaction-options.js');
const transformController = require('../shared/studio-editor-transform-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
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
      interactionOptionsApi: context.SlideNextStudioEditorInteractionOptions,
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
      getSelectedElements: context.getLiveSelectedElements,
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

test('setupIframeDragging wires marquee handlers beside shared transforms and commits additive selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setupIframeDraggingSource = extractFunctionSource(
    fileContent,
    'function setupIframeDragging(doc) {',
    '\n\n    // Insert New elements'
  );

  const calls = [];
  const bodyListeners = new Map();
  const windowListeners = new Map();
  let transformOptions = null;
  let marqueeOptions = null;
  const transformHandlers = {
    handlePointerDown() {},
    handlePointerMove() {},
    handlePointerUp() {},
    handlePointerCancel() {},
    handleWindowBlur() {}
  };
  const marqueeHandlers = {
    handlePointerDown() {},
    handlePointerMove() {},
    handlePointerUp() {},
    handlePointerCancel() {},
    handleWindowBlur() {}
  };
  const slide = {
    querySelector() {
      return null;
    }
  };
  const doc = {
    addEventListener(type) {
      calls.push(['doc.addEventListener', type]);
    },
    body: {
      addEventListener(type, handler) {
        const handlers = bodyListeners.get(type) || [];
        handlers.push(handler);
        bodyListeners.set(type, handlers);
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
      getStudioClosestPositionedAncestor() {}
    },
    SlideNextStudioEditorTransform: {
      createStudioTransformPointerHandlers(options) {
        transformOptions = options;
        return transformHandlers;
      }
    },
    SlideNextStudioEditorEvents: {
      attachStudioPointerHandlers: editorEvents.attachStudioPointerHandlers,
      attachStudioMarqueePointerHandlers: editorEvents.attachStudioMarqueePointerHandlers,
      createStudioMarqueePointerHandlers(options) {
        marqueeOptions = options;
        return marqueeHandlers;
      }
    },
    SlideNextStudioEditorSelectionBounds: {
      getStudioMarqueeSelection() {
        return [];
      }
    },
    getActiveSlide() {
      return slide;
    },
    getNormalizedSlideLayerOrder() {
      return ['marquee-element'];
    },
    getPointerOnSlide() {},
    getRectOnSlide() {},
    getSelectionBounds() {},
    getSlideMetrics() {},
    getTransformSelectionState() {},
    getLiveSelectedElements() {
      return ['existing-element'];
    },
    hideDragHud() {},
    hideGuides() {},
    isDraggingElement: false,
    isElementHidden() {
      return false;
    },
    renderGuides() {},
    resolveEditableTarget() {},
    saveHistoryState() {},
    selectElement() {},
    ensureSelectionOverlay() {
      return {
        classList: { add() {}, remove() {} },
        style: {},
        querySelectorAll() { return []; }
      };
    },
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    triggerAutoSave() {},
    triggerAutoVersion() {},
    updateDragHud() {},
    commitEditorSelectionState(nextState) {
      calls.push(['commitEditorSelectionState', nextState]);
    },
    clearMarqueeSelection() {},
    renderMarqueeSelection() {}
  };

  vm.createContext(context);
  loadTransformSessionFinalizer(fileContent, context);
  vm.runInContext(setupIframeDraggingSource, context);
  installTransformController(context);
  context.setupIframeDragging(doc);

  assert.equal(bodyListeners.get('pointerdown')[0], transformHandlers.handlePointerDown);
  assert.equal(bodyListeners.get('pointerdown')[1], marqueeHandlers.handlePointerDown);
  assert.equal(windowListeners.get('blur'), marqueeHandlers.handleWindowBlur);
  assert.equal(typeof marqueeOptions.getMarqueeSelection, 'function');
  assert.deepEqual(marqueeOptions.getMarqueeSelection(['element'], {
    left: 0,
    top: 0,
    right: 10,
    bottom: 10
  }, {
    slideMetrics: { scaleX: 1 }
  }), []);

  marqueeOptions.onSessionStart({});
  marqueeOptions.onSessionFrame({ left: 1, top: 2, right: 3, bottom: 4 });
  marqueeOptions.onSessionFinalize({
    cancelled: false,
    didSelect: true,
    additive: true,
    selection: ['new-element']
  }, {
    previousSelection: ['existing-element']
  });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ['doc.addEventListener', 'dragstart'],
    ['commitEditorSelectionState', {
      selectedElements: ['existing-element', 'new-element']
    }]
  ]);
});
