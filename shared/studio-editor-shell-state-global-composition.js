(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorShellStateGlobalComposition = api;
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

  function createGlobalApi(
    options,
    accessorsApiOption,
    accessorsOption,
    globalName,
    factoryName
  ) {
    const accessorsApi = resolveApi(options, accessorsApiOption, globalName);
    return accessorsApi
      && typeof accessorsApi[factoryName] === 'function'
      ? accessorsApi[factoryName]({ accessors: options[accessorsOption] })
      : {};
  }

  function createStudioEditorShellStateGlobalComposition(options = {}) {
    return {
      sessionStateGlobalApi: createGlobalApi(
        options,
        'sessionStateAccessorsApi',
        'sessionStateAccessors',
        'SlideNextStudioEditorSessionStateAccessors',
        'createStudioEditorSessionStateGlobalApi'
      ),
      stateGlobalApi: createGlobalApi(
        options,
        'stateAccessorsApi',
        'stateAccessors',
        'SlideNextStudioEditorStateAccessors',
        'createStudioEditorStateGlobalApi'
      ),
      historyGlobalApi: createGlobalApi(
        options,
        'historyAccessorsApi',
        'historyAccessors',
        'SlideNextStudioEditorHistoryAccessors',
        'createStudioEditorHistoryGlobalApi'
      ),
      persistedDeckGlobalApi: createGlobalApi(
        options,
        'persistedDeckAccessorsApi',
        'persistedDeckAccessors',
        'SlideNextStudioEditorPersistedDeckAccessors',
        'createStudioEditorPersistedDeckGlobalApi'
      ),
      timerStateGlobalApi: createGlobalApi(
        options,
        'timerStateAccessorsApi',
        'timerStateAccessors',
        'SlideNextStudioEditorTimerStateAccessors',
        'createStudioEditorTimerStateGlobalApi'
      )
    };
  }

  return {
    createStudioEditorShellStateGlobalComposition
  };
});
