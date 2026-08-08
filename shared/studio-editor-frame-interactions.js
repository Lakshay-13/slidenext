(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameInteractions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorFrameInteractions(options = {}) {
    const eventsApi = options.eventsApi
      || (root && root.SlideNextStudioEditorEvents)
      || null;
    const inlineTextEditApi = options.inlineTextEditApi
      || (root && root.SlideNextStudioEditorInlineEdit)
      || null;
    const getIsDragging = typeof options.getIsDragging === 'function'
      ? options.getIsDragging
      : () => false;
    const consumeClickSuppression = typeof options.consumeClickSuppression === 'function'
      ? options.consumeClickSuppression
      : () => false;
    const shouldIgnoreTarget = typeof options.shouldIgnoreTarget === 'function'
      ? options.shouldIgnoreTarget
      : () => false;
    const resolveEditableTarget = typeof options.resolveEditableTarget === 'function'
      ? options.resolveEditableTarget
      : () => null;
    const selectElement = typeof options.selectElement === 'function'
      ? options.selectElement
      : () => {};
    const deselectElement = typeof options.deselectElement === 'function'
      ? options.deselectElement
      : () => {};
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const resolveTextElement = typeof options.resolveTextElement === 'function'
      ? options.resolveTextElement
      : () => null;
    const resolveAdjacentTextElement = typeof options.resolveAdjacentTextElement === 'function'
      ? options.resolveAdjacentTextElement
      : null;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const isElementHidden = typeof options.isElementHidden === 'function'
      ? options.isElementHidden
      : () => false;
    const onInlineEditStart = typeof options.onInlineEditStart === 'function'
      ? options.onInlineEditStart
      : () => {};
    const onInlineEditCommit = typeof options.onInlineEditCommit === 'function'
      ? options.onInlineEditCommit
      : () => {};
    const onInlineEditEnd = typeof options.onInlineEditEnd === 'function'
      ? options.onInlineEditEnd
      : () => {};
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const canMutateDeck = typeof options.canMutateDeck === 'function'
      ? options.canMutateDeck
      : () => false;
    const editorUndo = typeof options.editorUndo === 'function' ? options.editorUndo : () => {};
    const editorRedo = typeof options.editorRedo === 'function' ? options.editorRedo : () => {};
    const selectAllElementsOnActiveSlide = typeof options.selectAllElementsOnActiveSlide === 'function'
      ? options.selectAllElementsOnActiveSlide
      : () => {};
    const arrangeElementLayer = typeof options.arrangeElementLayer === 'function'
      ? options.arrangeElementLayer
      : () => {};
    const removeSelectedElement = typeof options.removeSelectedElement === 'function'
      ? options.removeSelectedElement
      : () => {};
    const copySelectedElements = typeof options.copySelectedElements === 'function'
      ? options.copySelectedElements
      : () => {};
    const pasteClipboardElements = typeof options.pasteClipboardElements === 'function'
      ? options.pasteClipboardElements
      : () => {};
    const duplicateSelectedElements = typeof options.duplicateSelectedElements === 'function'
      ? options.duplicateSelectedElements
      : () => {};
    const nudgeSelectedElements = typeof options.nudgeSelectedElements === 'function'
      ? options.nudgeSelectedElements
      : () => {};
    const navigateSlide = typeof options.navigateSlide === 'function'
      ? options.navigateSlide
      : null;

    function attach(doc) {
      if (!doc || !eventsApi
        || typeof eventsApi.createStudioFrameClickHandler !== 'function'
        || typeof eventsApi.createStudioFrameKeydownHandler !== 'function') {
        return false;
      }

      const frameClickHandler = eventsApi.createStudioFrameClickHandler({
        isDraggingElement: getIsDragging,
        consumeClickSuppression,
        shouldIgnoreTarget,
        resolveEditableTarget,
        selectElement,
        deselectElement
      });

      if (inlineTextEditApi
        && typeof inlineTextEditApi.attachStudioInlineTextEditHandlers === 'function') {
        inlineTextEditApi.attachStudioInlineTextEditHandlers(doc, {
          getActiveSlide: () => getActiveSlide(doc),
          resolveTextElement,
          resolveAdjacentTextElement,
          canEdit: (element) => !!getActiveSlide(doc)
            && !isElementLocked(element)
            && !isElementHidden(element),
          onStart: (payload) => onInlineEditStart(payload, doc),
          onCommit: onInlineEditCommit,
          onEnd: onInlineEditEnd
        });
      }

      const frameKeydownHandler = eventsApi.createStudioFrameKeydownHandler({
        getActiveElement: () => doc.activeElement,
        getSelectedElements: () => getSelectedElements(doc),
        canMutateDeck: () => !!canMutateDeck(doc),
        editorUndo,
        editorRedo,
        selectAllElementsOnActiveSlide,
        arrangeElementLayer,
        deselectElement,
        removeSelectedElement,
        copySelectedElements,
        pasteClipboardElements,
        duplicateSelectedElements,
        nudgeSelectedElements,
        navigateSlide
      });
      if (typeof eventsApi.attachStudioFrameInteractionHandlers === 'function') {
        eventsApi.attachStudioFrameInteractionHandlers(doc, {
          clickHandler: frameClickHandler,
          keydownHandler: frameKeydownHandler
        });
      }

      return true;
    }

    return {
      attach
    };
  }

  return {
    createStudioEditorFrameInteractions
  };
});
