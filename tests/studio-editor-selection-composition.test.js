const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-selection-composition.js');

test('selection composition coordinates refresh, apply, and commit adapters', () => {
  const doc = { id: 'doc-1' };
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];
  let state = null;
  const selectionApi = { id: 'selection-api' };
  const controller = composition.createStudioEditorSelectionCompositionController({
    selectionApi,
    selectionClassAdapter: {
      refreshStudioEditorSelectionClasses(currentDoc, elements, options) {
        calls.push(['refresh', currentDoc, elements, options.getSelectionOptions()]);
        return { selectedElements: elements, selectedElement: elements[0] };
      }
    },
    selectionStateAdapter: {
      applyStudioEditorSelectionState(nextState, options) {
        calls.push(['apply', nextState, options.getSelectionOptions()]);
        options.setSelectionState(nextState);
        return true;
      }
    },
    selectionCommitAdapter: {
      commitStudioEditorSelectionState(nextState, options) {
        calls.push(['commit', nextState, options.getSelectionOptions()]);
        options.applySelectionState(nextState);
        options.refreshSelectionClasses(doc);
        options.syncSelectionOverlay(doc);
        options.syncInspectorForSelection(doc);
        options.updateLayersList(doc);
        return true;
      }
    },
    getDocument: () => doc,
    getSelectedElements: () => selectedElements,
    getSelectionOptions: () => ({ mode: 'normal' }),
    getRefreshSelectionOptions: (currentDoc) => ({ doc: currentDoc.id }),
    setSelectionState: (nextState) => {
      state = nextState;
    },
    clearSelectionState: () => {
      state = null;
    },
    syncSelectionOverlay: (currentDoc) => calls.push(['overlay', currentDoc]),
    syncInspectorForSelection: (currentDoc) => calls.push(['inspector', currentDoc]),
    updateLayersList: (currentDoc) => calls.push(['layers', currentDoc])
  });

  assert.equal(controller.refreshClasses(doc), true);
  assert.equal(controller.apply({ selectedElements }), true);
  assert.equal(controller.commit({ selectedElements }, { source: 'test' }), true);
  assert.deepEqual(state, { selectedElements, selectedElement: selectedElements[0] });
  assert.deepEqual(calls.map(([name]) => name), [
    'refresh',
    'apply',
    'commit',
    'apply',
    'refresh',
    'overlay',
    'inspector',
    'layers'
  ]);
  assert.equal(calls[0][1], doc);
  assert.deepEqual(calls[0][3], { doc: 'doc-1' });
  assert.deepEqual(calls[1][2], { mode: 'normal' });
});

test('selection composition fails closed when shared adapters are unavailable', () => {
  let cleared = 0;
  const controller = composition.createStudioEditorSelectionCompositionController({
    clearSelectionState: () => {
      cleared += 1;
    }
  });

  assert.equal(controller.refreshClasses(), false);
  assert.equal(controller.apply({}), false);
  assert.equal(controller.commit({}), false);
  assert.equal(cleared, 2);
});

test('select-all adapter binds document-scoped selection callbacks', () => {
  const doc = { id: 'doc-1' };
  const activeSlide = { id: 'slide-1' };
  const selectedElements = [{ id: 'node-1' }];
  const calls = [];
  const selectionApi = {
    selectAllStudioElementsOnActiveSlide(options) {
      calls.push(options);
      const slide = options.getActiveSlide(options.doc);
      const elements = options.getElements(slide);
      assert.equal(options.isSelectableElement(elements[0], slide), true);
      options.commitSelectionState(
        { selectedElements: elements },
        { source: 'test' }
      );
      return 'delegated';
    }
  };
  const adapter = composition.createStudioEditorSelectAllElementsOnActiveSlideAdapter({
    selectionApi,
    getActiveSlide: (currentDoc) => {
      assert.equal(currentDoc, doc);
      return activeSlide;
    },
    getElements: (slide) => {
      assert.equal(slide, activeSlide);
      return selectedElements;
    },
    isSelectableElement: (element, currentDoc, slide) => {
      assert.equal(element, selectedElements[0]);
      assert.equal(currentDoc, doc);
      assert.equal(slide, activeSlide);
      return true;
    },
    getSelectionOptions: (currentDoc, selectionOptions) => {
      assert.equal(currentDoc, doc);
      return { ...selectionOptions, doc: currentDoc };
    },
    commitSelectionState: (currentDoc, nextSelectionState, selectionOptions) => {
      assert.equal(currentDoc, doc);
      assert.deepEqual(nextSelectionState, { selectedElements });
      assert.deepEqual(selectionOptions, { source: 'test' });
    }
  });

  assert.equal(adapter(doc), 'delegated');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].doc, doc);
});

test('select-all adapter fails closed when the shared selection API is unavailable', () => {
  const adapter = composition.createStudioEditorSelectAllElementsOnActiveSlideAdapter();

  assert.equal(adapter({ id: 'doc-1' }), false);
});
