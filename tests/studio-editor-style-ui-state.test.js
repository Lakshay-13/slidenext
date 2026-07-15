const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const styleState = require('../shared/studio-editor-style.js');
const studioMutation = require('../shared/studio-editor-mutation.js');
const studioTransaction = require('../shared/studio-editor-transaction.js');

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

function loadStyleMutationHelper(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyEditorStyleMutationWithTransaction(styleApi, selection, prop, value, options = {}) {',
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

test('shared style view owns stable style toolbar control metadata', () => {
  const configs = styleState.getStudioStyleToolbarControlConfigs();
  assert.deepEqual(configs, [
    ['elTextContent', 'text', ''],
    ['elImageSrc', 'src', ''],
    ['elFontSize', 'size', '16'],
    ['elFontFamily', 'family', "'Geist', sans-serif"],
    ['elFontWeight', 'weight', '400'],
    ['alignLeftBtn', 'align', 'left'],
    ['alignCenterBtn', 'align', 'center'],
    ['alignRightBtn', 'align', 'right'],
    ['alignJustifyBtn', 'align', 'justify'],
    ['elTextColor', 'color', '#ffffff'],
    ['elOpacity', 'opacity', '100'],
    ['elBorderStyle', 'borderStyle', 'none'],
    ['elBorderWidth', 'borderWidth', '0'],
    ['elBorderRadius', 'borderRadius', '0'],
    ['elBorderColor', 'borderColor', '#ffffff']
  ]);
  configs[0][2] = 'mutated';
  assert.equal(styleState.getStudioStyleToolbarControlConfigs()[0][2], '');
});

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

test('updateStyleActionState reuses the shared style toolbar helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateStyleActionStateSource = extractFunctionSource(
    fileContent,
    'function updateStyleActionState(doc = getIframeDoc()) {',
    '\n\n    function updateLayerOrderActionState(doc = getIframeDoc()) {'
  );

  const controls = createControlMap();
  const calls = [];
  const context = {
    selectedElements: [{ isConnected: true, locked: false }],
    SlideNextStudioEditorStyle: {
      getStudioStyleToolbarControlConfigs() {
        return styleState.getStudioStyleToolbarControlConfigs();
      },
      buildStudioStyleMutationPlan() {
        throw new Error('buildStudioStyleMutationPlan should not be used when shared toolbar helper exists');
      },
      buildStudioStyleToolbarState(elements, controlConfigs, options = {}) {
        calls.push({
          elements,
          controlConfigs,
          hasCanMutateDeck: typeof options.canMutateDeck === 'function',
          canMutateDeck: options.canMutateDeck()
        });
        return {
          controlStates: Object.fromEntries(controlConfigs.map(([id]) => [id, true]))
        };
      },
      renderStudioStyleToolbarState(options) {
        return styleState.renderStudioStyleToolbarState(options);
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
    },
    isElementLocked(element) {
      return !!element.locked;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateStyleActionStateSource, context);

  context.updateStyleActionState({
    activeSlide: {}
  });

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
  assert.equal(calls.length, 1);
  assert.equal(calls[0].elements.length, 1);
  assert.equal(calls[0].controlConfigs.length, 15);
  assert.equal(calls[0].hasCanMutateDeck, true);
  assert.equal(calls[0].canMutateDeck, true);
});

test('updateStyleActionState delegates toolbar state assembly to the shared style view', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateStyleActionStateSource = extractFunctionSource(
    fileContent,
    'function updateStyleActionState(doc = getIframeDoc()) {',
    '\n\n    function updateLayerOrderActionState(doc = getIframeDoc()) {'
  );
  const selectedElement = { isConnected: true, locked: false };
  const calls = [];
  const context = {
    selectedElements: [selectedElement],
    SlideNextStudioEditorStyle: {
      getStudioStyleToolbarControlConfigs() {
        throw new Error('style control configs should be owned by the shared sync helper');
      },
      syncStudioStyleToolbarState(options) {
        calls.push(options);
        return 'delegated';
      }
    },
    document: {},
    getActiveSlide(doc) {
      return doc && doc.activeSlide ? doc.activeSlide : null;
    },
    isElementLocked(element) {
      return !!element.locked;
    }
  };

  vm.createContext(context);
  vm.runInContext(updateStyleActionStateSource, context);

  const doc = { activeSlide: {} };
  assert.equal(context.updateStyleActionState(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, context.document);
  assert.deepEqual(calls[0].elements, [selectedElement]);
  assert.equal(calls[0].controlConfigs, undefined);
  assert.equal(calls[0].isLocked(selectedElement), false);
  assert.equal(calls[0].canMutateDeck(), true);
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
  loadStyleMutationHelper(fileContent, context);
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
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioStyleMutationPlan'],
    ['applyStudioStyleMutation', [liveTarget], 'color', '#fff'],
    ['syncInspectorForSelection']
  ]);
});

