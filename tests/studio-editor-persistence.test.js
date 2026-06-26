const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

test('createStudioPersistenceActionContext normalizes persistence state', () => {
  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>'
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      { shouldUpdatePersistedHtml: false }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: false
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      { sessionToken: 9 }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      sessionToken: 9
    }
  );

  assert.deepEqual(
    editorPersistence.createStudioPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
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
      }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck({
        metadata: {
          title: 'Project Onboarding'
        },
        slides: [
          {
            id: 'slide-1',
            nodes: []
          }
        ]
      })
    }
  );
});

test('createStudioVersionPersistenceActionContext always disables persisted-html writes for checkpoint-only flows', () => {
  assert.deepEqual(
    editorPersistence.createStudioVersionPersistenceActionContext(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      { shouldUpdatePersistedHtml: true, sessionToken: 12 }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: false,
      sessionToken: 12
    }
  );
});

test('buildStudioSaveRequestBody includes canonical deck sidecars only when they are valid', () => {
  const canonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };

  assert.deepEqual(
    editorPersistence.buildStudioSaveRequestBody(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        isAutoSave: true,
        versionLabel: 'Auto: Updated Deck',
        canonicalDeck
      }
    ),
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html></html>',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck',
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );

  assert.deepEqual(
    editorPersistence.buildStudioSaveRequestBody(
      '/presentations/onboarding-presentation/index.html',
      '<html></html>',
      {
        canonicalDeck: {
          metadata: {
            title: 'Broken Deck'
          }
        },
        isCanonicalDeck: () => false
      }
    ),
    {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html></html>',
      isAutoSave: false
    }
  );
});

test('buildStudioPersistenceRequestPlan reuses persisted-html checks to skip redundant save payloads', () => {
  const canonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: []
      }
    ]
  };
  const buildSaveRequestBodyCalls = [];

  const persistedPlan = editorPersistence.buildStudioPersistenceRequestPlan(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    {
      isPersistedHtml: () => true,
      buildSaveRequestBody() {
        buildSaveRequestBodyCalls.push('persisted');
        return { shouldNotBeBuilt: true };
      },
      sessionToken: 4
    }
  );

  assert.deepEqual(persistedPlan, {
    hasPersistedCurrentHtml: true,
    saveRequestBody: null,
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: false,
      sessionToken: 4
    }
  });
  assert.deepEqual(buildSaveRequestBodyCalls, []);

  const dirtyPlan = editorPersistence.buildStudioPersistenceRequestPlan(
    '/presentations/onboarding-presentation/index.html',
    '<html>changed</html>',
    {
      isPersistedHtml: () => false,
      buildSaveRequestBody() {
        buildSaveRequestBodyCalls.push('dirty');
        return editorPersistence.buildStudioSaveRequestBody(
          '/presentations/onboarding-presentation/index.html',
          '<html>changed</html>',
          {
            canonicalDeck
          }
        );
      },
      sessionToken: 5
    }
  );

  assert.deepEqual(dirtyPlan, {
    hasPersistedCurrentHtml: false,
    saveRequestBody: {
      htmlPath: '/presentations/onboarding-presentation/index.html',
      htmlContent: '<html>changed</html>',
      isAutoSave: false,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    },
    persistenceContext: {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html>changed</html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck),
      sessionToken: 5
    }
  });
  assert.deepEqual(buildSaveRequestBodyCalls, ['dirty']);
});

test('isStudioPersistedHtml only reports true when a non-empty persisted html snapshot matches exactly', () => {
  assert.equal(
    editorPersistence.isStudioPersistedHtml('<html></html>', '<html></html>'),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistedHtml('<html></html>', ''),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistedHtml('<html>changed</html>', '<html></html>'),
    false
  );
});

test('isStudioPersistenceTaskStale rejects missing or stale deck/session combinations', () => {
  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale('', {
      currentPresentationUrl: '/presentations/onboarding-presentation/index.html'
    }),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/ai-tools-presentation/index.html'
      }
    ),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/onboarding-presentation/index.html'
      }
    ),
    false
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
        currentSessionToken: 4,
        sessionToken: 5
      }
    ),
    true
  );

  assert.equal(
    editorPersistence.isStudioPersistenceTaskStale(
      '/presentations/onboarding-presentation/index.html',
      {
        currentPresentationUrl: '/presentations/onboarding-presentation/index.html',
        currentSessionToken: 5,
        sessionToken: 5
      }
    ),
    false
  );
});

test('resolveStudioPersistenceCanonicalDeck normalizes valid deck-like payloads and rejects malformed ones', () => {
  assert.deepEqual(
    editorPersistence.resolveStudioPersistenceCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }),
    canonicalDeckModel.createCanonicalDeck({
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    })
  );

  assert.equal(
    editorPersistence.resolveStudioPersistenceCanonicalDeck({
      metadata: {
        title: 'Broken Deck'
      }
    }),
    null
  );
});

test('handleStudioPersistenceSuccess updates the active deck persistence state only', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    {
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      }
    }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    setPersistedHtml(nextHtml) {
      calls.push(['setPersistedHtml', nextHtml]);
    },
    setPersistedCanonicalDeck(nextCanonicalDeck) {
      calls.push(['setPersistedCanonicalDeck', nextCanonicalDeck.kind]);
    },
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['setPersistedHtml', '<html></html>'],
    ['setPersistedCanonicalDeck', 'slidenext.deck'],
    ['onSuccess', '/presentations/onboarding-presentation/index.html']
  ]);
});

test('handleStudioPersistenceSuccess skips stale deck completions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    setPersistedHtml() {
      calls.push(['setPersistedHtml']);
    },
    onSuccess() {
      calls.push(['onSuccess']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceSuccess skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 3 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 4,
    setPersistedHtml() {
      calls.push(['setPersistedHtml']);
    },
    onSuccess() {
      calls.push(['onSuccess']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioVersionPersistenceSuccess refreshes version entries only for the active deck', () => {
  const context = editorPersistence.createStudioVersionPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 8 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioVersionPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 8,
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    },
    refreshVersionEntries(presentationUrl) {
      calls.push(['refreshVersionEntries', presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['onSuccess', '/presentations/onboarding-presentation/index.html'],
    ['refreshVersionEntries', '/presentations/onboarding-presentation/index.html']
  ]);
});

test('handleStudioVersionPersistenceSuccess skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioVersionPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 10 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioVersionPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 11,
    onSuccess() {
      calls.push(['onSuccess']);
    },
    refreshVersionEntries() {
      calls.push(['refreshVersionEntries']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceFailure reports failures only for the active deck', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceFailure(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    onFailure(nextContext) {
      calls.push(['onFailure', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [['onFailure', '/presentations/onboarding-presentation/index.html']]);
});

test('handleStudioPersistenceFailure skips stale deck failures', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceFailure(context, {
    getCurrentPresentationUrl: () => '/presentations/ai-tools-presentation/index.html',
    onFailure() {
      calls.push(['onFailure']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});

test('handleStudioPersistenceFailure skips stale same-url editor sessions', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>',
    { sessionToken: 6 }
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceFailure(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    getCurrentSessionToken: () => 7,
    onFailure() {
      calls.push(['onFailure']);
    }
  });

  assert.equal(applied, false);
  assert.deepEqual(calls, []);
});
