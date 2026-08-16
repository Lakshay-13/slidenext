const test = require('node:test');
const assert = require('node:assert/strict');

const coordinatorApi = require('../shared/studio-editor-content-state-coordinator.js');

test('content state coordinator lazily composes all builder state controllers', () => {
  const calls = [];
  const doc = { id: 'iframe-doc' };
  const selectedElements = [{ id: 'element-1' }];
  const activeSlide = { id: 'slide-1' };
  const makeStateApi = (name) => ({
    [`createStudioEditor${name}StateController`](options) {
      calls.push([name, options]);
      return {
        sync(nextDoc) {
          return `${name}:${nextDoc.id}`;
        }
      };
    }
  });

  const coordinator = coordinatorApi.createStudioEditorContentStateCoordinator({
    clipboardStateApi: makeStateApi('Clipboard'),
    assetStateApi: makeStateApi('Asset'),
    templateStateApi: makeStateApi('Template'),
    masterSlideStateApi: makeStateApi('MasterSlide'),
    blockStateApi: makeStateApi('Block'),
    getDocument: () => doc,
    getCanonicalDeck: () => ({ slides: [] }),
    getActiveSlide: () => activeSlide,
    getSelectedElements: () => selectedElements,
    getLockedState: () => () => false,
    getClipboard: () => ({}),
    getActiveSlideId: () => 'slide-1',
    findCanonicalSlide: () => activeSlide,
    selectionHasLockedElements: () => false,
    isElementLocked: () => false,
    getCurrentPresentationUrl: () => '/presentations/demo/index.html',
    documentRef: {}
  });

  assert.equal(coordinator.syncClipboard(doc), 'Clipboard:iframe-doc');
  assert.equal(coordinator.syncAssetLibrary(doc), 'Asset:iframe-doc');
  assert.equal(coordinator.syncTemplate(doc), 'Template:iframe-doc');
  assert.equal(coordinator.syncMasterSlide(doc), 'MasterSlide:iframe-doc');
  assert.equal(coordinator.syncBlock(doc), 'Block:iframe-doc');
  assert.equal(coordinator.syncBlock(doc), 'Block:iframe-doc');
  assert.equal(calls.length, 5);
  assert.equal(typeof calls.find(([name]) => name === 'Clipboard')[1].syncBlockState, 'function');
  assert.equal(typeof calls.find(([name]) => name === 'MasterSlide')[1].findCanonicalSlide, 'function');
  assert.equal(calls.find(([name]) => name === 'Asset')[1].getCurrentPresentationUrl(), '/presentations/demo/index.html');
});

test('content state coordinator fails closed when builder state APIs are unavailable', () => {
  const coordinator = coordinatorApi.createStudioEditorContentStateCoordinator();

  assert.equal(coordinator.syncClipboard(), false);
  assert.equal(coordinator.syncAssetLibrary(), false);
  assert.equal(coordinator.syncTemplate(), false);
  assert.equal(coordinator.syncMasterSlide(), false);
  assert.equal(coordinator.syncBlock(), false);
});
