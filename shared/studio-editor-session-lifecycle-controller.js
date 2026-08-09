(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSessionLifecycleController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function prepareStudioEditorLaunchSession(options = {}) {
    if (typeof options.advanceSessionToken !== 'function'
      || typeof options.updateSessionState !== 'function') {
      return null;
    }

    const sessionToken = options.advanceSessionToken();
    if (typeof options.resetLiveCanonicalDeck === 'function') {
      options.resetLiveCanonicalDeck();
    }
    options.updateSessionState({
      presentationUrl: options.presentationUrl,
      presentationTitle: options.presentationTitle,
      presentationCategory: options.presentationCategory || 'General',
      slideIndex: 0,
      presentationMetadata: typeof options.buildPresentationMetadataSeed === 'function'
        ? options.buildPresentationMetadataSeed(options.presentationUrl, options.presentationTitle)
        : null
    });

    const sessionResetController = options.sessionResetController || null;
    const didResetSessionData = sessionResetController
      && typeof sessionResetController.reset === 'function'
      ? sessionResetController.reset()
      : false;
    if (!didResetSessionData) {
      const persistenceApi = options.persistenceApi || null;
      const clearedTimerState = persistenceApi
        && typeof persistenceApi.clearStudioPersistenceTimers === 'function'
        ? persistenceApi.clearStudioPersistenceTimers({
            autoSaveDebounceTimer: typeof options.getAutoSaveDebounceTimer === 'function'
              ? options.getAutoSaveDebounceTimer()
              : null,
            autoVersionTimers: typeof options.getAutoVersionTimers === 'function'
              ? options.getAutoVersionTimers()
              : {},
            clearTimer: options.clearTimer
          })
        : {
            autoSaveDebounceTimer: null,
            autoVersionTimers: {}
          };
      if (typeof options.setAutoSaveDebounceTimer === 'function') {
        options.setAutoSaveDebounceTimer(clearedTimerState.autoSaveDebounceTimer);
      }
      if (typeof options.setAutoVersionTimers === 'function') {
        options.setAutoVersionTimers(clearedTimerState.autoVersionTimers);
      }
      if (typeof options.applyPersistedDeckState === 'function') {
        options.applyPersistedDeckState({
          cleanHtml: '',
          canonicalDeck: null,
          playbackState: null
        }, {
          presentationUrl: '',
          syncPresentationMetadata: false
        });
      }
      if (typeof options.clearHistoryStacks === 'function') options.clearHistoryStacks();
      if (typeof options.updateHistoryButtons === 'function') options.updateHistoryButtons();
    }
    if (typeof options.applyEditorSelectionState === 'function') {
      options.applyEditorSelectionState({});
    }

    return { sessionToken };
  }

  function closeStudioEditor(options = {}) {
    if (typeof options.advanceSessionToken === 'function') {
      options.advanceSessionToken();
    }
    if (typeof options.resetLiveCanonicalDeck === 'function') {
      options.resetLiveCanonicalDeck();
    }
    if (typeof options.teardownDeckActiveSlideSync === 'function') {
      options.teardownDeckActiveSlideSync();
    }
    if (typeof options.updateSessionState === 'function') {
      options.updateSessionState({
        presentationUrl: '',
        presentationTitle: '',
        presentationCategory: '',
        slideIndex: 0,
        presentationMetadata: null
      });
    }

    const sessionResetController = options.sessionResetController || null;
    const didResetSessionData = sessionResetController
      && typeof sessionResetController.reset === 'function'
      ? sessionResetController.reset()
      : false;
    if (!didResetSessionData) {
      const persistenceApi = options.persistenceApi || null;
      const clearedTimerState = persistenceApi
        && typeof persistenceApi.clearStudioPersistenceTimers === 'function'
        ? persistenceApi.clearStudioPersistenceTimers({
            autoSaveDebounceTimer: typeof options.getAutoSaveDebounceTimer === 'function'
              ? options.getAutoSaveDebounceTimer()
              : null,
            autoVersionTimers: typeof options.getAutoVersionTimers === 'function'
              ? options.getAutoVersionTimers()
              : {},
            clearTimer: options.clearTimer
          })
        : {
            autoSaveDebounceTimer: null,
            autoVersionTimers: {}
          };
      if (typeof options.setAutoSaveDebounceTimer === 'function') {
        options.setAutoSaveDebounceTimer(clearedTimerState.autoSaveDebounceTimer);
      }
      if (typeof options.setAutoVersionTimers === 'function') {
        options.setAutoVersionTimers(clearedTimerState.autoVersionTimers);
      }
      if (typeof options.applyPersistedDeckState === 'function') {
        options.applyPersistedDeckState({
          cleanHtml: '',
          canonicalDeck: null,
          playbackState: null
        }, {
          presentationUrl: '',
          syncPresentationMetadata: false
        });
      }
      if (typeof options.clearHistoryStacks === 'function') options.clearHistoryStacks();
      if (typeof options.updateHistoryButtons === 'function') options.updateHistoryButtons();
    }

    const sessionUiController = options.sessionUiController || null;
    const didResetEditorUiState = sessionUiController
      && typeof sessionUiController.reset === 'function'
      ? sessionUiController.reset({ resetDeckUiState: false })
      : false;
    if (!didResetEditorUiState) {
      if (typeof options.resetPresentationUiState === 'function') options.resetPresentationUiState();
      if (typeof options.resetSourceViewUiState === 'function') options.resetSourceViewUiState();
      if (typeof options.resetVersionUiState === 'function') options.resetVersionUiState();
      if (typeof options.resetSaveButtonState === 'function') options.resetSaveButtonState();
      if (typeof options.updateDeckReadyToolbarActionState === 'function') {
        options.updateDeckReadyToolbarActionState();
      }
    }

    if (typeof options.deselectElement === 'function') options.deselectElement();

    const editor = options.editor || null;
    const iframe = options.iframe || null;
    const shellController = options.shellController || null;
    const didCloseEditorShell = shellController
      && typeof shellController.close === 'function'
      ? shellController.close(editor, iframe)
      : false;
    if (!didCloseEditorShell && editor && iframe) {
      iframe.onload = null;
      iframe.src = '';
      editor.classList.remove('active');
      editor.style.opacity = '0';
      editor.style.pointerEvents = 'none';
      if (options.documentRef && options.documentRef.body && options.documentRef.body.style) {
        options.documentRef.body.style.overflow = '';
      }
      const schedule = typeof options.schedule === 'function'
        ? options.schedule
        : (callback, delayMs) => setTimeout(callback, delayMs);
      schedule(() => {
        if (!editor.classList.contains('active')) editor.classList.add('hidden');
      }, 300);
    }
    if (typeof options.resetDeckUiState === 'function') options.resetDeckUiState();
    if (typeof options.loadPresentations === 'function') options.loadPresentations();
    return true;
  }

  return {
    prepareStudioEditorLaunchSession,
    closeStudioEditor
  };
});
