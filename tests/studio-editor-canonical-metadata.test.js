const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const metadata = require('../shared/studio-editor-canonical-metadata.js');

test('buildStudioCanonicalMetadataDeck applies a slide metadata patch to a supplied baseline', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', notes: 'Before' }]
  });
  const slide = { id: 'slide-1' };
  const result = metadata.buildStudioCanonicalMetadataDeck(slide, {
    notes: 'After'
  }, {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck
  });

  assert.equal(result.slides[0].notes, 'After');
  assert.equal(sourceDeck.slides[0].notes, 'Before');
});

test('createStudioCanonicalMetadataMutationBuilders shares the canonical baseline', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', section: 'Before' }]
  });
  const calls = [];
  const builders = metadata.createStudioCanonicalMetadataMutationBuilders({
    canonicalDeckApi: canonicalDeck,
    buildCanonicalDeck(sourceDocument) {
      calls.push(sourceDocument);
      return sourceDeck;
    }
  });

  const baseline = builders.buildCanonicalMetadataBaseline({ sourceDocument: { id: 'frame' } });
  const result = builders.buildCanonicalMetadataDeck({ id: 'slide-1' }, {
    section: 'After'
  }, {
    canonicalDeckBeforeMutation: baseline
  });

  assert.deepEqual(calls, [{ id: 'frame' }]);
  assert.equal(result.slides[0].section, 'After');
});
