(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoSave = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorAutoSaveAdapter(options = {}) {
    const persistenceApi = options.persistenceApi && typeof options.persistenceApi === 'object'
      ? options.persistenceApi
      : null;
    const captureSessionState = typeof options.captureSessionState === 'function'
      ? options.captureSessionState
      : () => ({ presentationUrl: '', sessionToken: null });
    const setStatus = typeof options.setStatus === 'function'
      ? options.setStatus
      : () => {};
    const getTimer = typeof options.getTimer === 'function'
      ? options.getTimer
      : () => null;
    const clearTimer = typeof options.clearTimer === 'function'
      ? options.clearTimer
      : () => {};
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : () => {};
    const schedule = typeof options.schedule === 'function'
      ? options.schedule
      : (callback) => setTimeout(callback, 1500);
    const isTaskStale = typeof options.isTaskStale === 'function'
      ? options.isTaskStale
      : () => false;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const resolvePersistenceState = typeof options.resolvePersistenceState === 'function'
      ? options.resolvePersistenceState
      : () => null;
    const isPersistedState = typeof options.isPersistedState === 'function'
      ? options.isPersistedState
      : () => false;
    const buildSaveRequestBody = typeof options.buildSaveRequestBody === 'function'
      ? options.buildSaveRequestBody
      : () => ({});
    const applyPersistenceSuccess = typeof options.applyPersistenceSuccess === 'function'
      ? options.applyPersistenceSuccess
      : () => {};
    const applyPersistenceFailure = typeof options.applyPersistenceFailure === 'function'
      ? options.applyPersistenceFailure
      : () => {};
    const fetchImpl = options.fetchImpl;
    const logger = options.logger && typeof options.logger.error === 'function'
      ? options.logger
      : null;

    return function triggerAutoSave() {
      const sessionState = captureSessionState() || {};
      const scheduledPresentationUrl = sessionState.presentationUrl;
      const scheduledSessionToken = sessionState.sessionToken;
      setStatus('saving');

      clearTimer(getTimer());
      const nextTimer = schedule(async () => {
        setTimer(null);
        if (isTaskStale(scheduledPresentationUrl, scheduledSessionToken)) return;

        const iframeDoc = getDocument();
        const autoSavePersistenceState = resolvePersistenceState(iframeDoc, {
          presentationUrl: scheduledPresentationUrl,
          resolvePersistenceStateFromCapture: persistenceApi
            && persistenceApi.resolveStudioAutoSavePersistenceStateFromCapture,
          persistenceOptions: {
            isPersistedState,
            buildSaveRequestBody,
            sessionToken: scheduledSessionToken
          }
        });
        if (!autoSavePersistenceState) {
          setStatus('saved');
          return;
        }
        const { persistencePlan } = autoSavePersistenceState;
        if (persistencePlan.hasPersistedCurrentState) {
          setStatus('saved');
          return;
        }

        try {
          if (!persistenceApi
            || typeof persistenceApi.executeStudioAutoSavePersistenceRequestWithHandlers !== 'function') {
            setStatus('saved');
            return;
          }
          await persistenceApi.executeStudioAutoSavePersistenceRequestWithHandlers(
            autoSavePersistenceState,
            {
              fetchImpl,
              applyPersistenceSuccess: (persistenceContext, successOptions = {}) => {
                return applyPersistenceSuccess(persistenceContext, successOptions);
              },
              applyPersistenceFailure: (persistenceContext, failureOptions = {}) => {
                return applyPersistenceFailure(persistenceContext, failureOptions);
              },
              successOptions: {
                presentationUrl: persistencePlan.persistenceContext
                  ? persistencePlan.persistenceContext.presentationUrl
                  : scheduledPresentationUrl,
                onSuccess: () => {
                  setStatus('saved');
                }
              },
              failureOptions: {
                onFailure: () => {
                  setStatus('autosave-failed');
                }
              }
            }
          );
        } catch (err) {
          if (logger) logger.error('AutoSave Error:', err);
          applyPersistenceFailure(persistencePlan.persistenceContext, {
            onFailure: () => {
              setStatus('network-error');
            }
          });
        }
      }, 1500);
      setTimer(nextTimer);
    };
  }

  return {
    createStudioEditorAutoSaveAdapter
  };
});
