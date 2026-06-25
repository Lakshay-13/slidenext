const test = require('node:test');
const assert = require('node:assert/strict');

const deckContext = require('../shared/studio-deck-context.js');

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('loadStudioPresentationMetadata commits fetched metadata when the requested deck is still current', async () => {
  const fetchDeferred = createDeferred();
  const committedMetadata = [];
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';

  const metadataPromise = deckContext.loadStudioPresentationMetadata(
    currentPresentationUrl,
    'Project Onboarding',
    {
      fetchImpl: async () => fetchDeferred.promise,
      getCurrentPresentationUrl: () => currentPresentationUrl,
      setCurrentPresentationMetadata: (metadata) => {
        committedMetadata.push(metadata);
      }
    }
  );

  fetchDeferred.resolve({
    ok: true,
    async json() {
      return {
        subtitle: 'Getting Started',
        tags: ['Onboarding']
      };
    }
  });

  const metadata = await metadataPromise;

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    subtitle: 'Getting Started',
    tags: ['Onboarding']
  });
  assert.deepEqual(committedMetadata, [metadata]);
});

test('loadStudioPresentationMetadata skips committing stale metadata after the current deck changes', async () => {
  const fetchDeferred = createDeferred();
  const committedMetadata = [];
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';

  const metadataPromise = deckContext.loadStudioPresentationMetadata(
    currentPresentationUrl,
    'Project Onboarding',
    {
      fetchImpl: async () => fetchDeferred.promise,
      getCurrentPresentationUrl: () => currentPresentationUrl,
      setCurrentPresentationMetadata: (metadata) => {
        committedMetadata.push(metadata);
      }
    }
  );

  currentPresentationUrl = '/presentations/ai-tools-presentation/index.html';
  fetchDeferred.resolve({
    ok: true,
    async json() {
      return {
        subtitle: 'Getting Started',
        tags: ['Onboarding']
      };
    }
  });

  const metadata = await metadataPromise;

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html',
    subtitle: 'Getting Started',
    tags: ['Onboarding']
  });
  assert.deepEqual(committedMetadata, []);
});
