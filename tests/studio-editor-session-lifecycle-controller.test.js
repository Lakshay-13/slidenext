const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const lifecycle = require('../shared/studio-editor-session-lifecycle-controller.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('session lifecycle controller prepares a launch session in a stable order', () => {
  const calls = [];
  const result = lifecycle.prepareStudioEditorLaunchSession({
    presentationUrl: '/presentations/demo/index.html',
    presentationTitle: 'Demo',
    presentationCategory: '',
    advanceSessionToken() { calls.push(['advance']); return 7; },
    resetLiveCanonicalDeck() { calls.push(['reset-canonical']); },
    buildPresentationMetadataSeed(url, title) {
      calls.push(['metadata-seed', url, title]);
      return { url, title };
    },
    updateSessionState(state) { calls.push(['session', state]); },
    sessionResetController: {
      reset() { calls.push(['session-reset']); return true; }
    },
    applyEditorSelectionState(state) { calls.push(['selection', state]); }
  });

  assert.deepEqual(result, { sessionToken: 7 });
  assert.deepEqual(calls.map(([name]) => name), [
    'advance', 'reset-canonical', 'metadata-seed', 'session', 'session-reset', 'selection'
  ]);
  assert.equal(calls[3][1].presentationCategory, 'General');
});

test('session lifecycle controller falls back when launch controllers are unavailable', () => {
  const calls = [];
  const result = lifecycle.prepareStudioEditorLaunchSession({
    presentationUrl: '/presentations/demo/index.html',
    presentationTitle: 'Demo',
    advanceSessionToken() { calls.push(['advance']); return 3; },
    updateSessionState() { calls.push(['session']); },
    persistenceApi: {
      clearStudioPersistenceTimers() {
        calls.push(['clear-timers']);
        return { autoSaveDebounceTimer: null, autoVersionTimers: {} };
      }
    },
    setAutoSaveDebounceTimer() { calls.push(['set-autosave']); },
    setAutoVersionTimers() { calls.push(['set-autoversion']); },
    applyPersistedDeckState() { calls.push(['persisted-reset']); },
    clearHistoryStacks() { calls.push(['history-clear']); },
    updateHistoryButtons() { calls.push(['history-buttons']); },
    applyEditorSelectionState() { calls.push(['selection']); }
  });

  assert.deepEqual(result, { sessionToken: 3 });
  assert.deepEqual(calls.map(([name]) => name), [
    'advance', 'session', 'clear-timers', 'set-autosave', 'set-autoversion',
    'persisted-reset', 'history-clear', 'history-buttons', 'selection'
  ]);
});

test('session lifecycle controller closes the editor in a stable order', () => {
  const calls = [];
  const editor = {
    classList: {
      remove(value) { calls.push(['editor-class-remove', value]); },
      contains() { return false; },
      add(value) { calls.push(['editor-class-add', value]); }
    },
    style: {}
  };
  const iframe = { onload: () => {}, src: 'deck.html' };
  const result = lifecycle.closeStudioEditor({
    documentRef: { body: { style: {} } },
    editor,
    iframe,
    advanceSessionToken() { calls.push(['advance']); },
    resetLiveCanonicalDeck() { calls.push(['reset-canonical']); },
    teardownDeckActiveSlideSync() { calls.push(['teardown']); },
    updateSessionState(state) { calls.push(['session', state]); },
    sessionResetController: {
      reset() { calls.push(['session-reset']); return true; }
    },
    sessionUiController: {
      reset(options) { calls.push(['ui-reset', options]); return true; }
    },
    deselectElement() { calls.push(['deselect']); },
    shellController: {
      close() { calls.push(['shell-close']); return true; }
    },
    resetDeckUiState() { calls.push(['deck-reset']); },
    loadPresentations() { calls.push(['load']); }
  });

  assert.equal(result, true);
  assert.deepEqual(calls.map(([name]) => name), [
    'advance', 'reset-canonical', 'teardown', 'session', 'session-reset',
    'ui-reset', 'deselect', 'shell-close', 'deck-reset', 'load'
  ]);
  assert.equal(iframe.src, 'deck.html');
});

test('session lifecycle controller uses fallback resets and shell closure when controllers are unavailable', () => {
  const calls = [];
  const editor = {
    classList: {
      remove() {},
      contains() { return false; },
      add(value) { calls.push(['hidden', value]); }
    },
    style: {}
  };
  const iframe = { onload: () => {}, src: 'deck.html' };
  lifecycle.closeStudioEditor({
    editor,
    iframe,
    persistenceApi: {
      clearStudioPersistenceTimers() {
        calls.push(['clear-timers']);
        return { autoSaveDebounceTimer: null, autoVersionTimers: {} };
      }
    },
    setAutoSaveDebounceTimer() { calls.push(['set-autosave']); },
    setAutoVersionTimers() { calls.push(['set-autoversion']); },
    applyPersistedDeckState() { calls.push(['persisted-reset']); },
    clearHistoryStacks() { calls.push(['history-clear']); },
    updateHistoryButtons() { calls.push(['history-buttons']); },
    resetPresentationUiState() { calls.push(['presentation-reset']); },
    resetSourceViewUiState() { calls.push(['source-reset']); },
    resetVersionUiState() { calls.push(['version-reset']); },
    resetSaveButtonState() { calls.push(['save-reset']); },
    updateDeckReadyToolbarActionState() { calls.push(['toolbar-reset']); },
    deselectElement() { calls.push(['deselect']); },
    schedule(callback) { callback(); },
    resetDeckUiState() { calls.push(['deck-reset']); },
    loadPresentations() { calls.push(['load']); }
  });

  assert.equal(iframe.src, '');
  assert.deepEqual(calls.map(([name]) => name), [
    'clear-timers', 'set-autosave', 'set-autoversion', 'persisted-reset',
    'history-clear', 'history-buttons', 'presentation-reset', 'source-reset',
    'version-reset', 'save-reset', 'toolbar-reset', 'deselect', 'hidden',
    'deck-reset', 'load'
  ]);
});

test('index routes close-editor lifecycle through the shared controller', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /src="\/shared\/studio-editor-session-lifecycle-controller\.js"/);
  assert.match(source, /sessionLifecycleController\.prepareStudioEditorLaunchSession/);
  assert.match(source, /sessionLifecycleController\.closeStudioEditor/);
});
