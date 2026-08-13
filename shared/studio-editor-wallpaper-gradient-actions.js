(function initStudioEditorWallpaperGradientActions(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }
  root.SlideNextStudioEditorWallpaperGradientActions = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function createApi() {
  function createStudioEditorWallpaperGradientActions(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const resolveActionState = typeof options.resolveActionState === 'function'
      ? options.resolveActionState
      : () => ({ canUseWallpaperControls: false });
    const getWallpaperView = typeof options.getWallpaperView === 'function'
      ? options.getWallpaperView
      : () => options.wallpaperView || null;
    const getCustomGradientType = typeof options.getCustomGradientType === 'function'
      ? options.getCustomGradientType
      : () => 'linear';
    const setCustomGradientTypeState = typeof options.setCustomGradientType === 'function'
      ? options.setCustomGradientType
      : () => false;
    const applyPresetWallpaper = typeof options.applyPresetWallpaper === 'function'
      ? options.applyPresetWallpaper
      : () => false;
    const applyCustomGradientOverride = typeof options.applyCustomGradient === 'function'
      ? options.applyCustomGradient
      : null;

    function buildCustomGradient() {
      if (!resolveActionState().canUseWallpaperControls) return false;
      const documentRef = getDocument();
      const color1Input = documentRef && documentRef.getElementById('cgColor1');
      const color2Input = documentRef && documentRef.getElementById('cgColor2');
      const angleInput = documentRef && documentRef.getElementById('cgAngle');
      if (!color1Input || !color2Input || !angleInput) {
        return false;
      }

      const color1 = color1Input.value;
      const color2 = color2Input.value;
      const angle = angleInput.value;
      const gradientValue = getCustomGradientType() === 'linear'
        ? `linear-gradient(${angle}deg, ${color1} 0%, ${color2} 100%)`
        : `radial-gradient(circle, ${color1} 0%, ${color2} 100%)`;
      return applyPresetWallpaper(gradientValue, true);
    }

    function applyCustomGradient() {
      return applyCustomGradientOverride
        ? applyCustomGradientOverride()
        : buildCustomGradient();
    }

    function setCustomGradientType(type) {
      if (!resolveActionState().canUseWallpaperControls) return false;
      const documentRef = getDocument();
      const linearButton = documentRef && documentRef.getElementById('cgLinearBtn');
      const radialButton = documentRef && documentRef.getElementById('cgRadialBtn');
      const angleGroup = documentRef && documentRef.getElementById('cgAngleGroup');
      const nextGradientTypeButton = type === 'radial' ? radialButton : linearButton;
      if (!linearButton || !radialButton || !angleGroup || !nextGradientTypeButton) {
        return false;
      }

      const wallpaperView = getWallpaperView();
      if (wallpaperView && typeof wallpaperView.syncStudioCustomGradientTypeChrome === 'function') {
        if (!wallpaperView.syncStudioCustomGradientTypeChrome({
          documentRef,
          gradientType: type
        })) {
          return false;
        }
        setCustomGradientTypeState(type);
        return applyCustomGradient();
      }

      setCustomGradientTypeState(type);
      const activeButtonClass = 'py-1 text-center text-xs font-mono rounded bg-white/5 text-[#7028d0] font-semibold border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#7028d0]';
      const idleButtonClass = 'py-1 text-center text-xs font-mono rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400';
      if (type === 'linear') {
        linearButton.className = activeButtonClass;
        radialButton.className = idleButtonClass;
        angleGroup.classList.remove('hidden');
      } else {
        radialButton.className = activeButtonClass;
        linearButton.className = idleButtonClass;
        angleGroup.classList.add('hidden');
      }
      return applyCustomGradient();
    }

    function updateCustomGradientAngle(value) {
      if (!resolveActionState().canUseWallpaperControls) return false;
      const documentRef = getDocument();
      const wallpaperView = getWallpaperView();
      if (wallpaperView && typeof wallpaperView.syncStudioCustomGradientAngleChrome === 'function') {
        wallpaperView.syncStudioCustomGradientAngleChrome({
          documentRef,
          angle: value
        });
      } else {
        const angleLabel = documentRef && documentRef.getElementById('cgAngleVal');
        if (angleLabel) {
          angleLabel.textContent = `${value}°`;
        }
      }
      return applyCustomGradient();
    }

    return {
      applyCustomGradient,
      setCustomGradientType,
      updateCustomGradientAngle
    };
  }

  function createStudioEditorWallpaperGradientGlobalApi(options = {}) {
    const actions = options.actions || {};
    return {
      applyCustomGradient: (...args) => typeof actions.applyCustomGradient === 'function'
        ? actions.applyCustomGradient(...args)
        : false,
      setCustomGradientType: (...args) => typeof actions.setCustomGradientType === 'function'
        ? actions.setCustomGradientType(...args)
        : false,
      updateCustomGradientAngle: (...args) => typeof actions.updateCustomGradientAngle === 'function'
        ? actions.updateCustomGradientAngle(...args)
        : false
    };
  }

  return {
    createStudioEditorWallpaperGradientActions,
    createStudioEditorWallpaperGradientGlobalApi
  };
}));
