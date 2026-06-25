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
});

test('handleStudioPersistenceSuccess updates the active deck persistence state only', () => {
  const context = editorPersistence.createStudioPersistenceActionContext(
    '/presentations/onboarding-presentation/index.html',
    '<html></html>'
  );
  const calls = [];

  const applied = editorPersistence.handleStudioPersistenceSuccess(context, {
    getCurrentPresentationUrl: () => '/presentations/onboarding-presentation/index.html',
    setPersistedHtml(nextHtml) {
      calls.push(['setPersistedHtml', nextHtml]);
    },
    onSuccess(nextContext) {
      calls.push(['onSuccess', nextContext.presentationUrl]);
    }
  });

  assert.equal(applied, true);
  assert.deepEqual(calls, [
    ['setPersistedHtml', '<html></html>'],
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
