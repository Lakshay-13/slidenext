(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionDeleteController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function deleteStudioVersion(options = {}) {
    const filename = typeof options.filename === 'string' ? options.filename : '';
    const confirmAction = typeof options.confirmAction === 'function'
      ? options.confirmAction
      : () => true;
    if (!confirmAction('Are you sure you want to delete this version? This action cannot be undone.')) {
      return Promise.resolve(undefined);
    }

    const createVersionActionContext = typeof options.createVersionActionContext === 'function'
      ? options.createVersionActionContext
      : () => ({});
    const deleteContext = createVersionActionContext();
    const versionActionsApi = options.versionActionsApi
      || (root && root.SlideNextStudioVersionActions)
      || null;
    const createDeleteRequestExecutor = versionActionsApi
      && typeof versionActionsApi.createStudioDeleteVersionRequestExecutor === 'function'
      ? versionActionsApi.createStudioDeleteVersionRequestExecutor
      : null;
    const executeDeleteVersionRequest = typeof options.executeDeleteVersionRequest === 'function'
      ? options.executeDeleteVersionRequest
      : versionActionsApi
        && typeof versionActionsApi.executeStudioDeleteVersionRequest === 'function'
        ? versionActionsApi.executeStudioDeleteVersionRequest
        : null;
    const createVersionRequestOptions = typeof options.createVersionRequestOptions === 'function'
      ? options.createVersionRequestOptions
      : () => ({});
    const executeDelete = createDeleteRequestExecutor
      ? createDeleteRequestExecutor({
          createVersionRequestOptions,
          executeDeleteVersionRequest
        })
      : (versionFilename, context) => executeDeleteVersionRequest
        ? executeDeleteVersionRequest(
            versionFilename,
            context,
            createVersionRequestOptions()
          )
        : Promise.reject(new Error('Delete version executor is unavailable'));

    const applyListMutationSuccess = typeof options.applyListMutationSuccess === 'function'
      ? options.applyListMutationSuccess
      : () => false;
    const applyFailure = typeof options.applyFailure === 'function'
      ? options.applyFailure
      : () => false;
    const alertAction = typeof options.alertAction === 'function'
      ? options.alertAction
      : () => {};

    return Promise.resolve()
      .then(() => executeDelete(filename, deleteContext))
      .then((data) => {
        if (data && data.success) {
          applyListMutationSuccess(deleteContext, {
            refreshVersionEntries: options.refreshVersionEntries
          });
          return undefined;
        }
        applyFailure(deleteContext, {
          onFailure: () => alertAction(`Delete failed: ${data && data.error}`)
        });
        return undefined;
      })
      .catch((error) => {
        applyFailure(deleteContext, {
          onFailure: () => alertAction(`Error deleting version: ${error.message}`)
        });
        return undefined;
      });
  }

  return {
    deleteStudioVersion
  };
});
