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
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedImage = typeof options.getSelectedImage === 'function'
      ? options.getSelectedImage
      : () => null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const isElementLocked = typeof options.isElementLocked === 'function'
      ? options.isElementLocked
      : () => false;
    const syncInspectorForSelection = typeof options.syncInspectorForSelection === 'function'
      ? options.syncInspectorForSelection
      : null;
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

    function applyAsset(assetId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.updateCanonicalNodeAsset !== 'function') {
        return false;
      }
      const selectedImage = getSelectedImage();
      if (!selectedImage || isElementLocked(selectedImage)) return false;
      const nextCanonicalDeck = canonicalDeckApi.updateCanonicalNodeAsset(
        getCanonicalDeck(),
        getActiveSlideId(),
        getElementId(selectedImage),
        assetId
      );
      if (!nextCanonicalDeck) return false;

      const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
      const asset = nextCanonicalDeck.assets.find(
        (candidate) => candidate && candidate.id === normalizedAssetId
      );
      if (normalizedAssetId && !asset) return false;
      if (asset && typeof selectedImage.setAttribute === 'function') {
        selectedImage.setAttribute('src', asset.src);
      }
      if (asset) selectedImage.src = asset.src;
      if (syncInspectorForSelection) syncInspectorForSelection();
      commitDeck(
        nextCanonicalDeck,
        asset
          ? `Auto: Applied Asset "${asset.name || asset.id}"`
          : 'Auto: Cleared Image Asset'
      );
      return true;
    }

    return {
      addAsset,
      removeAsset,
      applyAsset
    };
  }

  return {
    createStudioEditorAssetController
  };
});
