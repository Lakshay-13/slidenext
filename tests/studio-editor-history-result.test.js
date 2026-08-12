const test = require('node:test');
const assert = require('node:assert/strict');

const historyResult = require('../shared/studio-editor-history-result.js');

test('isStudioHistoryCaptureFailure normalizes supported rejection shapes', () => {
  assert.equal(historyResult.isStudioHistoryCaptureFailure(false), true);
  assert.equal(historyResult.isStudioHistoryCaptureFailure({ didCapture: false }), true);
  assert.equal(historyResult.isStudioHistoryCaptureFailure({ didCapture: true }), false);
  assert.equal(historyResult.isStudioHistoryCaptureFailure(null), false);
});
