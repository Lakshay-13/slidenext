const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const accessors = require('../shared/studio-editor-launch-controller-runtime-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('launch controller runtime accessors delegate construction and preserve runtime options', () => {
  let receivedOptions = null;
  const runtimeValue = { launch() {} };
  const runtimeApi = {
    createStudioEditorLaunchController(options) {
      receivedOptions = options;
      return runtimeValue;
    }
  };
  const runtimeOptions = {
    documentRef: { id: 'document' },
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    shellController: { name: 'shell' }
  };

  const result = accessors.createStudioEditorLaunchControllerRuntimeAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.deepEqual(result, { runtime: runtimeValue });
  assert.equal(receivedOptions, runtimeOptions);
});

test('launch controller runtime accessors fail closed without a controller factory', () => {
  assert.deepEqual(
    accessors.createStudioEditorLaunchControllerRuntimeAccessors({ runtimeApi: {} }),
    { runtime: null }
  );
  assert.deepEqual(
    accessors.createStudioEditorLaunchControllerRuntimeAccessors({ runtimeApi: null }),
    { runtime: null }
  );
});

test('index routes launch controller construction through the accessor module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-launch-controller-runtime-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-launch-controller-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorLaunchControllerShellComposition\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorLaunchControllerRuntimeAccessorsApi\s*\.\s*createStudioEditorLaunchControllerRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorLaunchController\.createStudioEditorLaunchController\(/
  );
});
