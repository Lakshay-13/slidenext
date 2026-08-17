const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const layoutUiShellRuntime = require('../shared/studio-editor-layout-ui-shell-runtime.js');
const layoutUiAccessors = require('../shared/studio-editor-layout-ui-accessors.js');

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

test('layout UI accessors compose the shell runtime and preserve its result', () => {
  const runtime = { isAvailable: true, layoutUiBridge: { name: 'bridge' } };
  const runtimeOptions = { documentRef: { id: 'editor-document' } };
  const calls = [];
  const runtimeApi = {
    createStudioEditorLayoutUiShellRuntime(options) {
      calls.push(options);
      return runtime;
    }
  };
  const accessors = layoutUiAccessors.createStudioEditorLayoutUiAccessors({
    runtimeApi,
    runtimeOptions
  });

  assert.equal(accessors.runtime, runtime);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].documentRef, runtimeOptions.documentRef);
  assert.notEqual(calls[0], runtimeOptions);
});

test('layout UI accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = layoutUiAccessors.createStudioEditorLayoutUiAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.runtime, null);
});

test('index routes layout UI bridge construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-ui-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-ui-accessors\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-layout-ui-shell-composition\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /createStudioEditorLayoutUiShellComposition\(/
  );
  assert.doesNotMatch(
    fileContent,
    /studioEditorLayoutUiAccessorsApi\s*\.\s*createStudioEditorLayoutUiAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorLayoutUiBridge = studioEditorLayoutUiShellRuntime/
  );
});
