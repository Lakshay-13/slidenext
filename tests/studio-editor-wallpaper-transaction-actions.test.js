const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const transactionActions = require('../shared/studio-editor-wallpaper-transaction-actions.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('wallpaper transaction actions forward canonical and DOM mutation adapters', () => {
  let received = null;
  const canonicalDeckApi = { name: 'deck' };
  const canonicalWallpaperApi = { name: 'wallpaper' };
  const sourceDocument = { id: 'editor-document' };
  const baseline = { kind: 'slidenext.deck', slides: [] };
  const wallpaperMutationApi = {
    applyStudioWallpaperSlidesMutationWithTransaction(slides, background, options) {
      received = { slides, background, options };
      return { didChange: true, transaction: { id: 'tx-1' } };
    }
  };
  const transactionApi = {
    createStudioStyleTransaction: () => ({ id: 'style-tx' }),
    applyStudioEditorTransaction: () => ({ didApply: true })
  };
  const wallpaperViewApi = {
    applyStudioWallpaperToSlides() {}
  };
  const buildCanonicalDeck = () => baseline;
  const getPendingCanonicalDeck = () => baseline;
  const getCanonicalDeckBaseline = () => baseline;
  const actions = transactionActions.createStudioEditorWallpaperTransactionActions({
    wallpaperMutationApi,
    transactionApi,
    wallpaperViewApi,
    canonicalDeckApi,
    canonicalWallpaperApi,
    getSlideId: () => 'slide-1',
    buildCanonicalDeck,
    getPendingCanonicalDeck,
    getCanonicalDeckBaseline
  });

  const result = actions.applyEditorWallpaperSlidesMutationWithTransaction(
    [{ id: 'slide-node' }],
    '#111111',
    { sourceDocument }
  );

  assert.equal(result.didChange, true);
  assert.equal(received.background, '#111111');
  assert.equal(received.options.sourceDocument, sourceDocument);
  assert.equal(received.options.canonicalDeckApi, canonicalDeckApi);
  assert.equal(received.options.canonicalWallpaperApi, canonicalWallpaperApi);
  assert.equal(received.options.createStyleTransaction, transactionApi.createStudioStyleTransaction);
  assert.equal(received.options.applyStudioWallpaperToSlides, wallpaperViewApi.applyStudioWallpaperToSlides);
  assert.equal(received.options.buildCanonicalDeckBaseline(sourceDocument, { mode: 'current' }), baseline);
  assert.equal(received.options.getCanonicalDeckBaseline(sourceDocument), baseline);
  assert.equal(received.options.getPendingCanonicalDeck(sourceDocument), baseline);
});

test('wallpaper transaction actions wrap active-slide mutations without changing the shared contract', () => {
  let receivedSlides = null;
  let receivedSlideId = null;
  const actions = transactionActions.createStudioEditorWallpaperTransactionActions({
    wallpaperMutationApi: {
      applyStudioWallpaperSlidesMutationWithTransaction(slides, background, options) {
        receivedSlides = slides;
        receivedSlideId = options.getSlideId({});
        return { didChange: false, transaction: null };
      }
    }
  });
  const activeSlide = { id: 'active-slide' };

  assert.deepEqual(
    actions.applyEditorWallpaperMutationWithTransaction(activeSlide, 'black', { slideId: 'slide-1' }),
    { didChange: false, transaction: null }
  );
  assert.deepEqual(receivedSlides, [activeSlide]);
  assert.equal(receivedSlideId, 'slide-1');
});

test('wallpaper transaction rollback resolves slide and element ids from the source document', () => {
  const calls = [];
  const documentRef = { id: 'editor-document' };
  const actions = transactionActions.createStudioEditorWallpaperTransactionActions({
    transactionApi: {
      applyStudioEditorTransaction(transaction, direction, options) {
        calls.push([transaction, direction, options.getElementById('slide:1'), options.getElementById('element-1')]);
        return { didApply: true };
      }
    },
    getIframeDocument: () => documentRef,
    getSlideById: (id, sourceDocument) => ({ id, sourceDocument }),
    getElementByEditorId: (id, sourceDocument) => ({ id, sourceDocument })
  });

  assert.equal(actions.rollbackEditorWallpaperMutation({ id: 'tx-1' }), true);
  assert.deepEqual(calls, [[
    { id: 'tx-1' },
    'undo',
    { id: '1', sourceDocument: documentRef },
    { id: 'element-1', sourceDocument: documentRef }
  ]]);
});

test('wallpaper transaction global API preserves the editor handler names', () => {
  const calls = [];
  const api = transactionActions.createStudioEditorWallpaperTransactionGlobalApi({
    actions: {
      applyEditorWallpaperSlidesMutationWithTransaction: (...args) => {
        calls.push(['slides', args]);
        return 'slides';
      },
      applyEditorWallpaperMutationWithTransaction: (...args) => {
        calls.push(['active', args]);
        return 'active';
      },
      rollbackEditorWallpaperMutation: (...args) => {
        calls.push(['rollback', args]);
        return true;
      }
    }
  });

  assert.equal(api.applyEditorWallpaperSlidesMutationWithTransaction([], 'black'), 'slides');
  assert.equal(api.applyEditorWallpaperMutationWithTransaction({}, 'black'), 'active');
  assert.equal(api.rollbackEditorWallpaperMutation({ id: 'tx' }), true);
  assert.deepEqual(calls.map(([name]) => name), ['slides', 'active', 'rollback']);
});

test('index loads and installs wallpaper transaction actions before editor handlers', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-wallpaper-transaction-actions\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorWallpaperTransactionGlobalApi\);/);
  assert.match(fileContent, /buildCanonicalDeck: \(sourceDoc, buildOptions\) => typeof buildEditorCanonicalDeck/);
});
