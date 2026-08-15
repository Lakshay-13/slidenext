(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetInsertion = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAssetInsertionController(options = {}) {
    const canonicalDeckApi = Object.prototype.hasOwnProperty.call(options, 'canonicalDeckApi')
      ? options.canonicalDeckApi
      : (root && root.SlideNextCanonicalDeck) || null;
    const insertionController = options.insertionController || null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const resolveCanonicalDeck = typeof options.resolveCanonicalDeck === 'function'
      ? options.resolveCanonicalDeck
      : () => null;

    function insert(assetId) {
      const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.findCanonicalAssetById !== 'function'
        || !insertionController
        || typeof insertionController.insert !== 'function') {
        return false;
      }

      let asset = null;
      try {
        asset = canonicalDeckApi.findCanonicalAssetById(
          resolveCanonicalDeck(getDocument()),
          normalizedAssetId
        );
      } catch (error) {
        return false;
      }
      if (!asset || !asset.src) return false;

      return insertionController.insert('img', {
        versionLabel: `Auto: Inserted Asset "${asset.name || asset.id}"`,
        prepareElement: (element) => {
          if (!element) return;
          if (typeof element.setAttribute === 'function') {
            element.setAttribute('data-asset-id', asset.id);
          }
          element.src = asset.src;
        }
      });
    }

    return { insert };
  }

  return {
    createStudioEditorAssetInsertionController
  };
});
