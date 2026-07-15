const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const studioTransaction = require('../shared/studio-editor-transaction.js');
const removalState = require('../shared/studio-editor-removal.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadBuildRemovalSelectionActionState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function buildRemovalSelectionActionState(doc = null) {',
    '\n\n    function updateRemovalActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadFinalizeRemovalActionResult(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeRemovalActionResult(result, doc = getIframeDoc()) {',
    '\n\n    function updateVisibilityActionState(doc = getIframeDoc()) {'
  );
  vm.runInContext(helperSource, context);
}

function loadFinalizeEditorDeckMutation(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function finalizeEditorDeckMutation(versionLabel, options = {}) {',
    '\n\n    // Apply styles immediately to active selected elements'
  );
  vm.runInContext(helperSource, context);
}

test('buildRemovalSelectionActionState reuses the current selection and live slide guard', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const selection = [{ id: 'selected' }];
  const doc = { activeSlide: { id: 'slide-1' } };
  const calls = [];
  const context = {
    selectedElements: selection,
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState(elements, options = {}) {
        calls.push(['buildStudioRemovalActionState', elements]);
        return {
          canRemove: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true,
          selection: elements
        };
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
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);

  assert.deepEqual(context.buildRemovalSelectionActionState(), {
    canRemove: true,
    selection
  });
  assert.deepEqual(calls, [
    ['buildStudioRemovalActionState', selection],
    ['getIframeDoc'],
    ['getActiveSlide', doc]
  ]);
});

test('updateRemovalActionState enables the delete control only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function finalizeRemovalActionResult(result, doc = getIframeDoc()) {'
  );

  const removeSelectionBtn = { disabled: true };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState(elements, options = {}) {
        return {
          canRemove: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      },
      renderStudioRemovalToolbarState(options) {
        return removalState.renderStudioRemovalToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  vm.runInContext(updateRemovalActionStateSource, context);

  context.updateRemovalActionState(null);
  assert.equal(removeSelectionBtn.disabled, true);

  context.updateRemovalActionState({
    getElementById() {
      return null;
    }
  });
  assert.equal(removeSelectionBtn.disabled, true);

  context.updateRemovalActionState({
    activeSlide: {}
  });
  assert.equal(removeSelectionBtn.disabled, false);
});

test('updateRemovalActionState reuses the shared removal toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateRemovalActionStateSource = extractFunctionSource(
    fileContent,
    'function updateRemovalActionState(doc = getIframeDoc()) {',
    '\n\n    function finalizeRemovalActionResult(result, doc = getIframeDoc()) {'
  );

  const calls = [];
  const removeSelectionBtn = { disabled: true };
  const context = {
    selectedElements: [{ id: 'selected' }],
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        throw new Error('buildStudioRemovalActionState should not be used when shared toolbar helper exists');
      },
      buildStudioRemovalToolbarState(elements, options = {}) {
        calls.push({
          elements,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canMutateDeck: options.canMutateDeck()
        });
        return {
          buttonStates: {
            removeSelectionBtn: true
          }
        };
      },
      renderStudioRemovalToolbarState(options) {
        return removalState.renderStudioRemovalToolbarState(options);
      }
    },
    document: {
      getElementById(id) {
        return id === 'removeSelectionBtn' ? removeSelectionBtn : null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return null;
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  vm.runInContext(updateRemovalActionStateSource, context);

  context.updateRemovalActionState({
    activeSlide: {}
  });

  assert.equal(removeSelectionBtn.disabled, false);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    elements: [{ id: 'selected' }],
    hasCanMutateDeck: true,
    canMutateDeck: true
  }]);
});

