const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
const canonicalTheme = require('../shared/studio-editor-canonical-theme.js');

function createDocumentRef() {
  const values = {};
  return {
    documentElement: {
      style: {
        setProperty(name, value) {
          values[name] = value;
        },
        getPropertyValue(name) {
          return values[name] || '';
        },
        removeProperty(name) {
          delete values[name];
        }
      }
    },
    values
  };
}

test('applyStudioCanonicalThemeTokenUpdates mirrors valid updates and deletions to the iframe root', () => {
  const documentRef = createDocumentRef();

  assert.equal(canonicalTheme.applyStudioCanonicalThemeTokenUpdates(documentRef, {
    '--color-primary': '#10b981',
    '--font-heading': 'Geist'
  }), true);
  assert.deepEqual(documentRef.values, {
    '--color-primary': '#10b981',
    '--font-heading': 'Geist'
  });

  assert.equal(canonicalTheme.applyStudioCanonicalThemeTokenUpdates(documentRef, {
    '--font-heading': null,
    'unsafe-name': 'red'
  }), true);
  assert.deepEqual(documentRef.values, {
    '--color-primary': '#10b981'
  });
});

test('applyStudioCanonicalThemeTokenUpdates is a no-op for invalid or unchanged updates', () => {
  const documentRef = createDocumentRef();
  documentRef.values['--color-primary'] = '#10b981';

  assert.equal(canonicalTheme.applyStudioCanonicalThemeTokenUpdates(documentRef, {
    '--color-primary': '#10b981',
    '--1invalid': 'red'
  }), false);
  assert.equal(canonicalTheme.applyStudioCanonicalThemeTokenUpdates(null, {
    '--color-primary': 'red'
  }), false);
});

test('buildStudioCanonicalThemeBaseline prefers a valid live canonical deck', () => {
  const liveDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalTheme.buildStudioCanonicalThemeBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return liveDeck;
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
    }
  });

  assert.equal(result, liveDeck);
  assert.equal(didBuildFromDocument, false);
});

test('buildStudioCanonicalThemeBaseline rejects invalid compatibility baselines', () => {
  let rebuildCalls = 0;
  const result = canonicalTheme.buildStudioCanonicalThemeBaseline({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeckBaseline: () => ({ invalid: true }),
    buildCanonicalDeck: () => {
      rebuildCalls += 1;
      return { invalid: true };
    }
  });

  assert.equal(result, null);
  assert.equal(rebuildCalls, 1);
});

test('buildStudioCanonicalThemeBaseline falls back when the live canonical deck is invalid', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  let didBuildFromDocument = false;
  const result = canonicalTheme.buildStudioCanonicalThemeBaseline({
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    getCanonicalDeckBaseline() {
      return { invalid: true };
    },
    buildCanonicalDeck() {
      didBuildFromDocument = true;
      return sourceDeck;
    }
  });

  assert.equal(result, sourceDeck);
  assert.equal(didBuildFromDocument, true);
});

test('buildStudioCanonicalThemeDeck applies token updates to a supplied baseline', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    theme: { tokens: { '--color-primary': '#7028d0' } },
    slides: [{ id: 'slide-1' }]
  });
  const result = canonicalTheme.buildStudioCanonicalThemeDeck({
    '--color-primary': '#10b981',
    '--font-heading': 'Geist'
  }, {
    canonicalDeckApi: canonicalDeck,
    canonicalStateApi: canonicalState,
    canonicalDeckBeforeMutation: sourceDeck
  });

  assert.equal(result.theme.tokens['--color-primary'], '#10b981');
  assert.equal(result.theme.tokens['--font-heading'], 'Geist');
  assert.equal(sourceDeck.theme.tokens['--color-primary'], '#7028d0');
});

test('createStudioCanonicalThemeMutationBuilders builds its baseline from the supplied document', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    theme: { tokens: { '--color-primary': '#7028d0' } },
    slides: [{ id: 'slide-1' }]
  });
  const sourceDocument = { id: 'editor-doc' };
  const calls = [];
  const builders = canonicalTheme.createStudioCanonicalThemeMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeckBaseline(documentRef) {
      calls.push(documentRef);
      return sourceDeck;
    },
    buildCanonicalDeck() {
      throw new Error('mutation builder should not build the baseline');
    }
  });

  const baseline = builders.buildCanonicalThemeBaseline({ sourceDocument });
  const result = builders.buildCanonicalThemeDeck({ '--color-primary': '#f59e0b' }, {
    canonicalDeckBeforeMutation: baseline
  });

  assert.deepEqual(calls, [sourceDocument]);
  assert.equal(result.theme.tokens['--color-primary'], '#f59e0b');
});

test('buildStudioCanonicalThemeDeck fails closed when its adapter dependency is missing', () => {
  assert.equal(canonicalTheme.buildStudioCanonicalThemeDeck({ '--color-primary': 'red' }, {}), null);
  assert.equal(canonicalTheme.buildStudioCanonicalThemeDeck({ '--color-primary': 'red' }, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] })
  }).theme.tokens['--color-primary'], 'red');
});
