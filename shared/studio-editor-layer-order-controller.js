(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayerOrderController(options = {}) {
    const layerOrderApi = options.layerOrderApi
      || (root && root.SlideNextStudioEditorLayerOrder)
      || null;
    const canonicalLayoutApi = options.canonicalLayoutApi
      || (root && root.SlideNextStudioEditorCanonicalLayout)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const assignElementId = typeof options.assignElementId === 'function'
      ? (element) => {
          const assignedId = options.assignElementId(element);
          if (assignedId) return assignedId;
          return element && element.dataset && element.dataset.editorId;
        }
      : (element) => element && element.dataset && element.dataset.editorId;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const applyLayerOrderMutation = typeof options.applyLayerOrderMutation === 'function'
      ? options.applyLayerOrderMutation
      : () => ({ didApply: false, transaction: null });

    function reorder(action, targetElements = [], reorderOptions = {}) {
      const slide = getActiveSlide();
      if (!slide || !layerOrderApi || typeof layerOrderApi.buildStudioLayerOrderMutationPlan !== 'function') {
        return false;
      }
      const buildCanonicalLayerOrderMutation = canonicalLayoutApi
        && typeof canonicalLayoutApi.createStudioCanonicalLayerOrderMutationBuilder === 'function'
        ? canonicalLayoutApi.createStudioCanonicalLayerOrderMutationBuilder({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline
          })
        : null;
      const buildCanonicalLayoutBaseline = canonicalLayoutApi
        && typeof canonicalLayoutApi.buildStudioCanonicalLayoutBaseline === 'function'
        ? canonicalLayoutApi.buildStudioCanonicalLayoutBaseline
        : null;
      const canonicalDeckBefore = buildCanonicalLayoutBaseline
        ? buildCanonicalLayoutBaseline({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            sourceDocument: getIframeDoc()
          })
        : null;
      const initialOrder = getNormalizedSlideLayerOrder(slide);
      const reorderResult = layerOrderApi.buildStudioLayerOrderMutationPlan(targetElements, action, {
        orderedElements: initialOrder,
        isEligibleElement: (element) => !!(element && element.isConnected && slide.contains(element)),
        isLocked: isElementLocked
      });
      if (!reorderResult || !reorderResult.didChange) return false;
      const getLayerOrderElementId = (element) => assignElementId(element);
      const mutation = applyLayerOrderMutation(
        slide,
        initialOrder,
        reorderResult.nextOrder,
        { getElementId: getLayerOrderElementId }
      );
      if (!mutation || !mutation.didApply) return false;
      const canonicalDeck = buildCanonicalLayerOrderMutation
        ? buildCanonicalLayerOrderMutation({
            orderedElements: initialOrder,
            canonicalDeckApi,
            canonicalDeckBeforeMutation: canonicalDeckBefore,
            getElementId: getLayerOrderElementId
          })
        : null;
      if (typeof reorderOptions.onTransaction === 'function') {
        reorderOptions.onTransaction(mutation.transaction);
      }
      if (typeof reorderOptions.onCanonicalDeck === 'function') {
        reorderOptions.onCanonicalDeck(canonicalDeck);
      }
      return true;
    }

    return {
      reorder
    };
  }

  return {
    createStudioEditorLayerOrderController
  };
});
