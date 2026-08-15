const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const overlayView = require('../shared/studio-editor-overlay.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('editor composes selection overlay synchronization through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /studioEditorSelectionOverlayShellRuntimeApi/);
  assert.match(source, /createStudioEditorSelectionOverlayShellRuntime\(/);
  assert.match(
    source,
    /getTransformSelectionState: \(doc\) => getTransformSelectionState\(getStudioSelectedElements\(doc\), doc\),/
  );
  assert.match(source, /return typeof studioEditorSelectionOverlaySynchronizer === 'function'/);
  assert.doesNotMatch(source, /syncSelectionOverlay\.synchronizer/);
});

function createOverlay() {
  const classes = new Set();
  const hiddenHandle = { style: {} };
  return {
    style: {},
    classList: {
      add(value) {
        classes.add(value);
      },
      remove(value) {
        classes.delete(value);
      },
      contains(value) {
        return classes.has(value);
      }
    },
    querySelectorAll(selector) {
      assert.equal(selector, '.editor-resize-handle');
      return [hiddenHandle];
    },
    hiddenHandle
  };
}

test('renderStudioMarqueeSelection positions the shared selection overlay and hides resize handles', () => {
  const overlay = createOverlay();
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorSelectionOverlay');
      return overlay;
    }
  };

  const result = overlayView.renderStudioMarqueeSelection({}, slide, {
    left: 80,
    top: 60,
    right: 20,
    bottom: 10
  });

  assert.equal(result, overlay);
  assert.equal(overlay.classList.contains('drag-preview'), true);
  assert.deepEqual(overlay.style, {
    display: 'block',
    pointerEvents: 'none',
    left: '20px',
    top: '10px',
    width: '60px',
    height: '50px'
  });
  assert.equal(overlay.hiddenHandle.style.display, 'none');
});

test('clearStudioMarqueeSelection hides the existing selection overlay', () => {
  const overlay = createOverlay();
  overlay.classList.add('drag-preview');
  overlay.style.display = 'block';
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorSelectionOverlay');
      return overlay;
    }
  };

  assert.equal(overlayView.clearStudioMarqueeSelection(slide), true);
  assert.equal(overlay.classList.contains('drag-preview'), false);
  assert.equal(overlay.style.display, 'none');
});

test('hideStudioSelectionOverlay ensures and hides the selection chrome for inline editing', () => {
  const overlay = createOverlay();
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorSelectionOverlay');
      return overlay;
    }
  };

  const result = overlayView.hideStudioSelectionOverlay({}, slide);

  assert.equal(result, overlay);
  assert.deepEqual(overlay.style, {
    display: 'none',
    pointerEvents: 'none'
  });
});

test('syncStudioSelectionOverlay applies bounds and transform handle state', () => {
  const overlay = createOverlay();
  const documentRef = { id: 'iframe-document' };
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorSelectionOverlay');
      return overlay;
    }
  };

  const result = overlayView.syncStudioSelectionOverlay(documentRef, slide, {
    selectedElements: ['element'],
    buildSelectionOverlayState() {
      return {
        hasVisibleSelection: true,
        visibleSelection: ['element']
      };
    },
    getSelectionBounds(elements) {
      assert.deepEqual(elements, ['element']);
      return { left: 4, top: 8, width: 12, height: 16 };
    },
    getTransformSelectionState(currentDocument) {
      assert.equal(currentDocument, documentRef);
      return { canTransform: false };
    }
  });

  assert.equal(result.didSync, true);
  assert.equal(result.canTransform, false);
  assert.deepEqual(overlay.style, {
    display: 'block',
    left: '4px',
    top: '8px',
    width: '12px',
    height: '16px',
    pointerEvents: 'none',
    opacity: '1'
  });
  assert.equal(overlay.hiddenHandle.style.display, 'none');
});

