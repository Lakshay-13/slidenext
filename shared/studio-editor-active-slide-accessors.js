(function (root, factory) {
  let activeSlideAdapter = root && root.SlideNextStudioEditorActiveSlideAdapter;
  let activeSlideIdAdapter = root && root.SlideNextStudioEditorActiveSlideIdAdapter;
  if (typeof module === 'object' && module.exports) {
    activeSlideAdapter = require('./studio-editor-active-slide-adapter.js');
    activeSlideIdAdapter = require('./studio-editor-active-slide-id-adapter.js');
  }
  const api = factory(activeSlideAdapter, activeSlideIdAdapter);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorActiveSlideAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (
  defaultActiveSlideAdapter,
  defaultActiveSlideIdAdapter
) {
  function resolveAdapter(options, key, fallback) {
    return options[key] && typeof options[key] === 'object'
      ? options[key]
      : fallback;
  }

  function createStudioEditorActiveSlideAccessors(options = {}) {
    const activeSlideAdapter = resolveAdapter(
      options,
      'activeSlideAdapter',
      defaultActiveSlideAdapter
    );
    const activeSlideIdAdapter = resolveAdapter(
      options,
      'activeSlideIdAdapter',
      defaultActiveSlideIdAdapter
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
    const stateBridge = options.stateBridge && typeof options.stateBridge === 'object'
      ? options.stateBridge
      : null;

    function resolveDomOptions(overrides = {}) {
      return getDomOptions(overrides);
    }

    function getActiveSlide(doc = getDocument(), domOptions = {}) {
      return activeSlideAdapter
        && typeof activeSlideAdapter.getStudioEditorActiveSlide === 'function'
        ? activeSlideAdapter.getStudioEditorActiveSlide(doc, {
            domApi,
            domOptions: resolveDomOptions(domOptions)
          })
        : null;
    }

    function getActiveSlideId(doc = getDocument(), options = {}) {
      if (options.preferStateBridge
        && stateBridge
        && typeof stateBridge.getSlideId === 'function') {
        const storedSlideId = stateBridge.getSlideId();
        if (typeof storedSlideId === 'string' && storedSlideId.trim()) {
          return storedSlideId.trim();
        }
      }
      return activeSlideIdAdapter
        && typeof activeSlideIdAdapter.getStudioEditorActiveSlideId === 'function'
        ? activeSlideIdAdapter.getStudioEditorActiveSlideId(doc, {
            domApi,
            domOptions: resolveDomOptions(options.domOptions || {})
          })
        : '';
    }

    return {
      getActiveSlide,
      getActiveSlideId
    };
  }

  return {
    createStudioEditorActiveSlideAccessors
  };
});
