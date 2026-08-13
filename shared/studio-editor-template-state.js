(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorTemplateStateController(options = {}) {
    const templateView = options.templateView && typeof options.templateView === 'object'
      ? options.templateView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const insertTemplate = typeof options.insertTemplate === 'function'
      ? options.insertTemplate
      : null;
    const removeTemplate = typeof options.removeTemplate === 'function'
      ? options.removeTemplate
      : null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function buildActionState(sourceDoc) {
      const canonicalDeck = getCanonicalDeck(sourceDoc);
      return {
        templates: canonicalDeck && canonicalDeck.templates,
        canUseTemplateActions: !!getActiveSlide(sourceDoc),
        insertTemplate,
        removeTemplate
      };
    }

    function sync(doc = getDocument()) {
      if (!templateView || typeof templateView.syncStudioTemplateState !== 'function') {
        return false;
      }
      if (typeof templateView.createStudioTemplateStateSync === 'function') {
        if (!stateSync) {
          stateSync = templateView.createStudioTemplateStateSync({
            getDocument,
            getActionState: buildActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      return templateView.syncStudioTemplateState({
        ...buildActionState(doc),
        documentRef
      });
    }

    return {
      sync,
      buildActionState
    };
  }

  return {
    createStudioEditorTemplateStateController
  };
});
