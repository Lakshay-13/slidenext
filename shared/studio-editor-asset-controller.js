(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorAssetController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorAssetController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const onAssetsChanged = typeof options.onAssetsChanged === 'function'
      ? options.onAssetsChanged
      : null;

    function commitDeck(nextCanonicalDeck, versionLabel = '') {
      if (finalizeMutation) {
        finalizeMutation(versionLabel, {
          refreshThumbnails: false,
          canonicalDeck: nextCanonicalDeck
        });
      } else {
        if (saveHistoryState) saveHistoryState(false, null, nextCanonicalDeck);
        if (triggerAutoSave) triggerAutoSave();
        if (triggerAutoVersion && versionLabel) triggerAutoVersion(versionLabel);
      }
      if (onAssetsChanged) onAssetsChanged(nextCanonicalDeck.assets, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    function addAsset(assetLike = {}) {
      if (!canonicalDeckApi || typeof canonicalDeckApi.appendCanonicalAsset !== 'function') {
        return null;
      }
      const nextCanonicalDeck = canonicalDeckApi.appendCanonicalAsset(getCanonicalDeck(), assetLike);
      if (!nextCanonicalDeck) return null;
      const asset = nextCanonicalDeck.assets[nextCanonicalDeck.assets.length - 1] || null;
      return commitDeck(
        nextCanonicalDeck,
        `Auto: Added Asset${asset && asset.name ? ` "${asset.name}"` : ''}`
      );
    }

    function removeAsset(assetId) {
      if (!canonicalDeckApi || typeof canonicalDeckApi.removeCanonicalAsset !== 'function') {
        return false;
      }
      const nextCanonicalDeck = canonicalDeckApi.removeCanonicalAsset(getCanonicalDeck(), assetId);
      if (!nextCanonicalDeck) return false;
      commitDeck(nextCanonicalDeck, `Auto: Removed Asset "${assetId}"`);
      return true;
    }

    return {
      addAsset,
      removeAsset
    };
  }

  return {
    createStudioEditorAssetController
  };
});
