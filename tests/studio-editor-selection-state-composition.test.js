const test = require('node:test');
const assert = require('node:assert/strict');

const selectionStateComposition = require('../shared/studio-editor-selection-state-composition.js');

test('selection-state composition delegates readers with canonical state callbacks', () => {
  const doc = { id: 'iframe-doc' };
  const element = { id: 'node-1' };
  const liveSelectionApi = {};
  const calls = [];
  const transformState = { selection: [element], canTransform: true };
  const nudgeState = { selection: [element], canNudge: true };
  liveSelectionApi.hasStudioLockedLiveSelection = (elements, options) => {
    calls.push(['locked', elements, options.isLocked(element)]);
    return true;
  };

  const controller = selectionStateComposition.createStudioEditorSelectionStateComposition({
    liveSelectionAdapter: {
      getStudioEditorLiveSelection(elements, options) {
        calls.push(['live', elements, options.selectionApi, options.getSelectionOptions()]);
        return [element];
      }
    },
    liveSelectionApi,
    transformSelectionStateBuilder(elements, options) {
      calls.push(['transform', elements, options.isLocked(element), options.isHidden(element), options.isFreeformPositioned(element)]);
      return transformState;
    },
    nudgeApi: {
      buildStudioNudgeSelectionState(elements, options) {
        calls.push(['nudge', elements, options.isLocked(element), options.isHidden(element), options.isFreeformPositioned(element)]);
        return nudgeState;
      }
    },
    getSelectionOptions(currentDoc) {
      assert.equal(currentDoc, doc);
      return { currentDoc };
    },
    getCanonicalVisibilityReader(property, currentDoc) {
      assert.equal(currentDoc, doc);
      return () => property === 'locked';
    },
    getCanonicalFreeformReader(currentDoc) {
      assert.equal(currentDoc, doc);
      return () => true;
    },
    isElementLocked: () => false,
    isElementHidden: () => false,
    isElementFreeformPositioned: () => false
  });

  assert.deepEqual(controller.getLiveSelectedElements([element], doc), [element]);
  assert.deepEqual(controller.getTransformSelectionState([element], doc), transformState);
  assert.equal(controller.selectionHasLockedElements([element], doc), true);
  assert.deepEqual(controller.getNudgeSelectionState([element], doc), nudgeState);
  assert.deepEqual(calls.map(([name]) => name), ['live', 'transform', 'locked', 'nudge']);
  assert.deepEqual(calls[0][3], { currentDoc: doc });
  assert.equal(calls[1][2], true);
  assert.equal(calls[1][3], false);
  assert.equal(calls[1][4], true);
  assert.equal(calls[3][2], true);
  assert.equal(calls[3][3], false);
  assert.equal(calls[3][4], true);
});

test('selection-state composition fails closed when shared runtimes are unavailable', () => {
  const controller = selectionStateComposition.createStudioEditorSelectionStateComposition();

  assert.deepEqual(controller.getLiveSelectedElements([{ id: 'node-1' }]), []);
  assert.equal(controller.getTransformSelectionState([{ id: 'node-1' }]), null);
  assert.equal(controller.selectionHasLockedElements([{ id: 'node-1' }]), false);
  assert.deepEqual(controller.getNudgeSelectionState([{ id: 'node-1' }]), {
    selection: [],
    canNudge: false
  });
});
