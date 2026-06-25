(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelection = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioSelectedElementIds(elements = [], options = {}) {
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : () => true;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : () => '';

    return elements
      .filter((el) => el && el.isConnected && isEligibleElement(el))
      .map((el) => getElementId(el))
      .filter(Boolean);
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
    if (!target) {
      return {
        selectedElements,
        selectedElement: selectedElements[0] || null
      };
    }

    const additive = !!options.additive;
    const toggle = !!options.toggle;
    let nextSelectedElements = additive ? [...selectedElements] : [];

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

  function selectAllStudioElements(elements = []) {
    return {
      selectedElements: [...elements],
      selectedElement: elements[0] || null
    };
  }

  return {
    getStudioSelectedElementIds,
    areStudioIdListsEqual,
    refreshStudioSelectionClasses,
    restoreStudioSelectionByIdsOnActiveSlide,
    updateStudioSelection,
    clearStudioSelection,
    selectAllStudioElements
  };
});
