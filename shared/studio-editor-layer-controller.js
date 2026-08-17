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
  const studioLayerListActionBindings = typeof WeakMap === 'function' ? new WeakMap() : null;

  function readStudioLayerAction(element) {
    if (!element) return '';
    if (element.dataset && typeof element.dataset.studioLayerAction === 'string') {
      return element.dataset.studioLayerAction;
    }
    return typeof element.getAttribute === 'function'
      ? element.getAttribute('data-studio-layer-action') || ''
      : '';
  }

  function resolveStudioLayerActionTarget(event, listContainer) {
    const eventTarget = event && event.target;
    if (!eventTarget || typeof eventTarget.closest !== 'function') return null;
    const actionTarget = eventTarget.closest('[data-studio-layer-action]');
    if (!actionTarget) return null;
    if (typeof listContainer.contains === 'function' && !listContainer.contains(actionTarget)) {
      return null;
    }
    return actionTarget;
  }

  function createStudioLayerActionEvent(event, actionTarget) {
    const actionEvent = event && typeof event === 'object'
      ? Object.create(event)
      : {};
    Object.defineProperty(actionEvent, 'currentTarget', {
      configurable: true,
      value: actionTarget
    });
    return actionEvent;
  }

  function bindStudioLayerListActions(options = {}) {
    const listContainer = options.listContainer;
    if (!listContainer || typeof listContainer.addEventListener !== 'function') return false;

    let binding = studioLayerListActionBindings && studioLayerListActionBindings.get(listContainer);
    if (!binding) {
      binding = { options };
      binding.handleClick = (event) => {
        const actionTarget = resolveStudioLayerActionTarget(event, listContainer);
        const action = readStudioLayerAction(actionTarget);
        if (!action) return;
        const actionOptions = binding.options || {};
        const actionEvent = createStudioLayerActionEvent(event, actionTarget);
        if (action === 'select') {
          selectStudioLayerElementByRef({ ...actionOptions, event: actionEvent });
        } else if (action === 'toggle-visibility') {
          toggleStudioLayerVisibilityByRef({ ...actionOptions, event: actionEvent });
        } else if (action === 'z-index-forward' || action === 'z-index-backward') {
          changeStudioLayerZIndexByRef({
            ...actionOptions,
            action: action === 'z-index-forward' ? 'forward' : 'backward',
            event: actionEvent
          });
        }
      };
      listContainer.addEventListener('click', binding.handleClick);
      if (studioLayerListActionBindings) {
        studioLayerListActionBindings.set(listContainer, binding);
      }
    } else {
      binding.options = options;
    }
    return true;
  }

  function resolveStudioLayerRowElement(options = {}) {
    const row = options.row;
    if (!row) return null;
    const editorId = row.dataset && row.dataset.editorElementId;
    const getElementByEditorId = options.getElementByEditorId;
    if (!editorId || typeof getElementByEditorId !== 'function') return null;
    return getElementByEditorId(editorId);
  }

  function finalizeStudioLayerOrderMutation(finalizeMutation, versionLabel, options = {}) {
    if (typeof finalizeMutation !== 'function') return false;
    try {
      return finalizeMutation(versionLabel, options);
    } catch (error) {
      return false;
    }
  }

  function readStudioLayerLocked(isLocked, element) {
    try {
      return isLocked(element) === true;
    } catch (error) {
      return true;
    }
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

    const targetDocument = target && target.ownerDocument ? target.ownerDocument : undefined;
    const getCommittedSelectedEditorElementIds = options.getCommittedSelectedEditorElementIds;
    const preservedSelectionIds = typeof getCommittedSelectedEditorElementIds === 'function'
      ? getCommittedSelectedEditorElementIds(targetDocument)
      : [];
    const restorePreservedSelection = () => {
      if (preservedSelectionIds.length === 0) {
        if (typeof options.deselectElement === 'function') options.deselectElement();
        return;
      }
      if (typeof options.restoreCommittedSelectionByIdsOnActiveSlide === 'function') {
        options.restoreCommittedSelectionByIdsOnActiveSlide(preservedSelectionIds, targetDocument);
      }
    };

    if (typeof options.applyEditorSelectionState === 'function') {
      options.applyEditorSelectionState({
        selectedElements: [target],
        selectedElement: target
      });
    }
    if (typeof options.refreshSelectionClasses === 'function') {
      options.refreshSelectionClasses(targetDocument);
    }
    const toggleSelectedElementsVisibility = options.toggleSelectedElementsVisibility;
    const didToggle = typeof toggleSelectedElementsVisibility === 'function'
      ? toggleSelectedElementsVisibility({
          skipSelectionUi: true,
          ...(targetDocument ? { doc: targetDocument } : {})
        })
      : false;
    if (!didToggle) {
      restorePreservedSelection();
      return false;
    }
    restorePreservedSelection();
    return true;
  }

  function changeStudioLayerZIndexByRef(options = {}) {
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
    const element = resolveLayerRowElement(parentRow);
    const targetDocument = element && element.ownerDocument ? element.ownerDocument : null;
    const refreshLayerOrderUi = typeof options.refreshLayerOrderUi === 'function'
      ? options.refreshLayerOrderUi
      : null;
    const refreshAfterNoOp = () => {
      if (refreshLayerOrderUi) {
        refreshLayerOrderUi({
          refreshLayersList: true,
          result: null,
          ...(targetDocument ? { doc: targetDocument } : {})
        });
      }
      return false;
    };
    if (!element || typeof options.isElementLocked !== 'function') {
      return refreshAfterNoOp();
    }
    if (readStudioLayerLocked(options.isElementLocked, element)) {
      return refreshAfterNoOp();
    }

    let transaction = null;
    let canonicalDeck = null;
    const reorderSlideLayers = options.reorderSlideLayers;
    const didChange = typeof reorderSlideLayers === 'function'
      ? reorderSlideLayers(options.action, [element], {
        onTransaction(nextTransaction) {
          transaction = nextTransaction;
        },
        onCanonicalDeck(nextCanonicalDeck) {
          canonicalDeck = nextCanonicalDeck;
        }
      })
      : false;
    if (!didChange) {
      return refreshAfterNoOp();
    }

    const liveSelectionApi = options.liveSelectionApi;
    if (liveSelectionApi
      && typeof liveSelectionApi.isStudioLiveSelectedElement === 'function'
      && liveSelectionApi.isStudioLiveSelectedElement(options.selectedElements, element)
      && typeof options.syncLayerOrderZIndexInput === 'function') {
      options.syncLayerOrderZIndexInput(element);
    }
    if (typeof options.finalizeLayerOrderMutation === 'function') {
      const finalizeResult = finalizeStudioLayerOrderMutation(
        options.finalizeLayerOrderMutation,
        'Auto: Rearranged Layers',
        {
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {}),
        ...(targetDocument ? { doc: targetDocument } : {})
        }
      );
      if (finalizeResult === false) {
        if (typeof options.rollbackLayerOrderMutation === 'function') {
          options.rollbackLayerOrderMutation(transaction, targetDocument);
        }
        if (typeof options.syncLayerOrderZIndexInput === 'function') {
          options.syncLayerOrderZIndexInput(element);
        }
        return false;
      }
    }
    return true;
  }

  function arrangeStudioElementLayer(options = {}) {
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : null;
    const refreshLayerOrderUi = typeof options.refreshLayerOrderUi === 'function'
      ? options.refreshLayerOrderUi
      : () => false;
    const resolvedDoc = getDocument ? getDocument() : undefined;
    const refreshForDocument = () => resolvedDoc
      ? refreshLayerOrderUi({ doc: resolvedDoc })
      : refreshLayerOrderUi();
    const targets = getSelectedElements(resolvedDoc) || [];
    if (targets.length === 0) {
      return refreshForDocument();
    }
    if (typeof options.selectionHasLockedElements === 'function') {
      let hasLockedElements = false;
      try {
        hasLockedElements = options.selectionHasLockedElements(targets, resolvedDoc);
      } catch (error) {
        return refreshForDocument();
      }
      if (hasLockedElements) return refreshForDocument();
    }

    let transaction = null;
    let canonicalDeck = null;
    const didChange = typeof options.reorderSlideLayers === 'function'
      ? options.reorderSlideLayers(options.action, targets, {
        onTransaction(nextTransaction) {
          transaction = nextTransaction;
        },
        onCanonicalDeck(nextCanonicalDeck) {
          canonicalDeck = nextCanonicalDeck;
        }
      })
      : false;
    if (!didChange) {
      return refreshForDocument();
    }
    if (typeof options.syncLayerOrderZIndexInput === 'function') {
      options.syncLayerOrderZIndexInput(targets[0]);
    }
    if (typeof options.finalizeLayerOrderMutation === 'function') {
      const finalizeResult = finalizeStudioLayerOrderMutation(
        options.finalizeLayerOrderMutation,
        'Auto: Rearranged Layers',
        {
        transaction,
        ...(canonicalDeck ? { canonicalDeck } : {}),
        ...(resolvedDoc ? { doc: resolvedDoc } : {})
        }
      );
      if (finalizeResult === false) {
        if (typeof options.rollbackLayerOrderMutation === 'function') {
          options.rollbackLayerOrderMutation(transaction, resolvedDoc);
        }
        if (typeof options.syncLayerOrderZIndexInput === 'function') {
          options.syncLayerOrderZIndexInput(targets[0]);
        }
        return false;
      }
    }
    return true;
  }

  function refreshStudioLayerOrderUi(options = {}) {
    const hasDocument = Object.prototype.hasOwnProperty.call(options, 'doc');
    if (options.refreshLayersList && typeof options.updateLayersList === 'function') {
      hasDocument ? options.updateLayersList(options.doc) : options.updateLayersList();
    }
    if (typeof options.updateLayerOrderActionState === 'function') {
      hasDocument
        ? options.updateLayerOrderActionState(options.doc)
        : options.updateLayerOrderActionState();
    }
    return options.result === undefined ? false : options.result;
  }

  function syncStudioLayerOrderActionState(options = {}) {
    const documentRef = options.documentRef;
    const selectedElements = Array.isArray(options.selectedElements)
      ? options.selectedElements
      : [];
    const layerOrderApi = options.layerOrderApi && typeof options.layerOrderApi === 'object'
      ? options.layerOrderApi
      : null;
    const styleApi = options.styleApi && typeof options.styleApi === 'object'
      ? options.styleApi
      : null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const slide = getActiveSlide(options.doc);
    const orderedElements = slide ? getNormalizedSlideLayerOrder(slide) : [];
    const canMutateDeck = () => !!slide;
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;
    const buildZIndexMutationPlan = typeof options.buildZIndexMutationPlan === 'function'
      ? options.buildZIndexMutationPlan
      : (elements) => {
          if (!styleApi || typeof styleApi.buildStudioStyleMutationPlan !== 'function') {
            return { canApply: false };
          }
          return styleApi.buildStudioStyleMutationPlan(elements, 'zIndex', '', {
            isLocked,
            canMutateDeck
          });
        };
    const syncToolbar = layerOrderApi
      && typeof layerOrderApi.syncStudioLayerOrderToolbarState === 'function'
      ? layerOrderApi.syncStudioLayerOrderToolbarState
      : null;
    if (syncToolbar) {
      return syncToolbar({
        documentRef,
        elements: selectedElements,
        orderedElements,
        isLocked,
        canMutateDeck,
        buildZIndexMutationPlan
      });
    }

    const buildToolbarState = layerOrderApi
      && typeof layerOrderApi.buildStudioLayerOrderToolbarState === 'function'
      ? layerOrderApi.buildStudioLayerOrderToolbarState
      : null;
    const buildSelectionState = typeof options.buildLayerOrderSelectionActionState === 'function'
      ? options.buildLayerOrderSelectionActionState
      : () => ({});
    const layerOrderActionState = buildToolbarState
      ? buildToolbarState(selectedElements, {
          orderedElements,
          isLocked,
          canMutateDeck,
          buildZIndexMutationPlan
        })
      : buildSelectionState(selectedElements, {
          slide,
          orderedElements,
          canMutateDeck
        });
    let zIndexCanApply;
    const zIndexInput = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('elZIndex')
      : null;
    if (zIndexInput) {
      const controlStates = layerOrderActionState.controlStates || null;
      if (controlStates && Object.prototype.hasOwnProperty.call(controlStates, 'elZIndex')) {
        zIndexCanApply = !!controlStates.elZIndex;
      } else {
        zIndexCanApply = !!buildZIndexMutationPlan(selectedElements).canApply;
      }
    }
    if (!layerOrderApi || typeof layerOrderApi.renderStudioLayerOrderToolbarState !== 'function') {
      return false;
    }
    return layerOrderApi.renderStudioLayerOrderToolbarState({
      documentRef,
      actionState: layerOrderActionState,
      zIndexCanApply
    });
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
    const buildEditorDeckSnapshot = typeof options.buildEditorDeckSnapshot === 'function'
      ? options.buildEditorDeckSnapshot
      : () => ({ slides: [] });
    const getSelectedElementIds = typeof options.getSelectedElementIds === 'function'
      ? options.getSelectedElementIds
      : null;
    const selectedElementIds = new Set(
      getSelectedElementIds
        ? (getSelectedElementIds(iframeDoc) || []).filter((id) => typeof id === 'string' && id)
        : []
    );
    const deckSnapshot = buildEditorDeckSnapshot(iframeDoc, {
      includeLayers: true,
      preferCanonicalLayers: true,
      ...(getSelectedElementIds
        ? {
            canonicalLayerOptions: {
              isSelectedNode: (node) => !!node && selectedElementIds.has(node.id)
            }
          }
        : {})
    }) || {};
    const activeSlideIndex = Number.isInteger(deckSnapshot.activeSlideIndex)
      && deckSnapshot.activeSlideIndex >= 0
      ? deckSnapshot.activeSlideIndex
      : -1;
    const activeSlideSnapshot = Array.isArray(deckSnapshot.slides)
      ? activeSlideIndex >= 0
        ? deckSnapshot.slides[activeSlideIndex] || null
        : deckSnapshot.slides.find((slide) => slide.id === deckSnapshot.activeSlideId)
      : null;
    const layers = activeSlideSnapshot && Array.isArray(activeSlideSnapshot.elements)
      ? activeSlideSnapshot.elements
      : [];
    const orderedLayerElements = activeSlide
      ? getNormalizedSlideLayerOrder(activeSlide)
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
              isLocked: () => !!layer.isLocked,
              canMutateDeck: () => canRunLayerActions
            }
          )
        };
      }
    };

    const listContainer = documentRef.getElementById('slideLayersList');
    const layerRenderOptions = {
      documentRef,
      ...renderOptions
    };
    const bindLayerActions = () => bindStudioLayerListActions({
      listContainer,
      ...(options.layerActionOptions || {}),
      getElementByEditorId
    });

    if (typeof view.renderStudioLayersListInDocument === 'function') {
      const didRender = view.renderStudioLayersListInDocument(layerRenderOptions);
      bindLayerActions();
      return didRender;
    }

    if (!listContainer || typeof view.renderStudioLayersList !== 'function') return false;
    listContainer.innerHTML = view.renderStudioLayersList(layerRenderOptions);
    const rows = listContainer.children;
    if (rows) {
      for (let index = 0; index < rows.length; index += 1) {
        const layer = layers[index];
        if (layer && rows[index] && rows[index].dataset) {
          rows[index].dataset.editorElementId = layer.id;
        }
      }
    }
    bindLayerActions();
    return true;
  }

  return {
    arrangeStudioElementLayer,
    changeStudioLayerZIndexByRef,
    refreshStudioLayerOrderUi,
    syncStudioLayerOrderActionState,
    resolveStudioLayerRowElement,
    bindStudioLayerListActions,
    selectStudioLayerElementByRef,
    toggleStudioLayerVisibilityByRef,
    syncStudioLayerList
  };
});
