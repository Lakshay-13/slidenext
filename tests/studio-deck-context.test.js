const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
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

test('loadStudioPresentationMetadata skips committing stale same-url editor sessions', async () => {
  const fetchDeferred = createDeferred();
  const committedMetadata = [];
  let currentPresentationUrl = '/presentations/onboarding-presentation/index.html';
  let currentSessionToken = 4;

  const metadataPromise = deckContext.loadStudioPresentationMetadata(
    currentPresentationUrl,
    'Project Onboarding',
    {
      fetchImpl: async () => fetchDeferred.promise,
      sessionToken: 4,
      getCurrentPresentationUrl: () => currentPresentationUrl,
      getCurrentSessionToken: () => currentSessionToken,
      setCurrentPresentationMetadata: (metadata) => {
        committedMetadata.push(metadata);
      }
    }
  );

  currentSessionToken = 5;
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

test('buildStudioCanonicalDeck returns the validated deck from the canonical builder', () => {
  const doc = { label: 'doc' };
  const presentationMetadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: '/presentations/onboarding-presentation/index.html'
  };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const builderCalls = [];
  const result = deckContext.buildStudioCanonicalDeck(doc, {
    currentPresentationMetadata: presentationMetadata,
    presentationUrl: '/presentations/onboarding-presentation/index.html',
    getSlideId: () => 'slide-1',
    getNodeId: () => 'node-1',
    buildCanonicalDeckFromDocument(nextDoc, options) {
      builderCalls.push({ nextDoc, options });
      return canonicalDeck;
    },
    isCanonicalDeck: (deck) => deck === canonicalDeck
  });

  assert.equal(result, canonicalDeck);
  assert.equal(builderCalls.length, 1);
  assert.equal(builderCalls[0].nextDoc, doc);
  assert.deepEqual(builderCalls[0].options, {
    presentationMetadata,
    sourcePath: '/presentations/onboarding-presentation/index.html',
    getSlideId: builderCalls[0].options.getSlideId,
    getNodeId: builderCalls[0].options.getNodeId
  });
  assert.equal(builderCalls[0].options.getSlideId(), 'slide-1');
  assert.equal(builderCalls[0].options.getNodeId(), 'node-1');
});

test('buildStudioCanonicalDeck prefers a valid stored canonical deck from presentation metadata', () => {
  const storedCanonicalDeck = {
    metadata: {
      id: 'onboarding-presentation',
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        title: 'Intro',
        nodes: [
          {
            id: 'node-1',
            type: 'html'
          }
        ]
      }
    ]
  };
  const result = deckContext.buildStudioCanonicalDeck({ label: 'doc' }, {
    currentPresentationMetadata: {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: '/presentations/onboarding-presentation/index.html',
      canonicalDeck: storedCanonicalDeck
    },
    buildCanonicalDeckFromDocument() {
      throw new Error('DOM import should not run when stored canonical metadata is valid');
    }
  });

  assert.deepEqual(result, canonicalDeck.createCanonicalDeck(storedCanonicalDeck));
});

test('buildStudioCanonicalDeck falls back to DOM import when stored canonical metadata is malformed', () => {
  const doc = { label: 'doc' };
  const builderCalls = [];
  const importedDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };

  const result = deckContext.buildStudioCanonicalDeck(doc, {
    currentPresentationMetadata: {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: '/presentations/onboarding-presentation/index.html',
      canonicalDeck: {
        metadata: {
          title: 'Broken Deck'
        }
      }
    },
    buildCanonicalDeckFromDocument(nextDoc) {
      builderCalls.push(nextDoc);
      return importedDeck;
    },
    isCanonicalDeck: (deck) => deck === importedDeck
  });

  assert.equal(result, importedDeck);
  assert.deepEqual(builderCalls, [doc]);
});

test('buildStudioCanonicalDeck returns null when the canonical builder yields malformed data', () => {
  const result = deckContext.buildStudioCanonicalDeck({ label: 'doc' }, {
    buildCanonicalDeckFromDocument() {
      return {
        metadata: {
          title: 'Broken Deck'
        }
      };
    },
    isCanonicalDeck: () => false
  });

  assert.equal(result, null);
});
