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

test('updateStyleActionState disables style controls whenever the current selection cannot accept style edits', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateStyleActionStateSource = extractFunctionSource(
    fileContent,
    'function updateStyleActionState() {',
    '\n\n    function updateLayerOrderActionState() {'
  );

  const controls = createControlMap();
  const context = {
    SlideNextStudioEditorStyle: styleState,
    document: {
      getElementById(id) {
        return controls[id] || null;
      }
    },
    isElementLocked(element) {
      return !!element.locked;
    },
    selectedElements: []
  };

  vm.createContext(context);
  vm.runInContext(updateStyleActionStateSource, context);

  context.updateStyleActionState();
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
  context.updateStyleActionState();
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
  context.updateStyleActionState();
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
