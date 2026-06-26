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