test('applySelectedElementStyle delegates unsuccessful result refresh to the shared style module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );
  const calls = [];
  const context = {
    selectedElements: [],
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        return { canApply: false };
      },
      finalizeStudioStyleActionResult(result, options) {
        calls.push({ result, options });
        return 'delegated';
      }
    },
    getIframeDoc() {
      return null;
    },
    isElementLocked() {
      return false;
    },
    syncInspectorForSelection() {}
  };

  vm.createContext(context);
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].result, false);
  assert.equal(calls[0].options.syncInspectorForSelection, context.syncInspectorForSelection);
});

test('applySelectedElementStyle delegates mutation and transaction assembly to the shared style module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );
  const element = { isConnected: true, style: { color: 'red' } };
  const calls = [];
  const context = {
    selectedElements: [element],
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan() {
        return {
          canApply: true,
          selection: [element],
          versionLabel: 'Auto: Styled Element'
        };
      },
      applyStudioStyleMutationWithTransaction(selection, prop, value, options) {
        calls.push(['applyStudioStyleMutationWithTransaction', selection, prop, value, options]);
        return {
          didApply: true,
          displayValue: value,
          transaction: { type: 'style' }
        };
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
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
    },
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), true);
  assert.equal(calls[0][0], 'applyStudioStyleMutationWithTransaction');
  assert.equal(calls[0][1][0], element);
  assert.equal(calls[0][2], 'color');
  assert.equal(calls[0][3], '#fff');
  assert.equal(typeof calls[0][4].getElementId, 'function');
  assert.deepEqual(calls.find(([name]) => name === 'saveHistoryState')[2], { type: 'style' });
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
    syncInspectorForSelection() {
      calls.push(['syncInspectorForSelection']);
      context.updateStyleActionState(doc);
    },
    updateStyleActionState(currentDoc) {
      calls.push(['updateStyleActionState', currentDoc]);
    }
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), false);
  assert.deepEqual(calls, [
    ['getIframeDoc'],
    ['buildStudioStyleMutationPlan'],
    ['syncInspectorForSelection'],
    ['updateStyleActionState', doc]
  ]);
});

test('applySelectedElementStyle tolerates missing style feedback labels after successful non-layer mutations', () => {
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
    loadStyleMutationHelper(fileContent, context);
    vm.runInContext(applySelectedElementStyleSource, context);

    assert.equal(context.applySelectedElementStyle(testCase.prop, testCase.value), true);
    assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === testCase.missingId));
    assert.ok(calls.some(([name]) => name === 'syncSelectionOverlay'));
    assert.ok(calls.some(([name]) => name === 'generateThumbnails'));
    assert.equal(calls.some(([name]) => name === 'updateLayersList'), false);
    assert.ok(calls.some(([name, immediate]) => name === 'saveHistoryState' && immediate === true));
    assert.ok(calls.some(([name]) => name === 'triggerAutoSave'));
    assert.ok(calls.some(([name, label]) => name === 'triggerAutoVersion' && label === testCase.versionLabel));
    assert.ok(!calls.some(([name]) => name === 'updateStyleActionState'));
  }
});

