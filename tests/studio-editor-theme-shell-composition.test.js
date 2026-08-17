const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const composition = require('../shared/studio-editor-theme-shell-composition.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('theme shell composition wires runtime dependencies and binds controls', () => {
  const runtime = { themeController: { id: 'theme-controller' } };
  const runtimeAccessors = { runtime };
  const documentRef = { id: 'document' };
  let runtimeOptions = null;
  let bindingOptions = null;

  const result = composition.createStudioEditorThemeShellComposition({
    runtimeAccessorsApi: {
      createStudioEditorThemeRuntimeAccessors(options) {
        runtimeOptions = options;
        return runtimeAccessors;
      }
    },
    runtimeApi: { id: 'shell-runtime' },
    themeRuntimeApi: { id: 'theme-runtime' },
    controllerApi: { id: 'controller' },
    themeViewApi: { id: 'theme-view' },
    documentRef,
    localStorageRef: { id: 'storage' },
    getIframeDocument: () => ({ id: 'iframe-document' }),
    resolveDarkMode: () => true
  });
  runtime.themeController.bindStudioEditorThemeButtons = (options) => {
    bindingOptions = options;
  };

  const reboundResult = composition.createStudioEditorThemeShellComposition({
    runtimeAccessorsApi: {
      createStudioEditorThemeRuntimeAccessors() {
        return runtimeAccessors;
      }
    },
    documentRef
  });

  assert.equal(result.runtimeAccessors, runtimeAccessors);
  assert.equal(result.runtime, runtime);
  assert.equal(result.themeController, runtime.themeController);
  assert.equal(runtimeOptions.runtimeApi.id, 'shell-runtime');
  assert.equal(runtimeOptions.themeRuntimeApi.id, 'theme-runtime');
  assert.equal(runtimeOptions.runtimeOptions.controllerApi.id, 'controller');
  assert.equal(runtimeOptions.runtimeOptions.themeViewApi.id, 'theme-view');
  assert.equal(runtimeOptions.runtimeOptions.documentRef, documentRef);
  assert.equal(reboundResult.themeController, runtime.themeController);
  assert.equal(bindingOptions.documentRef, documentRef);
});

test('theme shell composition fails closed without runtime accessors', () => {
  assert.deepEqual(
    composition.createStudioEditorThemeShellComposition({ runtimeAccessorsApi: null }),
    { runtimeAccessors: null, runtime: null, themeController: null }
  );
});

test('index routes theme assembly through the shell composition', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const runtimeAccessorsIndex = source.indexOf(
    '<script src="/shared/studio-editor-theme-runtime-accessors.js"></script>'
  );
  const compositionIndex = source.indexOf(
    '<script src="/shared/studio-editor-theme-shell-composition.js"></script>'
  );

  assert.ok(runtimeAccessorsIndex >= 0);
  assert.ok(compositionIndex > runtimeAccessorsIndex);
  assert.match(source, /studioEditorThemeShellCompositionApi/);
  assert.match(source, /createStudioEditorThemeShellComposition/);
  assert.doesNotMatch(
    source,
    /studioEditorThemeRuntimeAccessorsApi\s*\.\s*createStudioEditorThemeRuntimeAccessors\(/
  );
  assert.doesNotMatch(
    source,
    /SlideNextStudioEditorThemeController\.createStudioEditorThemeController\(/
  );
});
