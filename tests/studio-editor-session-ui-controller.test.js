const test = require('node:test');
const assert = require('node:assert/strict');
const sessionUi = require('../shared/studio-editor-session-ui-controller.js');

test('session UI controller resets launch chrome in a stable order', () => {
  const calls = [];
  const controller = sessionUi.createStudioEditorSessionUiController({
    resetPresentationUiState: () => calls.push('presentation'),
    resetSourceViewUiState: () => calls.push('source'),
    resetDeckUiState: (options) => calls.push(['deck', options]),
    resetVersionUiState: (options) => calls.push(['version', options]),
    resetSaveButtonState: () => calls.push('save'),
    updateDeckReadyToolbarActionState: () => calls.push('ready')
  });

  assert.equal(controller.reset({ isLoading: true }), true);
  assert.deepEqual(calls, [
    'presentation',
    'source',
    ['deck', { isLoading: true }],
    ['version', { isLoading: true }],
    'save',
    'ready'
  ]);
});

test('session UI controller prepares launch labels and loading state before resetting chrome', () => {
  const calls = [];
  const elements = {
    studioCategoryLabel: { textContent: '' },
    studioTitleLabel: { textContent: '' }
  };
  const controller = sessionUi.createStudioEditorSessionUiController({
    documentRef: {
      getElementById(id) {
        calls.push(['get', id]);
        return elements[id] || null;
      }
    },
    getPresentationCategory: () => 'Research',
    getPresentationTitle: () => 'Demo deck',
    setAutoSaveStatus: (state) => calls.push(['autosave', state]),
    setFrameLoadingState: (state) => calls.push(['frame', state]),
    resetPresentationUiState: () => calls.push(['presentation']),
    resetSourceViewUiState: () => calls.push(['source']),
    resetDeckUiState: (options) => calls.push(['deck', options]),
    resetVersionUiState: (options) => calls.push(['version', options]),
    resetSaveButtonState: () => calls.push(['save']),
    updateDeckReadyToolbarActionState: () => calls.push(['ready'])
  });

  assert.equal(controller.prepareLaunch(), true);
  assert.equal(elements.studioCategoryLabel.textContent, 'Research');
  assert.equal(elements.studioTitleLabel.textContent, 'Demo deck');
  assert.deepEqual(calls, [
    ['get', 'studioCategoryLabel'],
    ['get', 'studioTitleLabel'],
    ['autosave', 'loading'],
    ['frame', 'loading'],
    ['presentation'],
    ['source'],
    ['deck', { isLoading: true }],
    ['version', { isLoading: true }],
    ['save'],
    ['ready']
  ]);
});

test('session UI controller resets idle chrome without loading flags', () => {
  const states = [];
  const controller = sessionUi.createStudioEditorSessionUiController({
    resetDeckUiState: (options) => states.push(['deck', options]),
    resetVersionUiState: (options) => states.push(['version', options])
  });

  controller.reset();

  assert.deepEqual(states, [
    ['deck', { isLoading: false }],
    ['version', { isLoading: false }]
  ]);
});

test('session UI controller can defer deck reset until iframe teardown', () => {
  const calls = [];
  const controller = sessionUi.createStudioEditorSessionUiController({
    resetDeckUiState: () => calls.push('deck'),
    resetVersionUiState: () => calls.push('version')
  });

  controller.reset({ resetDeckUiState: false });

  assert.deepEqual(calls, ['version']);
});
