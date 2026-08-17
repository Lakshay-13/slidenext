(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorToolbarShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorToolbarShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorToolbarAccessors'
    );
    const accessorOptions = {
      gridSnapController: options.gridSnapController,
      themeController: options.themeController,
      alignmentController: options.alignmentController,
      groupController: options.groupController,
      nudgeController: options.nudgeController,
      arrangeElementLayer: options.arrangeElementLayer,
      toggleSelectedElementsLockState: options.toggleSelectedElementsLockState,
      toggleSelectedElementsVisibility: options.toggleSelectedElementsVisibility,
      removeSelectedElement: options.removeSelectedElement,
      deselectElement: options.deselectElement
    };
    const accessors = accessorsApi
      && typeof accessorsApi.createStudioEditorToolbarAccessors === 'function'
      ? accessorsApi.createStudioEditorToolbarAccessors(accessorOptions)
      : null;
    if (accessors
      && typeof accessors.bindStudioEditorLayoutControls === 'function') {
      accessors.bindStudioEditorLayoutControls({ documentRef: options.documentRef });
    }
    if (accessors
      && typeof accessors.bindStudioEditorSelectionControls === 'function') {
      accessors.bindStudioEditorSelectionControls({ documentRef: options.documentRef });
    }
    const globalAccessors = accessors || (
      accessorsApi
      && typeof accessorsApi.createStudioEditorToolbarAccessors === 'function'
        ? accessorsApi.createStudioEditorToolbarAccessors(accessorOptions)
        : null
    );
    const globalApi = accessorsApi
      && typeof accessorsApi.createStudioEditorToolbarGlobalApi === 'function'
      ? accessorsApi.createStudioEditorToolbarGlobalApi({ accessors: globalAccessors })
      : {};

    return {
      accessors,
      globalApi
    };
  }

  return {
    createStudioEditorToolbarShellComposition
  };
});
