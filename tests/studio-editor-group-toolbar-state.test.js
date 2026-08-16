const test = require('node:test');
const assert = require('node:assert/strict');

const groupToolbarState = require('../shared/studio-editor-group-toolbar-state.js');

test('group toolbar state controller delegates the legacy group view synchronizer', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const controller = groupToolbarState.createStudioEditorGroupToolbarStateController({
    groupView: {
      syncStudioGroupToolbarState(options) {
        calls.push(options);
        return 'synced';
      }
    },
    getGroupActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return { canGroup: true };
    },
    getUngroupActionState(currentDoc) {
      assert.equal(currentDoc, doc);
      return { canUngroup: false };
    },
    documentRef: { id: 'editor' }
  });

  assert.equal(controller.sync(doc), 'synced');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canGroup, true);
  assert.equal(calls[0].canUngroup, false);
  assert.deepEqual(calls[0].documentRef, { id: 'editor' });
});

test('group toolbar state controller caches the shared synchronizer', () => {
  const calls = [];
  const doc = { id: 'doc' };
  const groupView = {
    syncStudioGroupToolbarState() {
      throw new Error('fallback sync should not run');
    },
    createStudioGroupToolbarStateSync(options) {
      calls.push(['factory', options]);
      return (currentDoc) => {
        calls.push(['sync', currentDoc]);
        return true;
      };
    }
  };
  const controller = groupToolbarState.createStudioEditorGroupToolbarStateController({
    groupView,
    getGroupActionState: () => ({ canGroup: true }),
    getUngroupActionState: () => ({ canUngroup: true })
  });

  assert.equal(controller.sync(doc), true);
  assert.equal(controller.sync(doc), true);
  assert.equal(calls.filter(([type]) => type === 'factory').length, 1);
  assert.deepEqual(calls.filter(([type]) => type === 'sync').map(([, value]) => value), [doc, doc]);
});

test('group toolbar state controller fails closed when the view is unavailable', () => {
  const controller = groupToolbarState.createStudioEditorGroupToolbarStateController({
    groupView: null
  });

  assert.equal(controller.sync({}), false);
});
