const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

test('updateMotionActionState enables nudge controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateMotionActionStateSource = extractFunctionSource(
    fileContent,
    'function updateMotionActionState(doc = getIframeDoc()) {',
    '\n\n    function updateStyleActionState(doc = getIframeDoc()) {'
  );

  const controls = createControls();
  const context = {
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getNudgeSelectionState() {
      return { canNudge: true };
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
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
    activeSlide: {}
  });
  assert.deepEqual(getControlStates(controls), {
    nudgeSelectionUpBtn: false,
    nudgeSelectionLeftBtn: false,
    nudgeSelectionRightBtn: false,
    nudgeSelectionDownBtn: false
  });
});

test('nudgeSelectedElements returns false and refreshes motion controls when nudging is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas (no snapping)'
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

test('nudgeSelectedElements persists the moved selection through the shared mutation helper without refreshing thumbnails', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const nudgeSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function nudgeSelectedElements(dx, dy) {',
    '\n\n    // Element dragging + resize on an open canvas (no snapping)'
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
    updateLayersList() {
      calls.push(['updateLayersList']);
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
    'updateLayersList',
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
  assert.deepEqual(calls[8], ['saveHistoryState', true]);
  assert.deepEqual(calls[10], ['triggerAutoVersion', 'Auto: Nudged Element']);
});
