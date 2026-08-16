const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mutationRuntime = require('../shared/studio-editor-slide-mutation-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('slide mutation runtime composes the four structural slide controllers', () => {
  const calls = [];
  const controllers = {
    slideReorderController: { name: 'reorder' },
    slideInsertionController: { name: 'insert' },
    slideDeletionController: { name: 'delete' },
    slideDuplicationController: { name: 'duplicate' }
  };
  const callbacks = {
    slideCommandsApi: {},
    canonicalSlideApi: {},
    canonicalDeckApi: {},
    deckImportApi: {},
    transactionApi: {},
    insertionMutationApi: {},
    insertionTransactionApi: {},
    reorderMutationApi: {},
    reorderTransactionApi: {},
    deckViewApi: {},
    deletionMutationApi: {},
    deletionTransactionApi: {},
    getIframeDoc() {},
    getSlides() {},
    getSlideId() {},
    buildCanonicalDeckBaseline() {},
    getPendingCanonicalDeck() {},
    getCanonicalDeckBaseline() {},
    captureSlideMutationState() {},
    applyReorder() {},
    resolveInsertionActionState() {},
    createBlankSlide() {},
    saveHistoryState() {},
    applyInsertion() {},
    setActiveSlide() {},
    alert() {},
    applyDeletion() {},
    restoreDeckViewAfterSlideMutation() {},
    rollbackMutation() {},
    getActiveSlide() {},
    sanitizeDuplicatedSubtree() {},
    assignSlideId() {},
    makeElementsHoverable() {},
    generateThumbnails() {},
    finalizeMutation() {}
  };
  const api = (name, factoryName, result) => ({
    [factoryName](options) {
      calls.push([name, options]);
      return result;
    }
  });

  const result = mutationRuntime.createStudioEditorSlideMutationRuntime({
    reorderApi: api('reorder', 'createStudioEditorSlideReorderController', controllers.slideReorderController),
    insertionApi: api('insert', 'createStudioEditorSlideInsertionController', controllers.slideInsertionController),
    deletionApi: api('delete', 'createStudioEditorSlideDeletionController', controllers.slideDeletionController),
    duplicationApi: api('duplicate', 'createStudioEditorSlideDuplicationController', controllers.slideDuplicationController),
    ...callbacks
  });

  assert.deepEqual(result, controllers);
  assert.equal(calls[0][1].canonicalDeckApi, callbacks.canonicalDeckApi);
  assert.equal(calls[0][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[0][1].reorderMutationApi, callbacks.reorderMutationApi);
  assert.equal(calls[0][1].reorderTransactionApi, callbacks.reorderTransactionApi);
  assert.equal(calls[0][1].deckViewApi, callbacks.deckViewApi);
  assert.equal(calls[2][1].deletionMutationApi, callbacks.deletionMutationApi);
  assert.equal(calls[2][1].deletionTransactionApi, callbacks.deletionTransactionApi);
  assert.equal(calls[1][1].transactionApi, callbacks.transactionApi);
  assert.equal(calls[1][1].insertionMutationApi, callbacks.insertionMutationApi);
  assert.equal(calls[1][1].insertionTransactionApi, callbacks.insertionTransactionApi);
  assert.equal(calls[1][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[0][1].applyReorder, callbacks.applyReorder);
  assert.equal(calls[0][1].rollbackMutation, callbacks.rollbackMutation);
  assert.equal(calls[1][1].createBlankSlide, callbacks.createBlankSlide);
  assert.equal(calls[1][1].setActiveSlide, callbacks.setActiveSlide);
  assert.equal(calls[1][1].captureSlideMutationState, callbacks.captureSlideMutationState);
  assert.equal(calls[1][1].restoreDeckViewAfterSlideMutation, callbacks.restoreDeckViewAfterSlideMutation);
  assert.equal(calls[1][1].rollbackMutation, callbacks.rollbackMutation);
  assert.equal(calls[2][1].applyDeletion, callbacks.applyDeletion);
  assert.equal(calls[2][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[2][1].transactionApi, callbacks.transactionApi);
  assert.equal(calls[2][1].rollbackMutation, callbacks.rollbackMutation);
  assert.equal(calls[2][1].alert, callbacks.alert);
  assert.equal(calls[3][1].sanitizeDuplicatedSubtree, callbacks.sanitizeDuplicatedSubtree);
  assert.equal(calls[3][1].getPendingCanonicalDeck, callbacks.getPendingCanonicalDeck);
  assert.equal(calls[3][1].makeElementsHoverable, callbacks.makeElementsHoverable);
  assert.equal(calls[3][1].transactionApi, callbacks.transactionApi);
  assert.equal(calls[3][1].insertionMutationApi, callbacks.insertionMutationApi);
  assert.equal(calls[3][1].insertionTransactionApi, callbacks.insertionTransactionApi);
  assert.equal(calls[3][1].rollbackMutation, callbacks.rollbackMutation);
});

test('index wires structural slide mutations through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-mutation-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-slide-mutation-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorSlideMutationShellRuntime\.createStudioEditorSlideMutationShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSlideReorderController\.createStudioEditorSlideReorderController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSlideInsertionController\.createStudioEditorSlideInsertionController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSlideDeletionController\.createStudioEditorSlideDeletionController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorSlideDuplicationController\.createStudioEditorSlideDuplicationController\(/
  );
  assert.match(
    fileContent,
    /getCanonicalDeckBaseline: \(sourceDoc\) => resolveEditorLiveCanonicalDeck\([\s\S]*?getPendingCanonicalDeck: getStudioPendingEditorCanonicalDeck,/
  );
  assert.match(
    fileContent,
    /reorderTransactionApi: typeof SlideNextStudioEditorSlideReorderTransaction !== 'undefined'/
  );
  assert.doesNotMatch(
    fileContent,
    /function applyEditorSlideReorderWithTransaction\(/
  );
  assert.doesNotMatch(
    fileContent,
    /function applyEditorSlideDeletionWithTransaction\(/
  );
});

test('index keeps structural slide-mutation dependencies from being shadowed', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const start = fileContent.indexOf('const studioEditorSlideMutationRuntime =');
  const end = fileContent.indexOf(
    'const studioEditorSlideReorderController =',
    start
  );
  assert.ok(start >= 0);
  assert.ok(end > start);

  const wiring = fileContent.slice(start, end);
  assert.equal((wiring.match(/\binsertionApi:/g) || []).length, 1);
  assert.equal((wiring.match(/\binsertionTransactionApi:/g) || []).length, 1);
  assert.equal((wiring.match(/\btransactionApi:/g) || []).length, 1);
  assert.match(wiring, /SlideNextStudioEditorSlideInsertionController/);
  assert.doesNotMatch(wiring, /SlideNextStudioEditorElementInsertionTransaction/);
  assert.doesNotMatch(wiring, /SlideNextStudioEditorInsertion/);
});
