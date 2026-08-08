(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideRoutingController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorSlideRoutingController(options = {}) {
    const deckViewApi = options.deckViewApi
      || (root && root.SlideNextStudioDeckView)
      || null;
    const getSlideIndexById = typeof options.getSlideIndexById === 'function'
      ? options.getSlideIndexById
      : () => -1;
    const activateSlideByIndex = typeof options.activateSlideByIndex === 'function'
      ? options.activateSlideByIndex
      : null;
    const deleteSlideByIndex = typeof options.deleteSlideByIndex === 'function'
      ? options.deleteSlideByIndex
      : null;
    const reorderSlidesByIndex = typeof options.reorderSlidesByIndex === 'function'
      ? options.reorderSlidesByIndex
      : null;

    function select(slideId, doc, slideOptions = {}) {
      if (!deckViewApi || typeof deckViewApi.setStudioDeckActiveSlideById !== 'function') {
        return false;
      }
      return deckViewApi.setStudioDeckActiveSlideById(slideId, {
        doc,
        getSlideIndexById,
        activateSlideByIndex: (index) => {
          if (activateSlideByIndex) {
            activateSlideByIndex(index, slideOptions);
          }
        }
      });
    }

    function remove(slideId, doc) {
      if (!deleteSlideByIndex) return false;
      const index = getSlideIndexById(slideId, doc);
      if (index === -1) return false;
      return deleteSlideByIndex(index);
    }

    function reorder(sourceSlideId, targetSlideId, doc) {
      if (!reorderSlidesByIndex) return false;
      const fromIdx = getSlideIndexById(sourceSlideId, doc);
      const toIdx = getSlideIndexById(targetSlideId, doc);
      if (fromIdx === -1 || toIdx === -1) return false;
      return reorderSlidesByIndex(fromIdx, toIdx);
    }

    return {
      select,
      remove,
      reorder
    };
  }

  return {
    createStudioEditorSlideRoutingController
  };
});
