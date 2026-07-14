const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadFinalizeEditorDeckMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
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
