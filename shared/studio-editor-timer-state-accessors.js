(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTimerStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorTimerStateAccessors(options = {}) {
    const bridge = options.bridge || null;

    function read(methodName, args, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](...args)
        : fallback;
    }

    function write(methodName, args, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](...args)
        : fallback;
    }

    return {
      bridge,
      getAutoSaveDebounceTimer: () => read('getAutoSaveDebounceTimer', [], null),
      setAutoSaveDebounceTimer: (nextTimer) => write(
        'setAutoSaveDebounceTimer',
        [nextTimer],
        false
      ),
      getAutoVersionTimers: () => read('getAutoVersionTimers', [], {}),
      setAutoVersionTimers: (nextTimers) => write('setAutoVersionTimers', [nextTimers], false),
      getAutoVersionTimer: (timerKey) => read('getAutoVersionTimer', [timerKey], undefined),
      setAutoVersionTimer: (timerKey, timerId) => write(
        'setAutoVersionTimer',
        [timerKey, timerId],
        false
      ),
      clearAutoVersionTimer: (timerKey) => read(
        'clearAutoVersionTimer',
        [timerKey],
        undefined
      )
    };
  }

  return { createStudioEditorTimerStateAccessors };
});
