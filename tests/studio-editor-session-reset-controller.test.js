const test = require('node:test');
const assert = require('node:assert/strict');
const resetController = require('../shared/studio-editor-session-reset-controller.js');

test('session reset controller clears timers, persisted deck state, and history in order', () => {
  const calls = [];
  const controller = resetController.createStudioEditorSessionResetController({
    persistenceApi: {
      clearStudioPersistenceTimers(options) {
        calls.push(['clearStudioPersistenceTimers', options]);
        return {
          autoSaveDebounceTimer: null,
          autoVersionTimers: {}
        };
      }
    },
    getAutoSaveDebounceTimer: () => 'save-timer',
    setAutoSaveDebounceTimer: (value) => calls.push(['setAutoSaveDebounceTimer', value]),
    getAutoVersionTimers: () => ({ checkpoint: 'version-timer' }),
    setAutoVersionTimers: (value) => calls.push(['setAutoVersionTimers', value]),
    clearTimer: () => {},
    applyPersistedDeckState: (...args) => calls.push(['applyPersistedDeckState', ...args]),
    clearHistoryStacks: () => calls.push('clearHistoryStacks'),
    updateHistoryButtons: () => calls.push('updateHistoryButtons')
  });

  assert.equal(controller.reset(), true);
  assert.deepEqual(calls, [
    ['clearStudioPersistenceTimers', {
      autoSaveDebounceTimer: 'save-timer',
      autoVersionTimers: { checkpoint: 'version-timer' },
      clearTimer: calls[0][1].clearTimer
    }],
    ['setAutoSaveDebounceTimer', null],
    ['setAutoVersionTimers', {}],
    ['applyPersistedDeckState', {
      cleanHtml: '',
      canonicalDeck: null,
      playbackState: null
    }, {
      presentationUrl: '',
      syncPresentationMetadata: false
    }],
    'clearHistoryStacks',
    'updateHistoryButtons'
  ]);
});

test('session reset controller safely resets without optional collaborators', () => {
  const controller = resetController.createStudioEditorSessionResetController();
  assert.equal(controller.reset(), true);
});
