(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLaunchShellController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorLaunchShellController(options = {}) {
    const getPersistenceApi = typeof options.getPersistenceApi === 'function'
      ? options.getPersistenceApi
      : () => options.persistenceApi || null;
    const getSessionLifecycleController = typeof options.getSessionLifecycleController === 'function'
      ? options.getSessionLifecycleController
      : () => options.sessionLifecycleController || null;
    const getSessionResetController = typeof options.getSessionResetController === 'function'
      ? options.getSessionResetController
      : () => options.sessionResetController || null;
    const getSessionUiController = typeof options.getSessionUiController === 'function'
      ? options.getSessionUiController
      : () => options.sessionUiController || null;
    const getLaunchController = typeof options.getLaunchController === 'function'
      ? options.getLaunchController
      : () => options.launchController || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => options.documentRef || null;
    const getEditor = typeof options.getEditor === 'function'
      ? options.getEditor
      : () => null;
    const getIframe = typeof options.getIframe === 'function'
      ? options.getIframe
      : () => null;

    function callOption(name, ...args) {
      return typeof options[name] === 'function' ? options[name](...args) : undefined;
    }

    function prepareLaunchSession(presentationUrl, presentationTitle, presentationCategory) {
      const persistenceApi = getPersistenceApi();
      const sessionLifecycleController = getSessionLifecycleController();
      if (sessionLifecycleController
        && typeof sessionLifecycleController.prepareStudioEditorLaunchSession === 'function') {
        return sessionLifecycleController.prepareStudioEditorLaunchSession({
          presentationUrl,
          presentationTitle,
          presentationCategory,
          advanceSessionToken: options.advanceSessionToken,
          resetLiveCanonicalDeck: options.resetLiveCanonicalDeck,
          updateSessionState: options.updateSessionState,
          buildPresentationMetadataSeed: options.buildPresentationMetadataSeed,
          sessionResetController: getSessionResetController(),
          persistenceApi,
          getAutoSaveDebounceTimer: options.getAutoSaveDebounceTimer,
          setAutoSaveDebounceTimer: options.setAutoSaveDebounceTimer,
          getAutoVersionTimers: options.getAutoVersionTimers,
          setAutoVersionTimers: options.setAutoVersionTimers,
          clearTimer: options.clearTimer,
          applyPersistedDeckState: options.applyPersistedDeckState,
          clearHistoryStacks: options.clearHistoryStacks,
          updateHistoryButtons: options.updateHistoryButtons,
          applyEditorSelectionState: options.applyEditorSelectionState
        });
      }

      const sessionToken = typeof options.advanceSessionToken === 'function'
        ? options.advanceSessionToken()
        : 0;
      if (typeof options.resetLiveCanonicalDeck === 'function') {
        options.resetLiveCanonicalDeck();
      }
      callOption('updateSessionState', {
        presentationUrl,
        presentationTitle,
        presentationCategory: presentationCategory || 'General',
        slideIndex: 0,
        presentationMetadata: typeof options.buildPresentationMetadataSeed === 'function'
          ? options.buildPresentationMetadataSeed(presentationUrl, presentationTitle)
          : null
      });

      const sessionResetController = getSessionResetController();
      const didResetSessionData = sessionResetController
        && typeof sessionResetController.reset === 'function'
        ? sessionResetController.reset()
        : false;
      if (!didResetSessionData) {
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
        callOption('setAutoSaveDebounceTimer', clearedTimerState.autoSaveDebounceTimer);
        callOption('setAutoVersionTimers', clearedTimerState.autoVersionTimers);
        callOption('applyPersistedDeckState', {
          cleanHtml: '',
          canonicalDeck: null,
          playbackState: null
        }, {
          presentationUrl: '',
          syncPresentationMetadata: false
        });
        callOption('clearHistoryStacks');
        callOption('updateHistoryButtons');
      }
      callOption('applyEditorSelectionState', {});
      return { sessionToken };
    }

    function prepareEditorUiState() {
      const sessionUiController = getSessionUiController();
      if (sessionUiController && typeof sessionUiController.prepareLaunch === 'function') {
        return sessionUiController.prepareLaunch();
      }

      const documentRef = getDocument();
      const categoryLabel = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('studioCategoryLabel')
        : null;
      if (categoryLabel) {
        categoryLabel.textContent = typeof options.getPresentationCategory === 'function'
          ? options.getPresentationCategory()
          : '';
      }
      const titleLabel = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('studioTitleLabel')
        : null;
      if (titleLabel) {
        titleLabel.textContent = typeof options.getPresentationTitle === 'function'
          ? options.getPresentationTitle()
          : '';
      }

      callOption('setAutoSaveStatus', 'loading');
      callOption('setFrameLoadingState', 'loading');
      callOption('resetPresentationUiState');
      callOption('resetSourceViewUiState');
      callOption('resetDeckUiState', { isLoading: true });
      callOption('resetVersionUiState', { isLoading: true });
      callOption('resetSaveButtonState');
      callOption('updateDeckReadyToolbarActionState');
      return false;
    }

    async function launch(launchOptions = {}) {
      const presentationUrl = typeof launchOptions.presentationUrl === 'string'
        ? launchOptions.presentationUrl
        : '';
      const presentationTitle = typeof launchOptions.presentationTitle === 'string'
        ? launchOptions.presentationTitle
        : '';
      const presentationCategory = typeof launchOptions.presentationCategory === 'string'
        ? launchOptions.presentationCategory
        : 'General';
      const preparedLaunchSession = prepareLaunchSession(
        presentationUrl,
        presentationTitle,
        presentationCategory
      );
      const sessionToken = preparedLaunchSession && preparedLaunchSession.sessionToken !== undefined
        ? preparedLaunchSession.sessionToken
        : 0;
      const editor = getEditor();
      const iframe = getIframe();
      if (!editor || !iframe) return false;

      const isEditorActive = () => editor.classList.contains('active');
      const frameLoadSessionStateReaders = typeof options.createSessionStateReaders === 'function'
        ? options.createSessionStateReaders()
        : {};
      prepareEditorUiState();

      const launchController = getLaunchController();
      if (!launchController || typeof launchController.launch !== 'function') return false;
      return launchController.launch({
        presentationUrl,
        presentationTitle,
        editor,
        iframe,
        sessionToken,
        frameLoadSessionStateReaders,
        isEditorActive
      });
    }

    function close() {
      const persistenceApi = getPersistenceApi();
      const sessionLifecycleController = getSessionLifecycleController();
      if (!sessionLifecycleController
        || typeof sessionLifecycleController.closeStudioEditor !== 'function') {
        return false;
      }
      return sessionLifecycleController.closeStudioEditor({
        documentRef: getDocument(),
        editor: getEditor(),
        iframe: getIframe(),
        advanceSessionToken: options.advanceSessionToken,
        resetLiveCanonicalDeck: options.resetLiveCanonicalDeck,
        teardownDeckActiveSlideSync: options.teardownDeckActiveSlideSync,
        updateSessionState: options.updateSessionState,
        sessionResetController: getSessionResetController(),
        persistenceApi,
        getAutoSaveDebounceTimer: options.getAutoSaveDebounceTimer,
        setAutoSaveDebounceTimer: options.setAutoSaveDebounceTimer,
        getAutoVersionTimers: options.getAutoVersionTimers,
        setAutoVersionTimers: options.setAutoVersionTimers,
        clearTimer: options.clearTimer,
        schedule: options.schedule,
        applyPersistedDeckState: options.applyPersistedDeckState,
        clearHistoryStacks: options.clearHistoryStacks,
        updateHistoryButtons: options.updateHistoryButtons,
        sessionUiController: getSessionUiController(),
        resetPresentationUiState: options.resetPresentationUiState,
        resetSourceViewUiState: options.resetSourceViewUiState,
        resetVersionUiState: options.resetVersionUiState,
        resetSaveButtonState: options.resetSaveButtonState,
        updateDeckReadyToolbarActionState: options.updateDeckReadyToolbarActionState,
        deselectElement: options.deselectElement,
        shellController: options.shellController || null,
        resetDeckUiState: options.resetDeckUiState,
        loadPresentations: options.loadPresentations
      });
    }

    return { launch, close };
  }

  return {
    createStudioEditorLaunchShellController
  };
});
