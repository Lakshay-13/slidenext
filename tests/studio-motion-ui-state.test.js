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
  vm.runInContext(nudgeSelectedElementsSource, context);

  assert.equal(context.nudgeSelectedElements(1, 0), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['getActiveSlide', doc],
    ['getNudgeSelectionState'],
    ['updateMotionActionState', doc]
  ]);
});
