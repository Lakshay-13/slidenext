(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorZoomRuntimeOptions = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveDependency(options, name, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, name)) {
      return options[name];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorZoomRuntimeOptions(options = {}) {
    return {
      controllerApi: resolveDependency(
        options,
        'controllerApi',
        'SlideNextStudioEditorZoomController'
      ),
      zoomApi: resolveDependency(options, 'zoomApi', 'SlideNextStudioEditorZoom'),
      rulerViewApi: resolveDependency(
        options,
        'rulerViewApi',
        'SlideNextStudioEditorRulerView'
      ),
      documentRef: options.documentRef,
      localStorageRef: options.localStorageRef,
      initialZoomFactor: options.initialZoomFactor,
      resolveActionState: options.resolveActionState,
      getZoomFactor: options.getZoomFactor,
      setZoomFactor: options.setZoomFactor,
      applyZoom: options.applyZoom
    };
  }

  return {
    createStudioEditorZoomRuntimeOptions
  };
});