test('syncStudioSelectionOverlay hides the overlay and transient guides when selection is empty', () => {
  const overlay = createOverlay();
  const slide = {
    querySelector() {
      return overlay;
    }
  };
  const calls = [];

  const result = overlayView.syncStudioSelectionOverlay({}, slide, {
    buildSelectionOverlayState() {
      return { hasVisibleSelection: false, visibleSelection: [] };
    },
    hideGuides() {
      calls.push('hideGuides');
    },
    hideDragHud() {
      calls.push('hideDragHud');
    }
  });

  assert.equal(result.didSync, false);
  assert.equal(overlay.style.display, 'none');
  assert.deepEqual(calls, ['hideGuides', 'hideDragHud']);
});

test('syncStudioSelectionOverlayForActiveSlide resolves the current slide before rendering', () => {
  const overlay = createOverlay();
  const slide = {
    querySelector() {
      return overlay;
    }
  };
  const documentRef = { id: 'iframe-document' };
  let resolvedDocument = null;

  const result = overlayView.syncStudioSelectionOverlayForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    },
    buildSelectionOverlayState() {
      return { hasVisibleSelection: false, visibleSelection: [] };
    }
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result.didSync, false);
  assert.equal(result.overlay, overlay);
});

test('createStudioSelectionOverlaySynchronizer assembles editor overlay state', () => {
  const documentRef = { id: 'iframe-document' };
  const selectedElements = [{ id: 'element-1' }];
  const hiddenReader = () => false;
  const calls = [];
  const synchronizer = overlayView.createStudioSelectionOverlaySynchronizer({
    overlayApi: {
      syncStudioSelectionOverlayForActiveSlide(options) {
        calls.push(options);
        return true;
      }
    },
    overlayStateApi: {
      buildStudioSelectionOverlayState() {}
    },
    getCurrentDocument: () => documentRef,
    getActiveSlide: (doc) => {
      assert.equal(doc, documentRef);
      return { id: 'slide-1' };
    },
    getSelectedElements: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return selectedElements;
    },
    getOverlayOptions: ({ documentRef: currentDocument }) => {
      assert.equal(currentDocument, documentRef);
      return { selectionOverlayId: 'custom-overlay' };
    },
    getHiddenStateReader: (doc) => {
      assert.equal(doc, documentRef);
      return hiddenReader;
    },
    getSelectionBounds: () => ({ left: 1, top: 2, width: 3, height: 4 }),
    getTransformSelectionState: (currentDocument) => {
      assert.equal(currentDocument, documentRef);
      return { canTransform: true };
    },
    hideGuides: () => calls.push('hide-guides'),
    hideDragHud: () => calls.push('hide-drag-hud')
  });

  assert.equal(synchronizer(), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(calls[0].getActiveSlide(documentRef).id, 'slide-1');
  assert.deepEqual(calls[0].selectedElements, selectedElements);
  assert.equal(calls[0].buildSelectionOverlayState instanceof Function, true);
  assert.equal(calls[0].isHidden, hiddenReader);
  assert.equal(calls[0].getSelectionBounds instanceof Function, true);
  assert.equal(calls[0].getTransformSelectionState instanceof Function, true);
  assert.equal(calls[0].selectionOverlayId, 'custom-overlay');
});

test('createStudioSelectionOverlaySynchronizer fails closed without overlay state support', () => {
  const synchronizer = overlayView.createStudioSelectionOverlaySynchronizer({
    overlayApi: {},
    overlayStateApi: null
  });

  assert.equal(synchronizer(), false);
});

test('createStudioSelectionOverlaySynchronizer uses an explicit editor document override', () => {
  const fallbackDocument = { id: 'fallback-document' };
  const explicitDocument = { id: 'explicit-document' };
  const calls = [];
  const synchronizer = overlayView.createStudioSelectionOverlaySynchronizer({
    overlayApi: {
      syncStudioSelectionOverlayForActiveSlide(options) {
        calls.push(options.documentRef);
        return true;
      }
    },
    overlayStateApi: {
      buildStudioSelectionOverlayState() {}
    },
    getCurrentDocument: () => fallbackDocument,
    getActiveSlide: () => ({ id: 'slide-1' }),
    getSelectedElements: () => [],
    getOverlayOptions: () => ({}),
    getHiddenStateReader: () => () => false
  });

  assert.equal(synchronizer(explicitDocument), true);
  assert.deepEqual(calls, [explicitDocument]);
});

