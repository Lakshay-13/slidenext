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
