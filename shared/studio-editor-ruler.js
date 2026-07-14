(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRuler = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizePositiveNumber(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function buildStudioRulerTicks(lengthPx = 0, options = {}) {
    const length = Number.isFinite(lengthPx) && lengthPx > 0 ? lengthPx : 0;
    if (length === 0) {
      return [];
    }
    const majorStepPx = normalizePositiveNumber(options.majorStepPx, 100);
    const minorStepPx = Math.min(
      majorStepPx,
      normalizePositiveNumber(options.minorStepPx, majorStepPx / 5)
    );
    const tickCount = Math.floor(length / minorStepPx);
    const ticks = [];

    for (let index = 0; index <= tickCount; index += 1) {
      const position = index * minorStepPx;
      const isMajor = Math.abs(position / majorStepPx - Math.round(position / majorStepPx)) < 1e-9;
      ticks.push({
        position,
        isMajor,
        label: isMajor ? String(Math.round(position)) : ''
      });
    }

    if (ticks.length === 0 || ticks[ticks.length - 1].position < length) {
      ticks.push({
        position: length,
        isMajor: false,
        label: ''
      });
    }

    return ticks;
  }

  return {
    buildStudioRulerTicks
  };
});
