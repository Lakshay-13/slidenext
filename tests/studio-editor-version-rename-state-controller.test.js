const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const renameStateController = require('../shared/studio-editor-version-rename-state-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('version rename state controller owns filename and context state', () => {
  const initialContext = { presentationUrl: '/presentations/demo/index.html' };
  const controller = renameStateController.createStudioEditorVersionRenameStateController({
    initialFilename: 'draft.html',
    initialContext
  });

  assert.deepEqual(controller.getState(), {
    filename: 'draft.html',
    context: initialContext
  });
  assert.deepEqual(controller.setState({
    filename: 'renamed.html',
    context: { presentationUrl: '/presentations/next/index.html' }
  }), {
    filename: 'renamed.html',
    context: { presentationUrl: '/presentations/next/index.html' }
  });
  assert.deepEqual(controller.clear(), {
    filename: '',
    context: null
  });
});

test('editor routes version rename state through the controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /createStudioEditorVersionRenameStateController/);
  assert.match(source, /setStudioRenameVersionState\(/);
  assert.match(source, /getStudioRenameVersionState\(\)/);
  assert.doesNotMatch(source, /let renamingFilename = ''/);
  assert.doesNotMatch(source, /let renamingVersionContext = null/);
});
