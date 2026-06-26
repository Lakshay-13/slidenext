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
    arrangeLayerFrontBtn: { disabled: true },
    arrangeLayerBackBtn: { disabled: true },
    arrangeLayerForwardBtn: { disabled: true },
    arrangeLayerBackwardBtn: { disabled: true },
    elZIndex: { disabled: true }
  };
}

function getDisabledStates(controls) {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, control.disabled]));
}

test('updateLayerOrderActionState enables layer order controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateLayerOrderActionStateSource = extractFunctionSource(
    fileContent,
    'function updateLayerOrderActionState(doc = getIframeDoc()) {',
    '\n\n    function toggleSelectedElementsLockState() {'
  );

  const controls = createControls();
  const activeSlide = { id: 'slide-1' };
  const context = {
    selectedElements: [{ id: 'selected', isConnected: true }],
    SlideNextStudioEditorLayerOrder: {
      buildStudioLayerOrderActionState(elements, options = {}) {
        const canReorder = typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true;
        return {
          canBringToFront: canReorder,
          canSendToBack: canReorder,
          canBringForward: canReorder,
          canSendBackward: canReorder
        };
      }
    },
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan(elements, prop, value, options = {}) {
        return {
          canApply: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      }
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getNormalizedSlideLayerOrder(slide) {
      return slide === activeSlide ? [{ id: 'selected' }] : [];
    },
    getIframeDoc() {
      return null;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateLayerOrderActionStateSource, context);

  context.updateLayerOrderActionState(null);
  assert.deepEqual(getDisabledStates(controls), {
    arrangeLayerFrontBtn: true,
    arrangeLayerBackBtn: true,
    arrangeLayerForwardBtn: true,
    arrangeLayerBackwardBtn: true,
    elZIndex: true
  });

  context.updateLayerOrderActionState({
    activeSlide
  });
  assert.deepEqual(getDisabledStates(controls), {
    arrangeLayerFrontBtn: false,
    arrangeLayerBackBtn: false,
    arrangeLayerForwardBtn: false,
    arrangeLayerBackwardBtn: false,
    elZIndex: false
  });
});
