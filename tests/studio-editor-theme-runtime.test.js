const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const themeRuntime = require('../shared/studio-editor-theme-runtime.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('theme runtime composes global and iframe theme dependencies', () => {
  const calls = [];
  const controllerApi = {
    createStudioEditorThemeController(options) {
      calls.push(options);
      return { name: 'theme' };
    }
  };
  const options = {
    controllerApi,
    themeViewApi: {},
    documentRef: {},
    localStorageRef: {},
    getIframeDocument: () => null,
    resolveDarkMode: () => false
  };

  assert.deepEqual(
    themeRuntime.createStudioEditorThemeRuntime(options),
    { themeController: { name: 'theme' } }
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].themeViewApi, options.themeViewApi);
  assert.equal(calls[0].documentRef, options.documentRef);
  assert.equal(calls[0].localStorageRef, options.localStorageRef);
  assert.equal(calls[0].getIframeDocument, options.getIframeDocument);
  assert.equal(calls[0].resolveDarkMode, options.resolveDarkMode);
});

test('index wires theme behavior through the runtime module', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-theme-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-theme-shell-runtime\.js"><\/script>/
  );
  assert.match(
    fileContent,
    /SlideNextStudioEditorThemeShellRuntime\.createStudioEditorThemeShellRuntime\(/
  );
  assert.doesNotMatch(
    fileContent,
    /SlideNextStudioEditorThemeController\.createStudioEditorThemeController\(/
  );
});
