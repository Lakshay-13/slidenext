(function (root, factory) {
  const colorUtils = root && root.SlideNextStudioColorUtils
    ? root.SlideNextStudioColorUtils
    : typeof require === 'function'
      ? require('./studio-color-utils.js')
      : null;
  const api = factory(colorUtils);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (colorUtils) {
  function readInlineStyleValue(element, property) {
    return element && element.style && typeof element.style[property] === 'string'
      ? element.style[property].trim()
      : '';
  }

  function readStudioStyleDeclarationValue(styleText, property) {
    if (typeof styleText !== 'string' || !styleText.trim() || typeof property !== 'string') {
      return '';
    }
    const normalizedProperty = property.trim().toLowerCase();
    const declaration = styleText.split(';').find((candidate) => {
      const separatorIndex = candidate.indexOf(':');
      return separatorIndex >= 0
        && candidate.slice(0, separatorIndex).trim().toLowerCase() === normalizedProperty;
    });
    if (!declaration) return '';
    return declaration.slice(declaration.indexOf(':') + 1).trim();
  }

  function resolveStudioActiveSlideBackgroundValues(activeSlide) {
    const canonicalBackground = activeSlide
      && activeSlide.layout
      && activeSlide.layout.background
      && typeof activeSlide.layout.background === 'object'
      ? activeSlide.layout.background
      : null;
    if (canonicalBackground) {
      const styleText = typeof canonicalBackground.style === 'string'
        ? canonicalBackground.style
        : '';
      const background = readStudioStyleDeclarationValue(styleText, 'background')
        || (typeof canonicalBackground.color === 'string' ? canonicalBackground.color.trim() : '')
        || (typeof canonicalBackground.image === 'string' ? canonicalBackground.image.trim() : '');
      return {
        background,
        backgroundColor: typeof canonicalBackground.color === 'string'
          ? canonicalBackground.color.trim()
          : readStudioStyleDeclarationValue(styleText, 'background-color'),
        backgroundImage: typeof canonicalBackground.image === 'string'
          ? canonicalBackground.image.trim()
          : readStudioStyleDeclarationValue(styleText, 'background-image')
      };
    }

    return {
      background: readInlineStyleValue(activeSlide, 'background'),
      backgroundColor: readInlineStyleValue(activeSlide, 'backgroundColor'),
      backgroundImage: readInlineStyleValue(activeSlide, 'backgroundImage')
    };
  }

  function resolveStudioActiveSlideBackgroundPaint(activeSlide) {
    const backgroundValues = resolveStudioActiveSlideBackgroundValues(activeSlide);
    return backgroundValues.background
      || backgroundValues.backgroundColor
      || backgroundValues.backgroundImage
      || '';
  }

  function rgbToHex(value, converter = null) {
    if (typeof converter === 'function') return converter(value);
    if (!colorUtils || typeof colorUtils.rgbToHex !== 'function') return '#ffffff';
    return colorUtils.rgbToHex(value);
  }

  function normalizeStudioWallpaperColor(value, options = {}) {
    if (typeof value !== 'string') return '';
    const trimmedValue = value.trim();
    if (!trimmedValue) return '';
    if (trimmedValue.startsWith('#')) return trimmedValue;
    if (/^rgba?\(/i.test(trimmedValue)) {
      return rgbToHex(trimmedValue, options.rgbToHex);
    }
    return '';
  }

  function splitStudioGradientSegments(value) {
    if (typeof value !== 'string' || !value.trim()) return [];

    const segments = [];
    let currentSegment = '';
    let depth = 0;
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (char === '(') depth += 1;
      else if (char === ')' && depth > 0) depth -= 1;

      if (char === ',' && depth === 0) {
        segments.push(currentSegment.trim());
        currentSegment = '';
        continue;
      }
      currentSegment += char;
    }

    if (currentSegment.trim()) segments.push(currentSegment.trim());
    return segments;
  }

  function extractStudioGradientStopColor(segment) {
    if (typeof segment !== 'string') return '';
    const colorMatch = segment.trim().match(/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/i);
    return colorMatch ? colorMatch[1] : '';
  }

  function resolveStudioActiveSlideSolidWallpaperColor(activeSlide) {
    const backgroundValues = resolveStudioActiveSlideBackgroundValues(activeSlide);
    const backgroundImage = backgroundValues.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none') return '';

    const backgroundColor = backgroundValues.backgroundColor;
    const background = backgroundValues.background;
    const fallbackColorMatch = background && !/gradient\(/i.test(background)
      ? background.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/)
      : null;
    return backgroundColor || (fallbackColorMatch ? fallbackColorMatch[0] : '');
  }

  function resolveStudioActiveSlideGradientBackground(activeSlide) {
    const backgroundValues = resolveStudioActiveSlideBackgroundValues(activeSlide);
    const background = backgroundValues.background;
    if (background && /gradient\(/i.test(background)) return background;

    const backgroundImage = backgroundValues.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none' && /gradient\(/i.test(backgroundImage)) {
      return backgroundImage;
    }
    return '';
  }

  function syncStudioSolidWallpaperControl(options = {}) {
    const documentRef = options.documentRef;
    const solidWallpaperColorInput = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('wallpaperCustomColor')
      : null;
    const activeSlide = options.activeSlide;
    if (!solidWallpaperColorInput || !activeSlide || !activeSlide.style) return false;

    const solidColor = resolveStudioActiveSlideSolidWallpaperColor(activeSlide);
    if (!solidColor) return false;

    solidWallpaperColorInput.value = normalizeStudioWallpaperColor(solidColor, options);
    return true;
  }

  function renderStudioWallpaperPresets(options = {}) {
    const documentRef = options.documentRef;
    const solidsContainer = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('wallpaperSolidsList')
      : null;
    const gradientsContainer = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('wallpaperGradientsList')
      : null;
    if (!solidsContainer || !gradientsContainer) return false;

    const presetData = options.presetData || {};
    const renderPresets = (presets) => (Array.isArray(presets) ? presets : []).map((preset) => `
        <button onclick="applyPresetWallpaper('${preset.value}')" class="h-8 rounded border border-white/10 hover:border-[#7028d0]/50 hover:scale-105 active:scale-95 transition-all relative overflow-hidden group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:scale-100 disabled:active:scale-100" title="${preset.name}" style="background: ${preset.value};">
          <span class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100"></span>
        </button>
      `).join('');

    solidsContainer.innerHTML = renderPresets(presetData.solid);
    gradientsContainer.innerHTML = renderPresets(presetData.gradient);
    return true;
  }

  function applyStudioWallpaperToSlides(slides, background, options = {}) {
    const sourceSlides = Array.isArray(slides) ? slides : [];
    const createStyleTransaction = typeof options.createStyleTransaction === 'function'
      ? options.createStyleTransaction
      : null;
    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (slide) => slide && slide.dataset && slide.dataset.slideId;
    const previousBackgrounds = sourceSlides.map((slide) => ({
      slide,
      background: slide && slide.style ? slide.style.background : undefined
    }));
    try {
      const transactionItems = createStyleTransaction
        ? sourceSlides.reduce((items, slide) => {
            const slideId = getSlideId(slide);
            if (!slideId || !slide || !slide.style) return items;
            items.push({
              element: slide,
              elementId: `slide:${slideId}`,
              before: { background: slide.style.background }
            });
            return items;
          }, [])
        : [];
      let changedCount = 0;
      sourceSlides.forEach((slide) => {
        if (!slide || !slide.style || slide.style.background === background) return;
        slide.style.background = background;
        changedCount += 1;
      });
      if (changedCount === 0) {
        return { didChange: false, changedCount: 0, transaction: null };
      }

      transactionItems.forEach((item) => {
        item.after = { background: item.element.style.background };
      });
      return {
        didChange: true,
        changedCount,
        transaction: createStyleTransaction
          ? createStyleTransaction(transactionItems)
          : null
      };
    } catch (error) {
      previousBackgrounds.forEach(({ slide, background: previousBackground }) => {
        if (slide && slide.style) slide.style.background = previousBackground;
      });
      return { didChange: false, changedCount: 0, transaction: null };
    }
  }

  function setStudioWallpaperTab(options = {}) {
    const documentRef = options.documentRef;
    const solidTab = documentRef && documentRef.getElementById('wpTabSolid');
    const presetsTab = documentRef && documentRef.getElementById('wpTabPresets');
    const customTab = documentRef && documentRef.getElementById('wpTabCustom');
    const solidPanel = documentRef && documentRef.getElementById('wpPanelSolid');
    const presetsPanel = documentRef && documentRef.getElementById('wpPanelPresets');
    const customPanel = documentRef && documentRef.getElementById('wpPanelCustom');
    const tab = options.tab;
    const nextTabButton = tab === 'solid'
      ? solidTab
      : tab === 'presets'
        ? presetsTab
        : customTab;
    if (!solidTab || !presetsTab || !customTab || !nextTabButton || !solidPanel || !presetsPanel || !customPanel) {
      return false;
    }

    const inactiveTabClass = 'py-1 text-center text-[10px] font-mono rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400';
    const activeTabClass = 'py-1 text-center text-[10px] font-mono rounded bg-white/5 text-[#7028d0] font-semibold border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#7028d0]';
    [solidTab, presetsTab, customTab].forEach((tabButton) => {
      tabButton.className = inactiveTabClass;
    });
    [solidPanel, presetsPanel, customPanel].forEach((panel) => {
      panel.classList.add('hidden');
    });

    if (tab === 'solid') {
      solidTab.className = activeTabClass;
      solidPanel.classList.remove('hidden');
    } else if (tab === 'presets') {
      presetsTab.className = activeTabClass;
      presetsPanel.classList.remove('hidden');
    } else if (tab === 'custom') {
      customTab.className = activeTabClass;
      customPanel.classList.remove('hidden');
    }
    return true;
  }

  function bindStudioWallpaperTabControls(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

    const setWallpaperTab = typeof options.setWallpaperTab === 'function'
      ? options.setWallpaperTab
      : null;
    const bindings = {};
    const controls = [
      ['wpTabSolid', 'solid'],
      ['wpTabPresets', 'presets'],
      ['wpTabCustom', 'custom']
    ];
    controls.forEach(([id, tab]) => {
      const button = documentRef.getElementById(id);
      if (!button || typeof button.addEventListener !== 'function') {
        bindings[id] = false;
        return;
      }
      button.addEventListener('click', () => {
        if (setWallpaperTab) setWallpaperTab(tab);
      });
      bindings[id] = true;
    });
    return bindings;
  }

  function bindStudioCustomGradientTypeControls(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return {};

    const setCustomGradientType = typeof options.setCustomGradientType === 'function'
      ? options.setCustomGradientType
      : null;
    const bindings = {};
    const controls = [
      ['cgLinearBtn', 'linear'],
      ['cgRadialBtn', 'radial']
    ];
    controls.forEach(([id, gradientType]) => {
      const button = documentRef.getElementById(id);
      if (!button || typeof button.addEventListener !== 'function') {
        bindings[id] = false;
        return;
      }
      button.addEventListener('click', () => {
        if (setCustomGradientType) setCustomGradientType(gradientType);
      });
      bindings[id] = true;
    });
    return bindings;
  }

  function resetStudioWallpaperUiState(options = {}) {
    const documentRef = options.documentRef;
    if (!documentRef || typeof documentRef.getElementById !== 'function') return false;

    setStudioWallpaperTab({ documentRef, tab: 'solid' });
    syncStudioCustomGradientTypeChrome({
      documentRef,
      gradientType: 'linear'
    });

    const solidColorInput = documentRef.getElementById('wallpaperCustomColor');
    if (solidColorInput) solidColorInput.value = solidColorInput.defaultValue || '#000000';
    const color1Input = documentRef.getElementById('cgColor1');
    if (color1Input) color1Input.value = '#5050e8';
    const color2Input = documentRef.getElementById('cgColor2');
    if (color2Input) color2Input.value = '#050505';
    const angleInput = documentRef.getElementById('cgAngle');
    if (angleInput) angleInput.value = '135';
    const angleLabel = documentRef.getElementById('cgAngleVal');
    if (angleLabel) angleLabel.textContent = '135°';
    return true;
  }

  function syncStudioWallpaperTabChrome(options = {}) {
    const documentRef = options.documentRef;
    const solidTab = documentRef && documentRef.getElementById('wpTabSolid');
    const presetsTab = documentRef && documentRef.getElementById('wpTabPresets');
    const customTab = documentRef && documentRef.getElementById('wpTabCustom');
    const solidPanel = documentRef && documentRef.getElementById('wpPanelSolid');
    const presetsPanel = documentRef && documentRef.getElementById('wpPanelPresets');
    const customPanel = documentRef && documentRef.getElementById('wpPanelCustom');
    if (!solidTab || !presetsTab || !customTab || !solidPanel || !presetsPanel || !customPanel) {
      return { didApply: false, wallpaperTab: options.wallpaperTab };
    }

    const activeSlide = options.activeSlide;
    const hasGradientBackground = !!resolveStudioActiveSlideGradientBackground(activeSlide);
    const nextTab = options.didSyncCustomGradientControls
      ? 'custom'
      : hasGradientBackground
        ? 'presets'
        : resolveStudioActiveSlideSolidWallpaperColor(activeSlide)
          ? 'solid'
          : '';
    if (!nextTab) {
      return { didApply: false, wallpaperTab: options.wallpaperTab };
    }

    const inactiveTabClass = 'py-1 text-center text-[10px] font-mono rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400';
    const activeTabClass = 'py-1 text-center text-[10px] font-mono rounded bg-white/5 text-[#7028d0] font-semibold border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#7028d0]';
    solidTab.className = nextTab === 'solid' ? activeTabClass : inactiveTabClass;
    presetsTab.className = nextTab === 'presets' ? activeTabClass : inactiveTabClass;
    customTab.className = nextTab === 'custom' ? activeTabClass : inactiveTabClass;
    if (nextTab === 'solid') {
      solidPanel.classList.remove('hidden');
      presetsPanel.classList.add('hidden');
      customPanel.classList.add('hidden');
    } else if (nextTab === 'presets') {
      solidPanel.classList.add('hidden');
      presetsPanel.classList.remove('hidden');
      customPanel.classList.add('hidden');
    } else {
      solidPanel.classList.add('hidden');
      presetsPanel.classList.add('hidden');
      customPanel.classList.remove('hidden');
    }
    return { didApply: true, wallpaperTab: nextTab };
  }

  function syncStudioCustomGradientTypeChrome(options = {}) {
    const documentRef = options.documentRef;
    const linearBtn = documentRef && documentRef.getElementById('cgLinearBtn');
    const radialBtn = documentRef && documentRef.getElementById('cgRadialBtn');
    const angleGroup = documentRef && documentRef.getElementById('cgAngleGroup');
    if (!linearBtn || !radialBtn || !angleGroup) return false;

    const type = options.gradientType;
    const activeButtonClass = 'py-1 text-center text-xs font-mono rounded bg-white/5 text-[#7028d0] font-semibold border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#7028d0]';
    const inactiveButtonClass = 'py-1 text-center text-xs font-mono rounded text-zinc-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-zinc-400';
    if (type === 'linear') {
      linearBtn.className = activeButtonClass;
      radialBtn.className = inactiveButtonClass;
      angleGroup.classList.remove('hidden');
    } else {
      radialBtn.className = activeButtonClass;
      linearBtn.className = inactiveButtonClass;
      angleGroup.classList.add('hidden');
    }
    return true;
  }

  function syncStudioCustomGradientAngleChrome(options = {}) {
    const documentRef = options.documentRef;
    const angleLabel = documentRef && documentRef.getElementById('cgAngleVal');
    if (!angleLabel) return false;
    angleLabel.textContent = `${options.angle}°`;
    return true;
  }

  function syncStudioCustomGradientControls(options = {}) {
    const documentRef = options.documentRef;
    const color1Input = documentRef && documentRef.getElementById('cgColor1');
    const color2Input = documentRef && documentRef.getElementById('cgColor2');
    const angleInput = documentRef && documentRef.getElementById('cgAngle');
    const angleLabel = documentRef && documentRef.getElementById('cgAngleVal');
    const activeSlide = options.activeSlide;
    if (!color1Input || !color2Input || !angleInput || !angleLabel || !activeSlide || !activeSlide.style) {
      return { didApply: false, gradientType: '' };
    }

    const gradientControls = resolveStudioActiveSlideGradientControls(activeSlide, options);
    if (!gradientControls || !syncStudioCustomGradientTypeChrome({
      documentRef,
      gradientType: gradientControls.gradientType
    })) {
      return { didApply: false, gradientType: '' };
    }
    color1Input.value = gradientControls.color1Value;
    color2Input.value = gradientControls.color2Value;
    if (gradientControls.gradientType === 'linear') {
      angleInput.value = gradientControls.angleValue;
      angleLabel.textContent = `${gradientControls.angleValue}°`;
    }
    return {
      didApply: true,
      gradientType: gradientControls.gradientType
    };
  }

  function resolveStudioActiveSlideGradientControls(activeSlide, options = {}) {
    const background = resolveStudioActiveSlideGradientBackground(activeSlide);
    if (!background) return null;

    const linearGradientMatch = background.match(/^linear-gradient\((.*)\)$/i);
    const radialGradientMatch = linearGradientMatch
      ? null
      : background.match(/^radial-gradient\((.*)\)$/i);
    const linearGradientSegments = linearGradientMatch
      ? splitStudioGradientSegments(linearGradientMatch[1])
      : [];
    const radialGradientSegments = radialGradientMatch
      ? splitStudioGradientSegments(radialGradientMatch[1])
      : [];
    const linearGradientAngleMatch = linearGradientSegments.length === 3
      ? linearGradientSegments[0].match(/^(-?\d+(?:\.\d+)?)deg$/i)
      : null;
    const gradientType = linearGradientAngleMatch
      ? 'linear'
      : radialGradientSegments.length === 3 && /^circle$/i.test(radialGradientSegments[0])
        ? 'radial'
        : '';
    const color1Value = normalizeStudioWallpaperColor(
      gradientType === 'linear'
        ? extractStudioGradientStopColor(linearGradientSegments[1])
        : gradientType === 'radial'
          ? extractStudioGradientStopColor(radialGradientSegments[1])
          : '',
      options
    );
    const color2Value = normalizeStudioWallpaperColor(
      gradientType === 'linear'
        ? extractStudioGradientStopColor(linearGradientSegments[2])
        : gradientType === 'radial'
          ? extractStudioGradientStopColor(radialGradientSegments[2])
          : '',
      options
    );
    if (!gradientType || !color1Value || !color2Value) return null;

    return {
      gradientType,
      color1Value,
      color2Value,
      angleValue: gradientType === 'linear' ? `${parseFloat(linearGradientAngleMatch[1])}` : ''
    };
  }

  return {
    normalizeStudioWallpaperColor,
    splitStudioGradientSegments,
    extractStudioGradientStopColor,
    resolveStudioActiveSlideBackgroundPaint,
    resolveStudioActiveSlideSolidWallpaperColor,
    renderStudioWallpaperPresets,
    applyStudioWallpaperToSlides,
    setStudioWallpaperTab,
    bindStudioWallpaperTabControls,
    bindStudioCustomGradientTypeControls,
    resetStudioWallpaperUiState,
    resolveStudioActiveSlideGradientBackground,
    syncStudioSolidWallpaperControl,
    syncStudioWallpaperTabChrome,
    syncStudioCustomGradientTypeChrome,
    syncStudioCustomGradientAngleChrome,
    syncStudioCustomGradientControls,
    resolveStudioActiveSlideGradientControls
  };
});
