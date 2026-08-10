(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTimerStateBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTimerStateBridge(options = {}) {
    const autoSaveRuntimeApi = options.autoSaveRuntimeApi
      || (root && root.SlideNextStudioEditorAutoSaveTimerRuntime)
      || null;
    const autoVersionRuntimeApi = options.autoVersionRuntimeApi
      || (root && root.SlideNextStudioEditorAutoVersionTimerRuntime)
      || null;
    const autoSaveRuntime = autoSaveRuntimeApi
      && typeof autoSaveRuntimeApi.createStudioEditorAutoSaveTimerRuntime === 'function'
      ? autoSaveRuntimeApi.createStudioEditorAutoSaveTimerRuntime({
          stateStore: options.autoSaveStateStore
            || (root && root.SlideNextStudioEditorAutoSaveTimerStore)
            || null
        })
      : null;
    const autoVersionRuntime = autoVersionRuntimeApi
      && typeof autoVersionRuntimeApi.createStudioEditorAutoVersionTimerRuntime === 'function'
      ? autoVersionRuntimeApi.createStudioEditorAutoVersionTimerRuntime({
          stateStore: options.autoVersionStateStore
            || (root && root.SlideNextStudioEditorAutoVersionTimerStore)
            || null
        })
      : null;
    const autoSaveTimerStore = autoSaveRuntime
      ? autoSaveRuntime.autoSaveTimerStore
      : null;
    const autoVersionTimerStore = autoVersionRuntime
      ? autoVersionRuntime.autoVersionTimerStore
      : null;

    function read(store, methodName, args, fallback) {
      return store
        && typeof store[methodName] === 'function'
        ? store[methodName](...args)
        : fallback;
    }

    function write(store, methodName, args, fallback) {
      return store
        && typeof store[methodName] === 'function'
        ? store[methodName](...args)
        : fallback;
    }

    return {
      autoSaveRuntime,
      autoSaveTimerStore,
      autoVersionRuntime,
      autoVersionTimerStore,
      getAutoSaveDebounceTimer: () => read(autoSaveTimerStore, 'getTimer', [], null),
      setAutoSaveDebounceTimer: (nextTimer) => write(
        autoSaveTimerStore,
        'setTimer',
        [nextTimer],
        false
      ),
      getAutoVersionTimers: () => read(autoVersionTimerStore, 'getTimers', [], {}),
      setAutoVersionTimers: (nextTimers) => write(
        autoVersionTimerStore,
        'setTimers',
        [nextTimers],
        false
      ),
      getAutoVersionTimer: (timerKey) => read(autoVersionTimerStore, 'getTimer', [timerKey], undefined),
      setAutoVersionTimer: (timerKey, timerId) => write(
        autoVersionTimerStore,
        'setTimer',
        [timerKey, timerId],
        false
      ),
      clearAutoVersionTimer: (timerKey) => read(
        autoVersionTimerStore,
        'clearTimer',
        [timerKey],
        undefined
      )
    };
  }

  return {
    createStudioEditorTimerStateBridge
  };
});
