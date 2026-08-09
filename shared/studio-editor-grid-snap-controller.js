(function (root, factory) {
  const defaultView = root && root.SlideNextStudioEditorGridSnapView;
  const api = factory(defaultView);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGridSnapController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultView) {
  function createStudioEditorGridSnapController(options = {}) {
    const gridSnapView = options.gridSnapView || defaultView || null;
    const documentRef = options.documentRef || null;
    const gridSizePx = Number.isFinite(options.gridSizePx) && options.gridSizePx > 0
      ? options.gridSizePx
      : 20;
    let enabled = !!options.initiallyEnabled;

    function sync() {
      if (!gridSnapView || typeof gridSnapView.syncStudioGridSnapState !== 'function') {
        return false;
      }
      return gridSnapView.syncStudioGridSnapState({
        documentRef,
        isEnabled: enabled
      });
    }

    function toggle() {
      enabled = !enabled;
      sync();
      return enabled;
    }

    function getGridSizePx() {
      return enabled ? gridSizePx : null;
    }

    return {
      sync,
      toggle,
      getGridSizePx,
      isEnabled: () => enabled
    };
  }

  return { createStudioEditorGridSnapController };
});
