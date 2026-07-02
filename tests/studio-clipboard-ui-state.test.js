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

function extractClipboardMutationPlanBuilderSource(fileContent) {
  return extractFunctionSource(
    fileContent,
    'function buildClipboardSelectionMutationPlan(doc = null) {',
    '\n\n    function finalizeClipboardActionResult(result) {'
  );
}

function extractClipboardActionFinalizerSource(fileContent) {
  return extractFunctionSource(
    fileContent,
    'function finalizeClipboardActionResult(result) {',
    '\n\n    function finalizeInsertedElements(insertedElements, versionLabel) {'
  );
}

function createControls() {
  return {
    copySelectionBtn: { disabled: true },
    pasteClipboardBtn: { disabled: true },
    slidePasteClipboardBtn: { disabled: true }
  };
}

function getControlStates(controls) {
  return {
    copySelectionBtn: controls.copySelectionBtn.disabled,
    pasteClipboardBtn: controls.pasteClipboardBtn.disabled,
    slidePasteClipboardBtn: controls.slidePasteClipboardBtn.disabled
  };
}

test('buildClipboardSelectionMutationPlan reuses the current selection, clipboard, live slide guard, and payload viability', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);

  const selection = [{ id: 'node-1' }];
  const clipboard = { items: [{ id: 'clipboard-item' }], pasteCount: 0 };
  const payloadItems = [{ id: 'payload-item' }];
  const calls = [];
  const context = {
    selectedElements: selection,
    editorClipboard: clipboard,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements, nextClipboard, options = {}) {
        calls.push(['buildStudioClipboardMutationPlan', elements, nextClipboard]);
        return {
          canCopy: options.canMutateDeck(),
          canDuplicate: options.canMutateDeck(),
          selection: elements
        };
      }
    },
    buildClipboardPayload(elements, doc) {
      calls.push(['buildClipboardPayload', elements, doc]);
      return payloadItems;
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      const doc = { activeSlide: { id: 'slide-1' } };
      calls.push(['getIframeDoc', doc]);
      return doc;
    },
    isElementLocked(element) {
      calls.push(['isElementLocked', element]);
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildClipboardSelectionMutationPlanSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.buildClipboardSelectionMutationPlan())), {
    canCopy: true,
    canDuplicate: true,
    selection,
    payloadItems,
    canBuildPayload: true
  });
  assert.deepEqual(calls, [
    ['getIframeDoc', { activeSlide: { id: 'slide-1' } }],
    ['buildStudioClipboardMutationPlan', selection, clipboard],
    ['getActiveSlide', { activeSlide: { id: 'slide-1' } }],
    ['getActiveSlide', { activeSlide: { id: 'slide-1' } }],
    ['buildClipboardPayload', selection, { activeSlide: { id: 'slide-1' } }]
  ]);
});

test('finalizeClipboardActionResult refreshes clipboard controls and preserves the action result', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);

  const calls = [];
  const context = {
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(finalizeClipboardActionResultSource, context);

  assert.equal(context.finalizeClipboardActionResult(false), false);
  assert.equal(context.finalizeClipboardActionResult(true), true);
  assert.deepEqual(calls, [
    ['updateClipboardActionState'],
    ['updateClipboardActionState']
  ]);
});

test('finalizeInsertedElements commits the new selection and delegates persistence through the shared mutation helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeInsertedElementsSource = extractFunctionSource(
    fileContent,
    'function finalizeInsertedElements(insertedElements, versionLabel) {',
    '\n\n    function copySelectedElements() {'
  );

  const insertedElements = [{ id: 'node-1' }, { id: 'node-2' }];
  const nextSelectionState = {
    selectedElement: insertedElements[0],
    selectedElements: insertedElements
  };
  const calls = [];
  const context = {
    SlideNextStudioEditorSelection: {
      selectAllStudioElements(elements) {
        calls.push(['selectAllStudioElements', elements]);
        return nextSelectionState;
      }
    },
    commitEditorSelectionState(selectionState) {
      calls.push(['commitEditorSelectionState', selectionState]);
    },
    finalizeEditorDeckMutation(versionLabel) {
      calls.push(['finalizeEditorDeckMutation', versionLabel]);
    }
  };

  vm.createContext(context);
  vm.runInContext(finalizeInsertedElementsSource, context);

  assert.equal(context.finalizeInsertedElements(insertedElements, 'Auto: Pasted Element'), true);
  assert.equal(context.finalizeInsertedElements([], 'Auto: Pasted Element'), false);
  assert.deepEqual(calls, [
    ['selectAllStudioElements', insertedElements],
    ['commitEditorSelectionState', nextSelectionState],
    ['finalizeEditorDeckMutation', 'Auto: Pasted Element']
  ]);
});

