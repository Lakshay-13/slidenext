(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAutoVersionController(options = {}) {
    const versionActions = options.versionActions
      || (root && root.SlideNextStudioVersionActions)
      || null;
    const captureSessionState = typeof options.captureSessionState === 'function'
      ? options.captureSessionState
      : () => ({ presentationUrl: '', sessionToken: null });
    const getTimer = typeof options.getTimer === 'function'
      ? options.getTimer
      : () => undefined;
    const clearScheduledTimer = typeof options.clearScheduledTimer === 'function'
      ? options.clearScheduledTimer
      : () => {};
    const setTimer = typeof options.setTimer === 'function'
      ? options.setTimer
      : () => {};
    const clearStoredTimer = typeof options.clearStoredTimer === 'function'
      ? options.clearStoredTimer
      : () => {};
    const schedule = typeof options.schedule === 'function'
      ? options.schedule
      : (callback, delayMs) => setTimeout(callback, delayMs);
    const shouldDebounce = typeof options.shouldDebounce === 'function'
      ? options.shouldDebounce
      : versionActions && typeof versionActions.shouldDebounceStudioAutoVersion === 'function'
        ? (label) => versionActions.shouldDebounceStudioAutoVersion(label)
        : () => false;
    const timerKey = typeof options.timerKey === 'string'
      ? options.timerKey
      : versionActions && typeof versionActions.STUDIO_AUTO_VERSION_TIMER_KEY === 'string'
        ? versionActions.STUDIO_AUTO_VERSION_TIMER_KEY
        : 'frequent_action';
    const debounceMs = Number.isFinite(options.debounceMs)
      ? options.debounceMs
      : versionActions && Number.isFinite(versionActions.STUDIO_AUTO_VERSION_DEBOUNCE_MS)
        ? versionActions.STUDIO_AUTO_VERSION_DEBOUNCE_MS
        : 10000;
    const execute = typeof options.execute === 'function'
      ? options.execute
      : () => {};

    function trigger(label) {
      const sessionState = captureSessionState() || {};
      const scheduledPresentationUrl = sessionState.presentationUrl;
      const scheduledSessionToken = sessionState.sessionToken;

      if (shouldDebounce(label)) {
        clearScheduledTimer(getTimer(timerKey));
        const timerId = schedule(() => {
          clearStoredTimer(timerKey);
          execute(label, scheduledPresentationUrl, scheduledSessionToken);
        }, debounceMs);
        setTimer(timerKey, timerId);
        return;
      }

      execute(label, scheduledPresentationUrl, scheduledSessionToken);
    }

    return { trigger };
  }

  return {
    createStudioEditorAutoVersionController
  };
});
