const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-version-rename-state-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-version-rename-state-accessors.js');

test('version rename accessors delegate bridge state operations', () => {
  const bridge = {
    getState: () => ({ filename: 'draft.html', context: { id: 'one' } }),
    setState: (value) => value,
    clear: () => ({ filename: '', context: null })
  };
  const accessors = accessorsApi.createStudioEditorVersionRenameStateAccessors({ bridge });

  assert.deepEqual(accessors.getState(), {
    filename: 'draft.html',
    context: { id: 'one' }
  });
  assert.deepEqual(accessors.setState({ filename: 'next.html', context: null }), {
    filename: 'next.html',
    context: null
  });
  assert.deepEqual(accessors.clear(), { filename: '', context: null });
});

test('version rename accessors preserve the legacy fallback state contract', () => {
  let state = { filename: 'draft.html', context: { id: 'one' } };
  const accessors = accessorsApi.createStudioEditorVersionRenameStateAccessors({
    getFallbackState: () => state,
    setFallbackState: (nextState = {}) => {
      state = {
        filename: typeof nextState.filename === 'string' ? nextState.filename : '',
        context: Object.prototype.hasOwnProperty.call(nextState, 'context')
          ? nextState.context
          : null
      };
      return state;
    }
  });

  assert.deepEqual(accessors.getState(), {
    filename: 'draft.html',
    context: { id: 'one' }
  });
  assert.deepEqual(accessors.setState({ filename: 'next.html', context: null }), {
    filename: 'next.html',
    context: null
  });
  assert.deepEqual(accessors.clear(), { filename: '', context: null });
});

test('version rename accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorVersionRenameStateAccessors,
    'object'
  );
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorVersionRenameStateAccessors
      .createStudioEditorVersionRenameStateAccessors,
    'function'
  );
});

test('editor loads version rename accessors after the rename state bridge', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-version-rename-state-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /studioEditorShellStateRuntime\.versionRenameStateAccessors/);
  assert.match(fileContent, /studioEditorVersionRenameStateAccessors/);
});
