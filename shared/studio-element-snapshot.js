(function (root, factory) {
  const deckModel = typeof module === 'object' && module.exports
    ? require('./deck-model')
    : root && root.SlideNextDeckModel;
  const api = factory(deckModel);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioElementSnapshot = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckModel) {
  function resolveStudioLayerDisplayMetadata(el) {
    if (!deckModel || typeof deckModel.resolveElementDisplayMetadata !== 'function' || !el) {
      return {
        typeIcon: 'description',
        displayName: 'Element'
      };
    }
    return deckModel.resolveElementDisplayMetadata(el);
  }

  function buildStudioElementSnapshot(el, options = {}) {
    if (!deckModel || typeof deckModel.buildElementSnapshot !== 'function' || !el) {
      return {
        id: '',
        typeIcon: 'description',
        displayName: 'Element',
        zIndex: '0',
        isLocked: false,
        isHidden: false,
        isSelected: false
      };
    }
    return deckModel.buildElementSnapshot(el, options);
  }

  function buildStudioLayerSnapshot(elements, options = {}) {
    if (!deckModel || typeof deckModel.buildLayerSnapshot !== 'function') {
      return [];
    }

    const buildElementSnapshot = typeof options.buildElementSnapshot === 'function'
      ? options.buildElementSnapshot
      : (el) => buildStudioElementSnapshot(el, options);
    const layerSnapshot = deckModel.buildLayerSnapshot(elements, { buildElementSnapshot });
    return options.reverseOutput === false ? layerSnapshot : layerSnapshot.reverse();
  }

  return {
    resolveStudioLayerDisplayMetadata,
    buildStudioElementSnapshot,
    buildStudioLayerSnapshot
  };
});