test('updateClipboardActionState enables paste on a live slide and enables copy only when clipboard payloads can be built', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );

  const controls = createControls();
  const activeSlide = { id: 'slide-1' };
  let payloadItems = [];
  const context = {
    selectedElements: [{ id: 'selected' }],
    editorClipboard: { items: [{ id: 'clipboard-item' }], pasteCount: 0 },
    isElementLocked() {
      return false;
    },
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements, clipboard, options = {}) {
        return {
          canCopy: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true,
          canPaste: typeof options.canMutateDeck === 'function' ? options.canMutateDeck() : true
        };
      }
    },
    buildClipboardPayload() {
      return payloadItems;
    },
    document: {
      getElementById(id) {
        return controls[id] || null;
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
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${updateClipboardActionStateSource}`, context);

  context.updateClipboardActionState(null);
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });

  context.updateClipboardActionState({
    getElementById() {
      return null;
    }
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: true,
    slidePasteClipboardBtn: true
  });

  context.updateClipboardActionState({
    activeSlide
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: true,
    pasteClipboardBtn: false,
    slidePasteClipboardBtn: false
  });

  payloadItems = [{ id: 'payload-item' }];
  context.updateClipboardActionState({
    activeSlide
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: false,
    pasteClipboardBtn: false,
    slidePasteClipboardBtn: false
  });
});

test('copySelectedElements returns false and refreshes clipboard controls when payload build yields no items', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const copySelectedElementsSource = extractFunctionSource(
    fileContent,
    'function copySelectedElements() {',
    '\n\n    function pasteClipboardElements() {'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [liveTarget],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canCopy: true,
          selection: [liveTarget],
          payloadItems: [],
          canBuildPayload: false
        };
      },
      createStudioClipboardState() {
        calls.push(['createStudioClipboardState']);
        return { items: [{ id: 'clipboard-item' }], pasteCount: 0 };
      }
    },
    buildClipboardPayload(selection) {
      calls.push(['buildClipboardPayload', selection]);
      return [];
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
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${copySelectedElementsSource}`, context);

  assert.equal(context.copySelectedElements(), false);
  assert.equal(context.editorClipboard, null);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['updateClipboardActionState']
  ]);
});

test('copySelectedElements returns true after creating clipboard state from copied items', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const copySelectedElementsSource = extractFunctionSource(
    fileContent,
    'function copySelectedElements() {',
    '\n\n    function pasteClipboardElements() {'
  );

  const liveTarget = { isConnected: true };
  const copiedItems = [{ id: 'clipboard-item' }];
  const nextClipboard = { items: copiedItems, pasteCount: 0 };
  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [liveTarget],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canCopy: true,
          selection: [liveTarget],
          payloadItems: copiedItems,
          canBuildPayload: true
        };
      },
      createStudioClipboardState(items) {
        calls.push(['createStudioClipboardState', items]);
        return nextClipboard;
      }
    },
    buildClipboardPayload(selection) {
      calls.push(['buildClipboardPayload', selection]);
      return copiedItems;
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
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${copySelectedElementsSource}`, context);

  assert.equal(context.copySelectedElements(), true);
  assert.equal(context.editorClipboard, nextClipboard);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['createStudioClipboardState', copiedItems],
    ['updateClipboardActionState']
  ]);
});

test('duplicateSelectedElements returns false and refreshes clipboard controls when duplication is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const duplicateSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function duplicateSelectedElements() {',
    '\n\n    function nudgeSelectedElements(dx, dy) {'
  );

  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [{ isConnected: true }],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canDuplicate: false,
          selection: [],
          payloadItems: [],
          canBuildPayload: false
        };
      }
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
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${duplicateSelectedElementsSource}`, context);

  assert.equal(context.duplicateSelectedElements(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['updateClipboardActionState']
  ]);
});

