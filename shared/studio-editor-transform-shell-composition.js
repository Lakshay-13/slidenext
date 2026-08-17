(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorTransformShellComposition = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function resolveApi(options, optionName, globalName, fallbackOptions = null) {
    if (hasOwn(options, optionName)) {
      return options[optionName];
    }
    if (fallbackOptions && hasOwn(fallbackOptions, optionName)) {
      return fallbackOptions[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorTransformShellComposition(options = {}) {
    const accessorsApi = resolveApi(
      options,
      'accessorsApi',
      'SlideNextStudioEditorTransformRuntimeAccessors'
    );
    if (!accessorsApi
      || typeof accessorsApi.createStudioEditorTransformRuntimeAccessors !== 'function') {
      return {
        accessors: null,
        runtime: null,
        controller: null
      };
    }

    const runtimeOptions = { ...(options.runtimeOptions || {}) };
    const dependencies = [
      ['controllerApi', 'SlideNextStudioEditorTransformController'],
      ['transformApi', 'SlideNextStudioEditorTransform'],
      ['canonicalTransformApi', 'SlideNextStudioEditorCanonicalTransform'],
      ['canonicalDeckApi', 'SlideNextCanonicalDeck'],
      ['transactionApi', 'SlideNextStudioEditorTransaction'],
      ['domApi', 'SlideNextStudioEditorDom'],
      ['interactionOptionsApi', 'SlideNextStudioEditorInteractionOptions'],
      ['interactionsApi', 'SlideNextStudioEditorInteractions'],
      ['eventsApi', 'SlideNextStudioEditorEvents'],
      ['selectionBoundsApi', 'SlideNextStudioEditorSelectionBounds']
    ];
    for (const [optionName, globalName] of dependencies) {
      runtimeOptions[optionName] = resolveApi(
        options,
        optionName,
        globalName,
        runtimeOptions
      );
    }

    const accessors = accessorsApi.createStudioEditorTransformRuntimeAccessors({
      runtimeApi: resolveApi(
        options,
        'runtimeApi',
        'SlideNextStudioEditorTransformShellRuntime'
      ),
      transformRuntimeApi: resolveApi(
        options,
        'transformRuntimeApi',
        'SlideNextStudioEditorTransformRuntime'
      ),
      runtimeOptions
    });
    const runtime = accessors && accessors.runtime ? accessors.runtime : null;

    return {
      accessors,
      runtime,
      controller: runtime && runtime.transformController
        ? runtime.transformController
        : null
    };
  }

  return {
    createStudioEditorTransformShellComposition
  };
});
