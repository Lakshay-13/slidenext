(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorToolbarAccessors = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorToolbarAccessors(options = {}) {
    const gridSnapController = options.gridSnapController || null;
    const themeController = options.themeController || null;

    function call(controller, methodName, fallback, ...args) {
      return controller && typeof controller[methodName] === 'function'
        ? controller[methodName](...args)
        : fallback;
    }

    return {
      gridSnapController,
      themeController,
      updateGridSnapActionState: () => call(gridSnapController, 'sync', false),
      toggleGridSnap: () => call(gridSnapController, 'toggle', false),
      toggleGlobalTheme: () => call(themeController, 'toggleGlobalTheme', false),
      syncIframeTheme: () => call(themeController, 'syncIframeTheme', false)
    };
  }

  function createStudioEditorToolbarGlobalApi(options = {}) {
    const accessors = options.accessors || createStudioEditorToolbarAccessors(options);

    return {
      updateGridSnapActionState: () => accessors.updateGridSnapActionState(),
      toggleGridSnap: () => accessors.toggleGridSnap(),
      toggleGlobalTheme: () => accessors.toggleGlobalTheme(),
      syncIframeTheme: () => accessors.syncIframeTheme()
    };
  }

  return {
    createStudioEditorToolbarAccessors,
    createStudioEditorToolbarGlobalApi
  };
});
