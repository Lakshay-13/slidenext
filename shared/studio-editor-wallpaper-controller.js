(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function invokeStudioWallpaperFinalizer(finalizeMutation, ...args) {
    try {
      return finalizeMutation(...args);
    } catch (err) {
      return false;
    }
  }

  function resolveStudioWallpaperActionContext(options = {}) {
    const resolveActionState = typeof options.resolveActionState === 'function'
      ? options.resolveActionState
      : () => ({ canUseWallpaperControls: false });
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    try {
      const iframeDoc = getIframeDocument();
      return {
        iframeDoc,
        actionState: resolveActionState(iframeDoc)
      };
    } catch (err) {
      return null;
    }
  }

  function resolveStudioWallpaperPaint(wallpaperView, slide) {
    try {
      if (wallpaperView
        && typeof wallpaperView.resolveStudioActiveSlideBackgroundPaint === 'function') {
        return wallpaperView.resolveStudioActiveSlideBackgroundPaint(slide) || '';
      }
      return slide && slide.style && slide.style.background || '';
    } catch (err) {
      return '';
    }
  }

  function invokeStudioWallpaperRollback(rollbackMutation, ...args) {
    if (typeof rollbackMutation !== 'function') return;
    try {
      rollbackMutation(...args);
    } catch (err) {
      // Rollback is best effort after a rejected mutation.
    }
  }

  function applyStudioPresetWallpaper(options = {}) {
    const actionContext = resolveStudioWallpaperActionContext(options);
    if (!actionContext) return false;
    const { iframeDoc, actionState } = actionContext;
    if (!actionState || !actionState.canUseWallpaperControls || !actionState.activeSlide) {
      return false;
    }

    const wallpaperView = options.wallpaperView
      || (root && root.SlideNextStudioEditorWallpaperView)
      || null;
    const background = options.background;
    const currentBackground = resolveStudioWallpaperPaint(wallpaperView, actionState.canonicalActiveSlide)
      || resolveStudioWallpaperPaint(wallpaperView, actionState.activeSlide);
    if (currentBackground === background) return false;

    const applyMutation = typeof options.applyMutation === 'function'
      ? options.applyMutation
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    if (!applyMutation || !finalizeMutation) return false;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    let mutation;
    try {
      mutation = applyMutation(actionState.activeSlide, background, {
        sourceDocument: iframeDoc,
        getSlideId: () => getSlideId(actionState.activeSlide)
      });
    } catch (err) {
      return false;
    }
    if (!mutation || !mutation.didChange) return false;

    const versionLabel = options.isCustomInput ? '' : 'Auto: Changed Background';
    const finalizeResult = mutation.canonicalDeck
      ? invokeStudioWallpaperFinalizer(
          finalizeMutation,
          versionLabel,
          mutation.transaction,
          mutation.canonicalDeck
        )
      : invokeStudioWallpaperFinalizer(finalizeMutation, versionLabel, mutation.transaction);
    if (finalizeResult === false) {
      invokeStudioWallpaperRollback(rollbackMutation, mutation.transaction, iframeDoc);
      return false;
    }
    if (typeof options.setPendingCustomWallpaperVersion === 'function') {
      try {
        options.setPendingCustomWallpaperVersion(!!options.isCustomInput);
      } catch (err) {
        // The mutation is already finalized; preserve the successful result.
      }
    }
    return true;
  }

  function applyStudioWallpaperToAllSlides(options = {}) {
    const actionContext = resolveStudioWallpaperActionContext(options);
    if (!actionContext) return false;
    const { iframeDoc, actionState } = actionContext;
    if (!actionState || !actionState.canUseWallpaperControls || !actionState.activeSlide) {
      return false;
    }

    const wallpaperView = options.wallpaperView
      || (root && root.SlideNextStudioEditorWallpaperView)
      || null;
    const background = resolveStudioWallpaperPaint(wallpaperView, actionState.canonicalActiveSlide)
      || resolveStudioWallpaperPaint(wallpaperView, actionState.activeSlide);
    if (!background) return false;

    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : null;
    const applyMutation = typeof options.applyMutation === 'function'
      ? options.applyMutation
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const rollbackMutation = typeof options.rollbackMutation === 'function'
      ? options.rollbackMutation
      : null;
    if (!getSlides || !applyMutation || !finalizeMutation) return false;

    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    let mutation;
    try {
      mutation = applyMutation(getSlides(iframeDoc), background, {
        sourceDocument: iframeDoc,
        getSlideId
      });
    } catch (err) {
      return false;
    }
    if (!mutation || !mutation.didChange) return false;

    const versionLabel = 'Auto: Applied Background to All Slides';
    const finalizeResult = mutation.canonicalDeck
      ? invokeStudioWallpaperFinalizer(
          finalizeMutation,
          versionLabel,
          mutation.transaction,
          mutation.canonicalDeck
        )
      : invokeStudioWallpaperFinalizer(finalizeMutation, versionLabel, mutation.transaction);
    if (finalizeResult === false) {
      invokeStudioWallpaperRollback(rollbackMutation, mutation.transaction, iframeDoc);
      return false;
    }

    const alertRef = typeof options.alertRef === 'function'
      ? options.alertRef
      : root && typeof root.alert === 'function'
        ? root.alert.bind(root)
        : null;
    if (alertRef) {
      try {
        alertRef('Successfully applied active background paint to all slides in the deck.');
      } catch (err) {
        // A notification failure must not turn a committed mutation into an error.
      }
    }
    return true;
  }

  return {
    applyStudioPresetWallpaper,
    applyStudioWallpaperToAllSlides
  };
});
