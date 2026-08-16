(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorContentStateCoordinator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(value, globalName) {
    return value && typeof value === 'object'
      ? value
      : root && root[globalName] && typeof root[globalName] === 'object'
        ? root[globalName]
        : null;
  }

  function createStudioEditorContentStateCoordinator(options = {}) {
    const clipboardStateApi = resolveApi(
      options.clipboardStateApi,
      'SlideNextStudioEditorClipboardState'
    );
    const assetStateApi = resolveApi(options.assetStateApi, 'SlideNextStudioEditorAssetState');
    const templateStateApi = resolveApi(
      options.templateStateApi,
      'SlideNextStudioEditorTemplateState'
    );
    const masterSlideStateApi = resolveApi(
      options.masterSlideStateApi,
      'SlideNextStudioEditorMasterSlideState'
    );
    const blockStateApi = resolveApi(options.blockStateApi, 'SlideNextStudioEditorBlockState');
    const clipboardView = resolveApi(options.clipboardView, 'SlideNextStudioEditorClipboard');
    const assetView = resolveApi(options.assetView, 'SlideNextStudioEditorAssetView');
    const templateView = resolveApi(options.templateView, 'SlideNextStudioEditorTemplateView');
    const masterSlideView = resolveApi(
      options.masterSlideView,
      'SlideNextStudioEditorMasterSlideView'
    );
    const blockView = resolveApi(options.blockView, 'SlideNextStudioEditorBlockView');
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const getHiddenState = typeof options.getHiddenState === 'function'
      ? options.getHiddenState
      : () => () => false;
    const getClipboard = typeof options.getClipboard === 'function'
      ? options.getClipboard
      : () => null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const findCanonicalSlide = typeof options.findCanonicalSlide === 'function'
      ? options.findCanonicalSlide
      : () => null;
    const selectionHasLockedElements = typeof options.selectionHasLockedElements === 'function'
      ? options.selectionHasLockedElements
      : null;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const applyAsset = typeof options.applyAsset === 'function' ? options.applyAsset : null;
    const insertAsset = typeof options.insertAsset === 'function' ? options.insertAsset : null;
    const removeAsset = typeof options.removeAsset === 'function' ? options.removeAsset : null;
    const insertTemplate = typeof options.insertTemplate === 'function'
      ? options.insertTemplate
      : null;
    const removeTemplate = typeof options.removeTemplate === 'function'
      ? options.removeTemplate
      : null;
    const applyMasterSlide = typeof options.applyMasterSlide === 'function'
      ? options.applyMasterSlide
      : null;
    const removeMasterSlide = typeof options.removeMasterSlide === 'function'
      ? options.removeMasterSlide
      : null;
    const insertBlock = typeof options.insertBlock === 'function' ? options.insertBlock : null;
    const removeBlock = typeof options.removeBlock === 'function' ? options.removeBlock : null;
    const getCurrentPresentationUrl = typeof options.getCurrentPresentationUrl === 'function'
      ? options.getCurrentPresentationUrl
      : () => '';
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let clipboardController = null;
    let assetController = null;
    let templateController = null;
    let masterSlideController = null;
    let blockController = null;

    function syncController(controller, doc) {
      return controller && typeof controller.sync === 'function'
        ? controller.sync(doc)
        : false;
    }

    function syncClipboard(doc = getDocument()) {
      if (!clipboardStateApi
        || typeof clipboardStateApi.createStudioEditorClipboardStateController !== 'function') {
        return false;
      }
      if (!clipboardController) {
        clipboardController = clipboardStateApi.createStudioEditorClipboardStateController({
          clipboardView,
          getDocument,
          getSelectedElements,
          getClipboard,
          getLockedState,
          getActiveSlide,
          syncBlockState: syncBlock,
          documentRef
        });
      }
      return syncController(clipboardController, doc);
    }

    function syncAssetLibrary(doc = getDocument()) {
      if (!assetStateApi
        || typeof assetStateApi.createStudioEditorAssetStateController !== 'function') {
        return false;
      }
      if (!assetController) {
        assetController = assetStateApi.createStudioEditorAssetStateController({
          assetView,
          getDocument,
          getCanonicalDeck,
          getActiveSlide,
          getSelectedElements,
          getLockedState,
          isElementLocked,
          applyAsset,
          insertAsset,
          removeAsset,
          documentRef,
          getCurrentPresentationUrl
        });
      }
      return syncController(assetController, doc);
    }

    function syncTemplate(doc = getDocument()) {
      if (!templateStateApi
        || typeof templateStateApi.createStudioEditorTemplateStateController !== 'function') {
        return false;
      }
      if (!templateController) {
        templateController = templateStateApi.createStudioEditorTemplateStateController({
          templateView,
          getDocument,
          getCanonicalDeck,
          getActiveSlide,
          insertTemplate,
          removeTemplate,
          documentRef
        });
      }
      return syncController(templateController, doc);
    }

    function syncMasterSlide(doc = getDocument()) {
      if (!masterSlideStateApi
        || typeof masterSlideStateApi.createStudioEditorMasterSlideStateController !== 'function') {
        return false;
      }
      if (!masterSlideController) {
        masterSlideController = masterSlideStateApi
          .createStudioEditorMasterSlideStateController({
            masterSlideView,
            getDocument,
            getCanonicalDeck,
            getActiveSlide,
            getActiveSlideId,
            findCanonicalSlide,
            applyMasterSlide,
            removeMasterSlide,
            documentRef
          });
      }
      return syncController(masterSlideController, doc);
    }

    function syncBlock(doc = getDocument()) {
      if (!blockStateApi
        || typeof blockStateApi.createStudioEditorBlockStateController !== 'function') {
        return false;
      }
      if (!blockController) {
        blockController = blockStateApi.createStudioEditorBlockStateController({
          blockView,
          getDocument,
          getCanonicalDeck,
          getActiveSlide,
          getSelectedElements,
          selectionHasLockedElements,
          isElementLocked,
          insertBlock,
          removeBlock,
          documentRef
        });
      }
      return syncController(blockController, doc);
    }

    return {
      syncClipboard,
      syncAssetLibrary,
      syncTemplate,
      syncMasterSlide,
      syncBlock
    };
  }

  return {
    createStudioEditorContentStateCoordinator
  };
});
