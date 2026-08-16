const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const wallpaperFinalization = require('../shared/studio-editor-wallpaper-finalization.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('wallpaper finalization forwards the complete shared mutation contract', () => {
  let received = null;
  const mutationApi = { name: 'mutation-api' };
  const finalizeMutation = () => 'finalized';
  const generateThumbnails = () => {};
  const saveHistoryState = () => {};
  const triggerAutoSave = () => {};
  const triggerAutoVersion = () => {};
  const isCanonicalDeck = () => true;
  const deckMutationApi = {
    finalizeStudioEditorWallpaperMutation(...args) {
      received = args;
      return 'shared-result';
    }
  };
  const finalize = wallpaperFinalization.createStudioEditorWallpaperFinalization({
    deckMutationApi,
    mutationApi,
    finalizeMutation,
    generateThumbnails,
    saveHistoryState,
    triggerAutoSave,
    triggerAutoVersion,
    isCanonicalDeck
  });
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };

  assert.equal(finalize('Auto: Changed Background', { id: 'tx-1' }, canonicalDeck), 'shared-result');
  assert.equal(received[0], 'Auto: Changed Background');
  assert.deepEqual(received[1], { id: 'tx-1' });
  assert.equal(received[2], canonicalDeck);
  assert.equal(received[3].mutationApi, mutationApi);
  assert.equal(received[3].finalizeMutation, finalizeMutation);
  assert.equal(received[3].generateThumbnails, generateThumbnails);
  assert.equal(received[3].saveHistoryState, saveHistoryState);
  assert.equal(received[3].triggerAutoSave, triggerAutoSave);
  assert.equal(received[3].triggerAutoVersion, triggerAutoVersion);
  assert.equal(received[3].isCanonicalDeck, isCanonicalDeck);
});

test('wallpaper finalization fails closed without the shared deck mutation API', () => {
  const finalize = wallpaperFinalization.createStudioEditorWallpaperFinalization({
    generateThumbnails() {
      throw new Error('should not run');
    }
  });

  assert.equal(finalize('Auto: Changed Background'), false);
});

test('wallpaper finalization global API preserves the existing handler name', () => {
  const calls = [];
  const api = wallpaperFinalization.createStudioEditorWallpaperFinalizationGlobalApi({
    finalizeWallpaperMutation: (...args) => {
      calls.push(args);
      return 'finalized';
    }
  });

  assert.equal(api.finalizeWallpaperMutation('label', 'transaction'), 'finalized');
  assert.deepEqual(calls, [['label', 'transaction']]);
});

test('index loads and installs the wallpaper finalization module before editor orchestration', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(fileContent, /<script src="\/shared\/studio-editor-wallpaper-finalization\.js"><\/script>/);
  assert.match(fileContent, /Object\.assign\(globalThis, studioEditorWallpaperFinalizationGlobalApi\);/);
  assert.match(fileContent, /deckMutationApi: typeof SlideNextStudioEditorDeckMutation/);
  assert.match(fileContent, /isCanonicalDeck: typeof getEditorCanonicalDeckValidator/);
});
