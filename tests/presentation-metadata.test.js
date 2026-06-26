const test = require('node:test');
const assert = require('node:assert/strict');

const presentationMetadata = require('../shared/presentation-metadata.js');

test('derivePresentationMetadataPath maps presentation html files to presentation.json sidecars', () => {
  assert.equal(
    presentationMetadata.derivePresentationMetadataPath('presentations/onboarding-presentation/index.html'),
    'presentations/onboarding-presentation/presentation.json'
  );
  assert.equal(
    presentationMetadata.derivePresentationMetadataPath('/presentations/onboarding-presentation/index.html'),
    '/presentations/onboarding-presentation/presentation.json'
  );
  assert.equal(
    presentationMetadata.derivePresentationMetadataPath('presentations/onboarding-presentation/slides.html'),
    ''
  );
});

test('buildPresentationMetadataSeed derives stable metadata defaults from an html path', () => {
  assert.deepEqual(
    presentationMetadata.buildPresentationMetadataSeed('presentations/onboarding-presentation/index.html', 'Project Onboarding'),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: 'presentations/onboarding-presentation/index.html'
    }
  );
});

test('mergePresentationCanonicalDeck preserves metadata and only stores valid canonical decks', () => {
  const metadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    tags: ['Onboarding'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'stale-slide' }]
    }
  };
  const nextCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1' }]
  };

  assert.deepEqual(
    presentationMetadata.mergePresentationCanonicalDeck(metadata, nextCanonicalDeck),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      tags: ['Onboarding'],
      canonicalDeck: nextCanonicalDeck
    }
  );

  assert.deepEqual(
    presentationMetadata.mergePresentationCanonicalDeck(metadata, {
      metadata: {
        title: 'Broken Deck'
      }
    }, {
      isCanonicalDeck: () => false
    }),
    metadata
  );
});

test('stripPresentationCanonicalDeck removes stale canonical sidecars without disturbing other metadata', () => {
  assert.deepEqual(
    presentationMetadata.stripPresentationCanonicalDeck({
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      tags: ['Onboarding'],
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-1' }]
      }
    }),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      tags: ['Onboarding']
    }
  );

  assert.deepEqual(
    presentationMetadata.stripPresentationCanonicalDeck({
      id: 'onboarding-presentation',
      title: 'Project Onboarding'
    }),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding'
    }
  );
});
