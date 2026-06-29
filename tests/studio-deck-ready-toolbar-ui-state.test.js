const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function loadResolveEditorStoredCanonicalDeck(fileContent, context) {
  const resolveEditorStoredCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function resolveEditorStoredCanonicalDeck(metadata) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(resolveEditorStoredCanonicalDeckSource, context);
}

function loadGetCurrentEditorPersistedDeckState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function getCurrentEditorPersistedDeckState() {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );
  vm.runInContext(helperSource, context);
}

test('updateDeckReadyToolbarActionState enables deck-level toolbar actions when fallback deck state remains available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDeckReadyToolbarActionStateSource = extractFunctionSource(
    fileContent,
    'function updateDeckReadyToolbarActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    studioSaveBtn: { disabled: false },
    openSourceViewBtn: { disabled: false },
    studioVersionBtn: { disabled: false }
  };
  const context = {
    currentPresentationMetadata: null,
    currentPresentationUrl: '',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '',
    persistedDeckPlaybackState: null,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        if (!metadata || !metadata.canonicalDeck || !Array.isArray(metadata.canonicalDeck.slides)) {
          return null;
        }
        return metadata.canonicalDeck;
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(updateDeckReadyToolbarActionStateSource, context);

  context.updateDeckReadyToolbarActionState(null);
  assert.equal(elements.studioSaveBtn.disabled, true);
  assert.equal(elements.openSourceViewBtn.disabled, true);
  assert.equal(elements.studioVersionBtn.disabled, true);

  context.currentPresentationUrl = '/presentations/onboarding-presentation/index.html';
  context.lastPersistedDeckHtml = '<html>persisted-baseline</html>';
  context.updateDeckReadyToolbarActionState(null);
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);

  context.lastPersistedDeckHtml = '';
  context.currentPresentationMetadata = {
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: []
    }
  };
  context.updateDeckReadyToolbarActionState(null);
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);

  context.currentPresentationMetadata = {
    canonicalDeck: {
      metadata: {
        title: 'Broken Deck'
      }
    }
  };
  context.updateDeckReadyToolbarActionState(null);
  assert.equal(elements.studioSaveBtn.disabled, true);
  assert.equal(elements.openSourceViewBtn.disabled, true);
  assert.equal(elements.studioVersionBtn.disabled, true);

  context.updateDeckReadyToolbarActionState({ documentElement: {} });
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);
});
