(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorZoomController(options = {}) {
    const zoomApi = options.zoomApi || null;
    const rulerViewApi = options.rulerViewApi || null;
    const documentRef = options.documentRef || null;
    const localStorageRef = options.localStorageRef || null;
    const resolveActionState = typeof options.resolveActionState === 'function'
      ? options.resolveActionState
      : () => ({ canUseZoomControls: false });
    const getZoomFactor = typeof options.getZoomFactor === 'function'
      ? options.getZoomFactor
      : () => 1;
    const setZoomFactor = typeof options.setZoomFactor === 'function'
      ? options.setZoomFactor
      : () => {};
    const applyZoomOverride = typeof options.applyZoom === 'function'
      ? options.applyZoom
      : null;

    function syncRulers() {
      if (!rulerViewApi || typeof rulerViewApi.syncStudioCanvasRulers !== 'function') return false;
      return rulerViewApi.syncStudioCanvasRulers({
        documentRef,
        zoomFactor: getZoomFactor()
      });
    }

    function apply(scaleVal) {
      if (!zoomApi || typeof zoomApi.applyStudioZoom !== 'function') {
        return { didApply: false, zoomFactor: getZoomFactor() };
      }
      const result = zoomApi.applyStudioZoom({
        documentRef,
        localStorageRef,
        scaleVal,
        zoomFactor: getZoomFactor()
      });
      if (!result || !result.didApply) return result || { didApply: false };
      setZoomFactor(result.zoomFactor);
      syncRulers();
      return result;
    }

    function resolveNextZoomValue(direction) {
      const select = documentRef && typeof documentRef.getElementById === 'function'
        ? documentRef.getElementById('zoomSelect')
        : null;
      if (!select) return null;

      if (zoomApi && typeof zoomApi.resolveStudioZoomControlStep === 'function') {
        return zoomApi.resolveStudioZoomControlStep({
          documentRef,
          direction,
          zoomFactor: getZoomFactor()
        });
      }
      if (zoomApi && typeof zoomApi.resolveStudioZoomStep === 'function') {
        return zoomApi.resolveStudioZoomStep({
          currentValue: select.value,
          direction,
          zoomFactor: getZoomFactor()
        });
      }
      return 1.0;
    }

    function canUseZoomControls() {
      const actionState = resolveActionState();
      return !!(actionState && actionState.canUseZoomControls);
    }

    function step(direction, applyZoom = applyZoomOverride || apply) {
      if (!canUseZoomControls()) return false;
      const nextValue = resolveNextZoomValue(direction);
      if (!Number.isFinite(nextValue)) return false;
      applyZoom(nextValue.toString());
      return true;
    }

    function selectChange(value, applyZoom = applyZoomOverride || apply) {
      if (!canUseZoomControls()) return false;
      applyZoom(value);
      return true;
    }

    return {
      syncRulers,
      apply,
      zoomIn: (applyZoom) => step('in', applyZoom),
      zoomOut: (applyZoom) => step('out', applyZoom),
      zoomSelectChange: selectChange
    };
  }

  return {
    createStudioEditorZoomController
  };
});
