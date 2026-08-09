const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layoutRuntime = require('../shared/studio-editor-layout-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layout runtime composes nudge, alignment, and grouping controllers', () => {
  const calls = [];
  const controllers = {
    nudgeController: { name: 'nudge' },
    alignmentController: { name: 'alignment' },
    groupController: { name: 'group' }
  };
  const callbacks = {
    nudgeEngineApi: {},
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
    getCanonicalDeckBaseline() {},
    getEditorSlideId() {},
    applyPositionLayout() {},
    applyGroupMutation() {},
    applyUngroupMutation() {},
    commitSelectionState() {},
    finalizeDeckMutation() {},
    prepareGroup() {}
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
    ...callbacks
  });

  assert.deepEqual(result, controllers);
  assert.equal(calls[0][1].nudgeApi, callbacks.nudgeEngineApi);
  assert.equal(calls[0][1].applyPositionLayout, callbacks.applyPositionLayout);
  assert.equal(calls[1][1].alignmentApi, callbacks.alignmentEngineApi);
  assert.equal(calls[1][1].getCanonicalDeckBaseline, callbacks.getCanonicalDeckBaseline);
  assert.equal(calls[2][1].canonicalGroupApi, callbacks.canonicalGroupApi);
  assert.equal(calls[2][1].applyUngroupMutation, callbacks.applyUngroupMutation);
});

test('index wires layout editing through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorLayoutRuntime\.createStudioEditorLayoutRuntime\(/
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
});
