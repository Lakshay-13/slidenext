const test = require('node:test');
const assert = require('node:assert/strict');

const themeToolbarState = require('../shared/studio-editor-theme-toolbar-state.js');

test('theme toolbar state caches the shared synchronizer and forwards document state', () => {
  const documentRef = { id: 'chrome-document' };
  const firstDoc = { id: 'first-doc' };
  const secondDoc = { id: 'second-doc' };
  const calls = [];
  const controller = themeToolbarState.createStudioEditorThemeToolbarStateController({
    themeView: {
      syncStudioThemeTokenPresetActionState() {
        throw new Error('direct sync should not run');
      },
      createStudioThemeTokenPresetActionStateSync(options) {
        calls.push(['factory', options]);
        return (doc) => {
          calls.push(['sync', doc]);
          return options.getActionState(doc).canUseThemeTokenControls;
        };
      }
    },
    getDocument: () => firstDoc,
    getActionState: (doc) => ({ canUseThemeTokenControls: doc === firstDoc }),
    documentRef
  });

  assert.equal(controller.sync(), true);
  assert.equal(controller.sync(secondDoc), false);
  assert.equal(calls.filter(([name]) => name === 'factory').length, 1);
  assert.deepEqual(
    calls.filter(([name]) => name === 'sync').map(([, doc]) => doc),
    [firstDoc, secondDoc]
  );
});

test('theme toolbar state falls back to direct rendering and fails closed on readiness errors', () => {
  const calls = [];
  const documentRef = { id: 'chrome-document' };
  const controller = themeToolbarState.createStudioEditorThemeToolbarStateController({
    themeView: {
      syncStudioThemeTokenPresetActionState(options) {
        calls.push(options);
        return 'synced';
      }
    },
    getActionState: () => ({ canUseThemeTokenControls: true }),
    documentRef
  });

  assert.equal(controller.sync({ id: 'iframe-document' }), 'synced');
  assert.equal(calls[0].documentRef, documentRef);
  assert.equal(calls[0].canUseThemeTokenControls, true);

  const failingController = themeToolbarState.createStudioEditorThemeToolbarStateController({
    themeView: {
      syncStudioThemeTokenPresetActionState() {
        throw new Error('should not render after readiness failure');
      }
    },
    getActionState() {
      throw new Error('readiness unavailable');
    }
  });
  assert.equal(failingController.sync({ id: 'iframe-document' }), false);
});
