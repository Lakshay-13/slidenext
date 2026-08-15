const test = require('node:test');
const assert = require('node:assert/strict');

const launchShellController = require('../shared/studio-editor-launch-shell-controller.js');

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach(value => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach(value => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

function createElements() {
  const editor = {
    classList: createClassList(['hidden']),
    style: {}
  };
  const iframe = { onload: null, src: '' };
  return {
    editor,
    iframe,
    documentRef: {
      getElementById(id) {
        return id === 'studioEditor' ? editor : null;
      }
    }
  };
}

test('launch shell prepares the session and delegates the live token to the frame controller', async () => {
  const elements = createElements();
  const calls = [];
  let sessionToken = 4;
  const controller = launchShellController.createStudioEditorLaunchShellController({
    documentRef: elements.documentRef,
    getEditor: () => elements.editor,
    getIframe: () => elements.iframe,
    advanceSessionToken: () => ++sessionToken,
    updateSessionState: (state) => calls.push(['session', state]),
    createSessionStateReaders: () => ({ getCurrentSessionToken: () => sessionToken }),
    resetPresentationUiState: () => calls.push(['presentation-reset']),
    resetSourceViewUiState: () => calls.push(['source-reset']),
    resetDeckUiState: (options) => calls.push(['deck-reset', options]),
    resetVersionUiState: (options) => calls.push(['version-reset', options]),
    resetSaveButtonState: () => calls.push(['save-reset']),
    updateDeckReadyToolbarActionState: () => calls.push(['toolbar-sync']),
    setAutoSaveStatus: (state) => calls.push(['status', state]),
    getPresentationTitle: () => 'Demo',
    getPresentationCategory: () => 'General',
    launchController: {
      launch(options) {
        calls.push(['launch', options]);
        return true;
      }
    }
  });

  assert.equal(await controller.launch({
    presentationUrl: '/presentations/demo/index.html',
    presentationTitle: 'Demo',
    presentationCategory: 'General'
  }), true);
  assert.equal(sessionToken, 5);
  assert.equal(calls[0][0], 'session');
  assert.equal(calls.at(-1)[0], 'launch');
  assert.equal(calls.at(-1)[1].sessionToken, 5);
  assert.equal(calls.at(-1)[1].frameLoadSessionStateReaders.getCurrentSessionToken(), 5);
});

test('launch shell uses the session UI controller instead of fallback chrome resets', async () => {
  const elements = createElements();
  let prepareLaunchCalls = 0;
  let fallbackResetCalls = 0;
  const controller = launchShellController.createStudioEditorLaunchShellController({
    documentRef: elements.documentRef,
    getEditor: () => elements.editor,
    getIframe: () => elements.iframe,
    advanceSessionToken: () => 1,
    sessionUiController: {
      prepareLaunch() {
        prepareLaunchCalls += 1;
        return true;
      }
    },
    resetDeckUiState: () => {
      fallbackResetCalls += 1;
    },
    launchController: {
      launch() {
        return true;
      }
    }
  });

  assert.equal(await controller.launch({ presentationUrl: '/demo.html' }), true);
  assert.equal(prepareLaunchCalls, 1);
  assert.equal(fallbackResetCalls, 0);
});
