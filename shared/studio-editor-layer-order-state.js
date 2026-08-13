(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorLayerOrderStateController(options = {}) {
    const layerOrderApi = options.layerOrderApi && typeof options.layerOrderApi === 'object'
      ? options.layerOrderApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getNormalizedSlideLayerOrder = typeof options.getNormalizedSlideLayerOrder === 'function'
      ? options.getNormalizedSlideLayerOrder
      : () => [];
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    let actionStateBuilder = null;

    function buildDisabledState() {
      return {
        selection: [],
        hasSelection: false,
        hasLockedSelection: false,
        canReorder: false,
        canBringToFront: false,
        canSendToBack: false,
        canBringForward: false,
        canSendBackward: false
      };
    }

    function buildActionState(elements, options = {}) {
      if (!layerOrderApi) return buildDisabledState();
      const hasBuilder = typeof layerOrderApi.createStudioLayerOrderActionStateBuilder === 'function'
        || typeof layerOrderApi.buildStudioLayerOrderActionState === 'function';
      if (!hasBuilder) return buildDisabledState();

      if (typeof layerOrderApi.createStudioLayerOrderActionStateBuilder === 'function') {
        if (!actionStateBuilder) {
          try {
            actionStateBuilder = layerOrderApi.createStudioLayerOrderActionStateBuilder({
              getDocument,
              getSelectedElements,
              getActiveSlide,
              getNormalizedSlideLayerOrder,
              getLockedState: () => getLockedState()
            });
          } catch (error) {
            actionStateBuilder = null;
          }
        }
        if (typeof actionStateBuilder === 'function') {
          try {
            return actionStateBuilder(elements, options);
          } catch (error) {
            return buildDisabledState();
          }
        }
      }

      if (typeof layerOrderApi.buildStudioLayerOrderActionState !== 'function') {
        return buildDisabledState();
      }
      const hasDocOverride = Object.prototype.hasOwnProperty.call(options, 'doc');
      const resolvedDoc = hasDocOverride ? options.doc : getDocument();
      const resolvedElements = typeof elements === 'undefined'
        ? getSelectedElements(resolvedDoc)
        : elements;
      const hasSlideOverride = Object.prototype.hasOwnProperty.call(options, 'slide');
      const resolvedSlide = hasSlideOverride ? options.slide : getActiveSlide(resolvedDoc);
      const orderedElements = Array.isArray(options.orderedElements)
        ? options.orderedElements
        : (resolvedSlide ? getNormalizedSlideLayerOrder(resolvedSlide) : []);
      const canMutateDeck = typeof options.canMutateDeck === 'function'
        ? options.canMutateDeck
        : () => !!resolvedSlide;
      let lockedState = getLockedState();
      if (typeof options.isLocked === 'function') lockedState = options.isLocked;
      return layerOrderApi.buildStudioLayerOrderActionState(resolvedElements, {
        orderedElements,
        isLocked: typeof lockedState === 'function' ? lockedState : () => false,
        canMutateDeck
      });
    }

    return {
      buildActionState
    };
  }

  return {
    createStudioEditorLayerOrderStateController
  };
});
