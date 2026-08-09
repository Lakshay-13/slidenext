(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRestoreController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function restoreStudioVersion(options = {}) {
    const filename = typeof options.filename === 'string' ? options.filename : '';
    const confirmAction = typeof options.confirmAction === 'function'
      ? options.confirmAction
      : () => true;
    if (!confirmAction(`Are you sure you want to restore to version: ${filename}? Unsaved work will be overwritten.`)) {
      return Promise.resolve(undefined);
    }

    const createVersionActionContext = typeof options.createVersionActionContext === 'function'
      ? options.createVersionActionContext
      : () => ({});
    const restoreContext = createVersionActionContext();
    const versionActionsApi = options.versionActionsApi
      || (root && root.SlideNextStudioVersionActions)
      || null;
    const createRestoreRequestExecutor = versionActionsApi
      && typeof versionActionsApi.createStudioRestoreVersionRequestExecutor === 'function'
      ? versionActionsApi.createStudioRestoreVersionRequestExecutor
      : null;
    const executeRestoreVersionRequest = typeof options.executeRestoreVersionRequest === 'function'
      ? options.executeRestoreVersionRequest
      : versionActionsApi
        && typeof versionActionsApi.executeStudioRestoreVersionRequest === 'function'
        ? versionActionsApi.executeStudioRestoreVersionRequest
        : null;
    const createVersionRequestOptions = typeof options.createVersionRequestOptions === 'function'
      ? options.createVersionRequestOptions
      : () => ({});
    const executeRestore = createRestoreRequestExecutor
      ? createRestoreRequestExecutor({
          createVersionRequestOptions,
          executeRestoreVersionRequest
        })
      : (versionFilename, nextContext) => executeRestoreVersionRequest
        ? executeRestoreVersionRequest(
            versionFilename,
            nextContext,
            createVersionRequestOptions()
          )
        : Promise.reject(new Error('Restore version executor is unavailable'));

    const applyRestoreSuccess = typeof options.applyRestoreSuccess === 'function'
      ? options.applyRestoreSuccess
      : () => false;
    const applyFailure = typeof options.applyFailure === 'function'
      ? options.applyFailure
      : () => false;
    const alertAction = typeof options.alertAction === 'function'
      ? options.alertAction
      : () => {};

    return Promise.resolve()
      .then(() => executeRestore(filename, restoreContext))
      .then((data) => {
        if (data && data.success) {
          applyRestoreSuccess(restoreContext, {
            onSuccess: () => alertAction('Rollback successfully restored!'),
            hideVersionsDropdown: options.hideVersionsDropdown,
            relaunchEditor: options.relaunchEditor
          });
          return undefined;
        }
        applyFailure(restoreContext, {
          onFailure: () => alertAction(`Restore failed: ${data && data.error}`)
        });
        return undefined;
      })
      .catch((error) => {
        applyFailure(restoreContext, {
          onFailure: () => alertAction(`Network error restoring version: ${error.message}`)
        });
        return undefined;
      });
  }

  return {
    restoreStudioVersion
  };
});
