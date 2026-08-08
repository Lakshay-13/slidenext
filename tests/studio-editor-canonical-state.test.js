const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const canonicalDeckBuilder = require('../shared/studio-editor-canonical-deck.js');
const canonicalBridge = require('../shared/studio-editor-canonical-bridge.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

function createDeck(id) {
  return {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    metadata: { id },
    slides: []
  };
}

test('studio editor canonical state resolves only for its owning document and session', () => {
  const state = canonicalState.createStudioEditorCanonicalState({
    isCanonicalDeck: (value) => !!value && value.kind === 'slidenext.deck'
  });
  const documentRef = {};
  const deck = createDeck('active');

  assert.equal(state.set(deck, { documentRef, sessionToken: 4 }), deck);
  assert.equal(state.resolve({ documentRef, sessionToken: 4 }), deck);
  assert.equal(state.resolve(), null);
  assert.equal(state.resolve({ documentRef }), null);
  assert.equal(state.resolve({ sessionToken: 4 }), null);
  assert.equal(state.resolve({ documentRef: {}, sessionToken: 4 }), null);
  assert.equal(state.resolve({ documentRef, sessionToken: 5 }), null);
});

test('studio editor canonical state rejects invalid models and can be reset', () => {
  const state = canonicalState.createStudioEditorCanonicalState();
  const deck = createDeck('active');
  const documentRef = {};

  state.set(deck, { documentRef, sessionToken: 1 });
  assert.equal(state.set(null, { documentRef, sessionToken: 1 }), null);
  assert.equal(state.resolve({ documentRef, sessionToken: 1 }), null);

  state.set(deck, { documentRef, sessionToken: 1 });
  assert.equal(state.reset(), null);
  assert.equal(state.resolve({ documentRef, sessionToken: 1 }), null);
});

test('buildEditorCanonicalDeck prefers the active live model unless DOM rebuild is requested', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function resolveEditorCanonicalDeckOverride'
  );
  const documentRef = { id: 'active-frame' };
  const liveDeck = createDeck('live');
  const rebuiltDeck = createDeck('rebuilt');
  const calls = [];
  const context = {
    SlideNextStudioDeckContext: {
      buildStudioCanonicalDeck(doc, options) {
        calls.push([doc, options]);
        return rebuiltDeck;
      }
    },
    currentPresentationMetadata: null,
    currentPresentationUrl: '/presentations/demo/index.html',
    currentTitle: 'Demo',
    getEditorSlideId() {},
    assignEditorElementId() {},
    lastPersistedCanonicalDeck: null,
    resolveEditorLiveCanonicalDeck(doc, sessionToken) {
      assert.equal(doc, documentRef);
      assert.equal(sessionToken, 9);
      return liveDeck;
    },
    studioEditorSessionToken: 9,
    buildCurrentPresentationMetadataSeed() {},
    SlideNextCanonicalDeck: {
      isCanonicalDeck(value) {
        return !!value && value.kind === 'slidenext.deck';
      }
    }
  };
  context.studioEditorCanonicalDeckBuilder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    isCanonicalDeck: context.SlideNextCanonicalDeck.isCanonicalDeck,
    getCurrentPresentationMetadata: () => context.currentPresentationMetadata,
    getPersistedCanonicalDeck: () => context.lastPersistedCanonicalDeck,
    resolveLiveCanonicalDeck: (doc) => context.resolveEditorLiveCanonicalDeck(doc, context.studioEditorSessionToken),
    buildPresentationMetadataSeed: context.buildCurrentPresentationMetadataSeed,
    getPresentationUrl: () => context.currentPresentationUrl,
    getPresentationTitle: () => context.currentTitle,
    buildStudioCanonicalDeck: (doc, options) => context.SlideNextStudioDeckContext.buildStudioCanonicalDeck(doc, options),
    getSlideId: context.getEditorSlideId,
    getNodeId: context.assignEditorElementId
  });
  context.studioEditorCanonicalBridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalDeckBuilder: context.studioEditorCanonicalDeckBuilder,
    getCanonicalDeckBaseline: (doc) => context.resolveEditorLiveCanonicalDeck(doc, context.studioEditorSessionToken),
    getDocument: context.getIframeDoc
  });

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  assert.equal(context.buildEditorCanonicalDeck(documentRef), liveDeck);
  assert.equal(calls.length, 0);

  assert.equal(
    context.buildEditorCanonicalDeck(documentRef, { preferLiveCanonicalDeck: false }),
    rebuiltDeck
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].canonicalDeckBaseline, liveDeck);
});

test('buildEditorCanonicalDeck fails closed when the canonical builder throws', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorCanonicalDeckSource = extractFunctionSource(
    fileContent,
    'function buildEditorCanonicalDeck(doc = getIframeDoc()) {',
    '\n\n    function resolveEditorCanonicalDeckOverride'
  );
  const context = {
    studioEditorCanonicalDeckBuilder() {
      throw new Error('unsupported legacy markup');
    }
  };
  context.studioEditorCanonicalBridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalDeckBuilder: context.studioEditorCanonicalDeckBuilder
  });

  vm.createContext(context);
  vm.runInContext(buildEditorCanonicalDeckSource, context);

  assert.equal(context.buildEditorCanonicalDeck({ id: 'legacy-frame' }), null);
});
