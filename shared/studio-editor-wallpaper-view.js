(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorWallpaperView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function readInlineStyleValue(element, property) {
    return element && element.style && typeof element.style[property] === 'string'
      ? element.style[property].trim()
      : '';
  }

  function rgbToHex(value, converter = null) {
    if (typeof converter === 'function') return converter(value);
    if (!value) return '#ffffff';
    if (value.startsWith('#')) return value;
    const rgbValues = value.match(/\d+/g);
    if (!rgbValues) return '#ffffff';
    const red = parseInt(rgbValues[0], 10);
    const green = parseInt(rgbValues[1], 10);
    const blue = parseInt(rgbValues[2], 10);
    return `#${((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1)}`;
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
    const backgroundImage = readInlineStyleValue(activeSlide, 'backgroundImage');
    if (backgroundImage && backgroundImage !== 'none') return '';

    const backgroundColor = readInlineStyleValue(activeSlide, 'backgroundColor');
    const background = readInlineStyleValue(activeSlide, 'background');
    const fallbackColorMatch = background && !/gradient\(/i.test(background)
      ? background.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/)
      : null;
    return backgroundColor || (fallbackColorMatch ? fallbackColorMatch[0] : '');
  }

  function resolveStudioActiveSlideGradientBackground(activeSlide) {
    const background = readInlineStyleValue(activeSlide, 'background');
    if (background && /gradient\(/i.test(background)) return background;

    const backgroundImage = readInlineStyleValue(activeSlide, 'backgroundImage');
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
    resolveStudioActiveSlideSolidWallpaperColor,
    resolveStudioActiveSlideGradientBackground,
    syncStudioSolidWallpaperControl,
    resolveStudioActiveSlideGradientControls
  };
});
