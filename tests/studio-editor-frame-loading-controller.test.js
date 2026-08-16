const test = require('node:test');
const assert = require('node:assert/strict');
const controllerApi = require('../shared/studio-editor-frame-loading-controller.js');

test('frame loading controller delegates state, retry, and binding through the shared view', async () => {
  const calls = [];
  const documentRef = { id: 'document' };
  const loadingViewApi = {
    setStudioEditorFrameLoadingState(options) {
      calls.push(['state', options]);
      return true;
    },
    bindStudioEditorFrameLoadingControls(options) {
      calls.push(['bind', options]);
      return { bound: true };
    }
  };
  const launchCalls = [];
  const controller = controllerApi.createStudioEditorFrameLoadingController({
    documentRef,
    loadingViewApi,
    setAutoSaveStatus: (state) => calls.push(['autosave', state]),
    getPresentationUrl: () => '/deck/index.html',
    getPresentationTitle: () => 'Deck',
    getPresentationCategory: () => '',
    launchStudioEditor: (...args) => {
      launchCalls.push(args);
      return 'launched';
    }
  });

  assert.equal(controller.setLoadingState('ready'), true);
  assert.equal(controller.reportInitializationError(), false);
  assert.deepEqual(controller.bind(), { bound: true });
  assert.equal(await controller.retry(), 'launched');
  assert.deepEqual(launchCalls, [['/deck/index.html', 'Deck', 'General']]);
  assert.equal(calls[0][0], 'state');
  assert.equal(calls[0][1].state, 'ready');
  assert.deepEqual(calls[1], ['state', { documentRef, state: 'error' }]);
  assert.deepEqual(calls[2], ['autosave', 'editor-load-failed']);
  assert.equal(calls[3][0], 'bind');
  assert.equal(typeof calls[3][1].retryStudioEditorFrame, 'function');
});

test('frame loading controller fails closed when retry has no current presentation', async () => {
  const controller = controllerApi.createStudioEditorFrameLoadingController({
    getPresentationUrl: () => '',
    launchStudioEditor: () => {
      throw new Error('should not launch');
    }
  });

  assert.equal(await controller.retry(), false);
  assert.deepEqual(controller.bind(), {});
  assert.equal(controller.setLoadingState(), false);
  assert.equal(controller.reportInitializationError(), false);
});
