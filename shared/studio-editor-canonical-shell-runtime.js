(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorCanonicalShellRuntime(options = {}) {
    const canonicalRuntimeApi = resolveApi(
      options,
      'canonicalRuntimeApi',
      'SlideNextStudioEditorCanonicalRuntime'
    );
    if (!canonicalRuntimeApi
      || typeof canonicalRuntimeApi.createStudioEditorCanonicalRuntime !== 'function') {
      return null;
    }

    return canonicalRuntimeApi.createStudioEditorCanonicalRuntime(
      options.runtimeOptions || {}
    );
  }

  return {
    createStudioEditorCanonicalShellRuntime
  };
});
