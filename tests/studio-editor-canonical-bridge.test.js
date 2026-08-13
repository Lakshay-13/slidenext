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

test('canonical bridge clears stale live state when history publishes no canonical deck', () => {
  const state = createState();
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({ state });
  const deck = { kind: 'slidenext.deck', slides: [] };
  const documentRef = {};

  assert.equal(bridge.setLiveCanonicalDeck(deck, documentRef, 3), deck);
  assert.equal(bridge.setLiveCanonicalDeck(null, documentRef, 3), null);
  assert.equal(bridge.resolveLiveCanonicalDeck(documentRef, 3), null);
  assert.deepEqual(state.calls, [
    ['set', deck, { documentRef, sessionToken: 3 }],
    ['reset'],
    ['resolve', { documentRef, sessionToken: 3 }]
  ]);
});

test('canonical bridge ignores an owner-mismatched clear request', () => {
  const state = canonicalState.createStudioEditorCanonicalState();
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    state,
    canonicalStateApi: canonicalState
  });
  const activeDocument = {};
  const staleDocument = {};
  const deck = { kind: 'slidenext.deck', slides: [] };

  assert.equal(bridge.setLiveCanonicalDeck(deck, activeDocument, 3), deck);
  assert.equal(bridge.setLiveCanonicalDeck(null, staleDocument, 4), null);
  assert.equal(bridge.resolveLiveCanonicalDeck(activeDocument, 3), deck);
  assert.equal(bridge.setLiveCanonicalDeck(null, activeDocument, 3), null);
  assert.equal(bridge.resolveLiveCanonicalDeck(activeDocument, 3), null);
});

test('canonical bridge can upgrade an unowned live deck when the frame owner becomes available', () => {
  const state = canonicalState.createStudioEditorCanonicalState();
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    state,
    canonicalStateApi: canonicalState
  });
  const initialDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'initial' }] });
  const activeDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'active' }] });
  const documentRef = {};

  assert.equal(bridge.setLiveCanonicalDeck(initialDeck), initialDeck);
  assert.equal(bridge.setLiveCanonicalDeck(activeDeck, documentRef, 3), activeDeck);
  assert.equal(bridge.resolveLiveCanonicalDeck(documentRef, 3), activeDeck);
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

test('canonical bridge forwards mutation rebuild options', () => {
  const sourceDocument = { id: 'mutation-document' };
  const captured = [];
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    mutationCanonicalDeckBuilder(sourceDoc, buildOptions) {
      captured.push([sourceDoc, buildOptions]);
      return canonicalDeck;
    },
    isCanonicalDeck: (value) => value === canonicalDeck
  });

  assert.equal(bridge.buildMutationCanonicalDeck(sourceDocument, {
    canonicalDeckBaseline: canonicalDeck,
    customRebuildOption: true
  }), canonicalDeck);
  assert.deepEqual(captured, [[sourceDocument, {
    canonicalDeckBaseline: canonicalDeck,
    customRebuildOption: true
  }]]);
});

test('canonical bridge fails closed when the document getter throws', () => {
  let builderCalls = 0;
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    getDocument() {
      throw new Error('frame unavailable');
    },
    canonicalDeckBuilder() {
      builderCalls += 1;
      return { kind: 'slidenext.deck', slides: [] };
    }
  });

  assert.equal(bridge.buildCanonicalDeck(), null);
  assert.equal(builderCalls, 0);
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

test('canonical bridge prefers pending state for forced DOM rebuilds', () => {
  const documentRef = { id: 'frame' };
  const pendingCanonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'pending' }] };
  const liveCanonicalDeck = { kind: 'slidenext.deck', slides: [{ id: 'live' }] };
  let capturedOptions = null;
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: canonicalState,
    canonicalDeckBuilder(_doc, options) {
      capturedOptions = options;
      return { kind: 'slidenext.deck', slides: [] };
    },
    getPendingCanonicalDeck() {
      return pendingCanonicalDeck;
    },
    getCanonicalDeckBaseline() {
      return liveCanonicalDeck;
    }
  });

  bridge.buildCanonicalDeck(documentRef, { preferLiveCanonicalDeck: false });

  assert.equal(capturedOptions.canonicalDeckBaseline, pendingCanonicalDeck);
});

test('canonical bridge delegates baseline resolution to canonical state', () => {
  const documentRef = { id: 'frame' };
  const canonicalDeckBaseline = { kind: 'slidenext.deck', slides: [] };
  const isCanonicalDeck = (value) => !!value
    && value.kind === 'slidenext.deck'
    && Array.isArray(value.slides);
  let readerOptions = null;
  let readerDocument = null;
  let capturedOptions = null;
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader(options) {
        readerOptions = options;
        return (sourceDocument) => {
          readerDocument = sourceDocument;
          return canonicalDeckBaseline;
        };
      }
    },
    isCanonicalDeck,
    canonicalDeckBuilder(_doc, options) {
      capturedOptions = options;
      return canonicalDeckBaseline;
    },
    getCanonicalDeckBaseline() {
      throw new Error('custom reader should own baseline resolution');
    }
  });

  bridge.buildCanonicalDeck(documentRef, { preferLiveCanonicalDeck: false });

  assert.equal(readerDocument, documentRef);
  assert.equal(readerOptions.isCanonicalDeck, isCanonicalDeck);
  assert.equal(typeof readerOptions.getCanonicalDeckBaseline, 'function');
  assert.deepEqual(capturedOptions, {
    preferLiveCanonicalDeck: false,
    canonicalDeckBaseline
  });
});

test('canonical bridge fails closed when the shared baseline reader is unavailable', () => {
  let capturedOptions = null;
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: {
      createStudioEditorCanonicalDeckBaselineReader() {
        return null;
      }
    },
    canonicalDeckBuilder(_doc, options) {
      capturedOptions = options;
      return { kind: 'slidenext.deck', slides: [] };
    },
    getCanonicalDeckBaseline() {
      return { kind: 'slidenext.deck', slides: [] };
    }
  });

  bridge.buildCanonicalDeck({}, { preferLiveCanonicalDeck: false });

  assert.deepEqual(capturedOptions, { preferLiveCanonicalDeck: false });
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

test('canonical bridge rejects malformed decks without a custom validator', () => {
  let liveDeck = { invalid: true };
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
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

  assert.equal(bridge.setLiveCanonicalDeck({ invalid: true }), null);
  assert.equal(bridge.resolveLiveCanonicalDeck(), null);
  assert.equal(bridge.buildCanonicalDeck({}), null);
  assert.equal(bridge.buildMutationCanonicalDeck({}), null);
});

test('canonical bridge uses the shared editor shape predicate when provided', () => {
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    canonicalStateApi: {
      isStudioEditorCanonicalDeckLike: () => false
    },
    state: {
      set() {
        throw new Error('invalid deck should not reach state');
      }
    }
  });

  assert.equal(bridge.setLiveCanonicalDeck({ slides: [] }), null);
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

test('canonical bridge fails closed when live state adapters throw', () => {
  const bridge = canonicalBridge.createStudioEditorCanonicalBridge({
    state: {
      reset() {
        throw new Error('reset failed');
      },
      set() {
        throw new Error('set failed');
      },
      resolve() {
        throw new Error('resolve failed');
      }
    }
  });

  assert.doesNotThrow(() => {
    assert.equal(bridge.resetLiveCanonicalDeck(), null);
    assert.equal(bridge.setLiveCanonicalDeck({ slides: [] }), null);
    assert.equal(bridge.setLiveCanonicalDeck(null), null);
    assert.equal(bridge.resolveLiveCanonicalDeck(), null);
  });
});
