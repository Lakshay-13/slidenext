(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorLayerOrderStateShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorLayerOrderStateShellRuntime(options = {}) {
    const layerOrderStateApi = resolveApi(
      options,
      'layerOrderStateApi',
      'SlideNextStudioEditorLayerOrderState'
    );
    const controller = layerOrderStateApi
      && typeof layerOrderStateApi.createStudioEditorLayerOrderStateController === 'function'
      ? layerOrderStateApi.createStudioEditorLayerOrderStateController({
          layerOrderApi: options.layerOrderApi,
          getDocument: options.getDocument,
          getSelectedElements: options.getSelectedElements,
          getActiveSlide: options.getActiveSlide,
          getNormalizedSlideLayerOrder: options.getNormalizedSlideLayerOrder,
          getLockedState: options.getLockedState
        })
      : null;

    return {
      isAvailable: !!controller,
      layerOrderStateController: controller
    };
  }

  return {
    createStudioEditorLayerOrderStateShellRuntime
  };
});
