(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTemplateRuntime(options = {}) {
    const controllerApi = options.controllerApi
      || (root && root.SlideNextStudioEditorTemplateController)
      || null;
    const templateController = controllerApi
      && typeof controllerApi.createStudioEditorTemplateController === 'function'
      ? controllerApi.createStudioEditorTemplateController({
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
          getSlideContainer: options.getSlideContainer,
          getSlides: options.getSlides,
          getActiveSlideId: options.getActiveSlideId,
          prepareSlide: options.prepareSlide,
          getElementId: options.getElementId,
          applyInsertion: options.applyInsertion,
          generateThumbnails: options.generateThumbnails,
          setActiveSlide: options.setActiveSlide,
          saveHistoryState: options.saveHistoryState,
          triggerAutoSave: options.triggerAutoSave,
          triggerAutoVersion: options.triggerAutoVersion,
          finalizeMutation: options.finalizeMutation,
          onTemplatesChanged: options.onTemplatesChanged
        })
      : null;

    return {
      templateController
    };
  }

  return {
    createStudioEditorTemplateRuntime
  };
});
