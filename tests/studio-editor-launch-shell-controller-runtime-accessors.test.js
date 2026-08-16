const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-launch-shell-controller-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('launch shell controller runtime accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { launch() {}, close() {} };
  const runtimeApi = {
    createStudioEditorLaunchShellController(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    documentRef: { id: 'document' },
    getLaunchController: () => ({ launch() {} }),
    shellController: { name: 'shell' }
  };

  const result = accessors.createStudioEditorLaunchShellControllerRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('launch shell controller runtime accessors fail closed without a controller factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorLaunchShellControllerRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorLaunchShellControllerRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

test('index routes launch shell construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-launch-shell-controller-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorLaunchShellControllerRuntimeAccessorsApi\s*\.\s*createStudioEditorLaunchShellControllerRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLaunchShellController\.createStudioEditorLaunchShellController\(/
  );
});
