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
  const frameControllerIndex = indexHtml.indexOf('/shared/studio-editor-frame-controller.js');

  assert.ok(helperIndex >= 0);
  assert.ok(helperIndex < transformIndex);
  assert.ok(helperIndex < mutationIndex);
  assert.ok(helperIndex < deckMutationIndex);
  assert.ok(helperIndex < frameControllerIndex);
  assert.equal((indexHtml.match(/\/shared\/studio-editor-history-result\.js/g) || []).length, 1);
});
