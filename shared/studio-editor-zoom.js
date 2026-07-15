(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoom = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  return { applyStudioZoom };
});
