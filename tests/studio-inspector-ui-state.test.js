const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const liveSelection = require('../shared/studio-editor-live-selection.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('syncInspectorForSelection tolerates a missing z-index input when a live selection is active', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'DIV',
    innerText: 'Headline',
    textContent: 'Headline',
    style: { zIndex: '7' },
    classList: {
      contains(className) {
        return className === 'editor-shape';
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '24px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '700',
            color: 'rgb(255, 255, 255)',
            textAlign: 'center',
            opacity: '0.75',
            borderStyle: 'solid',
            borderWidth: '2px',
            borderRadius: '8px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elBorderStyle: { value: '' },
    elBorderWidth: { value: '' },
    borderWidthVal: { textContent: '' },
    elBorderRadius: { value: '' },
    borderRadiusVal: { textContent: '' },
    elBorderColor: { value: '' }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'elZIndex') return null;
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Headline');
  assert.equal(elements.elFontWeight.value, '700');
  assert.equal(elements.elOpacity.value, 75);
  assert.equal(elements.opacityVal.textContent, '75%');
  assert.equal(elements.elBorderWidth.value, 2);
  assert.equal(elements.borderWidthVal.textContent, '2px');
  assert.equal(elements.elBorderRadius.value, 8);
  assert.equal(elements.borderRadiusVal.textContent, '8px');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elZIndex'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'center'));
});

test('syncInspectorForSelection tolerates a missing font-family select when a live selection is active', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'DIV',
    innerText: 'Body copy',
    textContent: 'Body copy',
    style: { zIndex: '5' },
    classList: {
      contains() {
        return false;
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '18px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '400',
            color: 'rgb(255, 255, 255)',
            textAlign: 'left',
            opacity: '1',
            borderStyle: 'none',
            borderWidth: '0px',
            borderRadius: '0px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elBorderStyle: { value: '' },
    elBorderWidth: { value: '' },
    borderWidthVal: { textContent: '' },
    elBorderRadius: { value: '' },
    borderRadiusVal: { textContent: '' },
    elBorderColor: { value: '' }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'elFontFamily') return null;
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Body copy');
  assert.equal(elements.elFontWeight.value, '400');
  assert.equal(elements.elZIndex.value, '5');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elFontFamily'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'left'));
});

