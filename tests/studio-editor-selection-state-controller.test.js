const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const selectionStateController = require('../shared/studio-editor-selection-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('selection state controller owns the current selection without changing element references', () => {
  const firstElement = { id: 'node-1' };
  const secondElement = { id: 'node-2' };
  const controller = selectionStateController.createStudioEditorSelectionStateController({
    initialSelectedElements: [firstElement],
    initialSelectedElement: firstElement
  });

  assert.deepEqual(controller.getState(), {
    selectedElements: [firstElement],
    selectedElement: firstElement
  });
  assert.deepEqual(controller.setState({
    selectedElements: [secondElement]
  }), {
    selectedElements: [secondElement],
    selectedElement: secondElement
  });
  assert.equal(controller.getSelectedElements()[0], secondElement);
  assert.equal(controller.getSelectedElement(), secondElement);
  assert.deepEqual(controller.clear(), {
    selectedElements: [],
    selectedElement: null
  });
});

test('editor wiring routes selection state through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-selection-state-controller\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorSelectionStateController\(\{/);
  assert.match(fileContent, /getSelectedElements: getStudioSelectedElements/);
  assert.doesNotMatch(fileContent, /let selectedElement = null/);
  assert.doesNotMatch(fileContent, /let selectedElements = \[\]/);
});
