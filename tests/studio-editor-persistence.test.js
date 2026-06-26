const test = require('node:test');
const assert = require('node:assert/strict');

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
          kind: 'slidenext.deck',
          schemaVersion: 1,
          slides: []
        }
      }
    ),
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      cleanHtml: '<html></html>',
      shouldUpdatePersistedHtml: true,
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: []
      }
    }
  );
});

test('buildStudioSaveRequestBody includes canonical deck sidecars only when they are valid', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
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
      canonicalDeck
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
