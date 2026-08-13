(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorHistoryRestoreOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorHistoryRestoreOptions(options = {}) {
    const getFunction = (name) => typeof options[name] === 'function'
      ? options[name]
      : null;
    const getIframeDoc = getFunction('getIframeDoc') || (() => null);
    const getSlideById = getFunction('getSlideById');
    const getElementByEditorId = getFunction('getElementByEditorId');
    const buildEditorCanonicalDeck = getFunction('buildEditorCanonicalDeck');
    const getEditorCanonicalDeckValidator = getFunction('getEditorCanonicalDeckValidator');
    const createEditorDeckViewBuildOptions = getFunction('createEditorDeckViewBuildOptions');
    const buildDeckSourceHtml = getFunction('buildDeckSourceHtml');

    return {
      transactionApi: options.transactionApi || null,
      elementStateApi: options.elementStateApi || null,
      canonicalStateApi: options.canonicalStateApi || null,
      getIframeDoc,
      getCurrentSlideIndex: getFunction('getCurrentSlideIndex') || (() => 0),
      resolveElementById: (editorId, iframeDoc) => {
        if (editorId === 'slides-container') {
          return iframeDoc && typeof iframeDoc.getElementById === 'function'
            ? iframeDoc.getElementById('slidesContainer')
            : null;
        }
        if (typeof editorId === 'string'
          && editorId.startsWith('slide:')
          && getSlideById) {
          return getSlideById(editorId.slice('slide:'.length), iframeDoc);
        }
        return getElementByEditorId
          ? getElementByEditorId(editorId, iframeDoc)
          : null;
      },
      makeElementsHoverable: getFunction('makeElementsHoverable'),
      generateThumbnails: getFunction('generateThumbnails'),
      restoreCommittedSelectionByIdsOnActiveSlide: getFunction('restoreCommittedSelectionByIdsOnActiveSlide'),
      observeDeckActiveSlideState: getFunction('observeDeckActiveSlideState'),
      syncSelectionOverlay: getFunction('syncSelectionOverlay'),
      capturePersistedDeckPlaybackState: getFunction('capturePersistedDeckPlaybackState'),
      applyPersistedDeckState: getFunction('applyPersistedDeckState'),
      setEditorLiveCanonicalDeck: getFunction('setEditorLiveCanonicalDeck'),
      getSessionToken: getFunction('getSessionToken'),
      setCurrentPresentationCanonicalDeck: getFunction('setCurrentPresentationCanonicalDeck'),
      buildCanonicalDeck: buildEditorCanonicalDeck
        ? (sourceDoc, buildOptions) => buildEditorCanonicalDeck(
            sourceDoc || getIframeDoc(),
            buildOptions
          )
        : null,
      isCanonicalDeck: getEditorCanonicalDeckValidator
        ? getEditorCanonicalDeckValidator()
        : null,
      applyEditorSelectionState: getFunction('applyEditorSelectionState'),
      buildDeckViewOptions: createEditorDeckViewBuildOptions
        ? (nextHistoryEntry) => ({
            ...createEditorDeckViewBuildOptions(null, {
              activeSlideId: nextHistoryEntry.activeSlideId,
              buildCanonicalDeck: () => nextHistoryEntry.canonicalDeck,
              buildFallbackHtml: () => ''
            }),
            ...(buildDeckSourceHtml ? { buildDeckSourceHtml } : {})
          })
        : null,
      syncIframeTheme: getFunction('syncIframeTheme'),
      setupIframeDragging: getFunction('setupIframeDragging'),
      bindDeckNavigationSync: getFunction('bindDeckNavigationSync'),
      getSlides: getFunction('getSlides'),
      setActiveSlideById: getFunction('setActiveSlideById'),
      setActiveSlide: getFunction('setActiveSlide')
    };
  }

  return {
    createStudioEditorHistoryRestoreOptions
  };
});
