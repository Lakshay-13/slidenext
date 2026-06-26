const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const selection = require('../shared/studio-editor-selection.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('applyEditorSelectionState keeps only connected selections on the active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const getEditorSelectionOptionsSource = extractFunctionSource(
    fileContent,
    'function getEditorSelectionOptions(options = {}) {',
    '\n\n    function getEditorHistoryOptions(options = {}) {'
  );
  const applyEditorSelectionStateSource = extractFunctionSource(
    fileContent,
    'function applyEditorSelectionState(nextState = {}) {',
    '\n\n    function commitEditorSelectionState(nextSelectionState, options = {}) {'
  );

  const activeElement = { id: 'active', isConnected: true, onActiveSlide: true };
  const offSlideElement = { id: 'off-slide', isConnected: true, onActiveSlide: false };
  const readyDoc = {
    activeSlide: {
      contains(element) {
        return !!(element && element.onActiveSlide);
      }
    }
  };

  const context = {
    SlideNextStudioEditorSelection: selection,
    selectedElements: [],
    selectedElement: null,
    isEligibleEditableElement(element) {
      return !!element;
    },
    assignEditorElementId(element) {
      return element && element.id ? element.id : '';
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getElementByEditorId() {
      return null;
    },
    getIframeDoc() {
      return readyDoc;
    }
  };

  vm.createContext(context);
  vm.runInContext(getEditorSelectionOptionsSource, context);
  vm.runInContext(applyEditorSelectionStateSource, context);

  context.applyEditorSelectionState({
    selectedElements: [offSlideElement, activeElement],
    selectedElement: offSlideElement
  });
  assert.deepEqual(context.selectedElements, [activeElement]);
  assert.equal(context.selectedElement, activeElement);

  context.getIframeDoc = () => null;
  context.applyEditorSelectionState({
    selectedElements: [activeElement],
    selectedElement: activeElement
  });
  assert.deepEqual(context.selectedElements, []);
  assert.equal(context.selectedElement, null);
});
