const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const historyResult = require('../shared/studio-editor-history-result.js');

test('isStudioHistoryCaptureFailure normalizes supported rejection shapes', () => {
  assert.equal(historyResult.isStudioHistoryCaptureFailure(false), true);
  assert.equal(historyResult.isStudioHistoryCaptureFailure({ didCapture: false }), true);
  assert.equal(historyResult.isStudioHistoryCaptureFailure({ didCapture: true }), false);
  assert.equal(historyResult.isStudioHistoryCaptureFailure(null), false);
});

test('index loads the shared history result contract before its consumers', () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const helperIndex = indexHtml.indexOf('/shared/studio-editor-history-result.js');
  const transformIndex = indexHtml.indexOf('/shared/studio-editor-transform.js');
  const mutationIndex = indexHtml.indexOf('/shared/studio-editor-mutation.js');
  const deckMutationIndex = indexHtml.indexOf('/shared/studio-editor-deck-mutation.js');
  const slideMutationIndex = indexHtml.indexOf('/shared/studio-editor-slide-mutation.js');
  const elementInsertionIndex = indexHtml.indexOf('/shared/studio-editor-element-insertion-controller.js');
  const slideCommandsIndex = indexHtml.indexOf('/shared/studio-editor-slide-commands.js');
  const deckViewIndex = indexHtml.indexOf('/shared/studio-deck-view.js');
  const sourceControllerIndex = indexHtml.indexOf('/shared/studio-editor-source-controller.js');
  const assetControllerIndex = indexHtml.indexOf('/shared/studio-editor-asset-controller.js');
  const blockControllerIndex = indexHtml.indexOf('/shared/studio-editor-block-controller.js');
  const frameControllerIndex = indexHtml.indexOf('/shared/studio-editor-frame-controller.js');

  assert.ok(helperIndex >= 0);
  assert.ok(helperIndex < transformIndex);
  assert.ok(helperIndex < mutationIndex);
  assert.ok(helperIndex < deckMutationIndex);
  assert.ok(helperIndex < slideMutationIndex);
  assert.ok(helperIndex < elementInsertionIndex);
  assert.ok(helperIndex < slideCommandsIndex);
  assert.ok(helperIndex < deckViewIndex);
  assert.ok(helperIndex < sourceControllerIndex);
  assert.ok(helperIndex < assetControllerIndex);
  assert.ok(helperIndex < blockControllerIndex);
  assert.ok(helperIndex < frameControllerIndex);
  assert.equal((indexHtml.match(/\/shared\/studio-editor-history-result\.js/g) || []).length, 1);
});
