(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function applyStudioPresetWallpaper(options = {}) {
    const resolveActionState = typeof options.resolveActionState === 'function'
      ? options.resolveActionState
      : () => ({ canUseWallpaperControls: false });
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const iframeDoc = getIframeDocument();
    const actionState = resolveActionState(iframeDoc);
    if (!actionState || !actionState.canUseWallpaperControls || !actionState.activeSlide) {
      return false;
    }

    const wallpaperView = options.wallpaperView
      || (root && root.SlideNextStudioEditorWallpaperView)
      || null;
    const readBackgroundPaint = wallpaperView
      && typeof wallpaperView.resolveStudioActiveSlideBackgroundPaint === 'function'
      ? wallpaperView.resolveStudioActiveSlideBackgroundPaint
      : (slide) => slide && slide.style && slide.style.background || '';
    const background = options.background;
    const currentBackground = readBackgroundPaint(actionState.canonicalActiveSlide)
      || readBackgroundPaint(actionState.activeSlide);
    if (currentBackground === background) return false;

    const applyMutation = typeof options.applyMutation === 'function'
      ? options.applyMutation
      : null;
    if (!applyMutation) return false;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    const mutation = applyMutation(actionState.activeSlide, background, {
      sourceDocument: iframeDoc,
      getSlideId: () => getSlideId(actionState.activeSlide)
    });
    if (!mutation || !mutation.didChange) return false;

    if (typeof options.setPendingCustomWallpaperVersion === 'function') {
      options.setPendingCustomWallpaperVersion(!!options.isCustomInput);
    }
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (!finalizeMutation) return false;
    const versionLabel = options.isCustomInput ? '' : 'Auto: Changed Background';
    if (mutation.canonicalDeck) {
      finalizeMutation(versionLabel, mutation.transaction, mutation.canonicalDeck);
    } else {
      finalizeMutation(versionLabel, mutation.transaction);
    }
    return true;
  }

  function applyStudioWallpaperToAllSlides(options = {}) {
    const resolveActionState = typeof options.resolveActionState === 'function'
      ? options.resolveActionState
      : () => ({ canUseWallpaperControls: false });
    const getIframeDocument = typeof options.getIframeDocument === 'function'
      ? options.getIframeDocument
      : () => null;
    const iframeDoc = getIframeDocument();
    const actionState = resolveActionState(iframeDoc);
    if (!actionState || !actionState.canUseWallpaperControls || !actionState.activeSlide) {
      return false;
    }

    const wallpaperView = options.wallpaperView
      || (root && root.SlideNextStudioEditorWallpaperView)
      || null;
    const readBackgroundPaint = wallpaperView
      && typeof wallpaperView.resolveStudioActiveSlideBackgroundPaint === 'function'
      ? wallpaperView.resolveStudioActiveSlideBackgroundPaint
      : (slide) => slide && slide.style && slide.style.background || '';
    const background = readBackgroundPaint(actionState.canonicalActiveSlide)
      || readBackgroundPaint(actionState.activeSlide);
    if (!background) return false;

    const getSlides = typeof options.getSlides === 'function' ? options.getSlides : null;
    const applyMutation = typeof options.applyMutation === 'function'
      ? options.applyMutation
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    if (!getSlides || !applyMutation || !finalizeMutation) return false;

    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : () => '';
    const mutation = applyMutation(getSlides(iframeDoc), background, {
      sourceDocument: iframeDoc,
      getSlideId
    });
    if (!mutation || !mutation.didChange) return false;

    const versionLabel = 'Auto: Applied Background to All Slides';
    if (mutation.canonicalDeck) {
      finalizeMutation(versionLabel, mutation.transaction, mutation.canonicalDeck);
    } else {
      finalizeMutation(versionLabel, mutation.transaction);
    }

    const alertRef = typeof options.alertRef === 'function'
      ? options.alertRef
      : root && typeof root.alert === 'function'
        ? root.alert.bind(root)
        : null;
    if (alertRef) {
      alertRef('Successfully applied active background paint to all slides in the deck.');
    }
    return true;
  }

  return {
    applyStudioPresetWallpaper,
    applyStudioWallpaperToAllSlides
  };
});
