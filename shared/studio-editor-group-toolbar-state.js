(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorGroupToolbarState = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorGroupToolbarStateController(options = {}) {
    const groupView = options.groupView && typeof options.groupView === 'object'
      ? options.groupView
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const getGroupActionState = typeof options.getGroupActionState === 'function'
      ? options.getGroupActionState
      : () => ({ canGroup: false });
    const getUngroupActionState = typeof options.getUngroupActionState === 'function'
      ? options.getUngroupActionState
      : () => ({ canUngroup: false });
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    let stateSync = null;

    function sync(doc = getDocument()) {
      if (!groupView || typeof groupView.syncStudioGroupToolbarState !== 'function') {
        return false;
      }
      if (typeof groupView.createStudioGroupToolbarStateSync === 'function') {
        if (!stateSync) {
          stateSync = groupView.createStudioGroupToolbarStateSync({
            getDocument,
            getGroupActionState,
            getUngroupActionState,
            getDocumentRef: () => documentRef
          });
        }
        if (typeof stateSync === 'function') return stateSync(doc);
      }
      try {
        const groupState = getGroupActionState(doc) || {};
        const ungroupState = getUngroupActionState(doc) || {};
        return groupView.syncStudioGroupToolbarState({
          documentRef,
          canGroup: !!groupState.canGroup,
          canUngroup: !!ungroupState.canUngroup
        });
      } catch (error) {
        return false;
      }
    }

    return { sync };
  }

  return {
    createStudioEditorGroupToolbarStateController
  };
});
