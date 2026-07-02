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

function loadFinalizeLayerOrderMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeLayerOrderMutation(versionLabel = \'Auto: Rearranged Layers\') {',
    '\n\n    function syncLayerOrderZIndexInput(target) {'
  );
  vm.runInContext(helperSource, context);
}

function loadSyncLayerOrderZIndexInput(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function syncLayerOrderZIndexInput(target) {',
    '\n\n    function refreshLayerOrderUi(options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

function loadRefreshLayerOrderUi(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function refreshLayerOrderUi(options = {}) {',
    '\n\n    // Rearrange Selected Element Layers'
  );
  vm.runInContext(helperSource, context);
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

test('selectLayerElementByRef refreshes the layer list when the row target is stale', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selectLayerElementByRefSource = extractFunctionSource(
    fileContent,
    'function selectLayerElementByRef(event) {',
    '\n\n    function toggleLayerVisibilityByRef(event) {'
  );

  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return null;
    },
    selectElement(target, options) {
      calls.push(['selectElement', target, options]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  vm.runInContext(selectLayerElementByRefSource, context);

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
    shiftKey: false,
    stopPropagation() {
      calls.push(['stopPropagation']);
    }
  };

  context.selectLayerElementByRef(event);

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'updateLayersList'
  ]);
  assert.equal(calls[3][1], row);
});

test('toggleLayerVisibilityByRef refreshes the layer list when the row target is stale', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const toggleLayerVisibilityByRefSource = extractFunctionSource(
    fileContent,
    'function toggleLayerVisibilityByRef(event) {',
    '\n    \n    function changeLayerZIndexByRef(event, action) {'
  );

  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return null;
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
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
    'updateLayersList'
  ]);
  assert.equal(calls[3][1], row);
});

test('changeLayerZIndexByRef refreshes layer controls when the row target is locked', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const changeLayerZIndexByRefSource = extractFunctionSource(
    fileContent,
    'function changeLayerZIndexByRef(event, action) {',
    '\n\n    // Presentation Live Preview from workspace'
  );

  const target = { id: 'target', style: { zIndex: '4' } };
  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return true;
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(changeLayerZIndexByRefSource, context);

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

  context.changeLayerZIndexByRef(event, 'forward');

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'isElementLocked',
    'updateLayersList',
    'updateLayerOrderActionState'
  ]);
  assert.equal(calls[3][1], row);
  assert.equal(calls[4][1], target);
});

test('changeLayerZIndexByRef refreshes layer controls when the row target is stale', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const changeLayerZIndexByRefSource = extractFunctionSource(
    fileContent,
    'function changeLayerZIndexByRef(event, action) {',
    '\n\n    // Presentation Live Preview from workspace'
  );

  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return null;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(changeLayerZIndexByRefSource, context);

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

  context.changeLayerZIndexByRef(event, 'forward');

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'updateLayersList',
    'updateLayerOrderActionState'
  ]);
  assert.equal(calls[3][1], row);
});

test('changeLayerZIndexByRef refreshes layer controls when the row reorder becomes a no-op', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const changeLayerZIndexByRefSource = extractFunctionSource(
    fileContent,
    'function changeLayerZIndexByRef(event, action) {',
    '\n\n    // Presentation Live Preview from workspace'
  );

  const target = { id: 'target', style: { zIndex: '4' } };
  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    },
    reorderSlideLayers(action, targets) {
      calls.push(['reorderSlideLayers', action, targets]);
      return false;
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(changeLayerZIndexByRefSource, context);

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

  context.changeLayerZIndexByRef(event, 'forward');

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'isElementLocked',
    'reorderSlideLayers',
    'updateLayersList',
    'updateLayerOrderActionState'
  ]);
  assert.equal(calls[3][1], row);
  assert.equal(calls[4][1], target);
  assert.equal(calls[5][1], 'forward');
  assert.equal(calls[5][2].length, 1);
  assert.equal(calls[5][2][0], target);
});

