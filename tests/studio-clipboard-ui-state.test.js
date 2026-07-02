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

test('updateClipboardActionState enables clipboard controls only when the iframe has a live active slide', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateClipboardActionStateSource = extractFunctionSource(
    fileContent,
    'function updateClipboardActionState(doc = getIframeDoc()) {',
    '\n\n    function sanitizeDuplicatedSubtree(root) {'
  );

  const controls = createControls();
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
  vm.runInContext(updateClipboardActionStateSource, context);

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
    activeSlide: {}
  });
  assert.deepEqual(getControlStates(controls), {
    copySelectionBtn: false,
    pasteClipboardBtn: false,
    slidePasteClipboardBtn: false
  });
});

test('copySelectedElements returns false and refreshes clipboard controls when payload build yields no items', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
          selection: [liveTarget]
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
  vm.runInContext(copySelectedElementsSource, context);

  assert.equal(context.copySelectedElements(), false);
  assert.equal(context.editorClipboard, null);
  assert.deepEqual(calls, [
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['updateClipboardActionState']
  ]);
});

test('copySelectedElements returns true after creating clipboard state from copied items', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
          selection: [liveTarget]
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
  vm.runInContext(copySelectedElementsSource, context);

  assert.equal(context.copySelectedElements(), true);
  assert.equal(context.editorClipboard, nextClipboard);
  assert.deepEqual(calls, [
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['createStudioClipboardState', copiedItems],
    ['updateClipboardActionState']
  ]);
});

test('duplicateSelectedElements returns false and refreshes clipboard controls when duplication is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
          selection: []
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
  vm.runInContext(duplicateSelectedElementsSource, context);

  assert.equal(context.duplicateSelectedElements(), false);
  assert.deepEqual(calls, [
    ['buildStudioClipboardMutationPlan'],
    ['updateClipboardActionState']
  ]);
});

test('duplicateSelectedElements returns false and refreshes clipboard controls when insertion yields no duplicates', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
          selection: [liveTarget]
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
  vm.runInContext(duplicateSelectedElementsSource, context);

  assert.equal(context.duplicateSelectedElements(), false);
  assert.deepEqual(calls, [
    ['buildStudioClipboardMutationPlan'],
    ['buildClipboardPayload', [liveTarget]],
    ['insertClipboardPayload', [{ id: 'clipboard-item' }], 1],
    ['updateClipboardActionState']
  ]);
});

test('pasteClipboardElements returns false and refreshes clipboard controls when paste is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
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
  vm.runInContext(pasteClipboardElementsSource, context);

  assert.equal(context.pasteClipboardElements(), false);
  assert.equal(context.editorClipboard, null);
  assert.deepEqual(calls, [
    ['buildStudioClipboardPastePlan'],
    ['updateClipboardActionState']
  ]);
});
