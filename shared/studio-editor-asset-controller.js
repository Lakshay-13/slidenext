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
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const resolveActiveSlideId = () => getActiveSlideId(getDocument());
    const getSelectedImage = typeof options.getSelectedImage === 'function'
      ? options.getSelectedImage
      : () => null;
    const resolveSelectedImage = () => getSelectedImage(getDocument());
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

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = canonicalDeckApi
        && typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    }

    const readCanonicalDeckBaseline = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader({
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : () => {
          if (!getCanonicalDeckBaseline) return null;
          try {
            const liveCanonicalDeck = getCanonicalDeckBaseline();
            return isValidCanonicalDeck(liveCanonicalDeck)
              ? liveCanonicalDeck
              : null;
          } catch (err) {
            return null;
          }
        };

    const sharedCanonicalDeckResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckResolver({
          getCanonicalDeck,
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : null;

    function resolveCanonicalDeck(sourceDocument) {
      if (typeof sharedCanonicalDeckResolver === 'function') {
        return sharedCanonicalDeckResolver(sourceDocument);
      }
      const liveCanonicalDeck = readCanonicalDeckBaseline(sourceDocument);
      if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
      const fallbackCanonicalDeck = getCanonicalDeck(sourceDocument);
      return isValidCanonicalDeck(fallbackCanonicalDeck)
        ? fallbackCanonicalDeck
        : null;
    }

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
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.appendCanonicalAsset(
          resolveCanonicalDeck(),
          assetLike
        );
      } catch (err) {
        return null;
      }
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
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.removeCanonicalAsset(
          resolveCanonicalDeck(),
          assetId
        );
      } catch (err) {
        return false;
      }
      if (!nextCanonicalDeck) return false;
      commitDeck(nextCanonicalDeck, `Auto: Removed Asset "${assetId}"`);
      return true;
    }

    function applyAsset(assetId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.updateCanonicalNodeAsset !== 'function') {
        return false;
      }
      const selectedImage = resolveSelectedImage();
      if (!selectedImage) return false;
      const canonicalDeck = resolveCanonicalDeck();
      const hasCanonicalVisibilityReader = canonicalDeck
        && typeof canonicalDeckApi.findCanonicalNodeById === 'function'
        && canonicalStateApi
        && typeof canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck === 'function';
      const hasCanonicalLockReader = canonicalDeck
        && typeof canonicalDeckApi.findCanonicalNodeById === 'function'
        && canonicalStateApi
        && typeof canonicalStateApi.createStudioEditorCanonicalLockReaderFromApi === 'function';
      if (hasCanonicalVisibilityReader) {
        const readLockedState = canonicalStateApi.createStudioEditorCanonicalVisibilityReaderForDeck(canonicalDeck, {
          property: 'locked',
          canonicalDeckApi,
          getElementId,
          fallbackReader: isElementLocked
        });
        if (readLockedState(selectedImage)) return false;
      } else if (hasCanonicalLockReader) {
        const readLockedState = canonicalStateApi.createStudioEditorCanonicalLockReaderFromApi(canonicalDeck, {
          canonicalDeckApi,
          getElementId,
          fallbackReader: isElementLocked
        });
        if (readLockedState(selectedImage)) return false;
      } else {
        let canonicalLockState = null;
        if (canonicalDeck
          && typeof canonicalDeckApi.findCanonicalNodeById === 'function') {
          try {
            const canonicalNode = canonicalDeckApi.findCanonicalNodeById(
              canonicalDeck,
              getElementId(selectedImage)
            );
            const value = canonicalNode
              && canonicalNode.visibility
              && canonicalNode.visibility.locked;
            if (typeof value === 'boolean') canonicalLockState = value;
          } catch (err) {
            canonicalLockState = null;
          }
        }
        if (canonicalLockState === true || isElementLocked(selectedImage)) return false;
      }
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.updateCanonicalNodeAsset(
          canonicalDeck,
          resolveActiveSlideId(),
          getElementId(selectedImage),
          assetId
        );
      } catch (err) {
        return false;
      }
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
