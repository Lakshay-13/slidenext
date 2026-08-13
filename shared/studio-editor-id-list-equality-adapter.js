(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorIdListEqualityAdapter = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function areStudioEditorIdListsEqual(firstIds = [], secondIds = [], options = {}) {
    const selectionApi = options.selectionApi && typeof options.selectionApi === 'object'
      ? options.selectionApi
      : null;
    const compareIdLists = selectionApi
      && typeof selectionApi.areStudioIdListsEqual === 'function'
      ? selectionApi.areStudioIdListsEqual
      : null;
    if (!compareIdLists) {
      return null;
    }
    return compareIdLists(firstIds, secondIds);
  }

  return {
    areStudioEditorIdListsEqual
  };
});
