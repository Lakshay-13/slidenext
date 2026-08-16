(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorToolbarStateCoordinator = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(value, globalName) {
    return value && typeof value === 'object'
      ? value
      : root && root[globalName] && typeof root[globalName] === 'object'
        ? root[globalName]
        : null;
  }

  function createStudioEditorToolbarStateCoordinator(options = {}) {
    const lockToolbarStateApi = resolveApi(
      options.lockToolbarStateApi,
      'SlideNextStudioEditorLockToolbarState'
    );
    const visibilityToolbarStateApi = resolveApi(
      options.visibilityToolbarStateApi,
      'SlideNextStudioEditorVisibilityToolbarState'
    );
    const styleToolbarStateApi = resolveApi(
      options.styleToolbarStateApi,
      'SlideNextStudioEditorStyleToolbarState'
    );
    const lockView = resolveApi(options.lockView, 'SlideNextStudioEditorLockState');
    const visibilityView = resolveApi(
      options.visibilityView,
      'SlideNextStudioEditorVisibilityState'
    );
    const styleView = resolveApi(options.styleView, 'SlideNextStudioEditorStyle');
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getSelectedElements = typeof options.getSelectedElements === 'function'
      ? options.getSelectedElements
      : () => [];
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const getLockedState = typeof options.getLockedState === 'function'
      ? options.getLockedState
      : () => () => false;
    const getHiddenState = typeof options.getHiddenState === 'function'
      ? options.getHiddenState
      : () => () => false;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let lockController = null;
    let visibilityController = null;
    let styleController = null;

    function syncController(controller, doc) {
      return controller && typeof controller.sync === 'function'
        ? controller.sync(doc)
        : false;
    }

    function syncLock(doc = getDocument()) {
      if (!lockToolbarStateApi
        || typeof lockToolbarStateApi.createStudioEditorLockToolbarStateController !== 'function') {
        return false;
      }
      if (!lockController) {
        lockController = lockToolbarStateApi.createStudioEditorLockToolbarStateController({
          lockView,
          getDocument,
          getSelectedElements,
          getActiveSlide,
          getLockedState,
          documentRef
        });
      }
      return syncController(lockController, doc);
    }

    function syncVisibility(doc = getDocument()) {
      if (!visibilityToolbarStateApi
        || typeof visibilityToolbarStateApi
          .createStudioEditorVisibilityToolbarStateController !== 'function') {
        return false;
      }
      if (!visibilityController) {
        visibilityController = visibilityToolbarStateApi
          .createStudioEditorVisibilityToolbarStateController({
            visibilityView,
            getDocument,
            getSelectedElements,
            getActiveSlide,
            getHiddenState,
            documentRef
          });
      }
      return syncController(visibilityController, doc);
    }

    function syncStyle(doc = getDocument()) {
      if (!styleToolbarStateApi
        || typeof styleToolbarStateApi.createStudioEditorStyleToolbarStateController !== 'function') {
        return false;
      }
      if (!styleController) {
        styleController = styleToolbarStateApi.createStudioEditorStyleToolbarStateController({
          styleView,
          getDocument,
          getSelectedElements,
          getActiveSlide,
          getLockedState,
          documentRef
        });
      }
      return syncController(styleController, doc);
    }

    return {
      syncLock,
      syncVisibility,
      syncStyle
    };
  }

  return {
    createStudioEditorToolbarStateCoordinator
  };
});
