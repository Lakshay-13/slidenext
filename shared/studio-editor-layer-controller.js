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
  function resolveStudioLayerRowElement(options = {}) {
    const row = options.row;
    if (!row) return null;
    const editorId = row.dataset && row.dataset.editorElementId;
    const getElementByEditorId = options.getElementByEditorId;
    if (!editorId || typeof getElementByEditorId !== 'function') return null;
    return getElementByEditorId(editorId);
  }

  function selectStudioLayerElementByRef(options = {}) {
    const event = options.event;
    if (!event) return false;
    event.preventDefault();
    event.stopPropagation();
    const currentTarget = event.currentTarget;
    const parentRow = currentTarget && typeof currentTarget.closest === 'function'
      ? currentTarget.closest('[class*="border"]')
      : null;
    const resolveLayerRowElement = typeof options.resolveLayerRowElement === 'function'
      ? options.resolveLayerRowElement
      : (row) => resolveStudioLayerRowElement({
        row,
        getElementByEditorId: options.getElementByEditorId
      });
    const target = resolveLayerRowElement(parentRow);
    if (!target) {
      if (typeof options.updateLayersList === 'function') options.updateLayersList();
      return false;
    }
    if (typeof options.selectElement !== 'function') return false;
    options.selectElement(target, {
      additive: event.shiftKey,
      toggle: event.shiftKey
    });
    return true;
  }

  function toggleStudioLayerVisibilityByRef(options = {}) {
    const event = options.event;
    if (!event) return false;
    event.preventDefault();
    event.stopPropagation();
    const currentTarget = event.currentTarget;
    const parentRow = currentTarget && typeof currentTarget.closest === 'function'
      ? currentTarget.closest('[class*="border"]')
      : null;
    const resolveLayerRowElement = typeof options.resolveLayerRowElement === 'function'
      ? options.resolveLayerRowElement
      : (row) => resolveStudioLayerRowElement({
        row,
        getElementByEditorId: options.getElementByEditorId
      });
    const target = resolveLayerRowElement(parentRow);
    if (!target) {
      if (typeof options.updateLayersList === 'function') options.updateLayersList();
      return false;
    }

    const getCommittedSelectedEditorElementIds = options.getCommittedSelectedEditorElementIds;
    const preservedSelectionIds = typeof getCommittedSelectedEditorElementIds === 'function'
      ? getCommittedSelectedEditorElementIds()
      : [];
    const restorePreservedSelection = () => {
      if (preservedSelectionIds.length === 0) {
        if (typeof options.deselectElement === 'function') options.deselectElement();
        return;
      }
      if (typeof options.restoreCommittedSelectionByIdsOnActiveSlide === 'function') {
        options.restoreCommittedSelectionByIdsOnActiveSlide(preservedSelectionIds);
      }
    };

    if (typeof options.applyEditorSelectionState === 'function') {
      options.applyEditorSelectionState({
        selectedElements: [target],
        selectedElement: target
      });
    }
    if (typeof options.refreshSelectionClasses === 'function') {
      options.refreshSelectionClasses();
    }
    const toggleSelectedElementsVisibility = options.toggleSelectedElementsVisibility;
    const didToggle = typeof toggleSelectedElementsVisibility === 'function'
      ? toggleSelectedElementsVisibility({ skipSelectionUi: true })
      : false;
    if (!didToggle) {
      restorePreservedSelection();
      return false;
    }
    restorePreservedSelection();
    return true;
  }

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

  return {
    resolveStudioLayerRowElement,
    selectStudioLayerElementByRef,
    toggleStudioLayerVisibilityByRef,
    syncStudioLayerList
  };
});
