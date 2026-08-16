(function initStudioEditorSubmitSaveVersionAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorSubmitSaveVersionAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorSubmitSaveVersionAction(options = {}) {
    const getDocumentRef = typeof options.getDocumentRef === 'function'
      ? options.getDocumentRef
      : () => null;
    const getCaptureSessionState = typeof options.getCaptureSessionState === 'function'
      ? options.getCaptureSessionState
      : () => ({});
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const getResolveCheckpointState = typeof options.getResolveCheckpointState === 'function'
      ? options.getResolveCheckpointState
      : () => null;
    const getCloseModal = typeof options.getCloseModal === 'function'
      ? options.getCloseModal
      : () => {};
    const getSetSaveButtonState = typeof options.getSetSaveButtonState === 'function'
      ? options.getSetSaveButtonState
      : () => {};
    const getExecuteCheckpointSave = typeof options.getExecuteCheckpointSave === 'function'
      ? options.getExecuteCheckpointSave
      : () => null;
    const getApplyPersistenceFailure = typeof options.getApplyPersistenceFailure === 'function'
      ? options.getApplyPersistenceFailure
      : () => null;
    const getRunPersistenceActionIfCurrent =
      typeof options.getRunPersistenceActionIfCurrent === 'function'
        ? options.getRunPersistenceActionIfCurrent
        : () => null;
    const getResetSaveButtonState = typeof options.getResetSaveButtonState === 'function'
      ? options.getResetSaveButtonState
      : () => {};
    const getSetAutoSaveStatus = typeof options.getSetAutoSaveStatus === 'function'
      ? options.getSetAutoSaveStatus
      : () => {};
    const getAlert = typeof options.getAlert === 'function'
      ? options.getAlert
      : () => {};

    async function submitSaveVersion() {
      let documentRef;
      let input;
      try {
        documentRef = getDocumentRef();
        input = documentRef && typeof documentRef.getElementById === 'function'
          ? documentRef.getElementById('versionCheckpointName')
          : null;
      } catch (error) {
        return;
      }
      if (!input || typeof input.value !== 'string') return;
      const versionName = input.value.trim();
      if (!versionName) {
        getAlert()('Please enter a version name.');
        return;
      }

      let captureSessionState;
      try {
        captureSessionState = getCaptureSessionState();
      } catch (error) {
        return;
      }
      const sessionState = typeof captureSessionState === 'function'
        ? captureSessionState() || {}
        : captureSessionState || {};
      const scheduledPresentationUrl = sessionState.presentationUrl;
      const scheduledSessionToken = sessionState.sessionToken;
      let iframeDoc = null;
      let resolveCheckpointState = null;
      let versionCheckpointPersistenceState = null;
      try {
        iframeDoc = getIframeDocument();
        resolveCheckpointState = getResolveCheckpointState();
        versionCheckpointPersistenceState = typeof resolveCheckpointState === 'function'
          ? resolveCheckpointState(
              iframeDoc,
              scheduledPresentationUrl,
              scheduledSessionToken
            )
          : null;
      } catch (error) {
        versionCheckpointPersistenceState = null;
      }
      if (!versionCheckpointPersistenceState) {
        getAlert()('Save version failed: editor content is unavailable.');
        return;
      }

      getCloseModal()();
      getSetSaveButtonState()('saving-version');

      try {
        const executeCheckpointSave = getExecuteCheckpointSave();
        if (typeof executeCheckpointSave !== 'function') return;
        await executeCheckpointSave(
          versionName,
          versionCheckpointPersistenceState,
          scheduledPresentationUrl,
          {
            onSuccess: () => {
              getAlert()('Successfully saved named version backup checkpoint!');
              getSetAutoSaveStatus()('saved');
            },
            onFailure: (data = {}) => {
              getAlert()(`Save version failed: ${data.error}`);
              getSetAutoSaveStatus()('save-version-failed');
            }
          }
        );
      } catch (error) {
        const applyPersistenceFailure = getApplyPersistenceFailure();
        if (typeof applyPersistenceFailure === 'function') {
          applyPersistenceFailure(
            versionCheckpointPersistenceState.persistenceContext,
            {
              onFailure: () => {
                getAlert()(`Network error saving version: ${error.message}`);
                getSetAutoSaveStatus()('network-error');
              }
            }
          );
        }
      } finally {
        const runPersistenceActionIfCurrent = getRunPersistenceActionIfCurrent();
        if (typeof runPersistenceActionIfCurrent === 'function') {
          runPersistenceActionIfCurrent(
            versionCheckpointPersistenceState.persistenceContext,
            () => {
              getResetSaveButtonState()();
            }
          );
        }
      }
    }

    return submitSaveVersion;
  }

  return {
    createStudioEditorSubmitSaveVersionAction
  };
}));
