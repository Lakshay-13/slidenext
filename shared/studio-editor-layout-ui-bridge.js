(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayoutUiBridge = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorLayoutUiBridge(options = {}) {
    const layoutModeController = options.layoutModeController || null;
    const layoutConversionController = options.layoutConversionController || null;
    const layoutConversionViewApi = options.layoutConversionViewApi
      || (root && root.SlideNextStudioEditorLayoutConversionView)
      || null;
    const documentRef = options.documentRef
      || (root && root.document)
      || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;

    function syncLayoutModeControl(sourceDoc) {
      if (!layoutModeController || typeof layoutModeController.sync !== 'function') {
        return false;
      }
      const resolvedDoc = arguments.length === 0 ? getDocument() : sourceDoc;
      try {
        return layoutModeController.sync(resolvedDoc);
      } catch (error) {
        return false;
      }
    }

    function syncLayoutConversionControl(sourceDoc = null) {
      if (!layoutConversionViewApi
        || typeof layoutConversionViewApi.syncStudioLayoutConversionControl !== 'function') {
        return false;
      }
      const resolvedDoc = sourceDoc || getDocument();
      let plan = { canConvert: false, reason: 'slide-unavailable' };
      if (layoutConversionController
        && typeof layoutConversionController.buildPlan === 'function') {
        try {
          plan = layoutConversionController.buildPlan(resolvedDoc);
        } catch (error) {
          plan = { canConvert: false, reason: 'slide-unavailable' };
        }
      }
      try {
        return layoutConversionViewApi.syncStudioLayoutConversionControl({
          documentRef,
          plan
        });
      } catch (error) {
        return false;
      }
    }

    return {
      syncLayoutModeControl,
      syncLayoutConversionControl
    };
  }

  return {
    createStudioEditorLayoutUiBridge
  };
});
