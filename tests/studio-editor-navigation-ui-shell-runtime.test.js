const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const navigationUiShellRuntime = require('../shared/studio-editor-navigation-ui-shell-runtime.js');
const navigationUiAccessors = require('../shared/studio-editor-navigation-ui-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('navigation UI shell runtime forwards navigation and thumbnail controllers', () => {
  let receivedOptions = null;
  const bridge = { syncStudioChromeToActiveSlide() {} };
  const navigationUiBridgeApi = {
    createStudioEditorNavigationUiBridge(options) {
      receivedOptions = options;
      return bridge;
    }
  };
  const options = {
    navigationUiBridgeApi,
    navigationSync: { name: 'navigation-sync' },
    thumbnailController: { name: 'thumbnail-controller' }
  };
  const runtime = navigationUiShellRuntime
    .createStudioEditorNavigationUiShellRuntime(options);

  assert.equal(runtime.isAvailable, true);
  assert.equal(runtime.navigationUiBridge, bridge);
  assert.equal(receivedOptions.navigationSync, options.navigationSync);
  assert.equal(receivedOptions.thumbnailController, options.thumbnailController);
});

test('navigation UI shell runtime fails closed when the shared bridge is unavailable', () => {
  const runtime = navigationUiShellRuntime
    .createStudioEditorNavigationUiShellRuntime({ navigationUiBridgeApi: null });

  assert.equal(runtime.isAvailable, false);
  assert.equal(runtime.navigationUiBridge, null);
});

test('navigation UI accessors compose the shell runtime and expose the available bridge', () => {
  const bridge = { syncStudioChromeToActiveSlide() {} };
  const runtimeApi = {
    createStudioEditorNavigationUiShellRuntime(options) {
      assert.equal(options.navigationSync.name, 'navigation-sync');
      assert.equal(options.thumbnailController.name, 'thumbnail-controller');
      return { isAvailable: true, navigationUiBridge: bridge };
    }
  };
  const accessors = navigationUiAccessors.createStudioEditorNavigationUiAccessors({
    runtimeApi,
    navigationUiBridgeApi: { name: 'bridge-api' },
    navigationSync: { name: 'navigation-sync' },
    thumbnailController: { name: 'thumbnail-controller' }
  });

  assert.equal(accessors.isAvailable, true);
  assert.equal(accessors.navigationUiBridge, bridge);
  assert.equal(accessors.runtime.navigationUiBridge, bridge);
});

test('navigation UI accessors fail closed when the shell runtime is unavailable', () => {
  const accessors = navigationUiAccessors.createStudioEditorNavigationUiAccessors({
    runtimeApi: null
  });

  assert.equal(accessors.isAvailable, false);
  assert.equal(accessors.navigationUiBridge, null);
});

test('index routes navigation UI bridge construction through the shell runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-navigation-ui-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /studioEditorNavigationUiAccessorsApi\s*\.\s*createStudioEditorNavigationUiAccessors\(/
  );
  assert.match(
    fileContent,
    /studioEditorNavigationUiBridge = studioEditorNavigationUiAccessors/
  );
});
