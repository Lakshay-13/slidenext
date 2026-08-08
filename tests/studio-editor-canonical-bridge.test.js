const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalBridge = require('../shared/studio-editor-canonical-bridge.js');
const canonicalDeck = require('../shared/canonical-deck.js');

function createState() {
  let liveDeck = null;
  const calls = [];
  return {
    calls,
    reset() {
      calls.push(['reset']);
      liveDeck = null;
      return null;
    },
    set(deck, owner) {
      calls.push(['set', deck, owner]);
      liveDeck = deck;
      return deck;
    },
    resolve(owner) {
      calls.push(['resolve', owner]);
      return liveDeck;
    }
  };
}

test('canonical bridge delegates live state with document and session ownership', () => {
  const state = createState();
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({ state });
  const deck = { kind: 'slidenext.deck', slides: [] };
  const documentRef = {};

  assert.equal(bridge.setLiveCanonicalDeck(deck, documentRef, 3), deck);
  assert.equal(bridge.resolveLiveCanonicalDeck(documentRef, 3), deck);
  assert.equal(bridge.resetLiveCanonicalDeck(), null);
  assert.deepEqual(state.calls, [
    ['set', deck, { documentRef, sessionToken: 3 }],
    ['resolve', { documentRef, sessionToken: 3 }],
    ['reset']
  ]);
});

test('canonical bridge uses the document getter and normalizes build options', () => {
  const documentRef = { id: 'frame' };
  const calls = [];
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    getDocument: () => documentRef,
    canonicalDeckBuilder(doc, options) {
      calls.push([doc, options]);
      return { kind: 'slidenext.deck', slides: [] };
    }
  });

  assert.deepEqual(bridge.buildCanonicalDeck(), { kind: 'slidenext.deck', slides: [] });
  assert.deepEqual(bridge.buildCanonicalDeck(documentRef, null), { kind: 'slidenext.deck', slides: [] });
  assert.deepEqual(calls, [
    [documentRef, {}],
    [documentRef, {}]
  ]);
});

test('canonical bridge adds the live baseline to forced DOM rebuilds', () => {
  const documentRef = { id: 'frame' };
  const canonicalDeckBaseline = { kind: 'slidenext.deck', slides: [] };
  let capturedOptions = null;
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: canonicalState,
    canonicalDeckBuilder(_doc, options) {
      capturedOptions = options;
      return { kind: 'slidenext.deck', slides: [] };
    },
    getCanonicalDeckBaseline(sourceDoc) {
      assert.equal(sourceDoc, documentRef);
      return canonicalDeckBaseline;
    }
  });

  bridge.buildCanonicalDeck(documentRef, { preferLiveCanonicalDeck: false });

  assert.deepEqual(capturedOptions, {
    preferLiveCanonicalDeck: false,
    canonicalDeckBaseline
  });
});

test('canonical bridge ignores an invalid live baseline when rebuilding', () => {
  let capturedOptions = null;
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: canonicalState,
    isCanonicalDeck(value) {
      return !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides);
    },
    canonicalDeckBuilder(_doc, options) {
      capturedOptions = options;
      return { kind: 'slidenext.deck', slides: [] };
    },
    getCanonicalDeckBaseline() {
      return { invalid: true };
    }
  });

  bridge.buildCanonicalDeck({}, { preferLiveCanonicalDeck: false });

  assert.deepEqual(capturedOptions, { preferLiveCanonicalDeck: false });
});

test('canonical bridge rejects malformed decks at state and builder boundaries', () => {
  let liveDeck = { invalid: true };
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: canonicalState,
    isCanonicalDeck: canonicalDeck.isCanonicalDeck,
    state: {
      set(deck) {
        liveDeck = deck;
        return deck;
      },
      resolve() {
        return liveDeck;
      }
    },
    canonicalDeckBuilder: () => ({ invalid: true }),
    mutationCanonicalDeckBuilder: () => ({ invalid: true })
  });
  const validDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });

  assert.equal(bridge.setLiveCanonicalDeck({ invalid: true }), null);
  assert.equal(bridge.resolveLiveCanonicalDeck(), null);
  assert.equal(bridge.buildCanonicalDeck({}), null);
  assert.equal(bridge.buildMutationCanonicalDeck({}), null);
  assert.equal(bridge.setLiveCanonicalDeck(validDeck), validDeck);
  assert.equal(bridge.resolveLiveCanonicalDeck(), validDeck);
});

test('canonical bridge fails closed when either builder throws or is unavailable', () => {
  const throwingBridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalDeckBuilder() {
      throw new Error('unsupported legacy markup');
    },
    mutationCanonicalDeckBuilder() {
      throw new Error('unsupported mutation');
    }
  });
  const emptyBridge = canonicalBridge.createStudioEditorCanonicalBridge();

  assert.equal(throwingBridge.buildCanonicalDeck({}), null);
  assert.equal(throwingBridge.buildMutationCanonicalDeck({}), null);
  assert.equal(emptyBridge.buildCanonicalDeck({}), null);
  assert.equal(emptyBridge.buildMutationCanonicalDeck({}), null);
  assert.equal(emptyBridge.resetLiveCanonicalDeck(), null);
  assert.equal(emptyBridge.setLiveCanonicalDeck(null), null);
  assert.equal(emptyBridge.resolveLiveCanonicalDeck(), null);
});