test('finalizeRemovalActionResult refreshes removal controls and preserves the action result', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    updateRemovalActionState(currentDoc) {
      calls.push(['updateRemovalActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadFinalizeRemovalActionResult(fileContent, context);

  assert.equal(context.finalizeRemovalActionResult(false, doc), false);
  assert.equal(context.finalizeRemovalActionResult(true), true);
  assert.deepEqual(calls, [
    ['updateRemovalActionState', doc],
    ['getIframeDoc'],
    ['updateRemovalActionState', doc]
  ]);
});

test('removeSelectedElement returns false and skips persistence when planned targets disconnect before removal', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const disconnectedTarget = {
    isConnected: false,
    remove() {
      throw new Error('remove should not run for disconnected targets');
    }
  };
  const calls = [];
  const context = {
    selectedElements: [disconnectedTarget],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: true,
          selection: [disconnectedTarget]
        };
      }
    },
    deselectElement() {
      calls.push(['deselectElement']);
      context.updateLayersList();
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
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
    updateRemovalActionState(doc) {
      calls.push(['updateRemovalActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadFinalizeRemovalActionResult(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['updateRemovalActionState', { label: 'iframe-doc' }]
  ]);
});

test('removeSelectedElement returns false and refreshes removal controls when deletion is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    selectedElements: [],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: false,
          selection: []
        };
      }
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    updateRemovalActionState(currentDoc) {
      calls.push(['updateRemovalActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadFinalizeRemovalActionResult(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['updateRemovalActionState', doc]
  ]);
});

test('removeSelectedElement returns true after removing live targets and persisting the change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );

  const liveTarget = {
    isConnected: true,
    removeCalls: 0,
    remove() {
      this.removeCalls += 1;
      this.isConnected = false;
    }
  };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        calls.push(['buildStudioRemovalActionState']);
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      }
    },
    deselectElement() {
      calls.push(['deselectElement']);
      context.updateLayersList();
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
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
    updateRemovalActionState(doc) {
      calls.push(['updateRemovalActionState', doc]);
    },
    updateLayersList() {
      calls.push(['updateLayersList']);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  loadFinalizeRemovalActionResult(fileContent, context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(liveTarget.removeCalls, 1);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioRemovalActionState'],
    ['deselectElement'],
    ['updateLayersList'],
    ['generateThumbnails'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Deleted Element']
  ]);
});

test('removeSelectedElement captures a scoped parent markup transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );
  const parent = {
    dataset: { editorId: 'slide-1' },
    innerHTML: '<div data-editor-id="node-1">A</div>'
  };
  const liveTarget = {
    isConnected: true,
    parentElement: parent,
    remove() {
      this.isConnected = false;
      parent.innerHTML = '';
    }
  };
  let finalized = null;
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorTransaction: studioTransaction,
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      }
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
    },
    deselectElement() {},
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return { label: 'iframe-doc' };
    },
    isElementLocked() {
      return false;
    },
    finalizeEditorDeckMutation(versionLabel, options) {
      finalized = { versionLabel, options };
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(parent.innerHTML, '');
  assert.deepEqual(JSON.parse(JSON.stringify(finalized)), {
    versionLabel: 'Auto: Deleted Element',
    options: {
      transaction: {
        kind: 'slidenext.editor.transaction',
        version: 1,
        operations: [{
          type: 'markup',
          elementId: 'slide-1',
          before: '<div data-editor-id="node-1">A</div>',
          after: ''
        }]
      }
    }
  });
});

test('removeSelectedElement delegates removal and markup capture to the shared removal module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const removeSelectedElementSource = extractFunctionSource(
    fileContent,
    'function removeSelectedElement() {',
    '\n\n    function updateClipboardActionState(doc = getIframeDoc()) {'
  );
  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorRemoval: {
      buildStudioRemovalActionState() {
        return {
          canRemove: true,
          selection: [liveTarget]
        };
      },
      removeStudioElements(selection, options) {
        calls.push(['removeStudioElements', selection, options]);
        return { didRemove: true, transaction: { type: 'markup' } };
      }
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return {};
    },
    isElementLocked() {
      return false;
    },
    deselectElement() {
      calls.push(['deselectElement']);
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    }
  };

  vm.createContext(context);
  loadBuildRemovalSelectionActionState(fileContent, context);
  vm.runInContext(removeSelectedElementSource, context);

  assert.equal(context.removeSelectedElement(), true);
  assert.equal(calls[0][0], 'removeStudioElements');
  assert.equal(calls[0][1][0], liveTarget);
  assert.equal(typeof calls[0][2].getElementId, 'function');
  assert.deepEqual(JSON.parse(JSON.stringify(calls.slice(1))), [
    ['deselectElement'],
    ['finalizeEditorDeckMutation', 'Auto: Deleted Element', {
      transaction: { type: 'markup' }
    }]
  ]);
});
