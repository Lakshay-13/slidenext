(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorCanonicalPersistenceShellRuntime = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function resolveApi(options, optionName, globalName) {
    if (Object.prototype.hasOwnProperty.call(options, optionName)) {
      return options[optionName];
    }
    return root && root[globalName] ? root[globalName] : null;
  }

  function createStudioEditorCanonicalPersistenceShellRuntime(options = {}) {
    const canonicalPersistenceApi = resolveApi(
      options,
      'canonicalPersistenceApi',
      'SlideNextStudioEditorCanonicalPersistenceAdapter'
    );
    const adapter = canonicalPersistenceApi
      && typeof canonicalPersistenceApi.createStudioEditorCanonicalPersistenceAdapter === 'function'
      ? canonicalPersistenceApi.createStudioEditorCanonicalPersistenceAdapter({
          getPersistenceController: options.getPersistenceController,
          persistenceApi: resolveApi(
            options,
            'persistenceApi',
            'SlideNextStudioEditorPersistence'
          ),
          persistenceStateApi: resolveApi(
            options,
            'persistenceStateApi',
            'SlideNextStudioEditorPersistenceState'
          ),
          isCanonicalDeck: options.isCanonicalDeck,
          getPendingCanonicalDeck: options.getPendingCanonicalDeck,
          buildCanonicalDeckForDocument: options.buildCanonicalDeckForDocument
        })
      : null;

    return {
      isAvailable: !!adapter,
      canonicalPersistenceAdapter: adapter
    };
  }

  return {
    createStudioEditorCanonicalPersistenceShellRuntime
  };
});
