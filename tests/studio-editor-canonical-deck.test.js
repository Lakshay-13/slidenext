const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalDeckBuilder = require('../shared/studio-editor-canonical-deck.js');

function createDeck(id) {
  return {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    metadata: { id },
    slides: []
  };
}

test('canonical deck builder prioritizes overrides and session-scoped live state', () => {
  const liveDeck = createDeck('live');
  const overrideDeck = createDeck('override');
  const documentRef = {};
  const calls = [];
  const builder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    resolveLiveCanonicalDeck(doc) {
      calls.push(['live', doc]);
      return liveDeck;
    },
    buildStudioCanonicalDeck() {
      calls.push(['dom']);
      return createDeck('dom');
    }
  });

  assert.equal(builder(documentRef), liveDeck);
  assert.equal(builder(documentRef, { canonicalDeckOverride: overrideDeck }), overrideDeck);
  assert.deepEqual(calls, [['live', documentRef]]);
});

test('canonical deck builder rejects invalid overrides and live models before falling back', () => {
  const invalidOverride = { slides: [] };
  const invalidLiveDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const rebuiltDeck = createDeck('rebuilt');
  const documentRef = {};
  const builder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    isCanonicalDeck(value) {
      return !!value
        && value.kind === 'slidenext.deck'
        && value.metadata
        && typeof value.metadata.id === 'string'
        && value.metadata.id.trim() !== '';
    },
    resolveLiveCanonicalDeck() {
      return invalidLiveDeck;
    },
    buildStudioCanonicalDeck() {
      return rebuiltDeck;
    }
  });

  assert.equal(builder(documentRef, { canonicalDeckOverride: invalidOverride }), rebuiltDeck);
});

test('canonical deck builder rejects invalid DOM adapter output before using the stored baseline', () => {
  const storedDeck = createDeck('stored');
  const invalidDomDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const builder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    isCanonicalDeck(value) {
      return !!value
        && value.kind === 'slidenext.deck'
        && value.metadata
        && typeof value.metadata.id === 'string'
        && value.metadata.id.trim() !== '';
    },
    buildStudioCanonicalDeck() {
      return invalidDomDeck;
    },
    resolveStoredCanonicalBaseline() {
      return storedDeck;
    }
  });

  assert.equal(builder({ id: 'document' }), storedDeck);
});

test('canonical deck builder does not return an invalid stored baseline', () => {
  const invalidStoredDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  const builder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    isCanonicalDeck(value) {
      return !!value
        && value.kind === 'slidenext.deck'
        && value.metadata
        && typeof value.metadata.id === 'string'
        && value.metadata.id.trim() !== '';
    },
    resolveStoredCanonicalBaseline() {
      return invalidStoredDeck;
    }
  });

  assert.equal(builder(null), null);
});

test('canonical deck builder can rebuild from a document or return the stored model without one', () => {
  const storedDeck = createDeck('stored');
  const importedDeck = createDeck('imported');
  const documentRef = {};
  const builder = canonicalDeckBuilder.createStudioCanonicalDeckBuilder({
    getCurrentPresentationMetadata: () => ({ id: 'demo' }),
    getPersistedCanonicalDeck: () => storedDeck,
    resolveStoredCanonicalBaseline: () => storedDeck,
    buildCanonicalDeckFromDocument(doc, options) {
      assert.equal(doc, documentRef);
      assert.equal(options.sourcePath, '/presentations/demo/index.html');
      return importedDeck;
    },
    getPresentationUrl: () => '/presentations/demo/index.html',
    getPresentationTitle: () => 'Demo'
  });

  assert.equal(builder(documentRef, { preferLiveCanonicalDeck: false }), importedDeck);
  assert.equal(builder(null), storedDeck);
});
