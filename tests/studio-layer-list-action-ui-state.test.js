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

test('toggleLayerVisibilityByRef restores preserved selection when the visibility toggle fails', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleLayerVisibilityByRefSource = extractFunctionSource(
    fileContent,
    'function toggleLayerVisibilityByRef(event) {',
    '\n    \n    function changeLayerZIndexByRef(event, action) {'
  );

  const target = { id: 'target' };
  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    applyEditorSelectionState(nextSelectionState) {
      calls.push(['applyEditorSelectionState', nextSelectionState]);
    },
    getCommittedSelectedEditorElementIds() {
      calls.push(['getCommittedSelectedEditorElementIds']);
      return ['el-1', 'el-2'];
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    restoreCommittedSelectionByIdsOnActiveSlide(ids) {
      calls.push(['restoreCommittedSelectionByIdsOnActiveSlide', ids]);
    },
    toggleSelectedElementsVisibility() {
      calls.push(['toggleSelectedElementsVisibility']);
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(toggleLayerVisibilityByRefSource, context);

  const event = {
    currentTarget: {
      closest(selector) {
        calls.push(['closest', selector]);
        return row;
      }
    },
    preventDefault() {
      calls.push(['preventDefault']);
    },
    stopPropagation() {
      calls.push(['stopPropagation']);
    }
  };

  context.toggleLayerVisibilityByRef(event);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'getCommittedSelectedEditorElementIds',
    'applyEditorSelectionState',
    'refreshSelectionClasses',
    'toggleSelectedElementsVisibility',
    'restoreCommittedSelectionByIdsOnActiveSlide'
  ]);
  assert.equal(calls[3][1], row);
  assert.equal(calls[5][1].selectedElement, target);
  assert.equal(calls[5][1].selectedElements.length, 1);
  assert.equal(calls[5][1].selectedElements[0], target);
  assert.deepEqual(calls[8][1], ['el-1', 'el-2']);
});

test('toggleLayerVisibilityByRef deselects the temporary target when the visibility toggle fails without preserved selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleLayerVisibilityByRefSource = extractFunctionSource(
    fileContent,
    'function toggleLayerVisibilityByRef(event) {',
    '\n    \n    function changeLayerZIndexByRef(event, action) {'
  );

  const target = { id: 'target' };
  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    applyEditorSelectionState(nextSelectionState) {
      calls.push(['applyEditorSelectionState', nextSelectionState]);
    },
    deselectElement() {
      calls.push(['deselectElement']);
    },
    getCommittedSelectedEditorElementIds() {
      calls.push(['getCommittedSelectedEditorElementIds']);
      return [];
    },
    refreshSelectionClasses() {
      calls.push(['refreshSelectionClasses']);
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    restoreCommittedSelectionByIdsOnActiveSlide(ids) {
      calls.push(['restoreCommittedSelectionByIdsOnActiveSlide', ids]);
    },
    toggleSelectedElementsVisibility() {
      calls.push(['toggleSelectedElementsVisibility']);
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(toggleLayerVisibilityByRefSource, context);

  const event = {
    currentTarget: {
      closest(selector) {
        calls.push(['closest', selector]);
        return row;
      }
    },
    preventDefault() {
      calls.push(['preventDefault']);
    },
    stopPropagation() {
      calls.push(['stopPropagation']);
    }
  };

  context.toggleLayerVisibilityByRef(event);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'getCommittedSelectedEditorElementIds',
    'applyEditorSelectionState',
    'refreshSelectionClasses',
    'toggleSelectedElementsVisibility',
    'deselectElement'
  ]);
  assert.equal(calls[3][1], row);
  assert.equal(calls[5][1].selectedElement, target);
  assert.equal(calls[5][1].selectedElements.length, 1);
  assert.equal(calls[5][1].selectedElements[0], target);
});
