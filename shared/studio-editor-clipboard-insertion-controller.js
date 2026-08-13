(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardInsertionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorClipboardInsertionController(options = {}) {
    const hasOption = (name) => Object.prototype.hasOwnProperty.call(options, name);
    const resolveDependency = (name, globalName) => hasOption(name)
      ? options[name]
      : (root && root[globalName]) || null;
    const clipboardApi = resolveDependency('clipboardApi', 'SlideNextStudioEditorClipboard');
    const mutationApi = resolveDependency(
      'mutationApi',
      'SlideNextStudioEditorClipboardMutation'
    );
    const transactionApi = resolveDependency(
      'transactionApi',
      'SlideNextStudioEditorTransaction'
    );
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getEditorSlideId = typeof options.getEditorSlideId === 'function'
      ? options.getEditorSlideId
      : (slide) => slide && slide.id;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : () => {};
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : () => null;
    const getOffsetPx = typeof options.getOffsetPx === 'function'
      ? options.getOffsetPx
      : () => Number.isFinite(options.offsetPx) ? options.offsetPx : 0;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;

    function applyInsertionWithTransaction(insertionPlans, slide) {
      const applyMutation = mutationApi
        && typeof mutationApi.applyStudioClipboardInsertionWithTransaction === 'function'
        ? mutationApi.applyStudioClipboardInsertionWithTransaction
        : null;
      if (!applyMutation) {
        return {
          inserted: [],
          transaction: null
        };
      }

      return applyMutation(insertionPlans, slide, {
        clipboardApi,
        transactionApi,
        getElementId,
        getParentId: (parent) => {
          if (parent === slide) {
            let slideId = '';
            try {
              slideId = getEditorSlideId(slide) || '';
            } catch (error) {
              slideId = '';
            }
            return slideId ? `slide:${slideId}` : '';
          }
          return getElementId(parent);
        }
      });
    }

    function insert(items, offsetMultiplier = 1, actionOptions = {}) {
      const doc = getIframeDoc();
      const slide = getActiveSlide(doc);
      if (!doc || !slide || !Array.isArray(items) || items.length === 0
        || !clipboardApi
        || typeof clipboardApi.buildStudioClipboardInsertionPlan !== 'function') {
        return [];
      }

      const slideMetrics = getSlideMetrics(slide);
      if (!slideMetrics) return [];
      const insertionPlans = clipboardApi.buildStudioClipboardInsertionPlan(items, offsetMultiplier, {
        slide,
        prepareElement: makeElementsHoverable,
        isOnActiveSlide: (element) => !!(element
          && typeof slide.contains === 'function'
          && slide.contains(element)),
        getParentBoundsOnSlide: (parent) => {
          if (!parent || typeof parent.getBoundingClientRect !== 'function') return null;
          return getRectOnSlide(parent.getBoundingClientRect(), slideMetrics);
        },
        offsetPx: getOffsetPx(),
        slideWidth: slideMetrics.logicalWidth,
        slideHeight: slideMetrics.logicalHeight
      });
      if (!Array.isArray(insertionPlans) || insertionPlans.length !== items.length) return [];

      const mutation = applyInsertionWithTransaction(insertionPlans, slide);
      if (typeof actionOptions.onTransaction === 'function') {
        actionOptions.onTransaction(mutation.transaction);
      }
      return mutation.inserted;
    }

    return {
      insert,
      insertClipboardPayload: insert
    };
  }

  return {
    createStudioEditorClipboardInsertionController
  };
});
