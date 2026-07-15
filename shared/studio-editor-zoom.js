(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoom = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const STUDIO_ZOOM_OPTIONS = [
    0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7,
    0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2,
    1.25, 1.3, 1.35, 1.4, 1.45, 1.5
  ];

  function getStudioZoomOptions() {
    return [...STUDIO_ZOOM_OPTIONS];
  }

  function applyStudioZoom(options = {}) {
    const documentRef = options.documentRef;
    const stage = documentRef && documentRef.getElementById('canvasStage');
    const scroller = documentRef && documentRef.getElementById('canvasScrollContainer');
    const wrapper = documentRef && documentRef.getElementById('canvasWrapper');
    const select = documentRef && documentRef.getElementById('zoomSelect');
    const scaleValue = options.scaleVal;
    if (!stage || !scroller || !wrapper) {
      return { didApply: false, zoomFactor: options.zoomFactor };
    }

    let zoomFactor;
    if (scaleValue === 'fit') {
      const stageWidth = stage.clientWidth - 48;
      const stageHeight = stage.clientHeight - 48;
      const scaleX = stageWidth / 1920;
      const scaleY = stageHeight / 1080;
      zoomFactor = Math.min(scaleX, scaleY);
      zoomFactor = Math.max(0.15, Math.min(1.5, zoomFactor));
      if (select) select.value = 'fit';
    } else {
      zoomFactor = Number.parseFloat(scaleValue);
      if (!Number.isFinite(zoomFactor)) {
        return { didApply: false, zoomFactor: options.zoomFactor };
      }
      if (select) select.value = scaleValue;
    }

    const storage = options.localStorageRef;
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem('presentationZoom', scaleValue);
    }
    scroller.style.width = `${1920 * zoomFactor}px`;
    scroller.style.height = `${1080 * zoomFactor}px`;
    wrapper.style.transform = `translate(-50%, -50%) scale(${zoomFactor})`;
    return { didApply: true, zoomFactor };
  }

  return { getStudioZoomOptions, applyStudioZoom };
});
