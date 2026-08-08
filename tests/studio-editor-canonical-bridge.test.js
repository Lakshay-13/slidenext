const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalBridge = require('../shared/studio-editor-canonical-bridge.js');

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
