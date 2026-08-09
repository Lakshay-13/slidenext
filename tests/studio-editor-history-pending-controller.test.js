const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pendingController = require('../shared/studio-editor-history-pending-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('pending history controller owns and clears the pending transaction', () => {
  const transaction = { id: 'transaction-1' };
  const controller = pendingController.createStudioEditorHistoryPendingController({
    initialPendingTransaction: transaction
  });

  assert.equal(controller.getPendingTransaction(), transaction);
  assert.equal(controller.setPendingTransaction({ id: 'transaction-2' }).id, 'transaction-2');
  assert.equal(controller.clear(), null);
  assert.equal(controller.getPendingTransaction(), null);
});

test('editor wiring routes pending history transactions through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-pending-controller\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorHistoryPendingController\(\{/);
  assert.match(fileContent, /getPendingTransaction: getStudioPendingEditorTransaction/);
  assert.doesNotMatch(fileContent, /let pendingEditorTransaction = null/);
});
