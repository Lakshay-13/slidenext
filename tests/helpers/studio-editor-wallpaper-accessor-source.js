const fs = require('node:fs');
const path = require('node:path');

const ACCESSORS_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'shared', 'studio-editor-wallpaper-accessors.js'),
  'utf8'
);
const CONTROLLER_SOURCE = fs.readFileSync(
  path.join(__dirname, '..', '..', 'shared', 'studio-editor-wallpaper-controller.js'),
  'utf8'
);

function withWallpaperAccessorsSource(source) {
  if (typeof source !== 'string'
    || (!source.includes('function applyPresetWallpaper(')
      && !source.includes('function applyWallpaperToAllSlides()'))) {
    return source;
  }

  return `${CONTROLLER_SOURCE}
${ACCESSORS_SOURCE}
var studioEditorWallpaperAccessors = typeof SlideNextStudioEditorWallpaperAccessors !== 'undefined'
  && SlideNextStudioEditorWallpaperAccessors
  && typeof SlideNextStudioEditorWallpaperAccessors.createStudioEditorWallpaperAccessors === 'function'
  ? SlideNextStudioEditorWallpaperAccessors.createStudioEditorWallpaperAccessors({
      resolveActionState: typeof resolveCurrentStudioWallpaperActionState === 'function'
        ? resolveCurrentStudioWallpaperActionState
        : null,
      getDocument: () => typeof document !== 'undefined' ? document : null,
      getWallpaperView: () => typeof SlideNextStudioEditorWallpaperView !== 'undefined'
        ? SlideNextStudioEditorWallpaperView
        : null,
      getApplyPresetWallpaper: () => typeof applyPresetWallpaper === 'function'
        ? applyPresetWallpaper
        : null,
      getWallpaperController: () => typeof SlideNextStudioEditorWallpaperController !== 'undefined'
        ? SlideNextStudioEditorWallpaperController
        : null,
      getIframeDocument: typeof getIframeDoc === 'function' ? getIframeDoc : null,
      applyMutation: typeof applyEditorWallpaperMutationWithTransaction === 'function'
        ? applyEditorWallpaperMutationWithTransaction
        : null,
      applySlidesMutation: typeof applyEditorWallpaperSlidesMutationWithTransaction === 'function'
        ? applyEditorWallpaperSlidesMutationWithTransaction
        : null,
      getSlideId: typeof getEditorSlideId === 'function' ? getEditorSlideId : null,
      getSlides: typeof getSlides === 'function' ? getSlides : null,
      setPendingCustomWallpaperVersion: typeof setStudioPendingCustomWallpaperVersion === 'function'
        ? setStudioPendingCustomWallpaperVersion
        : null,
      finalizeMutation: typeof finalizeWallpaperMutation === 'function'
        ? finalizeWallpaperMutation
        : null,
      rollbackMutation: typeof rollbackEditorWallpaperMutation === 'function'
        ? rollbackEditorWallpaperMutation
        : null,
      getAlert: () => typeof alert === 'function' ? alert : null
    })
  : null;
${source}`;
}

module.exports = { withWallpaperAccessorsSource };
