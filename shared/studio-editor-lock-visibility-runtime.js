(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLockVisibilityRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLockVisibilityRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorLockVisibilityController)
      || null;
    const lockVisibilityController = controllerApi
      && typeof controllerApi.createStudioEditorLockVisibilityController === 'function'
      ? controllerApi.createStudioEditorLockVisibilityController({
          lockStateApi: options.lockStateApi
            || (root && root.SlideNextStudioEditorLockState)
            || null,
          visibilityStateApi: options.visibilityStateApi
            || (root && root.SlideNextStudioEditorVisibilityState)
            || null,
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalVisibilityApi: options.canonicalVisibilityApi
            || (root && root.SlideNextStudioEditorCanonicalVisibility)
            || null,
          canonicalStateApi: options.canonicalStateApi
            || (root && root.SlideNextStudioEditorCanonicalState)
            || null,
          getSelectedElements: options.getSelectedElements,
          getIframeDoc: options.getIframeDoc,
          getActiveSlide: options.getActiveSlide,
          isLocked: options.isLocked,
          isHidden: options.isHidden,
          setLocked: options.setLocked,
          setHidden: options.setHidden,
          getVisibilityState: options.getVisibilityState,
          assignLockElementId: options.assignLockElementId,
          assignVisibilityElementId: options.assignVisibilityElementId,
          buildCanonicalDeckBaseline: options.buildCanonicalDeckBaseline,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          applyLockMutation: options.applyLockMutation,
          applyVisibilityMutation: options.applyVisibilityMutation,
          finalizeSelectionToggleMutation: options.finalizeSelectionToggleMutation,
          rollbackSelectionToggleMutation: options.rollbackSelectionToggleMutation
        })
      : null;

    return {
      lockVisibilityController
    };
  }

  return {
    createStudioEditorLockVisibilityRuntime
  };
});
