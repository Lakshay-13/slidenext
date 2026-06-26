const test = require('node:test');
const assert = require('node:assert/strict');

const deckLoader = require('../shared/deck-loader.js');

test('derivePresentationMetadataUrl maps presentation html urls onto presentation.json sidecars', () => {
  assert.equal(
    deckLoader.derivePresentationMetadataUrl('presentations/onboarding-presentation/index.html'),
    'presentations/onboarding-presentation/presentation.json'
  );

  assert.equal(
    deckLoader.derivePresentationMetadataUrl('/presentations/onboarding-presentation/index.html'),
    '/presentations/onboarding-presentation/presentation.json'
  );

  assert.equal(
    deckLoader.derivePresentationMetadataUrl('presentations/onboarding-presentation/slides.html'),
    ''
  );
});

test('buildPresentationMetadataSeed derives stable metadata defaults from a presentation url', () => {
  assert.deepEqual(
    deckLoader.buildPresentationMetadataSeed('presentations/onboarding-presentation/index.html', 'Project Onboarding'),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: 'presentations/onboarding-presentation/index.html'
    }
  );
});

test('normalizeLoadedPresentationMetadata keeps a normalized canonical deck when the sidecar is valid', () => {
  const metadata = deckLoader.normalizeLoadedPresentationMetadata({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }
  });

  assert.equal(metadata.canonicalDeck.kind, 'slidenext.deck');
  assert.equal(metadata.canonicalDeck.metadata.title, 'Project Onboarding');
  assert.equal(metadata.canonicalDeck.slides.length, 1);
});

test('normalizeLoadedPresentationMetadata strips malformed canonical sidecars from fetched metadata', () => {
  const metadata = deckLoader.normalizeLoadedPresentationMetadata({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: 'Broken Deck'
      }
    }
  });

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html'
  });
});
