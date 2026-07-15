(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLiveSelection = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getStudioLiveSelection(elements = [], options = {}) {
    const selection = Array.isArray(elements) ? elements : [];
    const matchesBaseEligibility = (element) => !!element && (typeof element.isConnected !== 'boolean' || element.isConnected);
    const isEligibleElement = typeof options.isEligibleElement === 'function'
      ? options.isEligibleElement
      : () => true;
    const seenElements = new Set();

    return selection.filter((element) => {
      if (!matchesBaseEligibility(element) || !isEligibleElement(element) || seenElements.has(element)) {
        return false;
      }
      seenElements.add(element);
      return true;
    });
  }

  function buildStudioLiveSelectionState(elements = [], options = {}) {
    const selection = getStudioLiveSelection(elements, options);

    return {
      selection,
      hasSelection: selection.length > 0,
      count: selection.length,
      primaryElement: selection[0] || null
    };
  }

  function isStudioLiveSelectedElement(elements = [], candidate, options = {}) {
    if (!candidate) {
      return false;
    }
    return getStudioLiveSelection(elements, options).includes(candidate);
  }

  function hasStudioLockedLiveSelection(elements = [], options = {}) {
    const selection = getStudioLiveSelection(elements, options);
    const isLocked = typeof options.isLocked === 'function'
      ? options.isLocked
      : () => false;

    return selection.some((element) => isLocked(element));
  }

  return {
    getStudioLiveSelection,
    buildStudioLiveSelectionState,
    isStudioLiveSelectedElement,
    hasStudioLockedLiveSelection
  };
});
