const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const autoVersionRuntime = require('../shared/studio-editor-auto-version-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('auto-version runtime composes controller and executor dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorAutoVersionController(options) {
      calls.push(['controller', options]);
      return { name: 'controller' };
    },
    createStudioEditorAutoVersionExecutor(options) {
      calls.push(['executor', options]);
      return { name: 'executor' };
    }
  };
  const options = {
    controllerApi,
    versionActions: { shouldDebounceStudioAutoVersion() {} },
    captureSessionState: () => ({}),
    getTimer: () => null,
    clearScheduledTimer: () => {},
    setTimer: () => {},
    clearStoredTimer: () => {},
    schedule: () => null,
    execute: () => {},
    persistenceApi: {},
    isTaskStale: () => false,
    getDocument: () => null,
    resolvePersistenceState: () => null,
    isPersistedState: () => false,
    buildSaveRequestBody: () => ({}),
    saveCheckpoint: () => {},
    logger: console
  };

  assert.deepEqual(
    autoVersionRuntime.createStudioEditorAutoVersionRuntime(options),
    {
      autoVersionController: { name: 'controller' },
      autoVersionExecutor: { name: 'executor' }
    }
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0][1].captureSessionState, options.captureSessionState);
  assert.equal(calls[0][1].execute, options.execute);
  assert.equal(calls[1][1].resolvePersistenceState, options.resolvePersistenceState);
  assert.equal(calls[1][1].saveCheckpoint, options.saveCheckpoint);
});

test('index wires auto-version controller and executor through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-auto-version-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-auto-version-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorAutoVersionShellRuntime\.createStudioEditorAutoVersionShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAutoVersionController\.createStudioEditorAutoVersionController\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorAutoVersionController\.createStudioEditorAutoVersionExecutor\(/
  );
});
