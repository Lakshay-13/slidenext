const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const accessorsApi = require('../shared/studio-editor-toolbar-accessors.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');
const ACCESSORS_PATH = path.join(__dirname, '..', 'shared', 'studio-editor-toolbar-accessors.js');

test('toolbar accessors delegate grid snap and theme commands', () => {
  const calls = [];
  const accessors = accessorsApi.createStudioEditorToolbarAccessors({
    gridSnapController: {
      sync: () => {
        calls.push('grid-sync');
        return true;
      },
      toggle: () => {
        calls.push('grid-toggle');
        return true;
      }
    },
    themeController: {
      toggleGlobalTheme: () => {
        calls.push('theme-toggle');
        return true;
      },
      syncIframeTheme: () => {
        calls.push('theme-sync');
        return true;
      }
    }
  });

  assert.equal(accessors.updateGridSnapActionState(), true);
  assert.equal(accessors.toggleGridSnap(), true);
  assert.equal(accessors.toggleGlobalTheme(), true);
  assert.equal(accessors.syncIframeTheme(), true);
  assert.deepEqual(calls, ['grid-sync', 'grid-toggle', 'theme-toggle', 'theme-sync']);
});

test('toolbar accessors preserve safe fallbacks without controllers', () => {
  const accessors = accessorsApi.createStudioEditorToolbarAccessors();

  assert.equal(accessors.updateGridSnapActionState(), false);
  assert.equal(accessors.toggleGridSnap(), false);
  assert.equal(accessors.toggleGlobalTheme(), false);
  assert.equal(accessors.syncIframeTheme(), false);
});

test('toolbar accessors publish the global consumed by the editor shell', () => {
  const context = { globalThis: {} };
  vm.runInNewContext(fs.readFileSync(ACCESSORS_PATH, 'utf8'), context);

  assert.equal(typeof context.globalThis.SlideNextStudioEditorToolbarAccessors, 'object');
  assert.equal(
    typeof context.globalThis.SlideNextStudioEditorToolbarAccessors
      .createStudioEditorToolbarAccessors,
    'function'
  );
});

test('editor loads toolbar accessors after the theme runtime', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(
    fileContent,
    /<script src="\/shared\/studio-editor-toolbar-accessors\.js"><\/script>/
  );
  assert.match(fileContent, /createStudioEditorToolbarAccessors\(/);
  assert.match(fileContent, /studioEditorToolbarAccessors/);
});
