const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const deckPersistence = require('../shared/deck-persistence.js');

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
    '\n\n    function applyCurrentStudioPersistedCanonicalDeck('
  );
  vm.runInContext(resolveEditorStoredCanonicalDeckSource, context);
}

function loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedCanonicalDeck(',
    '\n\n    function applyCurrentStudioPersistedPlaybackState('
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedPlaybackState(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedPlaybackState(playbackState = null) {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

function loadApplyCurrentStudioPersistedHtml(fileContent, context) {
  const helperSource = extractFunctionSource(
    fileContent,
    'function applyCurrentStudioPersistedHtml(cleanHtml = \'\') {',
    '\n\n    function setCurrentPresentationCanonicalDeck('
  );
  vm.runInContext(helperSource, context);
}

test('getCurrentEditorPersistedDeckState returns the current persisted html, canonical deck, and playback baselines', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const helperSource = extractFunctionSource(
    fileContent,
    'function getCurrentEditorPersistedDeckState() {',
    '\n\n    function buildEditorDeckSnapshot(doc = getIframeDoc(), options = {}) {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>persisted</html>',
    lastPersistedCanonicalDeck: { id: 'persisted-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
  };

  vm.createContext(context);
  vm.runInContext(helperSource, context);

  assert.deepEqual(
    JSON.parse(JSON.stringify(context.getCurrentEditorPersistedDeckState())),
    {
      cleanHtml: '<html>persisted</html>',
      canonicalDeck: { id: 'persisted-deck' },
      playbackState: { activeSlideIds: ['slide-2'], slideCounterText: '2 / 4' }
    }
  );
});

test('updateEditorPersistedDeckState updates only the provided persisted baseline fields', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? metadata.canonicalDeck : null;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  context.updateEditorPersistedDeckState({
    cleanHtml: '<html>new</html>',
    playbackState: { activeSlideId: 'slide-2' }
  });

  assert.equal(context.lastPersistedDeckHtml, '<html>new</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, { id: 'old-deck' });
  assert.deepEqual(context.persistedDeckPlaybackState, { activeSlideIds: ['slide-2'], slideCounterText: '' });
});

test('updateEditorPersistedDeckState normalizes the persisted canonical baseline through the shared deck context', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );

  const rawCanonicalDeck = {
    metadata: {
      id: 'onboarding-presentation'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const normalizedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const calls = [];
  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        calls.push(metadata);
        return normalizedCanonicalDeck;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  context.updateEditorPersistedDeckState({
    canonicalDeck: rawCanonicalDeck
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeck, rawCanonicalDeck);
  assert.equal(context.lastPersistedCanonicalDeck, normalizedCanonicalDeck);
});

test('resetEditorDeckPersistenceState clears the persisted baseline through the shared helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );
  const resetEditorDeckPersistenceStateSource = extractFunctionSource(
    fileContent,
    'function resetEditorDeckPersistenceState() {',
    '\n\n    function resetEditorHistoryState(options = {}) {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? metadata.canonicalDeck : null;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);
  loadApplyCurrentStudioPersistedPlaybackState(fileContent, context);
  vm.runInContext(resetEditorDeckPersistenceStateSource, context);

  context.resetEditorDeckPersistenceState();

  assert.equal(context.lastPersistedDeckHtml, '');
  assert.equal(context.lastPersistedCanonicalDeck, null);
  assert.equal(context.persistedDeckPlaybackState, null);
});

test('applyCurrentStudioPersistedCanonicalDeck updates the canonical baseline and can skip presentation metadata sync', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );

  const rawCanonicalDeck = {
    metadata: {
      id: 'onboarding-presentation'
    },
    slides: []
  };
  const normalizedCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const metadataSyncCalls = [];
  const context = {
    currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? normalizedCanonicalDeck : null;
      }
    },
    setCurrentPresentationCanonicalDeck(nextCanonicalDeck, presentationUrl) {
      metadataSyncCalls.push([nextCanonicalDeck, presentationUrl]);
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);
  loadApplyCurrentStudioPersistedCanonicalDeck(fileContent, context);

  context.applyCurrentStudioPersistedCanonicalDeck(rawCanonicalDeck);
  context.applyCurrentStudioPersistedCanonicalDeck(rawCanonicalDeck, '/presentations/custom/index.html', {
    syncPresentationMetadata: false
  });

  assert.deepEqual(context.lastPersistedCanonicalDeck, normalizedCanonicalDeck);
  assert.deepEqual(metadataSyncCalls, [[rawCanonicalDeck, '/presentations/onboarding-presentation/index.html']]);
});

test('applyCurrentStudioPersistedHtml updates the persisted html baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: null,
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? metadata.canonicalDeck : null;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);
  loadApplyCurrentStudioPersistedHtml(fileContent, context);

  const result = context.applyCurrentStudioPersistedHtml('<html>new</html>');

  assert.equal(result, '<html>new</html>');
  assert.equal(context.lastPersistedDeckHtml, '<html>new</html>');
});

test('applyCurrentStudioPersistedPlaybackState updates the normalized playback baseline', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: null,
    persistedDeckPlaybackState: { activeSlideIds: ['slide-1'], slideCounterText: '1 / 2' },
    SlideNextDeckPersistence: deckPersistence,
    SlideNextStudioDeckContext: {
      resolveStoredStudioCanonicalDeck(metadata) {
        return metadata && metadata.canonicalDeck ? metadata.canonicalDeck : null;
      }
    },
    Object
  };

  vm.createContext(context);
  loadResolveEditorStoredCanonicalDeck(fileContent, context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);
  loadApplyCurrentStudioPersistedPlaybackState(fileContent, context);

  const result = context.applyCurrentStudioPersistedPlaybackState({ activeSlideId: 'slide-3' });

  assert.deepEqual(result, { activeSlideId: 'slide-3' });
  assert.deepEqual(context.persistedDeckPlaybackState, {
    activeSlideIds: ['slide-3'],
    slideCounterText: ''
  });
});