test('duplicateSelectedElements returns false and refreshes clipboard controls when insertion yields no duplicates', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const duplicateSelectedElementsSource = extractFunctionSource(
    fileContent,
    'function duplicateSelectedElements() {',
    '\n\n    function nudgeSelectedElements(dx, dy) {'
  );

  const liveTarget = { isConnected: true };
  const calls = [];
  const context = {
    editorClipboard: null,
    selectedElements: [liveTarget],
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan() {
        calls.push(['buildStudioClipboardMutationPlan']);
        return {
          canDuplicate: true,
          selection: [liveTarget],
          payloadItems: [{ id: 'clipboard-item' }],
          canBuildPayload: true
        };
      }
    },
    buildClipboardPayload(selection) {
      calls.push(['buildClipboardPayload', selection]);
      return [{ id: 'clipboard-item' }];
    },
    finalizeInsertedElements() {
      calls.push(['finalizeInsertedElements']);
      return true;
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    insertClipboardPayload(items, offsetMultiplier) {
      calls.push(['insertClipboardPayload', items, offsetMultiplier]);
      return [];
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${buildClipboardSelectionMutationPlanSource}\n${finalizeClipboardActionResultSource}\n${duplicateSelectedElementsSource}`, context);

  assert.equal(context.duplicateSelectedElements(), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['insertClipboardPayload', [{ id: 'clipboard-item' }], 1],
    ['updateClipboardActionState']
  ]);
});

test('buildClipboardSelectionMutationPlan disables copy and duplicate when the selection cannot build a clipboard payload', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildClipboardSelectionMutationPlanSource = extractClipboardMutationPlanBuilderSource(fileContent);

  const selection = [{ id: 'node-1' }];
  const calls = [];
  const context = {
    selectedElements: selection,
    editorClipboard: null,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardMutationPlan(elements) {
        calls.push(['buildStudioClipboardMutationPlan', elements]);
        return {
          canCopy: true,
          canDuplicate: true,
          canPaste: false,
          selection: elements
        };
      }
    },
    buildClipboardPayload(elements, doc) {
      calls.push(['buildClipboardPayload', elements, doc]);
      return [];
    },
    getActiveSlide(doc) {
      calls.push(['getActiveSlide', doc]);
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      const doc = { activeSlide: { id: 'slide-1' } };
      calls.push(['getIframeDoc', doc]);
      return doc;
    },
    isElementLocked() {
      return false;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildClipboardSelectionMutationPlanSource, context);

  assert.deepEqual(JSON.parse(JSON.stringify(context.buildClipboardSelectionMutationPlan())), {
    canCopy: false,
    canDuplicate: false,
    canPaste: false,
    selection,
    payloadItems: [],
    canBuildPayload: false
  });
  assert.deepEqual(calls, [
    ['getIframeDoc', { activeSlide: { id: 'slide-1' } }],
    ['buildStudioClipboardMutationPlan', selection],
    ['buildClipboardPayload', selection, { activeSlide: { id: 'slide-1' } }]
  ]);
});

test('pasteClipboardElements returns false and refreshes clipboard controls when paste is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const finalizeClipboardActionResultSource = extractClipboardActionFinalizerSource(fileContent);
  const pasteClipboardElementsSource = extractFunctionSource(
    fileContent,
    'function pasteClipboardElements() {',
    '\n\n    function duplicateSelectedElements() {'
  );

  const calls = [];
  const context = {
    editorClipboard: null,
    SlideNextStudioEditorClipboard: {
      buildStudioClipboardPastePlan() {
        calls.push(['buildStudioClipboardPastePlan']);
        return {
          canPaste: false,
          items: [],
          nextPasteCount: 1,
          nextClipboard: null
        };
      }
    },
    getActiveSlide() {
      calls.push(['getActiveSlide']);
      return null;
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return { label: 'iframe-doc' };
    },
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(`${finalizeClipboardActionResultSource}\n${pasteClipboardElementsSource}`, context);

  assert.equal(context.pasteClipboardElements(), false);
  assert.equal(context.editorClipboard, null);
  assert.deepEqual(calls, [
    ['buildStudioClipboardPastePlan'],
    ['updateClipboardActionState']
  ]);
});
