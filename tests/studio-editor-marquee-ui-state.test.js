const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const editorEvents = require('../shared/studio-editor-events.js');
const transformState = require('../shared/studio-editor-transform.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadTransformSessionFinalizer(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function createEditorTransformSessionFinalizer(transformApi, options = {}) {',
    '\n\n    // Element dragging + resize on an open canvas'
  );
  context.SlideNextStudioEditorTransform = {
    createStudioTransformSessionFinalizer: transformState.createStudioTransformSessionFinalizer,
    ...(context.SlideNextStudioEditorTransform || {})
  };
  vm.runInContext(helperSource, context);
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
