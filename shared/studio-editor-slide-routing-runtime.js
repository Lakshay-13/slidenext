(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideRoutingRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideRoutingRuntime(options = {}) {
    const routingApi = options.routingApi
      || (root && root.SlideNextStudioEditorSlideRoutingController)
      || null;
    const slideRoutingController = routingApi
      && typeof routingApi.createStudioEditorSlideRoutingController === 'function'
      ? routingApi.createStudioEditorSlideRoutingController({
          deckViewApi: options.deckViewApi
            || (root && root.SlideNextStudioDeckView)
            || null,
          getSlideIndexById: options.getSlideIndexById,
          activateSlideByIndex: options.activateSlideByIndex,
          deleteSlideByIndex: options.deleteSlideByIndex,
          reorderSlidesByIndex: options.reorderSlidesByIndex
        })
      : null;

    return {
      slideRoutingController
    };
  }

  return {
    createStudioEditorSlideRoutingRuntime
  };
});
