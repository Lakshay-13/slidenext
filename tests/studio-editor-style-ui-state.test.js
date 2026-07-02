const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const styleState = require('../shared/studio-editor-style.js');

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

function createControlMap() {
  return {
    elTextContent: { disabled: false },
    elImageSrc: { disabled: false },
    elFontSize: { disabled: false },
    elFontFamily: { disabled: false },
    elFontWeight: { disabled: false },
    alignLeftBtn: { disabled: false },
    alignCenterBtn: { disabled: false },
    alignRightBtn: { disabled: false },
    alignJustifyBtn: { disabled: false },
    elTextColor: { disabled: false },
    elOpacity: { disabled: false },
    elBorderStyle: { disabled: false },
    elBorderWidth: { disabled: false },
    elBorderRadius: { disabled: false },
    elBorderColor: { disabled: false }
  };
}

function getDisabledStates(controls) {
  return Object.fromEntries(Object.entries(controls).map(([id, control]) => [id, control.disabled]));
}

test('finalizeEditorDeckMutation refreshes requested editor chrome before persisting', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const calls = [];
  const context = {
    syncSelectionOverlay() {
      calls.push(['syncSelectionOverlay']);
    },
    generateThumbnails() {
      calls.push(['generateThumbnails']);
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
    }
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);

  const result = context.finalizeEditorDeckMutation('Auto: Styled Element', {
    syncSelectionOverlay: true,
    refreshLayersList: true,
    debounceHistory: true
  });

  assert.equal(result, 'Auto: Styled Element');
  assert.deepEqual(calls, [
    ['syncSelectionOverlay'],
    ['generateThumbnails'],
    ['updateLayersList'],
    ['saveHistoryState', true],
    ['triggerAutoSave'],
    ['triggerAutoVersion', 'Auto: Styled Element']
  ]);
});

test('style inspector inputs do not wire duplicate inline version checkpoints', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  [
    'elTextContent',
    'elImageSrc',
    'elFontSize',
    'elTextColor',
    'elOpacity',
    'elBorderWidth',
    'elBorderRadius',
    'elBorderColor'
  ].forEach((id) => {
    assert.doesNotMatch(
      fileContent,
      new RegExp(`<[^>]*id="${id}"[^>]*onchange="triggerAutoVersion\\(`),
      `${id} should rely on applySelectedElementStyle for versioning`
    );
  });
});

test('updateStyleActionState disables style controls whenever the current selection cannot accept style edits', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateStyleActionStateSource = extractFunctionSource(
    fileContent,
    'function updateStyleActionState(doc = getIframeDoc()) {',
    '\n\n    function updateLayerOrderActionState(doc = getIframeDoc()) {'
  );

  const controls = createControlMap();
  const readyDoc = { activeSlide: {} };
  const context = {
    SlideNextStudioEditorStyle: styleState,
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    getIframeDoc() {
      return readyDoc;
    },
    isElementLocked(element) {
      return !!element.locked;
    },
    selectedElements: []
  };

  vm.createContext(context);
  vm.runInContext(updateStyleActionStateSource, context);

  context.updateStyleActionState(null);
  assert.deepEqual(getDisabledStates(controls), {
    elTextContent: true,
    elImageSrc: true,
    elFontSize: true,
    elFontFamily: true,
    elFontWeight: true,
    alignLeftBtn: true,
    alignCenterBtn: true,
    alignRightBtn: true,
    alignJustifyBtn: true,
    elTextColor: true,
    elOpacity: true,
    elBorderStyle: true,
    elBorderWidth: true,
    elBorderRadius: true,
    elBorderColor: true
  });

  context.updateStyleActionState(readyDoc);
  assert.deepEqual(getDisabledStates(controls), {
    elTextContent: true,
    elImageSrc: true,
    elFontSize: true,
    elFontFamily: true,
    elFontWeight: true,
    alignLeftBtn: true,
    alignCenterBtn: true,
    alignRightBtn: true,
    alignJustifyBtn: true,
    elTextColor: true,
    elOpacity: true,
    elBorderStyle: true,
    elBorderWidth: true,
    elBorderRadius: true,
    elBorderColor: true
  });

  context.selectedElements = [{ isConnected: true, locked: false }];
  context.updateStyleActionState(readyDoc);
  assert.deepEqual(getDisabledStates(controls), {
    elTextContent: false,
    elImageSrc: false,
    elFontSize: false,
    elFontFamily: false,
    elFontWeight: false,
    alignLeftBtn: false,
    alignCenterBtn: false,
    alignRightBtn: false,
    alignJustifyBtn: false,
    elTextColor: false,
    elOpacity: false,
    elBorderStyle: false,
    elBorderWidth: false,
    elBorderRadius: false,
    elBorderColor: false
  });

  context.selectedElements = [{ isConnected: true, locked: true }];
  context.updateStyleActionState(readyDoc);
  assert.deepEqual(getDisabledStates(controls), {
    elTextContent: true,
    elImageSrc: true,
    elFontSize: true,
    elFontFamily: true,
    elFontWeight: true,
    alignLeftBtn: true,
    alignCenterBtn: true,
    alignRightBtn: true,
    alignJustifyBtn: true,
    elTextColor: true,
    elOpacity: true,
    elBorderStyle: true,
    elBorderWidth: true,
    elBorderRadius: true,
    elBorderColor: true
  });
});

