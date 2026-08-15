(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutConversionController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayoutConversionController(options = {}) {
    const conversionApi = options.conversionApi
      || (root && root.SlideNextStudioEditorLayoutConversion)
      || null;
    const canonicalLayoutApi = options.canonicalLayoutApi
      || (root && root.SlideNextStudioEditorCanonicalLayout)
      || null;
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const transactionApi = options.transactionApi
      || (root && root.SlideNextStudioEditorTransaction)
      || null;
    const conversionMutationApi = options.conversionMutationApi
      || (root && root.SlideNextStudioEditorLayoutConversionMutation)
      || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSlideMetrics = typeof options.getSlideMetrics === 'function'
      ? options.getSlideMetrics
      : () => null;
    const getClosestPositionedAncestor = typeof options.getClosestPositionedAncestor === 'function'
      ? options.getClosestPositionedAncestor
      : () => null;
    const getRectOnSlide = typeof options.getRectOnSlide === 'function'
      ? options.getRectOnSlide
      : (rect) => rect;
    const buildPositionedLayoutItems = typeof options.buildPositionedLayoutItems === 'function'
      ? options.buildPositionedLayoutItems
      : null;
    const isLocked = typeof options.isLocked === 'function' ? options.isLocked : () => false;
    const isHidden = typeof options.isHidden === 'function' ? options.isHidden : () => false;
    const isFreeformPositioned = typeof options.isFreeformPositioned === 'function'
      ? options.isFreeformPositioned
      : () => false;
    const assignElementId = typeof options.assignElementId === 'function'
      ? options.assignElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const buildCanonicalDeck = typeof options.buildCanonicalDeck === 'function'
      ? options.buildCanonicalDeck
      : null;
    const buildCanonicalDeckBaseline = typeof options.buildCanonicalDeckBaseline === 'function'
      ? options.buildCanonicalDeckBaseline
      : null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getPendingCanonicalDeck = typeof options.getPendingCanonicalDeck === 'function'
      ? options.getPendingCanonicalDeck
      : null;
    const finalizeDeckMutation = typeof options.finalizeDeckMutation === 'function'
      ? options.finalizeDeckMutation
      : null;
    const updateActionState = typeof options.updateActionState === 'function'
      ? options.updateActionState
      : null;

    function buildPlan(doc = null) {
      const resolvedDoc = doc || getDocument();
      const activeSlide = getActiveSlide(resolvedDoc);
      if (!activeSlide || !conversionApi
        || typeof conversionApi.buildStudioFlowToFreeformPlan !== 'function') {
        return { selection: [], items: [], canConvert: false, reason: 'slide-unavailable' };
      }
      const slideMetrics = getSlideMetrics(activeSlide);
      return conversionApi.buildStudioFlowToFreeformPlan(getSelectedElements(resolvedDoc), {
        isLocked: (element) => isLocked(element, resolvedDoc),
        isHidden: (element) => isHidden(element, resolvedDoc),
        isFreeformPositioned: (element) => isFreeformPositioned(element, resolvedDoc),
        buildPositionedLayoutItems: buildPositionedLayoutItems
          ? (elements) => buildPositionedLayoutItems(elements, {
              getClosestPositionedAncestor,
              getRectOnSlide,
              slideMetrics
            })
          : null
      });
    }

    const restoreConversionStyles = conversionMutationApi
      && typeof conversionMutationApi.restoreStudioLayoutConversionStyles === 'function'
      ? conversionMutationApi.restoreStudioLayoutConversionStyles
      : (items = []) => {
          items.forEach((item) => {
            if (!item || !item.element || !item.element.style) return;
            Object.keys(item.beforeStyle || {}).forEach((property) => {
              item.element.style[property] = item.beforeStyle[property];
            });
          });
          return true;
        };
    const applyConversionStyles = conversionMutationApi
      && typeof conversionMutationApi.applyStudioLayoutConversionStyles === 'function'
      ? conversionMutationApi.applyStudioLayoutConversionStyles
      : (items = []) => {
          const appliedItems = [];
          try {
            items.forEach((item) => {
              if (!item || !item.element || !item.element.style) {
                throw new Error('conversion target has no writable style');
              }
              appliedItems.push(item);
              Object.keys(item.afterStyle || {}).forEach((property) => {
                item.element.style[property] = item.afterStyle[property];
              });
            });
            return true;
          } catch (error) {
            restoreConversionStyles(appliedItems);
            return false;
          }
        };

    function buildCanonicalDeckForPlan(plan, doc) {
      const createMutationBuilder = canonicalLayoutApi
        && typeof canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder === 'function'
        ? canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder({
            canonicalDeckApi,
            buildCanonicalDeck,
            buildCanonicalDeckBaseline,
            getPendingCanonicalDeck,
            getCanonicalDeckBaseline
          })
        : null;
      if (!createMutationBuilder) return null;
      return createMutationBuilder({
        sourceDocument: doc,
        nextItems: plan.items.map((item) => ({
          element: item.element,
          nextAbsLeft: item.layout.x,
          nextAbsTop: item.layout.y,
          nextWidth: item.layout.width,
          nextHeight: item.layout.height
        })),
        getElementId: assignElementId
      });
    }

    function convert() {
      const doc = getDocument();
      const plan = buildPlan(doc);
      if (!plan.canConvert || !transactionApi
        || typeof transactionApi.createStudioStyleTransaction !== 'function') {
        if (updateActionState) updateActionState(doc);
        return false;
      }
      if (!finalizeDeckMutation) {
        if (updateActionState) updateActionState(doc);
        return false;
      }

      let transaction = null;
      try {
        transaction = transactionApi.createStudioStyleTransaction(
          plan.items.map((item) => ({
            element: item.element,
            before: item.beforeStyle,
            after: item.afterStyle
          })),
          { getElementId: assignElementId }
        );
      } catch (error) {
        transaction = null;
      }
      if (!transaction) {
        if (updateActionState) updateActionState(doc);
        return false;
      }

      let canonicalDeck = null;
      try {
        canonicalDeck = buildCanonicalDeckForPlan(plan, doc);
      } catch (error) {
        canonicalDeck = null;
      }
      if (canonicalLayoutApi
        && typeof canonicalLayoutApi.createStudioCanonicalLayoutMutationBuilder === 'function'
        && !canonicalDeck) {
        if (updateActionState) updateActionState(doc);
        return false;
      }
      if (!applyConversionStyles(plan.items)) {
        restoreConversionStyles(plan.items);
        if (updateActionState) updateActionState(doc);
        return false;
      }

      let finalizeResult = false;
      try {
        finalizeResult = finalizeDeckMutation('Auto: Converted to Freeform', {
          syncSelectionOverlay: true,
          refreshThumbnails: false,
          transaction,
          ...(canonicalDeck ? { canonicalDeck } : {})
        });
      } catch (error) {
        finalizeResult = false;
      }
      if (finalizeResult === false) {
        restoreConversionStyles(plan.items);
        if (updateActionState) updateActionState(doc);
        return false;
      }
      if (updateActionState) updateActionState(doc);
      return true;
    }

    return {
      buildPlan,
      convert
    };
  }

  return {
    createStudioEditorLayoutConversionController
  };
});
