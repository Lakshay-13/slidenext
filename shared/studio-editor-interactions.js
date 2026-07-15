(function (root, factory) {
  const transform = typeof module === 'object' && module.exports
    ? require('./studio-editor-transform')
    : root && root.SlideNextStudioEditorTransform;
  const events = typeof module === 'object' && module.exports
    ? require('./studio-editor-events')
    : root && root.SlideNextStudioEditorEvents;
  const api = factory(transform, events);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorInteractions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (transform, events) {
  function attachStudioEditorInteractionHandlers(doc, options = {}) {
    if (!doc || !transform || !events) return false;

    const transformOptions = options.transformOptions && typeof options.transformOptions === 'object'
      ? options.transformOptions
      : {};
    const createTransformHandlers = typeof transform.createStudioTransformPointerHandlers === 'function'
      ? transform.createStudioTransformPointerHandlers
      : typeof transform.createStudioTransformFallbackPointerHandlers === 'function'
        ? transform.createStudioTransformFallbackPointerHandlers
        : null;
    if (!createTransformHandlers) return false;

    const transformHandlers = createTransformHandlers(transformOptions);
    const attachTransformHandlers = typeof transform.attachStudioTransformPointerHandlers === 'function'
      ? transform.attachStudioTransformPointerHandlers
      : null;
    const didAttachTransform = attachTransformHandlers
      ? attachTransformHandlers(doc, transformHandlers)
      : false;
    if (!didAttachTransform) return false;

    const marqueeOptions = options.marqueeOptions && typeof options.marqueeOptions === 'object'
      ? options.marqueeOptions
      : {};
    const createMarqueeHandlers = typeof events.createStudioMarqueeSelectionHandlers === 'function'
      ? events.createStudioMarqueeSelectionHandlers
      : typeof events.createStudioMarqueePointerHandlers === 'function'
        ? events.createStudioMarqueePointerHandlers
        : null;
    if (!createMarqueeHandlers) return true;

    const marqueeHandlers = createMarqueeHandlers(marqueeOptions);
    const attachMarqueeHandlers = typeof events.attachStudioMarqueePointerHandlers === 'function'
      ? events.attachStudioMarqueePointerHandlers
      : null;
    const didAttachMarquee = attachMarqueeHandlers
      ? attachMarqueeHandlers(doc, marqueeHandlers)
      : false;

    return didAttachTransform || didAttachMarquee;
  }

  return {
    attachStudioEditorInteractionHandlers
  };
});