test('applySelectedElementStyle returns false and refreshes style controls when style edits are unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    selectedElements: [],
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        calls.push(['buildStudioStyleMutationPlan']);
        return {
          canApply: false,
          selection: [],
          versionLabel: ''
        };
      },
      applyStudioStyleMutation() {
        calls.push(['applyStudioStyleMutation']);
        return {
          didApply: true
        };
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
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
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
    },
    updateStyleActionState(currentDoc) {
      calls.push(['updateStyleActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioStyleMutationPlan'],
    ['syncInspectorForSelection']
  ]);
});

test('applySelectedElementStyle returns false and refreshes style controls when the mutation becomes a no-op', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );

  const liveTarget = { isConnected: true };
  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        calls.push(['buildStudioStyleMutationPlan']);
        return {
          canApply: true,
          selection: [liveTarget],
          versionLabel: 'Auto: Styled Element'
        };
      },
      applyStudioStyleMutation(selection, prop, value) {
        calls.push(['applyStudioStyleMutation', selection, prop, value]);
        return {
          didApply: false
        };
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      calls.push(['getIframeDoc']);
      return doc;
    },
    isElementLocked() {
      calls.push(['isElementLocked']);
      return false;
    },
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
    },
    updateStyleActionState(currentDoc) {
      calls.push(['updateStyleActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioStyleMutationPlan'],
    ['applyStudioStyleMutation', [liveTarget], 'color', '#fff'],
    ['syncInspectorForSelection']
  ]);
});

test('applySelectedElementStyle falls back to style-action refresh when inspector sync is unavailable', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );

  const doc = { label: 'iframe-doc' };
  const calls = [];
  const context = {
    selectedElements: [],
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        calls.push(['buildStudioStyleMutationPlan']);
        return {
          canApply: false,
          selection: [],
          versionLabel: ''
        };
      },
      applyStudioStyleMutation() {
        calls.push(['applyStudioStyleMutation']);
        return {
          didApply: true
        };
      }
    },
    getActiveSlide(currentDoc) {
      calls.push(['getActiveSlide', currentDoc]);
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
    updateStyleActionState(currentDoc) {
      calls.push(['updateStyleActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioStyleMutationPlan'],
    ['updateStyleActionState', doc]
  ]);
});

test('applySelectedElementStyle tolerates missing style feedback labels after successful mutations', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );

  const cases = [
    { prop: 'size', value: '32', displayValue: 32, missingId: 'fontSizeVal', versionLabel: 'Auto: Sized Text' },
    { prop: 'borderWidth', value: '4', displayValue: 4, missingId: 'borderWidthVal', versionLabel: 'Auto: Styled Border' },
    { prop: 'borderRadius', value: '12', displayValue: 12, missingId: 'borderRadiusVal', versionLabel: 'Auto: Rounded Element' },
    { prop: 'opacity', value: '70', displayValue: 70, missingId: 'opacityVal', versionLabel: 'Auto: Adjusted Opacity' }
  ];

  for (const testCase of cases) {
    const liveTarget = { isConnected: true };
    const doc = { label: `iframe-doc-${testCase.prop}` };
    const calls = [];
    const context = {
      selectedElements: [liveTarget],
      SlideNextStudioEditorStyle: {
        buildStudioStyleMutationPlan(selection, prop, value) {
          calls.push(['buildStudioStyleMutationPlan', selection, prop, value]);
          return {
            canApply: true,
            selection: [liveTarget],
            versionLabel: testCase.versionLabel
          };
        },
        applyStudioStyleMutation(selection, prop, value) {
          calls.push(['applyStudioStyleMutation', selection, prop, value]);
          return {
            didApply: true,
            displayValue: testCase.displayValue
          };
        }
      },
      document: {
        getElementById(id) {
          calls.push(['getElementById', id]);
          if (id === testCase.missingId) {
            return null;
          }
          return { textContent: '' };
        }
      },
      getActiveSlide(currentDoc) {
        calls.push(['getActiveSlide', currentDoc]);
        return { id: 'slide-1' };
      },
      getIframeDoc() {
        calls.push(['getIframeDoc']);
        return doc;
      },
      isElementLocked() {
        calls.push(['isElementLocked']);
        return false;
      },
      highlightAlignButton(value) {
        calls.push(['highlightAlignButton', value]);
      },
      syncSelectionOverlay() {
        calls.push(['syncSelectionOverlay']);
      },
      generateThumbnails() {
        calls.push(['generateThumbnails']);
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
      updateStyleActionState(currentDoc) {
        calls.push(['updateStyleActionState', currentDoc]);
      }
    };

    vm.createContext(context);
    loadFinalizeEditorDeckMutation(fileContent, context);
    vm.runInContext(applySelectedElementStyleSource, context);

    assert.equal(context.applySelectedElementStyle(testCase.prop, testCase.value), true);
    assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === testCase.missingId));
    assert.ok(calls.some(([name]) => name === 'syncSelectionOverlay'));
    assert.ok(calls.some(([name]) => name === 'generateThumbnails'));
    assert.ok(calls.some(([name]) => name === 'updateLayersList'));
    assert.ok(calls.some(([name, immediate]) => name === 'saveHistoryState' && immediate === true));
    assert.ok(calls.some(([name]) => name === 'triggerAutoSave'));
    assert.ok(calls.some(([name, label]) => name === 'triggerAutoVersion' && label === testCase.versionLabel));
    assert.ok(!calls.some(([name]) => name === 'updateStyleActionState'));
  }
});
