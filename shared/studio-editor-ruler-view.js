(function (root, factory) {
  const ruler = typeof module === 'object' && module.exports
    ? require('./studio-editor-ruler')
    : root && root.SlideNextStudioEditorRuler;
  const api = factory(ruler);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorRulerView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ruler) {
  function renderStudioCanvasRulers(options = {}) {
    const documentRef = options.documentRef;
    const stage = documentRef && documentRef.getElementById('canvasStage');
    const wrapper = documentRef && documentRef.getElementById('canvasWrapper');
    const horizontal = documentRef && documentRef.getElementById('canvasRulerHorizontal');
    const vertical = documentRef && documentRef.getElementById('canvasRulerVertical');
    const zoomFactor = Number.isFinite(options.zoomFactor) ? options.zoomFactor : 1;
    if (!stage || !wrapper || !horizontal || !vertical || !ruler
      || typeof ruler.buildStudioRulerRenderState !== 'function'
      || typeof stage.getBoundingClientRect !== 'function'
      || typeof wrapper.getBoundingClientRect !== 'function') {
      return false;
    }

    const stageRect = stage.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const offsetX = wrapperRect.left - stageRect.left;
    const offsetY = wrapperRect.top - stageRect.top;
    const horizontalTicks = ruler.buildStudioRulerRenderState(1920, offsetX, zoomFactor, {
      majorStepPx: 100,
      minorStepPx: 20
    });
    const verticalTicks = ruler.buildStudioRulerRenderState(1080, offsetY, zoomFactor, {
      majorStepPx: 100,
      minorStepPx: 20
    });

    function renderTicks(container, ticks, axis) {
      if (typeof container.replaceChildren === 'function') {
        container.replaceChildren();
      } else {
        container.innerHTML = '';
      }
      const ownerDocument = container.ownerDocument || documentRef;
      ticks.forEach((tick) => {
        const mark = ownerDocument.createElement('span');
        mark.className = `studio-ruler-tick${tick.isMajor ? ' major' : ''}`;
        mark.style[axis === 'horizontal' ? 'left' : 'top'] = `${tick.screenPosition}px`;
        container.appendChild(mark);
        if (!tick.label) return;
        const label = ownerDocument.createElement('span');
        label.className = 'studio-ruler-label';
        label.textContent = tick.label;
        label.style[axis === 'horizontal' ? 'left' : 'top'] = `${tick.screenPosition}px`;
        container.appendChild(label);
      });
    }

    renderTicks(horizontal, horizontalTicks, 'horizontal');
    renderTicks(vertical, verticalTicks, 'vertical');
    return true;
  }

  function syncStudioCanvasRulers(options = {}) {
    return renderStudioCanvasRulers({
      documentRef: options.documentRef,
      zoomFactor: options.zoomFactor
    });
  }

  return { renderStudioCanvasRulers, syncStudioCanvasRulers };
});
