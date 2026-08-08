const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalTheme = require('../shared/studio-editor-canonical-theme.js');

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
