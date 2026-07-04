const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const editorPersistence = require('../shared/studio-editor-persistence.js');

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
  context.SlideNextStudioEditorPersistence ??= editorPersistence;
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
    launchPreviewBtn: { disabled: false },
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
  assert.equal(elements.launchPreviewBtn.disabled, true);
  assert.equal(elements.studioSaveBtn.disabled, true);
  assert.equal(elements.openSourceViewBtn.disabled, true);
  assert.equal(elements.studioVersionBtn.disabled, true);

  context.currentPresentationUrl = '/presentations/onboarding-presentation/index.html';
  context.lastPersistedDeckHtml = '<html>persisted-baseline</html>';
  context.updateDeckReadyToolbarActionState(null);
  assert.equal(elements.launchPreviewBtn.disabled, false);
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
  assert.equal(elements.launchPreviewBtn.disabled, false);
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
  assert.equal(elements.launchPreviewBtn.disabled, false);
  assert.equal(elements.studioSaveBtn.disabled, true);
  assert.equal(elements.openSourceViewBtn.disabled, true);
  assert.equal(elements.studioVersionBtn.disabled, true);

  context.updateDeckReadyToolbarActionState({ documentElement: {} });
  assert.equal(elements.launchPreviewBtn.disabled, false);
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);
});

test('updateDeckReadyToolbarActionState preserves the save button disabled state while a version save is in flight', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDeckReadyToolbarActionStateSource = extractFunctionSource(
    fileContent,
    'function updateDeckReadyToolbarActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    launchPreviewBtn: { disabled: false },
    studioSaveBtn: { disabled: false },
    openSourceViewBtn: { disabled: false },
    studioVersionBtn: { disabled: false }
  };
  const context = {
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    currentStudioSaveButtonState: 'saving-version',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(updateDeckReadyToolbarActionStateSource, context);

  context.updateDeckReadyToolbarActionState(null);

  assert.equal(elements.launchPreviewBtn.disabled, false);
  assert.equal(elements.studioSaveBtn.disabled, true);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);
});

test('updateDeckReadyToolbarActionState prefers the shared persisted-content resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDeckReadyToolbarActionStateSource = extractFunctionSource(
    fileContent,
    'function updateDeckReadyToolbarActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    launchPreviewBtn: { disabled: false },
    studioSaveBtn: { disabled: false },
    openSourceViewBtn: { disabled: false },
    studioVersionBtn: { disabled: false }
  };
  const calls = [];
  const context = {
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    },
    SlideNextStudioEditorPersistence: {
      resolveStudioPersistableDeckStateWithContent(persistedDeckState) {
        calls.push(persistedDeckState);
        return persistedDeckState;
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(updateDeckReadyToolbarActionStateSource, context);

  context.updateDeckReadyToolbarActionState(null);

  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck: null,
    playbackState: null
  });
  assert.equal(elements.launchPreviewBtn.disabled, false);
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);
});

test('updateDeckReadyToolbarActionState reuses the local persisted deck state-with-content resolver when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDeckReadyToolbarActionStateSource = extractFunctionSource(
    fileContent,
    'function updateDeckReadyToolbarActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const elements = {
    launchPreviewBtn: { disabled: false },
    studioSaveBtn: { disabled: false },
    openSourceViewBtn: { disabled: false },
    studioVersionBtn: { disabled: false }
  };
  const calls = [];
  const context = {
    __resolveEditorPersistedDeckStateWithContent(persistedDeckState) {
      calls.push(persistedDeckState);
      return persistedDeckState;
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getIframeDoc() {
      return null;
    },
    lastPersistedCanonicalDeck: null,
    lastPersistedDeckHtml: '<html>persisted-baseline</html>',
    persistedDeckPlaybackState: null,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck() {
        return null;
      }
    }
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  loadGetCurrentEditorPersistedDeckState(fileContent, context);
  vm.runInContext(updateDeckReadyToolbarActionStateSource, context);
  vm.runInContext('resolveEditorPersistedDeckStateWithContent = __resolveEditorPersistedDeckStateWithContent;', context);

  context.updateDeckReadyToolbarActionState(null);

  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
    cleanHtml: '<html>persisted-baseline</html>',
    canonicalDeck: null,
    playbackState: null
  });
  assert.equal(elements.launchPreviewBtn.disabled, false);
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);
});

test('updateDeckReadyToolbarActionState delegates action gating to the shared deck-ready helper when available', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateDeckReadyToolbarActionStateSource = extractFunctionSource(
    fileContent,
    'function updateDeckReadyToolbarActionState(doc = getIframeDoc()) {',
    '\n\n    function resetStudioSaveButtonState() {'
  );

  const doc = { documentElement: {} };
  const elements = {
    launchPreviewBtn: { disabled: false },
    studioSaveBtn: { disabled: false },
    openSourceViewBtn: { disabled: false },
    studioVersionBtn: { disabled: false }
  };
  const calls = [];
  const persistedDeckStateWithContent = {
    cleanHtml: '<html>persisted-baseline</html>'
  };
  const storedCanonicalDeck = {
    kind: 'slidenext.deck',
    slides: []
  };
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    getIframeDoc() {
      return doc;
    },
    getCurrentEditorPersistedDeckState() {
      return {
        cleanHtml: '<html>persisted-baseline</html>',
        canonicalDeck: null,
        playbackState: null
      };
    },
    resolveEditorStoredCanonicalBaseline() {
      return storedCanonicalDeck;
    },
    SlideNextStudioDeckReady: {
      resolveStudioDeckReadyActionState(options = {}) {
        calls.push(options);
        return {
          canUseDeckActions: true,
          canLaunchPreview: true
        };
      }
    }
  };
  context.getCurrentEditorPersistedDeckState.resolveWithContent = () => persistedDeckStateWithContent;

  vm.createContext(context);
  vm.runInContext(
    'resolveEditorPersistedDeckStateWithContent = (persistedDeckState) => getCurrentEditorPersistedDeckState.resolveWithContent(persistedDeckState);',
    context
  );
  vm.runInContext(updateDeckReadyToolbarActionStateSource, context);

  context.updateDeckReadyToolbarActionState(doc);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [{
    doc,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    persistedDeckStateWithContent,
    storedCanonicalDeck
  }]);
  assert.equal(elements.launchPreviewBtn.disabled, false);
  assert.equal(elements.studioSaveBtn.disabled, false);
  assert.equal(elements.openSourceViewBtn.disabled, false);
  assert.equal(elements.studioVersionBtn.disabled, false);
});
