(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAutoVersionTimerController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeTimers(timers) {
    return timers && typeof timers === 'object' && !Array.isArray(timers)
      ? timers
      : {};
  }

  function createStudioEditorAutoVersionTimerController(options = {}) {
    let timers = normalizeTimers(options.initialTimers);

    return {
      getTimers: () => timers,
      setTimers(nextTimers) {
        timers = normalizeTimers(nextTimers);
        return timers;
      },
      getTimer(timerKey) {
        return typeof timerKey === 'string' ? timers[timerKey] : undefined;
      },
      setTimer(timerKey, timerId) {
        if (typeof timerKey !== 'string' || !timerKey) return false;
        timers[timerKey] = timerId;
        return timerId;
      },
      clearTimer(timerKey) {
        if (typeof timerKey !== 'string' || !timerKey) return undefined;
        const timerId = timers[timerKey];
        delete timers[timerKey];
        return timerId;
      },
      clear() {
        timers = {};
        return timers;
      }
    };
  }

  return {
    createStudioEditorAutoVersionTimerController,
    normalizeTimers
  };
});
