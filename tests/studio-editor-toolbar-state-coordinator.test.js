const test = require('node:test');
const assert = require('node:assert/strict');

const coordinatorApi = require('../shared/studio-editor-toolbar-state-coordinator.js');

test('toolbar state coordinator lazily composes lock, visibility, and style controllers', () => {
  const calls = [];
  const documentRef = {};
  const doc = { id: 'iframe-doc' };
  const selectedElements = [{ id: 'element-1' }];
  const activeSlide = { id: 'slide-1' };
  const makeToolbarApi = (name) => ({
    [`createStudioEditor${name}ToolbarStateController`](options) {
      calls.push([name, options]);
      return {
        sync(nextDoc) {
          return `${name}:${nextDoc.id}`;
        }
      };
    }
  });

  const coordinator = coordinatorApi.createStudioEditorToolbarStateCoordinator({
    lockToolbarStateApi: makeToolbarApi('Lock'),
    visibilityToolbarStateApi: makeToolbarApi('Visibility'),
    styleToolbarStateApi: makeToolbarApi('Style'),
    getDocument: () => doc,
    getSelectedElements: () => selectedElements,
    getActiveSlide: () => activeSlide,
    getLockedState: () => () => false,
    getHiddenState: () => () => false,
    documentRef
  });

  assert.equal(coordinator.syncLock(doc), 'Lock:iframe-doc');
  assert.equal(coordinator.syncVisibility(doc), 'Visibility:iframe-doc');
  assert.equal(coordinator.syncStyle(doc), 'Style:iframe-doc');
  assert.equal(coordinator.syncLock(doc), 'Lock:iframe-doc');
  assert.equal(calls.length, 3);
  assert.equal(calls[0][1].documentRef, documentRef);
  assert.equal(calls[0][1].getSelectedElements(), selectedElements);
  assert.equal(calls[0][1].getActiveSlide(), activeSlide);
  assert.equal(typeof calls[1][1].getHiddenState, 'function');
  assert.equal(typeof calls[2][1].getLockedState, 'function');
});

test('toolbar state coordinator fails closed when a toolbar API is unavailable', () => {
  const coordinator = coordinatorApi.createStudioEditorToolbarStateCoordinator();

  assert.equal(coordinator.syncLock(), false);
  assert.equal(coordinator.syncVisibility(), false);
  assert.equal(coordinator.syncStyle(), false);
});
