(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorNotesActions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function applyStudioSpeakerNotesEdit(value = '', options = {}) {
    const resolveReadyState = typeof options.resolveReadyState === 'function'
      ? options.resolveReadyState
      : () => ({ canUseDeckActions: false });
    const actionState = resolveReadyState();
    if (!actionState || !actionState.canUseDeckActions) return false;

    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const documentRef = getDocument();
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const activeSlide = getActiveSlide(documentRef);
    const notesApi = options.notesApi && typeof options.notesApi === 'object'
      ? options.notesApi
      : null;
    const applyNotes = notesApi && typeof notesApi.applyStudioSpeakerNotes === 'function'
      ? notesApi.applyStudioSpeakerNotes
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (!activeSlide || !applyNotes || !finalizeMutation) return false;

    const mutation = applyNotes(activeSlide, value, {
      transactionApi: options.transactionApi,
      getElementId: options.getElementId
    });
    if (!mutation || !mutation.didApply) return false;

    finalizeMutation(options.versionLabel || 'Auto: Updated Speaker Notes', {
      refreshThumbnails: false,
      transaction: mutation.transaction || null
    });
    if (typeof options.syncChrome === 'function') {
      options.syncChrome(documentRef);
    }
    return true;
  }

  return {
    applyStudioSpeakerNotesEdit
  };
});
