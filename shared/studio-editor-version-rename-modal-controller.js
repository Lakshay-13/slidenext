(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorVersionRenameModalController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorVersionRenameModalController(options = {}) {
    const documentRef = options.documentRef
      || (root && root.document)
      || null;
    const getElementById = (id) => documentRef
      && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById(id)
      : null;
    const setRenameState = typeof options.setRenameState === 'function'
      ? options.setRenameState
      : () => {};
    const clearRenameState = typeof options.clearRenameState === 'function'
      ? options.clearRenameState
      : () => {};
    const createVersionActionContext = typeof options.createVersionActionContext === 'function'
      ? options.createVersionActionContext
      : () => null;
    const resetRenameButton = typeof options.resetRenameButton === 'function'
      ? options.resetRenameButton
      : () => false;
    const showModal = typeof options.showModal === 'function'
      ? options.showModal
      : () => false;
    const hideModal = typeof options.hideModal === 'function'
      ? options.hideModal
      : () => false;

    function open(filename, currentLabel) {
      setRenameState({
        filename,
        context: createVersionActionContext()
      });

      const renameInput = getElementById('newVersionNameInput');
      if (renameInput) {
        renameInput.value = currentLabel;
      }

      const modal = getElementById('renameVersionModal');
      const content = getElementById('renameVersionModalContent');
      const button = getElementById('confirmRenameVersionBtn');
      resetRenameButton(button);

      return showModal(modal, content, {
        delayMs: 10,
        onShown: () => {
          if (renameInput) {
            if (typeof renameInput.focus === 'function') renameInput.focus();
            if (typeof renameInput.select === 'function') renameInput.select();
          }
        }
      });
    }

    function close() {
      const modal = getElementById('renameVersionModal');
      const content = getElementById('renameVersionModalContent');
      clearRenameState();
      return hideModal(modal, content);
    }

    return { open, close };
  }

  return {
    createStudioEditorVersionRenameModalController
  };
});
