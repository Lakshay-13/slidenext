(function (root, factory) {
  const layerView = typeof module === 'object' && module.exports
    ? require('./studio-editor-layer-view')
    : root && root.SlideNextStudioEditorLayerView;
  const api = factory(layerView);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (layerView) {
  function syncStudioLayerList(options = {}) {
    const documentRef = options.documentRef;
    const iframeDoc = options.iframeDoc || null;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    const activeSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide(iframeDoc)
      : null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const orderedLayerElements = activeSlide ? getNormalizedSlideLayerOrder(activeSlide) : [];
    const buildEditorDeckSnapshot = typeof options.buildEditorDeckSnapshot === 'function'
      ? options.buildEditorDeckSnapshot
      : () => ({ slides: [] });
    const deckSnapshot = buildEditorDeckSnapshot(iframeDoc, { includeLayers: true }) || {};
    const activeSlideSnapshot = Array.isArray(deckSnapshot.slides)
      ? deckSnapshot.slides.find((slide) => slide.id === deckSnapshot.activeSlideId)
      : null;
    const layers = activeSlideSnapshot && Array.isArray(activeSlideSnapshot.elements)
      ? activeSlideSnapshot.elements
      : [];
    const view = options.layerView || layerView;
    const canRenderLayers = view
      && (typeof view.renderStudioLayersListInDocument === 'function'
        || typeof view.renderStudioLayersList === 'function');
    if (!canRenderLayers) return false;

    const getElementByEditorId = typeof options.getElementByEditorId === 'function'
      ? options.getElementByEditorId
      : () => null;
    const buildLayerOrderSelectionActionState = typeof options.buildLayerOrderSelectionActionState === 'function'
      ? options.buildLayerOrderSelectionActionState
      : () => ({});
    const renderOptions = {
      activeSlideSnapshot,
      layers,
      resolveLayerState: (layer) => {
        const liveElement = getElementByEditorId(layer.id, iframeDoc);
        const canRunLayerActions = !!liveElement;
        return {
          canRunLayerActions,
          layerOrderActionState: buildLayerOrderSelectionActionState(
            liveElement ? [liveElement] : [],
            {
              doc: iframeDoc,
              slide: activeSlide,
              orderedElements: orderedLayerElements,
              canMutateDeck: () => canRunLayerActions
            }
          )
        };
      }
    };

    if (typeof view.renderStudioLayersListInDocument === 'function') {
      return view.renderStudioLayersListInDocument({
        documentRef,
        ...renderOptions
      });
    }

    const listContainer = documentRef.getElementById('slideLayersList');
    if (!listContainer || typeof view.renderStudioLayersList !== 'function') return false;
    listContainer.innerHTML = view.renderStudioLayersList(renderOptions);
    const rows = listContainer.children;
    if (rows) {
      for (let index = 0; index < rows.length; index += 1) {
        const layer = layers[index];
        if (layer && rows[index] && rows[index].dataset) {
          rows[index].dataset.editorElementId = layer.id;
        }
      }
    }
    return true;
  }

  return { syncStudioLayerList };
});
