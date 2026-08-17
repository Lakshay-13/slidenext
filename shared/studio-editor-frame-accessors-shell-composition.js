(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorFrameAccessorsShellComposition = api;
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

  function createStudioEditorFrameAccessorsShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorFrameAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorFrameAccessors !== 'function') {
      return {
        accessors: null,
        globalApi: {}
      };
    }

    const accessors = accessorsApi.createStudioEditorFrameAccessors({
      ...(options.accessorOptions || {})
    });
    const globalApi = typeof accessorsApi.createStudioEditorFrameGlobalApi === 'function'
      ? accessorsApi.createStudioEditorFrameGlobalApi({ accessors })
      : {};

    return {
      accessors,
      globalApi
    };
  }

  return {
    createStudioEditorFrameAccessorsShellComposition
  };
});
