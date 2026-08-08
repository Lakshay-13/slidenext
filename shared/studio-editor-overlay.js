(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorOverlay = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function ensureStudioSelectionOverlay(doc, slide, options = {}) {
    if (!doc || !slide) return null;
    const overlayId = options.selectionOverlayId || 'editorSelectionOverlay';
    const handleClassName = options.resizeHandleClassName || 'editor-resize-handle';
    const handleDirectionAttr = options.resizeHandleDirectionAttr || 'data-dir';
    const resizeHandleDirections = options.resizeHandleDirections || [];

    let overlay = slide.querySelector(`#${overlayId}`);
    if (!overlay) {
      overlay = doc.createElement('div');
      overlay.id = overlayId;
      resizeHandleDirections.forEach((direction) => {
        const handle = doc.createElement('div');
        handle.className = handleClassName;
        handle.setAttribute(handleDirectionAttr, direction);
        overlay.appendChild(handle);
      });
      slide.appendChild(overlay);
    }
    return overlay;
  }

  function ensureStudioGuidesLayer(doc, slide, options = {}) {
    if (!doc || !slide) return null;
    const guidesLayerId = options.guidesLayerId || 'editorGuidesLayer';

    let guides = slide.querySelector(`#${guidesLayerId}`);
    if (!guides) {
      guides = doc.createElement('div');
      guides.id = guidesLayerId;
      slide.appendChild(guides);
    }
    return guides;
  }

  function ensureStudioDragHud(doc, slide, options = {}) {
    if (!doc || !slide) return null;
    const dragHudId = options.dragHudId || 'editorDragHud';

    let hud = slide.querySelector(`#${dragHudId}`);
    if (!hud) {
      hud = doc.createElement('div');
      hud.id = dragHudId;
      slide.appendChild(hud);
    }
    return hud;
  }

  function clearStudioGuides(slide, options = {}) {
    if (!slide) return;
    const guidesLayerId = options.guidesLayerId || 'editorGuidesLayer';
    const guides = slide.querySelector(`#${guidesLayerId}`);
    if (guides) guides.innerHTML = '';
  }

  function hideStudioDragHud(slide, options = {}) {
    if (!slide) return;
    const dragHudId = options.dragHudId || 'editorDragHud';
    const visibleClassName = options.visibleClassName || 'visible';
    const hud = slide.querySelector(`#${dragHudId}`);
    if (hud) hud.classList.remove(visibleClassName);
  }

  function updateStudioDragHud(doc, slide, bounds, options = {}) {
    if (!doc || !slide || !bounds) return null;
    const visibleClassName = options.visibleClassName || 'visible';
    const hud = ensureStudioDragHud(doc, slide, options);
    if (!hud) return null;

    const x = Math.round(bounds.left);
    const y = Math.round(bounds.top);
    const width = Math.round(bounds.width);
    const height = Math.round(bounds.height);
    hud.textContent = `X ${x}  Y ${y}  W ${width}  H ${height}`;
    hud.classList.add(visibleClassName);
    return hud;
  }

  function updateStudioDragHudForActiveSlide(options = {}) {
    const documentRef = options.documentRef;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const slide = documentRef ? getActiveSlide(documentRef) : null;
    if (!documentRef || !slide || !options.bounds) return null;
    return updateStudioDragHud(documentRef, slide, options.bounds, options);
  }

  function renderStudioGuides(doc, slide, guidesDef, options = {}) {
    if (!doc || !slide) return null;
    const guidesLayer = ensureStudioGuidesLayer(doc, slide, options);
    if (!guidesLayer) return null;

    const guideLineClassName = options.guideLineClassName || 'editor-guide-line';
    const visibleClassName = options.visibleClassName || 'visible';
    const verticalClassName = options.guideLineVerticalClassName || 'vertical';
    const horizontalClassName = options.guideLineHorizontalClassName || 'horizontal';

    guidesLayer.innerHTML = '';
    (guidesDef || []).forEach((guide) => {
      const line = doc.createElement('div');
      line.className = `${guideLineClassName} ${guide.axis === 'x' ? verticalClassName : horizontalClassName} ${visibleClassName}`;
      if (guide.axis === 'x') {
        line.style.left = `${guide.position}px`;
      } else {
        line.style.top = `${guide.position}px`;
      }
      guidesLayer.appendChild(line);
    });

    return guidesLayer;
  }

  function renderStudioGuidesForActiveSlide(options = {}) {
    const documentRef = options.documentRef;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const slide = documentRef ? getActiveSlide(documentRef) : null;
    if (!documentRef || !slide) return null;
    return renderStudioGuides(documentRef, slide, options.guidesDef, options);
  }

  function renderStudioMarqueeSelection(doc, slide, rect, options = {}) {
    if (!doc || !slide || !rect) return null;
    const overlay = ensureStudioSelectionOverlay(doc, slide, options);
    if (!overlay) return null;

    const left = Math.min(rect.left, rect.right);
    const top = Math.min(rect.top, rect.bottom);
    overlay.classList.add('drag-preview');
    overlay.style.display = 'block';
    overlay.style.pointerEvents = 'none';
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${Math.abs(rect.right - rect.left)}px`;
    overlay.style.height = `${Math.abs(rect.bottom - rect.top)}px`;
    overlay.querySelectorAll('.editor-resize-handle').forEach((handle) => {
      handle.style.display = 'none';
    });
    return overlay;
  }

  function renderStudioMarqueeSelectionForActiveSlide(options = {}) {
    const documentRef = options.documentRef;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const slide = documentRef ? getActiveSlide(documentRef) : null;
    if (!documentRef || !slide) return null;
    return renderStudioMarqueeSelection(documentRef, slide, options.rect, options);
  }

  function clearStudioMarqueeSelection(slide, options = {}) {
    if (!slide) return false;
    const overlayId = options.selectionOverlayId || 'editorSelectionOverlay';
    const overlay = slide.querySelector(`#${overlayId}`);
    if (!overlay) return false;
    overlay.classList.remove('drag-preview');
    overlay.style.display = 'none';
    return true;
  }

  function syncStudioSelectionOverlay(doc, slide, options = {}) {
    if (!doc || !slide) return { didSync: false };
    const overlay = ensureStudioSelectionOverlay(doc, slide, options);
    if (!overlay) return { didSync: false };

    const buildSelectionOverlayState = typeof options.buildSelectionOverlayState === 'function'
      ? options.buildSelectionOverlayState
      : () => ({ visibleSelection: [], hasVisibleSelection: false });
    const overlaySelectionState = buildSelectionOverlayState(options.selectedElements, {
      isHidden: options.isHidden
    });
    const hideOverlay = () => {
      overlay.style.display = 'none';
      if (typeof options.hideGuides === 'function') options.hideGuides();
      if (typeof options.hideDragHud === 'function') options.hideDragHud();
    };
    if (!overlaySelectionState || !overlaySelectionState.hasVisibleSelection) {
      hideOverlay();
      return { didSync: false, overlay };
    }

    const getSelectionBounds = typeof options.getSelectionBounds === 'function'
      ? options.getSelectionBounds
      : () => null;
    const bounds = getSelectionBounds(overlaySelectionState.visibleSelection);
    if (!bounds) {
      hideOverlay();
      return { didSync: false, overlay };
    }

    overlay.style.display = 'block';
    overlay.style.left = `${bounds.left}px`;
    overlay.style.top = `${bounds.top}px`;
    overlay.style.width = `${bounds.width}px`;
    overlay.style.height = `${bounds.height}px`;
    const transformState = typeof options.getTransformSelectionState === 'function'
      ? options.getTransformSelectionState()
      : { canTransform: false };
    const canTransform = !!transformState.canTransform;
    overlay.style.pointerEvents = canTransform ? 'auto' : 'none';
    overlay.style.opacity = '1';
    overlay.querySelectorAll('.editor-resize-handle').forEach((handle) => {
      handle.style.display = canTransform ? '' : 'none';
    });
    return { didSync: true, overlay, bounds, canTransform };
  }

  function syncStudioSelectionOverlayForActiveSlide(options = {}) {
    const documentRef = options.documentRef;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const slide = documentRef ? getActiveSlide(documentRef) : null;
    if (!documentRef || !slide) return { didSync: false };
    return syncStudioSelectionOverlay(documentRef, slide, options);
  }

  return {
    ensureStudioSelectionOverlay,
    ensureStudioGuidesLayer,
    ensureStudioDragHud,
    clearStudioGuides,
    hideStudioDragHud,
    updateStudioDragHud,
    updateStudioDragHudForActiveSlide,
    renderStudioGuides,
    renderStudioGuidesForActiveSlide,
    renderStudioMarqueeSelection,
    renderStudioMarqueeSelectionForActiveSlide,
    clearStudioMarqueeSelection,
    syncStudioSelectionOverlay,
    syncStudioSelectionOverlayForActiveSlide
  };
});
