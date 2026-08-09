(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryTimerController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistoryTimerController(options = {}) {
    let timer = Object.prototype.hasOwnProperty.call(options, 'initialTimer')
      ? options.initialTimer
      : null;

    return {
      getTimer: () => timer,
      setTimer(nextTimer) {
        timer = nextTimer;
        return timer;
      },
      clear() {
        timer = null;
        return timer;
      }
    };
  }

  return { createStudioEditorHistoryTimerController };
});
