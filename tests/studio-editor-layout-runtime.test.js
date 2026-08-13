const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layoutRuntime = require('../shared/studio-editor-layout-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layout runtime composes layout controllers', () => {
  const calls = [];
  const controllers = {
    nudgeController: { name: 'nudge' },
    alignmentController: { name: 'alignment' },
    groupController: { name: 'group' },
    conversionController: { name: 'conversion' }
    ,layoutModeController: { name: 'layout-mode' }
  };
  const callbacks = {
    nudgeEngineApi: {},
    conversionEngineApi: {},
    alignmentEngineApi: {},
    canonicalLayoutApi: {},
    canonicalDeckApi: {},
    canonicalGroupApi: {},
    deckImportApi: {},
    buildMotionSelectionActionState() {},
    updateMotionActionState() {},
    buildAlignmentActionState() {},
    updateAlignmentActionState() {},
    buildGroupSelectionActionState() {},
    buildUngroupSelectionActionState() {},
    updateGroupActionState() {},
    getIframeDoc() {},
    getSlideMetrics() {},
    getRectOnSlide() {},
    getNormalizedSlideLayerOrder() {},
    assignElementId() {},
    buildCanonicalDeckBaseline() {},
    getPendingCanonicalDeck() {},
    getCanonicalDeckBaseline() {},
    getEditorSlideId() {},
    getTransactionElementById() {},
    applyPositionLayout() {},
    rollbackPositionMutation() {},
    applyGroupMutation() {},
    applyUngroupMutation() {},
    commitSelectionState() {},
    finalizeDeckMutation() {},
    prepareGroup() {},
    transactionApi: {},
    getSelectedElements() {},
    getActiveSlide() {},
    getClosestPositionedAncestor() {},
    buildPositionedLayoutItems() {},
    isLocked() {},
    isHidden() {},
    isFreeformPositioned() {},
    buildCanonicalDeck() {},
    updateConversionActionState() {}
    ,layoutModeApi: {}
    ,layoutModeViewApi: {}
    ,documentRef: {}
    ,resolveCanonicalDeck() {}
    ,resolveActiveSlideId() {}
  };
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });

  const result = layoutRuntime.createStudioEditorLayoutRuntime({
    nudgeApi: api('nudge', 'createStudioEditorNudgeController', controllers.nudgeController),
    alignmentApi: api('alignment', 'createStudioEditorAlignmentController', controllers.alignmentController),
    groupApi: api('group', 'createStudioEditorGroupController', controllers.groupController),
    conversionApi: api(
      'conversion',
      'createStudioEditorLayoutConversionController',
      controllers.conversionController
    ),
    layoutModeControllerApi: api(
      'layout-mode',
      'createStudioEditorLayoutModeController',
      controllers.layoutModeController
    ),
    ...callbacks
  });

  assert.deepEqual(result, controllers);
  assert.equal(calls[0][1].nudgeApi, callbacks.nudgeEngineApi);
  assert.equal(calls[0][1].applyPositionLayout, callbacks.applyPositionLayout);
  assert.equal(calls[0][1].rollbackPositionMutation, callbacks.rollbackPositionMutation);
  assert.equal(calls[0][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[1][1].alignmentApi, callbacks.alignmentEngineApi);
  assert.equal(calls[1][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[1][1].getCanonicalDeckBaseline, callbacks.getCanonicalDeckBaseline);
  assert.equal(calls[1][1].rollbackPositionMutation, callbacks.rollbackPositionMutation);
  assert.equal(calls[2][1].canonicalGroupApi, callbacks.canonicalGroupApi);
  assert.equal(calls[2][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[2][1].applyUngroupMutation, callbacks.applyUngroupMutation);
  assert.equal(calls[2][1].getTransactionElementById, callbacks.getTransactionElementById);
  assert.equal(calls[3][1].conversionApi, callbacks.conversionEngineApi);
  assert.equal(calls[3][1].transactionApi, callbacks.transactionApi);
  assert.equal(calls[3][1].buildPositionedLayoutItems, callbacks.buildPositionedLayoutItems);
  assert.equal(calls[4][1].layoutModeApi, callbacks.layoutModeApi);
  assert.equal(calls[4][1].layoutModeViewApi, callbacks.layoutModeViewApi);
  assert.equal(calls[4][1].documentRef, callbacks.documentRef);
  assert.equal(calls[4][1].resolveCanonicalDeck, callbacks.resolveCanonicalDeck);
  assert.equal(calls[4][1].resolveActiveSlideId, callbacks.resolveActiveSlideId);
});

test('index wires layout editing through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorLayoutShellRuntime\.createStudioEditorLayoutShellRuntime\(/
  );
  assert.match(fileContent, /function convertSelectedElementsToFreeform\(\)/);
  assert.match(fileContent, /function rollbackEditorPositionLayoutMutation\(/);
  assert.match(fileContent, /rollbackPositionMutation: \(\.\.\.args\) => rollbackEditorPositionLayoutMutation\(\.\.\.args\)/);
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-conversion-view\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-mode-controller\.js"><\/script>/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorNudgeController\.createStudioEditorNudgeController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAlignmentController\.createStudioEditorAlignmentController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorGroupController\.createStudioEditorGroupController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLayoutModeController\.createStudioEditorLayoutModeController\(/
  );
  assert.match(fileContent, /getSelectedElements: \(doc\) => getStudioSelectedElements\(doc\),/);
});
