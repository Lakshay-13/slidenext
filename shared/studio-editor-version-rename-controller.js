(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function renameStudioVersion(options = {}) {
    const versionFilename = typeof options.versionFilename === 'string'
      ? options.versionFilename
      : '';
    const newLabel = typeof options.newLabel === 'string' ? options.newLabel : '';
    const renameContext = options.renameContext || {};
    if (!versionFilename || !newLabel || !renameContext.presentationUrl) {
      return Promise.resolve(undefined);
    }

    const setBusy = typeof options.setBusy === 'function' ? options.setBusy : () => {};
    const setIdle = typeof options.setIdle === 'function' ? options.setIdle : () => {};
    setBusy();

    const versionActionsApi = options.versionActionsApi
      || (root && root.SlideNextStudioVersionActions)
      || null;
    const createRenameRequestExecutor = versionActionsApi
      && typeof versionActionsApi.createStudioRenameVersionRequestExecutor === 'function'
      ? versionActionsApi.createStudioRenameVersionRequestExecutor
      : null;
    const executeRenameVersionRequest = typeof options.executeRenameVersionRequest === 'function'
      ? options.executeRenameVersionRequest
      : versionActionsApi
        && typeof versionActionsApi.executeStudioRenameVersionRequest === 'function'
        ? versionActionsApi.executeStudioRenameVersionRequest
        : null;
    const createVersionRequestOptions = typeof options.createVersionRequestOptions === 'function'
      ? options.createVersionRequestOptions
      : () => ({});
    const executeRename = createRenameRequestExecutor
      ? createRenameRequestExecutor({
          createVersionRequestOptions,
          executeRenameVersionRequest
        })
      : (filename, label, context) => executeRenameVersionRequest
        ? executeRenameVersionRequest(
            filename,
            label,
            context,
            createVersionRequestOptions()
          )
        : Promise.reject(new Error('Rename version executor is unavailable'));

    const applyListMutationSuccess = typeof options.applyListMutationSuccess === 'function'
      ? options.applyListMutationSuccess
      : () => false;
    const applyFailure = typeof options.applyFailure === 'function'
      ? options.applyFailure
      : () => false;
    const alertAction = typeof options.alertAction === 'function'
      ? options.alertAction
      : () => {};
    const isCurrentSession = typeof options.isCurrentSession === 'function'
      ? options.isCurrentSession
      : () => true;

    return Promise.resolve()
      .then(() => executeRename(versionFilename, newLabel, renameContext))
      .then((data) => {
        if (data && data.success) {
          applyListMutationSuccess(renameContext, {
            isCurrentSession,
            onSuccess: options.closeRenameVersionModal,
            refreshVersionEntries: options.refreshVersionEntries
          });
          return undefined;
        }
        applyFailure(renameContext, {
          isCurrentSession,
          onFailure: () => alertAction(`Rename failed: ${data && data.error}`)
        });
        return undefined;
      })
      .catch((error) => {
        applyFailure(renameContext, {
          isCurrentSession,
          onFailure: () => alertAction(`Error renaming version: ${error.message}`)
        });
        return undefined;
      })
      .finally(() => {
        applyListMutationSuccess(renameContext, {
          isCurrentSession,
          onSuccess: setIdle
        });
      });
  }

  return {
    renameStudioVersion
  };
});
