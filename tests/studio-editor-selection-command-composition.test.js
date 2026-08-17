const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-selection-command-composition.js');
const selectionComposition = require('../shared/studio-editor-selection-composition.js');

test('selection command composition scopes selection and commit callbacks to the requested document', () => {
  const doc = { id: 'doc-1' };
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];
  const command = composition.createStudioEditorSelectionCommandComposition({
    selectionApi: {
      selectStudioElement(options) {
        calls.push(options);
        options.commitSelectionState({ selectedElements: [options.element] }, { source: 'click' });
        return 'selected';
      }
    },
    getDocument: () => doc,
    getSelectedElements: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return selectedElements;
    },
    resolveEditableTarget: (element) => element,
    getSelectionOptions: (options) => ({ ...options, mode: 'editor' }),
    commitSelectionState: (nextState, options) => {
      calls.push({ nextState, options });
      return 'committed';
    }
  });

  assert.equal(command.selectElement({ id: 'node-2' }, { additive: true }), 'selected');
  assert.equal(calls[0].selectedElements, selectedElements);
  assert.equal(calls[0].additive, true);
  assert.deepEqual(calls[0].getSelectionOptions(), { doc, mode: 'editor' });
  assert.deepEqual(calls[1], {
    nextState: { selectedElements: [{ id: 'node-2' }] },
    options: { source: 'click', doc }
  });
});

test('selection command composition preserves deselect callbacks and fail-closed behavior', () => {
  const calls = [];
  const command = composition.createStudioEditorSelectionCommandComposition({
    selectionApi: {
      deselectStudioElement(options) {
        calls.push(options);
        options.commitSelectionState({ selectedElements: [] }, { hideDragHudOnClear: true });
        return 'deselected';
      }
    },
    hideDragHud: () => calls.push('hide-drag-hud'),
    commitSelectionState: (nextState, options) => calls.push([nextState, options])
  });

  assert.equal(command.deselectElement(), 'deselected');
  assert.equal(typeof calls[0].hideDragHud, 'function');
  assert.deepEqual(calls[1], [{ selectedElements: [] }, { hideDragHudOnClear: true }]);

  const unavailable = composition.createStudioEditorSelectionCommandComposition();
  assert.equal(unavailable.selectElement({}), false);
  assert.equal(unavailable.deselectElement(), false);
  assert.equal(unavailable.selectAllElementsOnActiveSlide(), false);
});

test('selection command composition builds select-all adapter and filters locked or hidden elements', () => {
  const doc = { id: 'doc-1' };
  const activeSlide = { id: 'slide-1' };
  const elements = [{ id: 'visible' }, { id: 'locked' }];
  const calls = [];
  const command = composition.createStudioEditorSelectionCommandComposition({
    selectionApi: {
      selectAllStudioElementsOnActiveSlide(options) {
        calls.push(options);
        assert.equal(options.doc, doc);
        assert.equal(options.getActiveSlide(doc), activeSlide);
        assert.deepEqual(options.getElements(activeSlide), elements);
        assert.equal(options.isSelectableElement(elements[0], activeSlide), true);
        assert.equal(options.isSelectableElement(elements[1], activeSlide), false);
        options.commitSelectionState({ selectedElements: [elements[0]] }, { source: 'select-all' });
        return 'selected-all';
      }
    },
    selectionCompositionApi: selectionComposition,
    getActiveSlide: () => activeSlide,
    getElements: () => elements,
    isSelectableElement: (element) => element.id !== 'locked',
    getSelectionOptions: (options) => options,
    commitSelectionState: (nextState, options) => calls.push({ nextState, options })
  });

  assert.equal(command.selectAllElementsOnActiveSlide(doc), 'selected-all');
  assert.deepEqual(calls[1], {
    nextState: { selectedElements: [elements[0]] },
    options: { source: 'select-all', doc }
  });
});
