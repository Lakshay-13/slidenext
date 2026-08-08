(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTemplateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorTemplateController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;
    const onTemplatesChanged = typeof options.onTemplatesChanged === 'function'
      ? options.onTemplatesChanged
      : null;

    function saveActiveSlide(templateLike = {}) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.saveCanonicalTemplateFromSlideId !== 'function') {
        return null;
      }

      const nextCanonicalDeck = canonicalDeckApi.saveCanonicalTemplateFromSlideId(
        getCanonicalDeck(),
        getActiveSlideId(),
        templateLike
      );
      if (!nextCanonicalDeck) return null;

      const template = nextCanonicalDeck.templates[nextCanonicalDeck.templates.length - 1] || null;
      if (saveHistoryState) saveHistoryState(false, null, nextCanonicalDeck);
      if (triggerAutoSave) triggerAutoSave();
      if (triggerAutoVersion) {
        triggerAutoVersion(`Auto: Saved Template${template && template.name ? ` "${template.name}"` : ''}`);
      }
      if (onTemplatesChanged) onTemplatesChanged(nextCanonicalDeck.templates, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    return {
      saveActiveSlide
    };
  }

  return {
    createStudioEditorTemplateController
  };
});
