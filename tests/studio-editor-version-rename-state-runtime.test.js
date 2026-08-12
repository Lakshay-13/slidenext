const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const versionRenameStateRuntime = require('../shared/studio-editor-version-rename-state-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version rename state runtime composes the version rename state store', () => {
  const calls = [];
  const stateStore = {
    createStudioEditorVersionRenameStateStore(options) {
      calls.push(options);
      return { name: 'version-rename-state' };
    }
  };

  assert.deepEqual(
    versionRenameStateRuntime.createStudioEditorVersionRenameStateRuntime({ stateStore }),
    { versionRenameStateStore: { name: 'version-rename-state' } }
  );
  assert.deepEqual(calls, [{}]);
});

test('index wires version rename state through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-version-rename-state-runtime\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.versionRenameStateRuntime/);
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorVersionRenameStateStore\.createStudioEditorVersionRenameStateStore\(\{\}/
  );
});
