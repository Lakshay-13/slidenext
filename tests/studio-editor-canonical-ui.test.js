const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalUi = require('../shared/studio-editor-canonical-ui.js');

test('canonical UI reader prefers the live deck and forwards the session token', () => {
  const sourceDoc = { id: 'live-doc' };
  const liveCanonicalDeck = { slides: [{ id: 'live-slide' }] };
  let buildCalls = 0;

  const result = canonicalUi.resolveStudioEditorCanonicalDeck(sourceDoc, {
    resolveLiveCanonicalDeck(doc, sessionToken) {
      assert.equal(doc, sourceDoc);
      assert.equal(sessionToken, 19);
      return liveCanonicalDeck;
    },
    getSessionToken() {
      return 19;
    },
    buildCanonicalDeck() {
      buildCalls += 1;
      return { slides: [] };
    }
  });

  assert.equal(result, liveCanonicalDeck);
  assert.equal(buildCalls, 0);
});

test('canonical UI reader prefers pending state before live state', () => {
  const sourceDoc = { id: 'pending-doc' };
  const pendingCanonicalDeck = { slides: [{ id: 'pending-slide' }] };
  const liveCanonicalDeck = { slides: [{ id: 'live-slide' }] };
  const calls = [];

  const result = canonicalUi.resolveStudioEditorCanonicalDeck(sourceDoc, {
    getPendingCanonicalDeck(doc) {
      calls.push(['pending', doc]);
      return pendingCanonicalDeck;
    },
    resolveLiveCanonicalDeck(doc) {
      calls.push(['live', doc]);
      return liveCanonicalDeck;
    }
  });

  assert.equal(result, pendingCanonicalDeck);
  assert.deepEqual(calls, [['pending', sourceDoc]]);
});

test('canonical UI reader falls back to the document builder when live state is unavailable', () => {
  const sourceDoc = { id: 'fallback-doc' };
  const importedCanonicalDeck = { slides: [{ id: 'imported-slide' }] };
  let buildCalls = 0;

  const result = canonicalUi.resolveStudioEditorCanonicalDeck(sourceDoc, {
    resolveLiveCanonicalDeck() {
      throw new Error('live state unavailable');
    },
    buildCanonicalDeck(doc) {
      buildCalls += 1;
      assert.equal(doc, sourceDoc);
      return importedCanonicalDeck;
    }
  });

  assert.equal(result, importedCanonicalDeck);
  assert.equal(buildCalls, 1);
});

test('canonical UI reader forwards explicit rebuild options to the document builder', () => {
  const sourceDoc = { id: 'deterministic-doc' };
  const rebuildOptions = {
    preferLiveCanonicalDeck: false,
    canonicalDeckBaseline: { slides: [{ id: 'baseline-slide' }] }
  };
  let captured = null;

  const result = canonicalUi.resolveStudioEditorCanonicalDeck(sourceDoc, {
    buildOptions: rebuildOptions,
    buildCanonicalDeck(doc, options) {
      captured = { doc, options };
      return { slides: [{ id: 'rebuilt-slide' }] };
    }
  });

  assert.deepEqual(captured, { doc: sourceDoc, options: rebuildOptions });
  assert.deepEqual(result, { slides: [{ id: 'rebuilt-slide' }] });
});

test('canonical UI reader honors deterministic rebuild options over live state', () => {
  const sourceDoc = { id: 'deterministic-live-doc' };
  const liveCanonicalDeck = { slides: [{ id: 'live-slide' }] };
  const rebuiltCanonicalDeck = { slides: [{ id: 'rebuilt-slide' }] };
  let liveCalls = 0;
  let buildOptions = null;

  const result = canonicalUi.resolveStudioEditorCanonicalDeck(sourceDoc, {
    buildOptions: { preferLiveCanonicalDeck: false },
    resolveLiveCanonicalDeck() {
      liveCalls += 1;
      return liveCanonicalDeck;
    },
    buildCanonicalDeck(_doc, options) {
      buildOptions = options;
      return rebuiltCanonicalDeck;
    }
  });

  assert.equal(result, rebuiltCanonicalDeck);
  assert.equal(liveCalls, 0);
  assert.deepEqual(buildOptions, { preferLiveCanonicalDeck: false });
});

test('canonical UI reader honors a valid explicit canonical override before pending or live state', () => {
  const overrideDeck = { slides: [{ id: 'override-slide' }] };
  let pendingCalls = 0;
  let liveCalls = 0;
  let buildCalls = 0;

  const result = canonicalUi.resolveStudioEditorCanonicalDeck({}, {
    buildOptions: { canonicalDeckOverride: overrideDeck },
    getPendingCanonicalDeck() {
      pendingCalls += 1;
      return { slides: [{ id: 'pending-slide' }] };
    },
    resolveLiveCanonicalDeck() {
      liveCalls += 1;
      return { slides: [{ id: 'live-slide' }] };
    },
    buildCanonicalDeck() {
      buildCalls += 1;
      return { slides: [{ id: 'rebuilt-slide' }] };
    }
  });

  assert.equal(result, overrideDeck);
  assert.equal(pendingCalls, 0);
  assert.equal(liveCalls, 0);
  assert.equal(buildCalls, 0);
});

test('canonical UI reader rejects malformed live state before rebuilding', () => {
  const rebuiltCanonicalDeck = { kind: 'slidenext.deck', schemaVersion: 1, slides: [] };
  let buildCalls = 0;

  const result = canonicalUi.resolveStudioEditorCanonicalDeck({}, {
    resolveLiveCanonicalDeck() {
      return { invalid: true };
    },
    buildCanonicalDeck() {
      buildCalls += 1;
      return rebuiltCanonicalDeck;
    },
    isCanonicalDeck(value) {
      return value === rebuiltCanonicalDeck;
    }
  });

  assert.equal(result, rebuiltCanonicalDeck);
  assert.equal(buildCalls, 1);
});

test('canonical UI reader fails closed for malformed rebuilt state', () => {
  const result = canonicalUi.resolveStudioEditorCanonicalDeck({}, {
    buildCanonicalDeck() {
      return { invalid: true };
    },
    isCanonicalDeck() {
      return false;
    }
  });

  assert.equal(result, null);
});
