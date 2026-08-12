(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorStateAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorStateAccessors(options = {}) {
    const bridge = options.bridge || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getElementById = typeof options.getElementById === 'function'
      ? options.getElementById
      : () => null;

    function read(methodName, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName]()
        : fallback;
    }

    function write(methodName, value, fallback) {
      return bridge && typeof bridge[methodName] === 'function'
        ? bridge[methodName](value)
        : fallback;
    }

    function resolveSelectedElementsFromState(storedElements = [], doc = getDocument()) {
      if (!bridge || typeof bridge.getSelectedElementIds !== 'function') return null;
      const selectedIds = bridge.getSelectedElementIds();
      if (!Array.isArray(selectedIds) || selectedIds.length === 0) return [];
      const activeSlide = getActiveSlide(doc);
      if (!activeSlide || typeof activeSlide.contains !== 'function') return storedElements;
      return selectedIds
        .map((editorId) => getElementById(editorId, doc))
        .filter((element) => element
          && element.isConnected !== false
          && activeSlide.contains(element));
    }

    function getSelectedElements(doc = getDocument()) {
      const storedElements = read('getSelectedElements', []);
      const resolvedElements = resolveSelectedElementsFromState(storedElements, doc);
      return resolvedElements === null ? storedElements : resolvedElements;
    }

    return {
      bridge,
      getPresentationMetadata: () => read('getPresentationMetadata', null),
      setPresentationMetadata: (nextMetadata) => write(
        'setPresentationMetadata',
        nextMetadata,
        null
      ),
      getTitle: () => read('getTitle', ''),
      setTitle: (nextTitle) => write('setTitle', nextTitle, false),
      getCategory: () => read('getCategory', ''),
      setCategory: (nextCategory) => write('setCategory', nextCategory, false),
      getSlideIndex: () => read('getSlideIndex', 0),
      setSlideIndex: (nextValue) => write('setSlideIndex', nextValue, false),
      getSlideId: () => read('getSlideId', ''),
      setSlideId: (nextValue) => write('setSlideId', nextValue, false),
      resolveSelectedElementsFromState,
      getSelectedElements,
      getSelectedElement: () => getSelectedElements()[0] || null,
      getSelectedElementIds: () => read('getSelectedElementIds', []),
      setSelectionState: (nextState) => write('setSelectionState', nextState, false),
      clearSelectionState: () => read('clearSelectionState', false),
      getPreserveSelectionOnNextActiveSlideSync: () => read(
        'getPreserveSelectionOnNextActiveSlideSync',
        false
      ),
      setPreserveSelectionOnNextActiveSlideSync: (nextValue) => write(
        'setPreserveSelectionOnNextActiveSlideSync',
        nextValue,
        false
      )
    };
  }

  function createStudioEditorStateGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorStateAccessors(options);

    return {
      getStudioCurrentPresentationMetadata: () => accessors.getPresentationMetadata(),
      setStudioCurrentPresentationMetadata: (nextMetadata) => accessors.setPresentationMetadata(nextMetadata),
      getStudioPresentationTitle: () => accessors.getTitle(),
      setStudioPresentationTitle: (nextTitle) => accessors.setTitle(nextTitle),
      getStudioPresentationCategory: () => accessors.getCategory(),
      setStudioPresentationCategory: (nextCategory) => accessors.setCategory(nextCategory),
      getStudioCurrentSlideIndex: () => accessors.getSlideIndex(),
      setStudioCurrentSlideIndex: (nextValue) => accessors.setSlideIndex(nextValue),
      getStudioCurrentSlideId: () => accessors.getSlideId(),
      setStudioCurrentSlideId: (nextValue) => accessors.setSlideId(nextValue)
    };
  }

  return {
    createStudioEditorStateAccessors,
    createStudioEditorStateGlobalApi
  };
});