test('applySelectedElementStyle refreshes the layer list when the z-index changes', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );

  const liveTarget = {
    dataset: { editorId: 'node-1' },
    isConnected: true,
    style: { zIndex: '1' }
  };
  const doc = { label: 'iframe-doc-z-index' };
  const sourceDeck = canonicalDeckModel.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', layout: { zIndex: 1 } }]
    }]
  });
  const calls = [];
  const context = {
    selectedElements: [liveTarget],
    SlideNextCanonicalDeck: canonicalDeckModel,
    SlideNextStudioEditorMutation: studioMutation,
    SlideNextStudioEditorStyle: {
      buildStudioStyleMutationPlan(selection, prop, value) {
        calls.push(['buildStudioStyleMutationPlan', selection, prop, value]);
        return {
          canApply: true,
          selection: [liveTarget],
          versionLabel: 'Auto: Updated Layer Order'
        };
      },
      applyStudioStyleMutation(selection, prop, value) {
        calls.push(['applyStudioStyleMutation', selection, prop, value]);
        selection[0].style.zIndex = String(value);
        return {
          didApply: true,
          displayValue: 9
        };
      }
    },
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
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
    buildEditorCanonicalDeck() {
      return sourceDeck;
    },
    assignEditorElementId(element) {
      return element.dataset.editorId;
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
    saveHistoryState(...args) {
      calls.push(['saveHistoryState', ...args]);
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
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('zIndex', '9'), true);
  assert.ok(calls.some(([name]) => name === 'syncSelectionOverlay'));
  assert.ok(calls.some(([name]) => name === 'generateThumbnails'));
  assert.ok(calls.some(([name]) => name === 'updateLayersList'));
  assert.ok(calls.some(([name, immediate]) => name === 'saveHistoryState' && immediate === true));
  const historyCall = calls.find(([name]) => name === 'saveHistoryState');
  assert.equal(historyCall[3].slides[0].nodes[0].layout.zIndex, 9);
  assert.equal(sourceDeck.slides[0].nodes[0].layout.zIndex, 1);
  assert.ok(calls.some(([name]) => name === 'triggerAutoSave'));
  assert.ok(calls.some(([name, label]) => name === 'triggerAutoVersion' && label === 'Auto: Updated Layer Order'));
  assert.ok(!calls.some(([name]) => name === 'updateStyleActionState'));
});

test('applySelectedElementStyle forwards a reversible CSS style transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );
  const element = {
    dataset: { editorId: 'node-1' },
    isConnected: true,
    style: { color: 'red' }
  };
  const doc = { label: 'iframe-doc' };
  const historyCalls = [];
  const context = {
    SlideNextStudioEditorMutation: studioMutation,
    SlideNextStudioEditorStyle: styleState,
    SlideNextStudioEditorTransaction: studioTransaction,
    selectedElements: [element],
    assignEditorElementId() {
      return 'node-1';
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getIframeDoc() {
      return doc;
    },
    isElementLocked() {
      return false;
    },
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState(...args) {
      historyCalls.push(args);
    },
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('color', '#fff'), true);
  assert.deepEqual(historyCalls, [[true, {
    kind: studioTransaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: studioTransaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'style',
      elementId: 'node-1',
      before: { color: 'red' },
      after: { color: '#fff' }
    }]
  }]]);
});

test('applySelectedElementStyle forwards a reversible text property transaction', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const applySelectedElementStyleSource = extractFunctionSource(
    fileContent,
    'function applySelectedElementStyle(prop, val) {',
    '\n\n    // Delete active selection'
  );
  const element = {
    dataset: { editorId: 'node-1' },
    isConnected: true,
    tagName: 'DIV',
    style: {},
    textContent: 'Before'
  };
  const historyCalls = [];
  const context = {
    SlideNextStudioEditorMutation: studioMutation,
    SlideNextStudioEditorStyle: styleState,
    SlideNextStudioEditorTransaction: studioTransaction,
    selectedElements: [element],
    assignEditorElementId() {
      return 'node-1';
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
    syncInspectorForSelection() {},
    syncSelectionOverlay() {},
    generateThumbnails() {},
    updateLayersList() {},
    saveHistoryState(...args) {
      historyCalls.push(args);
    },
    triggerAutoSave() {},
    triggerAutoVersion() {}
  };

  vm.createContext(context);
  loadFinalizeEditorDeckMutation(fileContent, context);
  loadStyleMutationHelper(fileContent, context);
  vm.runInContext(applySelectedElementStyleSource, context);

  assert.equal(context.applySelectedElementStyle('text', 'After'), true);
  assert.equal(element.textContent, 'After');
  assert.deepEqual(historyCalls, [[true, {
    kind: studioTransaction.STUDIO_EDITOR_TRANSACTION_KIND,
    version: studioTransaction.STUDIO_EDITOR_TRANSACTION_VERSION,
    operations: [{
      type: 'property',
      elementId: 'node-1',
      property: 'textContent',
      before: 'Before',
      after: 'After'
    }]
  }]]);
});
