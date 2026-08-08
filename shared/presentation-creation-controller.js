(function (root, factory) {
  const presentationCreationView = root && root.SlideNextPresentationCreationView;
  const presentationLibrary = root && root.SlideNextPresentationLibrary;
  const api = factory(presentationCreationView, presentationLibrary);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationCreationController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (defaultView, defaultLibrary) {
  function getElement(documentRef, id) {
    return documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById(id)
      : null;
  }

  function createPresentationController(options = {}) {
    const documentRef = options.documentRef
      || (typeof globalThis !== 'undefined' ? globalThis.document : null);
    const view = options.presentationCreationView || defaultView;
    const library = options.presentationLibrary || defaultLibrary;
    const loadPresentations = typeof options.loadPresentations === 'function'
      ? options.loadPresentations
      : async () => {};
    const launchStudioEditor = typeof options.launchStudioEditor === 'function'
      ? options.launchStudioEditor
      : () => {};
    const consoleRef = options.consoleRef || (typeof console !== 'undefined' ? console : null);

    function open() {
      if (!view || typeof view.openPresentationCreationModal !== 'function') return false;
      return view.openPresentationCreationModal({ documentRef });
    }

    function close() {
      if (!view || typeof view.closePresentationCreationModal !== 'function') return false;
      return view.closePresentationCreationModal({ documentRef });
    }

    async function submit(event) {
      if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      if (
        !view
        || typeof view.setPresentationCreationError !== 'function'
        || typeof view.setPresentationCreationBusyState !== 'function'
        || !library
        || typeof library.createPresentation !== 'function'
      ) {
        return null;
      }

      const titleInput = getElement(documentRef, 'createPresentationTitle');
      view.setPresentationCreationError({ documentRef, message: '' });
      view.setPresentationCreationBusyState({ documentRef, isBusy: true });

      try {
        const createdPresentation = await library.createPresentation({
          title: titleInput ? titleInput.value : ''
        });
        if (titleInput) {
          titleInput.value = '';
        }
        close();
        try {
          await loadPresentations();
        } catch (refreshError) {
          if (consoleRef && typeof consoleRef.error === 'function') {
            consoleRef.error('Presentation library refresh failed after creation:', refreshError);
          }
        }
        launchStudioEditor(
          createdPresentation.url,
          createdPresentation.title,
          createdPresentation.category || 'General'
        );
        return createdPresentation;
      } catch (error) {
        view.setPresentationCreationError({
          documentRef,
          message: error && error.message ? error.message : 'Failed to create presentation.'
        });
        return null;
      } finally {
        view.setPresentationCreationBusyState({ documentRef, isBusy: false });
      }
    }

    return {
      open,
      close,
      submit
    };
  }

  return {
    createPresentationController
  };
});