test('syncInspectorForSelection tolerates a missing text-color input when a live selection is active', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'P',
    innerText: 'Caption',
    textContent: 'Caption',
    style: { zIndex: '2' },
    classList: {
      contains() {
        return false;
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '16px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '500',
            color: 'rgb(188, 201, 198)',
            textAlign: 'right',
            opacity: '0.9',
            borderStyle: 'none',
            borderWidth: '0px',
            borderRadius: '0px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elFontWeight: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'elTextColor') return null;
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#bcc9c6';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Caption');
  assert.equal(elements.elFontWeight.value, '500');
  assert.equal(elements.elZIndex.value, '2');
  assert.equal(elements.elOpacity.value, 90);
  assert.equal(elements.opacityVal.textContent, '90%');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elTextColor'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'right'));
});

test('syncInspectorForSelection tolerates a missing font-weight control when a live selection is active', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'SPAN',
    innerText: 'Label',
    textContent: 'Label',
    style: { zIndex: '3' },
    classList: {
      contains() {
        return false;
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '14px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '600',
            color: 'rgb(255, 255, 255)',
            textAlign: 'left',
            opacity: '1',
            borderStyle: 'none',
            borderWidth: '0px',
            borderRadius: '0px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'elFontWeight') return null;
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Label');
  assert.equal(elements.elTextColor.value, '#ffffff');
  assert.equal(elements.elZIndex.value, '3');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elFontWeight'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'left'));
});

test('syncInspectorForSelection tolerates missing opacity controls when a live selection is active', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'P',
    innerText: 'Footnote',
    textContent: 'Footnote',
    style: { zIndex: '6' },
    classList: {
      contains() {
        return false;
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '12px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '400',
            color: 'rgb(255, 255, 255)',
            textAlign: 'justify',
            opacity: '0.65',
            borderStyle: 'none',
            borderWidth: '0px',
            borderRadius: '0px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'elOpacity' || id === 'opacityVal') return null;
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Footnote');
  assert.equal(elements.elFontWeight.value, '400');
  assert.equal(elements.elZIndex.value, '6');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elOpacity'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'opacityVal'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'justify'));
});

test('syncInspectorForSelection tolerates missing font-size controls when a live selection is active', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'H3',
    innerText: 'Section',
    textContent: 'Section',
    style: { zIndex: '4' },
    classList: {
      contains() {
        return false;
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '28px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '700',
            color: 'rgb(255, 255, 255)',
            textAlign: 'center',
            opacity: '1',
            borderStyle: 'none',
            borderWidth: '0px',
            borderRadius: '0px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (id === 'elFontSize' || id === 'fontSizeVal') return null;
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Section');
  assert.equal(elements.elFontWeight.value, '700');
  assert.equal(elements.elTextColor.value, '#ffffff');
  assert.equal(elements.elZIndex.value, '4');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elFontSize'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'fontSizeVal'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'center'));
});

test('syncInspectorForSelection tolerates missing border inspector controls when a live selection is shape-like', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'DIV',
    innerText: 'Card',
    textContent: 'Card',
    style: { zIndex: '8' },
    classList: {
      contains(className) {
        return className === 'editor-shape';
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '20px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '600',
            color: 'rgb(255, 255, 255)',
            textAlign: 'center',
            opacity: '0.8',
            borderStyle: 'solid',
            borderWidth: '3px',
            borderRadius: '12px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elTextContent: { value: '' },
    inspectorImageGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elImageSrc: { value: '' },
    inspectorTextContentGroup: {
      classList: {
        add() {},
        remove() {},
        toggle() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (
          id === 'inspectorBorderGroup'
          || id === 'elBorderStyle'
          || id === 'elBorderWidth'
          || id === 'borderWidthVal'
          || id === 'elBorderRadius'
          || id === 'borderRadiusVal'
          || id === 'elBorderColor'
        ) {
          return null;
        }
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elTextContent.value, 'Card');
  assert.equal(elements.elFontWeight.value, '600');
  assert.equal(elements.elTextColor.value, '#ffffff');
  assert.equal(elements.elOpacity.value, 80);
  assert.equal(elements.opacityVal.textContent, '80%');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'inspectorBorderGroup'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elBorderColor'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'center'));
});

test('syncInspectorForSelection tolerates missing content and image controls for an image selection', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const syncInspectorForSelectionSource = extractFunctionSource(
    fileContent,
    'function syncInspectorForSelection() {',
    '\n\n    // Click Selection highlights'
  );

  const activeElement = {
    isConnected: true,
    onActiveSlide: true,
    tagName: 'IMG',
    src: 'https://example.com/hero.png',
    style: { zIndex: '5' },
    classList: {
      contains() {
        return false;
      }
    },
    ownerDocument: {
      defaultView: {
        getComputedStyle() {
          return {
            fontSize: '18px',
            fontFamily: "'Geist', sans-serif",
            fontWeight: '500',
            color: 'rgb(255, 255, 255)',
            textAlign: 'left',
            opacity: '0.65',
            borderStyle: 'solid',
            borderWidth: '1px',
            borderRadius: '6px',
            borderColor: 'rgb(255, 255, 255)'
          };
        }
      }
    }
  };

  const elements = {
    inspectorTargetLabel: { innerHTML: '' },
    slideInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elementInspectorPanel: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elFontSize: { value: '' },
    fontSizeVal: { textContent: '' },
    elFontFamily: {
      value: '',
      options: [{ value: "'Geist', sans-serif" }]
    },
    elFontWeight: { value: '' },
    elTextColor: { value: '' },
    elZIndex: { value: '' },
    elOpacity: { value: '' },
    opacityVal: { textContent: '' },
    inspectorBorderGroup: {
      classList: {
        add() {},
        remove() {}
      }
    },
    elBorderStyle: { value: '' },
    elBorderWidth: { value: '' },
    borderWidthVal: { textContent: '' },
    elBorderRadius: { value: '' },
    borderRadiusVal: { textContent: '' },
    elBorderColor: { value: '' }
  };

  const calls = [];
  const context = {
    SlideNextStudioEditorLiveSelection: liveSelection,
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (
          id === 'elTextContent'
          || id === 'inspectorImageGroup'
          || id === 'elImageSrc'
          || id === 'inspectorTextContentGroup'
        ) {
          return null;
        }
        return elements[id] || null;
      }
    },
    highlightAlignButton(value) {
      calls.push(['highlightAlignButton', value]);
    },
    rgbToHex(value) {
      calls.push(['rgbToHex', value]);
      return '#ffffff';
    },
    selectedElements: [activeElement],
    updateClipboardActionState() {
      calls.push(['updateClipboardActionState']);
    },
    updateLayerOrderActionState() {
      calls.push(['updateLayerOrderActionState']);
    },
    updateLockActionState() {
      calls.push(['updateLockActionState']);
    },
    updateMotionActionState() {
      calls.push(['updateMotionActionState']);
    },
    updateRemovalActionState() {
      calls.push(['updateRemovalActionState']);
    },
    updateStyleActionState() {
      calls.push(['updateStyleActionState']);
    },
    updateVisibilityActionState() {
      calls.push(['updateVisibilityActionState']);
    }
  };

  vm.createContext(context);
  vm.runInContext(syncInspectorForSelectionSource, context);

  assert.doesNotThrow(() => context.syncInspectorForSelection());
  assert.equal(elements.elFontWeight.value, '500');
  assert.equal(elements.elTextColor.value, '#ffffff');
  assert.equal(elements.elZIndex.value, '5');
  assert.equal(elements.elOpacity.value, 65);
  assert.equal(elements.opacityVal.textContent, '65%');
  assert.equal(elements.elBorderStyle.value, 'solid');
  assert.equal(elements.elBorderWidth.value, 1);
  assert.equal(elements.borderWidthVal.textContent, '1px');
  assert.equal(elements.elBorderRadius.value, 6);
  assert.equal(elements.borderRadiusVal.textContent, '6px');
  assert.equal(elements.elBorderColor.value, '#ffffff');
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elTextContent'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'inspectorImageGroup'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'elImageSrc'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'inspectorTextContentGroup'));
  assert.ok(calls.some(([name, value]) => name === 'highlightAlignButton' && value === 'left'));
});
