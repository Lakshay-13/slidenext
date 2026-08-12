(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorClipboardPayloadShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorClipboardPayloadShellRuntime(options = {}) {
    const payloadRuntimeApi = resolveApi(
      options,
      'payloadRuntimeApi',
      'SlideNextStudioEditorClipboardPayloadRuntime'
    );
    if (!payloadRuntimeApi
      || typeof payloadRuntimeApi.createStudioEditorClipboardPayloadRuntime !== 'function') {
      return null;
    }

    const runtimeOptions = { ...options };
    delete runtimeOptions.payloadRuntimeApi;
    runtimeOptions.controllerApi = resolveApi(
      options,
      'controllerApi',
      'SlideNextStudioEditorClipboardPayloadController'
    );
    runtimeOptions.clipboardApi = resolveApi(
      options,
      'clipboardApi',
      'SlideNextStudioEditorClipboard'
    );
    runtimeOptions.domApi = resolveApi(
      options,
      'domApi',
      'SlideNextStudioEditorDom'
    );
    runtimeOptions.transformApi = resolveApi(
      options,
      'transformApi',
      'SlideNextStudioEditorTransform'
    );

    return payloadRuntimeApi.createStudioEditorClipboardPayloadRuntime(runtimeOptions);
  }

  return {
    createStudioEditorClipboardPayloadShellRuntime
  };
});
