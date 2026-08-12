(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorZoomAccessors(options = {}) {
    const zoomController = options.zoomController || null;

    function call(methodName, fallback, ...args) {
      return zoomController && typeof zoomController[methodName] === 'function'
        ? zoomController[methodName](...args)
        : fallback;
    }

    function applyZoom(scaleValue) {
      return call('apply', undefined, scaleValue);
    }

    return {
      syncCanvasRulers: () => call('syncRulers', false),
      applyZoom,
      zoomIn: () => call('zoomIn', false, applyZoom),
      zoomOut: () => call('zoomOut', false, applyZoom),
      zoomSelectChange: (value) => call('zoomSelectChange', false, value, applyZoom)
    };
  }

  return { createStudioEditorZoomAccessors };
});
