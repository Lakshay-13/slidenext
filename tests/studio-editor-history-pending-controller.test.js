const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pendingController = require('../shared/studio-editor-history-pending-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const HISTORY_ACCESSORS_PATH = path.join(
  __dirname,
  '..',
  'shared',
  'studio-editor-history-accessors.js'
);

test('pending history controller owns and clears pending history values', () => {
  const transaction = { id: 'transaction-1' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const controller = pendingController.createStudioEditorHistoryPendingController({
    initialPendingTransaction: transaction,
    initialPendingCanonicalDeck: canonicalDeck
  });

  assert.equal(controller.getPendingTransaction(), transaction);
  assert.equal(controller.getPendingCanonicalDeck(), canonicalDeck);
  assert.equal(controller.setPendingTransaction({ id: 'transaction-2' }).id, 'transaction-2');
  assert.equal(
    controller.setPendingCanonicalDeck({ kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] }).slides[0].id,
    'slide-1'
  );
  assert.equal(controller.clear(), null);
  assert.equal(controller.getPendingTransaction(), null);
  assert.equal(controller.getPendingCanonicalDeck(), null);
});

test('editor wiring routes pending history transactions through the shared controller', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-history-pending-controller\.js"><\/script>/
  );
  assert.match(fileContent, /studio-editor-history-store\.js/);
  assert.match(fileContent, /studioEditorHistoryGlobalApi/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorHistoryGlobalApi\)/);
  const accessorSource = fs.readFileSync(HISTORY_ACCESSORS_PATH, 'utf8');
  assert.match(
    accessorSource,
    /getStudioPendingEditorTransaction: \(\) => accessors\.getPendingEditorTransaction\(\)/
  );
  assert.match(
    accessorSource,
    /getStudioPendingEditorCanonicalDeck: \(\) => accessors\.getPendingEditorCanonicalDeck\(\)/
  );
  assert.doesNotMatch(fileContent, /let pendingEditorTransaction = null/);
  assert.doesNotMatch(fileContent, /let pendingEditorCanonicalDeck = null/);
});