test('renderStudioGuidesForActiveSlide resolves the current slide before rendering guides', () => {
  const guideLine = { style: {} };
  const guidesLayer = {
    innerHTML: '',
    appendChild(child) {
      this.child = child;
    }
  };
  const slide = {
    querySelector() {
      return guidesLayer;
    }
  };
  const documentRef = {
    createElement() {
      return guideLine;
    }
  };
  let resolvedDocument = null;

  const result = overlayView.renderStudioGuidesForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    },
    guidesDef: [{ axis: 'x', position: 24 }]
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result, guidesLayer);
  assert.equal(guideLine.style.left, '24px');
});

test('renderStudioMarqueeSelectionForActiveSlide resolves the current slide before rendering the marquee', () => {
  const overlay = createOverlay();
  const slide = {
    querySelector() {
      return overlay;
    }
  };
  const documentRef = { id: 'iframe-document' };
  let resolvedDocument = null;

  const result = overlayView.renderStudioMarqueeSelectionForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    },
    rect: { left: 90, top: 80, right: 30, bottom: 20 }
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result, overlay);
  assert.equal(overlay.style.left, '30px');
  assert.equal(overlay.style.top, '20px');
});

test('updateStudioDragHudForActiveSlide resolves the current slide before rendering drag feedback', () => {
  const hud = {
    textContent: '',
    classList: {
      add(value) {
        this.added = value;
      }
    }
  };
  const slide = {
    querySelector() {
      return hud;
    }
  };
  const documentRef = { id: 'iframe-document' };
  let resolvedDocument = null;

  const result = overlayView.updateStudioDragHudForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    },
    bounds: { left: 12.4, top: 18.8, width: 120.2, height: 64.9 }
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result, hud);
  assert.equal(hud.textContent, 'X 12  Y 19  W 120  H 65');
  assert.equal(hud.classList.added, 'visible');
});

test('clearStudioMarqueeSelectionForActiveSlide resolves the current slide before clearing the preview', () => {
  const overlay = createOverlay();
  overlay.classList.add('drag-preview');
  overlay.style.display = 'block';
  const slide = {
    querySelector() {
      return overlay;
    }
  };
  const documentRef = { id: 'iframe-document' };
  let resolvedDocument = null;

  const result = overlayView.clearStudioMarqueeSelectionForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    }
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result, true);
  assert.equal(overlay.classList.contains('drag-preview'), false);
  assert.equal(overlay.style.display, 'none');
});

test('clearStudioGuidesForActiveSlide resolves the current slide before clearing guide lines', () => {
  const guidesLayer = { innerHTML: '<div class="guide"></div>' };
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorGuidesLayer');
      return guidesLayer;
    }
  };
  const documentRef = { id: 'iframe-document' };
  let resolvedDocument = null;

  const result = overlayView.clearStudioGuidesForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    }
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result, true);
  assert.equal(guidesLayer.innerHTML, '');
});

test('hideStudioDragHudForActiveSlide resolves the current slide before hiding drag feedback', () => {
  const classes = new Set(['visible']);
  const hud = {
    classList: {
      remove(value) {
        classes.delete(value);
      }
    }
  };
  const slide = {
    querySelector(selector) {
      assert.equal(selector, '#editorDragHud');
      return hud;
    }
  };
  const documentRef = { id: 'iframe-document' };
  let resolvedDocument = null;

  const result = overlayView.hideStudioDragHudForActiveSlide({
    documentRef,
    getActiveSlide(doc) {
      resolvedDocument = doc;
      return slide;
    }
  });

  assert.equal(resolvedDocument, documentRef);
  assert.equal(result, true);
  assert.equal(classes.has('visible'), false);
});
