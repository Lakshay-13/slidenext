(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorMasterSlideRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorMasterSlideRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorMasterSlideController)
      || null;
    const masterSlideController = controllerApi
      && typeof controllerApi.createStudioEditorMasterSlideController === 'function'
      ? controllerApi.createStudioEditorMasterSlideController({
          canonicalDeckApi: options.canonicalDeckApi
            || (root && root.SlideNextCanonicalDeck)
            || null,
          canonicalStateApi: options.canonicalStateApi
            || (root && root.SlideNextStudioEditorCanonicalState)
            || null,
          renderApi: options.renderApi
            || (root && root.SlideNextDeckRender)
            || null,
          getCanonicalDeck: options.getCanonicalDeck,
          getCanonicalDeckBaseline: options.getCanonicalDeckBaseline,
          getDocument: options.getDocument,
          getSlides: options.getSlides,
          getActiveSlideId: options.getActiveSlideId,
          prepareSlide: options.prepareSlide,
          setActiveSlide: options.setActiveSlide,
          generateThumbnails: options.generateThumbnails,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          finalizeMutation: options.finalizeMutation,
          onMasterSlidesChanged: options.onMasterSlidesChanged
        })
      : null;

    return {
      masterSlideController
    };
  }

  return {
    createStudioEditorMasterSlideRuntime
  };
});
