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
    '\n\n    // Rearrange Selected Element Layers'
  );
  vm.runInContext(helperSource, context);
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

test('finalizeLayerOrderMutation refreshes layer chrome before versioning', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
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

  const result = context.finalizeLayerOrderMutation();

  assert.equal(result, 'Auto: Rearranged Layers');
  assert.deepEqual(calls, [
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['updateLayersList'],
    ['updateLayerOrderActionState'],
    ['triggerAutoVersion', 'Auto: Rearranged Layers']
  ]);
});

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

test('arrangeElementLayer returns false when there is no live reorder target or no layer change', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );

  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        if (id === 'elZIndex') {
          calls.push(['getElementById', id]);
          return { value: '' };
        }
        return null;
      }
    },
    getLiveSelectedElements() {
      calls.push(['getLiveSelectedElements']);
      return [];
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectionHasLockedElements() {
      calls.push(['selectionHasLockedElements']);
      return false;
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
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('front'), false);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['updateLayerOrderActionState']
  ]);

  const target = { style: { zIndex: '7' } };
  calls.length = 0;
  context.getLiveSelectedElements = () => {
    calls.push(['getLiveSelectedElements']);
    return [target];
  };
  context.reorderSlideLayers = (action, targets) => {
    calls.push(['reorderSlideLayers', action, targets]);
    return false;
  };

  assert.equal(context.arrangeElementLayer('front'), false);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['selectionHasLockedElements'],
    ['reorderSlideLayers', 'front', [target]],
    ['updateLayerOrderActionState']
  ]);
});

test('arrangeElementLayer returns false and refreshes layer controls when the live selection is locked', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );

  const lockedTarget = { style: { zIndex: '5' } };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    getLiveSelectedElements() {
      calls.push(['getLiveSelectedElements']);
      return [lockedTarget];
    },
    reorderSlideLayers() {
      calls.push(['reorderSlideLayers']);
      return true;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectionHasLockedElements(targets) {
      calls.push(['selectionHasLockedElements', targets]);
      return true;
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
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('front'), false);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['selectionHasLockedElements', [lockedTarget]],
    ['updateLayerOrderActionState']
  ]);
});

test('arrangeElementLayer returns true and tolerates a missing z-index input when reordering succeeds', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const arrangeElementLayerSource = extractFunctionSource(
    fileContent,
    'function arrangeElementLayer(action) {',
    '\n\n    // Wallpaper / Background styles Tabs'
  );

  const target = { style: { zIndex: '9' } };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        return null;
      }
    },
    getLiveSelectedElements() {
      calls.push(['getLiveSelectedElements']);
      return [target];
    },
    reorderSlideLayers(action, targets) {
      calls.push(['reorderSlideLayers', action, targets]);
      return true;
    },
    saveHistoryState() {
      calls.push(['saveHistoryState']);
    },
    selectionHasLockedElements(targets) {
      calls.push(['selectionHasLockedElements', targets]);
      return false;
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
  vm.runInContext(arrangeElementLayerSource, context);

  assert.equal(context.arrangeElementLayer('front'), true);
  assert.deepEqual(calls, [
    ['getLiveSelectedElements'],
    ['selectionHasLockedElements', [target]],
    ['reorderSlideLayers', 'front', [target]],
    ['getElementById', 'elZIndex'],
    ['saveHistoryState'],
    ['triggerAutoSave'],
    ['updateLayersList'],
    ['updateLayerOrderActionState'],
    ['triggerAutoVersion', 'Auto: Rearranged Layers']
  ]);
});
