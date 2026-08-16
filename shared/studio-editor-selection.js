(function (root, factory) {
  const liveSelection = typeof module === 'object' && module.exports
    ? require('./studio-editor-live-selection')
    : root && root.SlideNextStudioEditorLiveSelection;
  const api = factory(liveSelection);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelection = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (liveSelection) {
  function buildStudioEditorSelectionOptions(options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const activeSlide = Object.prototype.hasOwnProperty.call(options, 'activeSlide')
      ? options.activeSlide
      : getActiveSlide(options.doc);
    const isEditableElement = typeof options.isEditableElement === 'function'
      ? options.isEditableElement
      : () => true;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : () => '';
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;

    return {
      selectionClassName: 'editor-selected',
      isEligibleElement: (element) => !!(
        isEditableElement(element)
        && activeSlide
        && typeof activeSlide.contains === 'function'
        && activeSlide.contains(element)
      ),
      getElementId,
      getActiveSlide,
      getElementById,
      ...options
    };
  }

  function normalizeStudioSelectionState(nextSelectionState = {}, options = {}) {
    const rawSelectedElements = Array.isArray(nextSelectionState.selectedElements)
      ? nextSelectionState.selectedElements
      : [];
    const selectedElements = liveSelection && typeof liveSelection.getStudioLiveSelection === 'function'
      ? liveSelection.getStudioLiveSelection(rawSelectedElements, options)
      : rawSelectedElements.filter((element) => {
        const isEligibleElement = typeof options.isEligibleElement === 'function'
          ? options.isEligibleElement
          : () => true;
        return !!element
          && (typeof element.isConnected !== 'boolean' || element.isConnected)
          && isEligibleElement(element);
      });
    const preferredSelectedElement = nextSelectionState.selectedElement;
    const selectedElement = liveSelection && typeof liveSelection.isStudioLiveSelectedElement === 'function'
      && liveSelection.isStudioLiveSelectedElement(selectedElements, preferredSelectedElement, options)
      ? preferredSelectedElement
      : selectedElements[0] || null;

    return {
      selectedElements,
      selectedElement
    };
  }

  function getStudioSelectedElementIds(elements = [], options = {}) {
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : () => '';
    const selectedElements = liveSelection && typeof liveSelection.getStudioLiveSelection === 'function'
      ? liveSelection.getStudioLiveSelection(elements, options)
      : Array.isArray(elements)
        ? elements
        : [];

    return selectedElements
      .map((el) => getElementId(el))
      .filter(Boolean);
  }

  function getStudioCommittedSelectedElements(elements = [], doc, options = {}) {
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : () => true;
    const selectionClassName = options.selectionClassName || 'editor-selected';
    const connectedSelection = Array.isArray(elements)
      ? elements.filter((el) => el && el.isConnected && isEligibleElement(el))
      : [];

    if (connectedSelection.length > 0) {
      return connectedSelection;
    }
    if (!doc || typeof doc.querySelectorAll !== 'function') {
      return [];
    }

    return Array.from(doc.querySelectorAll(`.${selectionClassName}`)).filter((el) => {
      return el && el.isConnected && isEligibleElement(el);
    });
  }

  function getStudioCommittedSelectedElementIds(elements = [], doc, options = {}) {
    return getStudioSelectedElementIds(
      getStudioCommittedSelectedElements(elements, doc, options),
      options
    );
  }

  function areStudioIdListsEqual(a = [], b = []) {
    if (a.length !== b.length) return false;
    return a.every((id, index) => id === b[index]);
  }

  function refreshStudioSelectionClasses(doc, selectedElements = [], options = {}) {
    const selectionClassName = options.selectionClassName || 'editor-selected';
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : () => true;

    const nextSelectedElements = selectedElements.filter((el) => {
      return el && el.isConnected && isEligibleElement(el);
    });

    if (doc && typeof doc.querySelectorAll === 'function') {
      doc.querySelectorAll(`.${selectionClassName}`).forEach((el) => el.classList.remove(selectionClassName));
      nextSelectedElements.forEach((el) => el.classList.add(selectionClassName));
    }

    return {
      selectedElements: nextSelectedElements,
      selectedElement: nextSelectedElements[0] || null
    };
  }

  function restoreStudioSelectionByIdsOnActiveSlide(selectedIds, doc, options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;

    const activeSlide = getActiveSlide(doc);
    if (!activeSlide || !Array.isArray(selectedIds) || selectedIds.length === 0) {
      const emptySelectionState = refreshStudioSelectionClasses(doc, [], options);
      return {
        ...emptySelectionState,
        restored: false
      };
    }

    const restoredSelection = selectedIds
      .map((id) => getElementById(id, doc))
      .filter((el) => el && el.isConnected && activeSlide.contains(el));

    const refreshedSelectionState = refreshStudioSelectionClasses(doc, restoredSelection, options);
    return {
      ...refreshedSelectionState,
      restored: refreshedSelectionState.selectedElements.length > 0
    };
  }

  function updateStudioSelection(selectedElements = [], target, options = {}) {
    const normalizedSelectionState = normalizeStudioSelectionState({
      selectedElements
    }, options);
    const currentSelection = normalizedSelectionState.selectedElements;
    if (!target) {
      return {
        selectedElements: currentSelection,
        selectedElement: currentSelection[0] || null
      };
    }

    const additive = !!options.additive;
    const toggle = !!options.toggle;
    let nextSelectedElements = additive ? [...currentSelection] : [];

    if (toggle) {
      if (nextSelectedElements.includes(target)) {
        nextSelectedElements = nextSelectedElements.filter((el) => el !== target);
      } else {
        nextSelectedElements.push(target);
      }
    } else if (!nextSelectedElements.includes(target)) {
      nextSelectedElements.push(target);
    }

    return {
      selectedElements: nextSelectedElements,
      selectedElement: nextSelectedElements[0] || null
    };
  }

  function clearStudioSelection() {
    return {
      selectedElements: [],
      selectedElement: null
    };
  }

  function selectAllStudioElements(elements = [], options = {}) {
    return normalizeStudioSelectionState({
      selectedElements: elements
    }, options);
  }

  function selectStudioElement(options = {}) {
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : (element) => element;
    const target = resolveEditableTarget(options.element);
    if (!target) return false;
    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const nextSelectionState = updateStudioSelection(
      Array.isArray(options.selectedElements) ? options.selectedElements : [],
      target,
      {
        ...getSelectionOptions(),
        additive: !!options.additive,
        toggle: !!options.toggle
      }
    );
    if (typeof options.commitSelectionState !== 'function') return false;
    options.commitSelectionState(nextSelectionState);
    return true;
  }

  function deselectStudioElement(options = {}) {
    if (typeof options.commitSelectionState !== 'function') return false;
    options.commitSelectionState(clearStudioSelection(), {
      hideDragHud: options.hideDragHud,
      hideDragHudOnClear: true
    });
    return true;
  }

  function selectAllStudioElementsOnActiveSlide(options = {}) {
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const activeSlide = getActiveSlide(options.doc);
    if (!activeSlide) return false;
    const getElements = typeof options.getElements === 'function'
      ? options.getElements
      : () => [];
    const rawElements = getElements(activeSlide) || [];
    if (!Array.isArray(rawElements) || rawElements.length === 0) return false;
    const isSelectableElement = typeof options.isSelectableElement === 'function'
      ? options.isSelectableElement
      : () => true;
    const elements = rawElements.filter((element) => {
      try {
        return isSelectableElement(element, activeSlide) !== false;
      } catch (err) {
        return false;
      }
    });
    if (elements.length === 0) return false;
    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const nextSelectionState = selectAllStudioElements(
      elements,
      getSelectionOptions({ activeSlide })
    );
    if (typeof options.commitSelectionState !== 'function') return false;
    options.commitSelectionState(nextSelectionState);
    return true;
  }

  function commitStudioSelectionState(nextSelectionState = {}, options = {}) {
    const normalizedSelectionState = normalizeStudioSelectionState(nextSelectionState, options);
    const selectedElements = normalizedSelectionState.selectedElements;
    const selectedElement = normalizedSelectionState.selectedElement;
    const selectionDocument = Object.prototype.hasOwnProperty.call(options, 'doc')
      ? options.doc
      : selectedElements.find((element) => element && element.ownerDocument)?.ownerDocument;
    const applySelectionState = typeof options.applySelectionState === 'function'
      ? options.applySelectionState
      : () => {};
    const refreshSelectionClasses = typeof options.refreshSelectionClasses === 'function'
      ? options.refreshSelectionClasses
      : () => {};
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const hideDragHud = typeof options.hideDragHud === 'function'
      ? options.hideDragHud
      : () => {};
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : () => {};

    applySelectionState({
      selectedElements,
      selectedElement
    });
    refreshSelectionClasses(selectionDocument);
    syncStudioSelectionUi(selectedElements, {
      doc: selectionDocument,
      syncSelectionOverlay,
      hideDragHud,
      hideDragHudOnClear: options.hideDragHudOnClear,
      syncInspectorForSelection,
      updateLayersList
    });

    return {
      selectedElements,
      selectedElement
    };
  }

  function syncStudioSelectionUi(selectedElements = [], options = {}) {
    const selectionDocument = Object.prototype.hasOwnProperty.call(options, 'doc')
      ? options.doc
      : selectedElements.find((element) => element && element.ownerDocument)?.ownerDocument;
    const syncSelectionOverlay = typeof options.syncSelectionOverlay === 'function'
      ? options.syncSelectionOverlay
      : () => {};
    const hideDragHud = typeof options.hideDragHud === 'function'
      ? options.hideDragHud
      : () => {};
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : () => {};
    const updateLayersList = typeof options.updateLayersList === 'function'
      ? options.updateLayersList
      : () => {};

    syncSelectionOverlay(selectionDocument);
    if (options.hideDragHudOnClear && selectedElements.length === 0) {
      hideDragHud();
    }
    syncInspectorForSelection(selectionDocument);
    updateLayersList(selectionDocument);
  }

  function syncStudioSelectionUiAfterMutation(selectedElements = [], options = {}) {
    const refreshSelectionClasses = typeof options.refreshSelectionClasses === 'function'
      ? options.refreshSelectionClasses
      : () => {};
    const selectionDocument = Object.prototype.hasOwnProperty.call(options, 'doc')
      ? options.doc
      : selectedElements.find((element) => element && element.ownerDocument)?.ownerDocument;
    refreshSelectionClasses(selectionDocument);
    syncStudioSelectionUi(selectedElements, {
      ...options,
      doc: selectionDocument
    });
    return selectedElements;
  }

  function restoreCommittedStudioSelectionByIdsOnActiveSlide(selectedIds, doc, options = {}) {
    const nextSelectionState = restoreStudioSelectionByIdsOnActiveSlide(selectedIds, doc, options);
    const applySelectionState = typeof options.applySelectionState === 'function'
      ? options.applySelectionState
      : () => {};

    applySelectionState({
      selectedElements: nextSelectionState.selectedElements,
      selectedElement: nextSelectionState.selectedElement
    });
    syncStudioSelectionUi(nextSelectionState.selectedElements, {
      ...options,
      doc
    });

    return nextSelectionState;
  }

  function restoreStudioSelectionAfterSlideMutation(selectedIds, doc, options = {}) {
    const preserveSelection = typeof options.preserveSelection === 'function'
      ? options.preserveSelection
      : () => {};

    preserveSelection();
    return restoreCommittedStudioSelectionByIdsOnActiveSlide(selectedIds, doc, options);
  }

  return {
    buildStudioEditorSelectionOptions,
    normalizeStudioSelectionState,
    getStudioSelectedElementIds,
    getStudioCommittedSelectedElements,
    getStudioCommittedSelectedElementIds,
    areStudioIdListsEqual,
    refreshStudioSelectionClasses,
    restoreStudioSelectionByIdsOnActiveSlide,
    updateStudioSelection,
    clearStudioSelection,
    selectAllStudioElements,
    selectStudioElement,
    deselectStudioElement,
    selectAllStudioElementsOnActiveSlide,
    commitStudioSelectionState,
    syncStudioSelectionUi,
    syncStudioSelectionUiAfterMutation,
    restoreCommittedStudioSelectionByIdsOnActiveSlide,
    restoreStudioSelectionAfterSlideMutation
  };
});
