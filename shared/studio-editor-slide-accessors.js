(function (root, factory) {
  let defaultSlideIdAdapter = root && root.SlideNextStudioEditorSlideIdAdapter;
  let defaultSlideCollectionAdapter = root && root.SlideNextStudioEditorSlideCollectionAdapter;
  if (typeof module === 'object' && module.exports) {
    defaultSlideIdAdapter = require('./studio-editor-slide-id-adapter.js');
    defaultSlideCollectionAdapter = require('./studio-editor-slide-collection-adapter.js');
  }
  const api = factory(defaultSlideIdAdapter, defaultSlideCollectionAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  defaultSlideIdAdapter,
  defaultSlideCollectionAdapter
) {
  function resolveAdapter(options, key, fallback) {
    return options[key] && typeof options[key] === 'object'
      ? options[key]
      : fallback;
  }

  function createStudioEditorSlideAccessors(options = {}) {
    const slideIdAdapter = resolveAdapter(
      options,
      'slideIdAdapter',
      defaultSlideIdAdapter
    );
    const slideCollectionAdapter = resolveAdapter(
      options,
      'slideCollectionAdapter',
      defaultSlideCollectionAdapter
    );
    const domApi = options.domApi && typeof options.domApi === 'object'
      ? options.domApi
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getDomOptions = typeof options.getDomOptions === 'function'
      ? options.getDomOptions
      : (overrides = {}) => overrides;

    function resolveDomOptions(overrides = {}) {
      return getDomOptions(overrides);
    }

    function assignSlideId(slide, options = {}) {
      return slideIdAdapter
        && typeof slideIdAdapter.assignStudioEditorSlideId === 'function'
        ? slideIdAdapter.assignStudioEditorSlideId(slide, {
            domApi,
            domOptions: resolveDomOptions(options)
          })
        : '';
    }

    function getSlideId(slide, options = {}) {
      return slideIdAdapter
        && typeof slideIdAdapter.getStudioEditorSlideId === 'function'
        ? slideIdAdapter.getStudioEditorSlideId(slide, {
            domApi,
            domOptions: resolveDomOptions(options)
          })
        : '';
    }

    function getSlides(doc = getDocument()) {
      return slideCollectionAdapter
        && typeof slideCollectionAdapter.getStudioEditorSlides === 'function'
        ? slideCollectionAdapter.getStudioEditorSlides(doc, {
            domApi,
            domOptions: resolveDomOptions()
          })
        : [];
    }

    function getSlideById(slideId, doc = getDocument()) {
      return slideCollectionAdapter
        && typeof slideCollectionAdapter.getStudioEditorSlideById === 'function'
        ? slideCollectionAdapter.getStudioEditorSlideById(slideId, doc, {
            domApi,
            domOptions: resolveDomOptions()
          })
        : null;
    }

    function getSlideIndexById(slideId, doc = getDocument()) {
      return slideCollectionAdapter
        && typeof slideCollectionAdapter.getStudioEditorSlideIndexById === 'function'
        ? slideCollectionAdapter.getStudioEditorSlideIndexById(slideId, doc, {
            domApi,
            domOptions: resolveDomOptions()
          })
        : -1;
    }

    return {
      assignSlideId,
      getSlideId,
      getSlides,
      getSlideById,
      getSlideIndexById
    };
  }

  return {
    createStudioEditorSlideAccessors
  };
});
