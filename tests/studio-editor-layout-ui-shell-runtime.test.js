const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layoutUiShellRuntime = require('../shared/studio-editor-layout-ui-shell-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('layout UI shell runtime forwards mode, conversion, and document dependencies', () => {
  let receivedOptions = null;
  const bridge = { syncLayoutModeControl() {}, syncLayoutConversionControl() {} };
  const layoutUiBridgeApi = {
    createStudioEditorLayoutUiBridge(options) {
      receivedOptions = options;
      return bridge;
    }
  };
  const options = {
    layoutUiBridgeApi,
    layoutModeController: { name: 'mode-controller' },
    layoutConversionController: { name: 'conversion-controller' },
    layoutConversionViewApi: { name: 'conversion-view' },
    documentRef: { id: 'editor-document' },
    getDocument: () => ({ id: 'iframe-document' })
  };
  const runtime = layoutUiShellRuntime.createStudioEditorLayoutUiShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.layoutUiBridge, bridge);
  assert.equal(receivedOptions.layoutModeController, options.layoutModeController);
  assert.equal(receivedOptions.layoutConversionController, options.layoutConversionController);
  assert.equal(receivedOptions.layoutConversionViewApi, options.layoutConversionViewApi);
  assert.equal(receivedOptions.documentRef, options.documentRef);
  assert.equal(receivedOptions.getDocument, options.getDocument);
});

test('layout UI shell runtime fails closed when the shared bridge is unavailable', () => {
  const runtime = layoutUiShellRuntime.createStudioEditorLayoutUiShellRuntime({
    layoutUiBridgeApi: null
  });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.layoutUiBridge, null);
});

test('index routes layout UI bridge construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-ui-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorLayoutUiShellRuntimeApi\s*\.\s*createStudioEditorLayoutUiShellRuntime\(/
  );
  assert.match(
    fileContent,
    /studioEditorLayoutUiBridge = studioEditorLayoutUiShellRuntime/
  );
});
