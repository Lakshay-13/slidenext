const test = require('node:test');
const assert = require('node:assert/strict');

const elementStateAccessors = require('../shared/studio-editor-element-state-accessors.js');

test('element state accessors centralize state reads, writes, and duplicate sanitization', () => {
  const calls = [];
  const elementStateApi = {
    getStudioElementVisibilityState(element) {
      calls.push(['visibility', element]);
      return { hidden: false };
    },
    setStudioElementLockedState(element, locked) {
      calls.push(['locked-write', element, locked]);
    },
    isStudioElementLocked(element) {
      calls.push(['locked-read', element]);
      return true;
    },
    isStudioElementHidden(element) {
      calls.push(['hidden-read', element]);
      return false;
    },
    setStudioElementHiddenState(element, hidden) {
      calls.push(['hidden-write', element, hidden]);
    },
    sanitizeStudioDuplicatedSubtree(element, options) {
      calls.push(['sanitize', element, options]);
    }
  };
  const accessors = elementStateAccessors.createStudioEditorElementStateAccessors({
    elementStateApi,
    editorElementIdAttr: 'data-node-id',
    transientClassNames: ['selected']
  });
  const element = { id: 'node-1', isConnected: true };

  assert.deepEqual(accessors.getVisibilityState(element), { hidden: false });
  accessors.setLockedState(element, true);
  assert.equal(accessors.isLocked(element), true);
  assert.equal(accessors.isHidden(element), false);
  accessors.setHiddenState(element, true);
  accessors.sanitizeDuplicatedSubtree(element);

  assert.deepEqual(calls, [
    ['visibility', element],
    ['locked-write', element, true],
    ['locked-read', element],
    ['hidden-read', element],
    ['hidden-write', element, true],
    ['sanitize', element, {
      editorElementIdAttr: 'data-node-id',
      transientClassNames: ['selected']
    }]
  ]);
});

test('element state accessors preserve fail-closed and disconnected-element behavior', () => {
  const accessors = elementStateAccessors.createStudioEditorElementStateAccessors({
    elementStateApi: null
  });

  assert.equal(accessors.getVisibilityState({}), null);
  assert.equal(accessors.setLockedState({}, true), undefined);
  assert.equal(accessors.isLocked({}), false);
  assert.equal(accessors.isHidden({}), false);
  assert.equal(accessors.setHiddenState({ isConnected: false }, true), undefined);
  assert.equal(accessors.sanitizeDuplicatedSubtree({}), undefined);
});
