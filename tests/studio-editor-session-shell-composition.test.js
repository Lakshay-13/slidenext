const test = require('node:test');
const assert = require('node:assert/strict');

const composition = require('../shared/studio-editor-session-shell-composition.js');

test('session shell composition resolves runtimes and preserves session options', () => {
  let receivedOptions = null;
  const runtimeOptions = {
    getPresentationUrl: () => '/presentations/example/index.html',
    getSessionToken: () => 4,
    resolveLoadOptions: () => ({})
  };
  const runtime = { sessionStateController: { name: 'session-state' } };
  const accessorsApi = {
    createStudioEditorSessionRuntimeAccessors(options) {
      receivedOptions = options;
      return { runtime };
    }
  };
  const runtimeApi = { name: 'session-shell-runtime' };
  const sessionRuntimeApi = { name: 'session-runtime' };

  const result = composition.createStudioEditorSessionShellComposition({
    accessorsApi,
    runtimeApi,
    sessionRuntimeApi,
    runtimeOptions
  });

  assert.equal(result.accessors.runtime, runtime);
  assert.equal(result.runtime, runtime);
  assert.equal(receivedOptions.runtimeApi, runtimeApi);
  assert.equal(receivedOptions.sessionRuntimeApi, sessionRuntimeApi);
  assert.equal(receivedOptions.runtimeOptions, runtimeOptions);
});

test('session shell composition fails closed when accessors are unavailable', () => {
  assert.deepEqual(
    composition.createStudioEditorSessionShellComposition({ accessorsApi: null }),
    { accessors: null, runtime: null }
  );
});