test('changeLayerZIndexByRef updates layer controls after a successful row reorder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const changeLayerZIndexByRefSource = extractFunctionSource(
    fileContent,
    'function changeLayerZIndexByRef(event, action) {',
    '\n\n    // Presentation Live Preview from workspace'
  );

  const target = { id: 'target', style: { zIndex: '9' } };
  const row = { id: 'row-1' };
  const zIndexInput = { value: '' };
  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: {
      isStudioLiveSelectedElement(selection, element) {
        calls.push(['isStudioLiveSelectedElement', selection, element]);
        return true;
      }
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return id === 'elZIndex' ? zIndexInput : null;
      }
    },
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    },
    reorderSlideLayers(action, targets) {
      calls.push(['reorderSlideLayers', action, targets]);
      return true;
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectedElements: [target],
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(changeLayerZIndexByRefSource, context);

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

  context.changeLayerZIndexByRef(event, 'forward');

  assert.equal(zIndexInput.value, '9');
  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'isElementLocked',
    'reorderSlideLayers',
    'isStudioLiveSelectedElement',
    'getElementById',
    'saveHistoryState',
    'triggerAutoSave',
    'updateLayersList',
    'updateLayerOrderActionState',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[3][1], row);
  assert.equal(calls[4][1], target);
  assert.equal(calls[5][1], 'forward');
  assert.equal(calls[5][2].length, 1);
  assert.equal(calls[5][2][0], target);
  assert.equal(calls[6][1].length, 1);
  assert.equal(calls[6][1][0], target);
  assert.equal(calls[6][2], target);
  assert.equal(calls[7][1], 'elZIndex');
  assert.equal(calls[12][1], 'Auto: Rearranged Layers');
});

test('changeLayerZIndexByRef tolerates a missing z-index input on successful row reorder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const changeLayerZIndexByRefSource = extractFunctionSource(
    fileContent,
    'function changeLayerZIndexByRef(event, action) {',
    '\n\n    // Presentation Live Preview from workspace'
  );

  const target = { id: 'target', style: { zIndex: '11' } };
  const row = { id: 'row-1' };
  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: {
      isStudioLiveSelectedElement(selection, element) {
        calls.push(['isStudioLiveSelectedElement', selection, element]);
        return true;
      }
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    },
    reorderSlideLayers(action, targets) {
      calls.push(['reorderSlideLayers', action, targets]);
      return true;
    },
    resolveLayerRowElement(currentRow) {
      calls.push(['resolveLayerRowElement', currentRow]);
      return target;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectedElements: [target],
    triggerAutoSave() {
      calls.push(['triggerAutoSave']);
    },
    triggerAutoVersion(label) {
      calls.push(['triggerAutoVersion', label]);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadFinalizeLayerOrderMutation(fileContent, context);
  loadSyncLayerOrderZIndexInput(fileContent, context);
  loadRefreshLayerOrderUi(fileContent, context);
  vm.runInContext(changeLayerZIndexByRefSource, context);

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

  context.changeLayerZIndexByRef(event, 'forward');

  assert.deepEqual(calls.map(([name]) => name), [
    'preventDefault',
    'stopPropagation',
    'closest',
    'resolveLayerRowElement',
    'isElementLocked',
    'reorderSlideLayers',
    'isStudioLiveSelectedElement',
    'getElementById',
    'saveHistoryState',
    'triggerAutoSave',
    'updateLayersList',
    'updateLayerOrderActionState',
    'triggerAutoVersion'
  ]);
  assert.equal(calls[3][1], row);
  assert.equal(calls[4][1], target);
  assert.equal(calls[5][1], 'forward');
  assert.equal(calls[5][2].length, 1);
  assert.equal(calls[5][2][0], target);
  assert.equal(calls[6][1].length, 1);
  assert.equal(calls[6][1][0], target);
  assert.equal(calls[6][2], target);
  assert.equal(calls[7][1], 'elZIndex');
  assert.equal(calls[12][1], 'Auto: Rearranged Layers');
});
