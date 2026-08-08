(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationCreationView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function getElement(documentRef, id) {
    return documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById(id)
      : null;
  }

  function openPresentationCreationModal(options = {}) {
    const documentRef = options.documentRef;
    const modal = getElement(documentRef, 'createPresentationModal');
    const content = getElement(documentRef, 'createPresentationModalContent');
    const titleInput = getElement(documentRef, 'createPresentationTitle');
    const error = getElement(documentRef, 'createPresentationError');
    if (!modal) return false;

    modal.classList.remove('hidden', 'opacity-0');
    if (content) content.classList.remove('scale-95');
    if (error) {
      error.textContent = '';
      error.classList.add('hidden');
    }
    if (titleInput && typeof titleInput.focus === 'function') {
      titleInput.focus();
    }
    return true;
  }

  function closePresentationCreationModal(options = {}) {
    const documentRef = options.documentRef;
    const modal = getElement(documentRef, 'createPresentationModal');
    const content = getElement(documentRef, 'createPresentationModalContent');
    if (!modal) return false;

    modal.classList.add('hidden', 'opacity-0');
    if (content) content.classList.add('scale-95');
    return true;
  }

  function setPresentationCreationError(options = {}) {
    const error = getElement(options.documentRef, 'createPresentationError');
    if (!error) return false;

    const message = typeof options.message === 'string' ? options.message.trim() : '';
    error.textContent = message;
    if (message) {
      error.classList.remove('hidden');
    } else {
      error.classList.add('hidden');
    }
    return true;
  }

  function setPresentationCreationBusyState(options = {}) {
    const submitButton = getElement(options.documentRef, 'createPresentationSubmitBtn');
    const submitLabel = getElement(options.documentRef, 'createPresentationSubmitLabel');
    if (!submitButton) return false;

    const isBusy = options.isBusy === true;
    submitButton.disabled = isBusy;
    if (submitLabel) {
      submitLabel.textContent = isBusy ? 'Creating...' : 'Create Deck';
    }
    return true;
  }

  return {
    openPresentationCreationModal,
    closePresentationCreationModal,
    setPresentationCreationError,
    setPresentationCreationBusyState
  };
});
