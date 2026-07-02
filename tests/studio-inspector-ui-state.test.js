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
