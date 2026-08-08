const test = require('node:test');
const assert = require('node:assert/strict');

const themeController = require('../shared/studio-editor-theme-controller.js');

test('syncs the iframe theme through the shared theme view and live document state', () => {
  const iframeDoc = { id: 'iframe-document' };
  const calls = [];
  const controller = themeController.createStudioEditorThemeController({
    themeViewApi: {
      syncStudioIframeTheme(options) {
        calls.push(options);
        return true;
      }
    },
    getIframeDocument: () => iframeDoc,
    resolveDarkMode: () => false
  });

  assert.equal(controller.syncIframeTheme(), true);
  assert.deepEqual(calls, [{ iframeDoc, isDark: false }]);
});

test('toggles the global theme and wires the shared view callback back to iframe sync', () => {
  const callbacks = [];
  const documentRef = { id: 'document' };
  const localStorageRef = { id: 'storage' };
  const controller = themeController.createStudioEditorThemeController({
    themeViewApi: {
      toggleStudioGlobalTheme(options) {
        callbacks.push(options);
        options.syncIframeTheme();
        return { didApply: true };
      }
    },
    documentRef,
    localStorageRef
  });

  assert.equal(controller.toggleGlobalTheme(), true);
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].documentRef, documentRef);
  assert.equal(callbacks[0].localStorageRef, localStorageRef);
  assert.equal(typeof callbacks[0].syncIframeTheme, 'function');
});

test('fails closed when the shared theme view is unavailable', () => {
  const controller = themeController.createStudioEditorThemeController({ themeViewApi: null });

  assert.equal(controller.toggleGlobalTheme(), false);
  assert.equal(controller.syncIframeTheme(), false);
});
