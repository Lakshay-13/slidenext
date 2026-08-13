(function initStudioEditorTriggerAutoSaveAction(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorTriggerAutoSaveAction = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorTriggerAutoSaveAction(options = {}) {
    const getCreateAdapter = typeof options.getCreateAdapter === 'function'
      ? options.getCreateAdapter
      : () => null;
    const getAdapterOptions = typeof options.getAdapterOptions === 'function'
      ? options.getAdapterOptions
      : () => ({});

    function triggerAutoSave() {
      if (typeof triggerAutoSave.adapter !== 'function') {
        const createAdapter = getCreateAdapter();
        if (typeof createAdapter !== 'function') return;
        triggerAutoSave.adapter = createAdapter(getAdapterOptions());
      }
      if (typeof triggerAutoSave.adapter !== 'function') return;
      return triggerAutoSave.adapter();
    }

    return triggerAutoSave;
  }

  function createStudioEditorTriggerAutoSaveGlobalApi(options = {}) {
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    return {
      triggerAutoSave: (...args) =>
        triggerAutoSave
          ? triggerAutoSave(...args)
          : undefined
    };
  }

  return {
    createStudioEditorTriggerAutoSaveAction,
    createStudioEditorTriggerAutoSaveGlobalApi
  };
}));
