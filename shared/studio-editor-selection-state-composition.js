(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSelectionStateComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorSelectionStateComposition(options = {}) {
    const liveSelectionAdapter = options.liveSelectionAdapter
      && typeof options.liveSelectionAdapter === 'object'
      ? options.liveSelectionAdapter
      : null;
    const liveSelectionApi = options.liveSelectionApi && typeof options.liveSelectionApi === 'object'
      ? options.liveSelectionApi
      : null;
    const transformApi = options.transformApi && typeof options.transformApi === 'object'
      ? options.transformApi
      : null;
    const nudgeApi = options.nudgeApi && typeof options.nudgeApi === 'object'
      ? options.nudgeApi
      : null;
    const getSelectionOptions = typeof options.getSelectionOptions === 'function'
      ? options.getSelectionOptions
      : () => ({});
    const getCanonicalVisibilityReader = typeof options.getCanonicalVisibilityReader === 'function'
      ? options.getCanonicalVisibilityReader
      : (_property, _doc, fallbackReader) => (
        typeof fallbackReader === 'function' ? fallbackReader : () => false
      );
    const getCanonicalFreeformReader = typeof options.getCanonicalFreeformReader === 'function'
      ? options.getCanonicalFreeformReader
      : (_doc, fallbackReader) => (
        typeof fallbackReader === 'function' ? fallbackReader : () => false
      );
    const transformSelectionStateBuilder = typeof options.transformSelectionStateBuilder === 'function'
      ? options.transformSelectionStateBuilder
      : transformApi && typeof transformApi.buildStudioTransformSelectionState === 'function'
        ? (...args) => transformApi.buildStudioTransformSelectionState(...args)
        : null;
    const freeformPositionFallback = typeof options.isElementFreeformPositioned === 'function'
      ? options.isElementFreeformPositioned
      : transformApi && typeof transformApi.isStudioFreeformPositioned === 'function'
        ? (...args) => transformApi.isStudioFreeformPositioned(...args)
        : () => false;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const isElementHidden = typeof options.isElementHidden === 'function'
      ? options.isElementHidden
      : () => false;

    function getLiveSelectedElements(elements = [], doc = null) {
      if (!liveSelectionAdapter
        || typeof liveSelectionAdapter.getStudioEditorLiveSelection !== 'function') {
        return [];
      }
      const liveElements = liveSelectionAdapter.getStudioEditorLiveSelection(elements, {
        selectionApi: liveSelectionApi,
        getSelectionOptions: () => getSelectionOptions(doc)
      });
      return liveElements || [];
    }

    function getTransformSelectionState(elements = [], doc = null) {
      if (typeof transformSelectionStateBuilder !== 'function') {
        return null;
      }
      const readLockedState = getCanonicalVisibilityReader('locked', doc, isElementLocked);
      const readHiddenState = getCanonicalVisibilityReader('hidden', doc, isElementHidden);
      return transformSelectionStateBuilder(elements, {
        isLocked: readLockedState,
        isHidden: readHiddenState,
        isFreeformPositioned: getCanonicalFreeformReader(doc, freeformPositionFallback)
      });
    }

    function selectionHasLockedElements(elements = [], doc = null) {
      if (!liveSelectionApi || typeof liveSelectionApi.hasStudioLockedLiveSelection !== 'function') {
        return false;
      }
      return liveSelectionApi.hasStudioLockedLiveSelection(elements, {
        isLocked: getCanonicalVisibilityReader('locked', doc, isElementLocked)
      });
    }

    function getNudgeSelectionState(elements = [], doc = null) {
      if (!nudgeApi || typeof nudgeApi.buildStudioNudgeSelectionState !== 'function') {
        return { selection: [], canNudge: false };
      }
      const readLockedState = getCanonicalVisibilityReader('locked', doc, isElementLocked);
      const readHiddenState = getCanonicalVisibilityReader('hidden', doc, isElementHidden);
      return nudgeApi.buildStudioNudgeSelectionState(elements, {
        isLocked: readLockedState,
        isHidden: readHiddenState,
        isFreeformPositioned: getCanonicalFreeformReader(doc, freeformPositionFallback)
      });
    }

    return {
      getLiveSelectedElements,
      getTransformSelectionState,
      selectionHasLockedElements,
      getNudgeSelectionState
    };
  }

  return { createStudioEditorSelectionStateComposition };
});
