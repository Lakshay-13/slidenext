(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioPdfExport = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const DEFAULT_PAGE_WIDTH = '16in';
  const DEFAULT_PAGE_HEIGHT = '9in';
  const DEFAULT_LOAD_TIMEOUT_MS = 10000;

  function normalizeDimension(value, fallback) {
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    const match = normalizedValue.match(/^(\d+(?:\.\d+)?)(?:in|cm|mm|px|pt)$/);
    if (!match || !(Number(match[1]) > 0)) {
      return fallback;
    }
    return normalizedValue;
  }

  function resolveStudioPdfPageDimensions(canonicalDeck) {
    const layout = canonicalDeck && typeof canonicalDeck === 'object'
      ? canonicalDeck.layout
      : null;
    const size = layout && typeof layout === 'object' ? layout.size : null;
    const width = size && Number.isFinite(size.width) ? size.width : null;
    const height = size && Number.isFinite(size.height) ? size.height : null;
    const unit = size && typeof size.unit === 'string' ? size.unit.trim() : '';
    if (!(width > 0) || !(height > 0) || !/^(?:in|cm|mm|px|pt)$/.test(unit)) {
      return {};
    }
    return {
      pageWidth: `${width}${unit}`,
      pageHeight: `${height}${unit}`
    };
  }

  function buildStudioPdfPrintStyles(options = {}) {
    const pageWidth = normalizeDimension(options.pageWidth, DEFAULT_PAGE_WIDTH);
    const pageHeight = normalizeDimension(options.pageHeight, DEFAULT_PAGE_HEIGHT);
    const slideSelector = typeof options.slideSelector === 'string' && options.slideSelector.trim()
      ? options.slideSelector.trim()
      : '.slide';

    return `
@page {
  size: ${pageWidth} ${pageHeight};
  margin: 0;
}

@media print {
  html,
  body {
    width: auto !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .presentation-viewport {
    width: auto !important;
    height: auto !important;
    overflow: visible !important;
  }

  .slides-container,
  .slides-wrapper {
    display: block !important;
    width: auto !important;
    height: auto !important;
    position: static !important;
    transform: none !important;
    transition: none !important;
  }

  ${slideSelector} {
    display: flex !important;
    width: ${pageWidth} !important;
    height: ${pageHeight} !important;
    position: relative !important;
    min-height: 0 !important;
    max-height: ${pageHeight} !important;
    margin: 0 !important;
    flex: none !important;
    break-after: page;
    page-break-after: always;
    break-inside: avoid;
    page-break-inside: avoid;
    overflow: hidden !important;
  }

  ${slideSelector}:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  #prevBtn,
  #nextBtn,
  #progressLine,
  #slideNum,
  #indicatorDots {
    display: none !important;
  }
}
`.trim();
  }

  function buildStudioPdfPrintHtml(html, options = {}) {
    if (typeof html !== 'string' || !html.trim()) {
      return '';
    }

    const styleTag = `<style data-slidenext-pdf-print="true">\n${buildStudioPdfPrintStyles(options)}\n</style>`;
    if (/<\/head\s*>/i.test(html)) {
      return html.replace(/<\/head\s*>/i, `${styleTag}</head>`);
    }
    if (/<head(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(/<head(?:\s[^>]*)?>/i, `$&${styleTag}`);
    }
    if (/<html(?:\s[^>]*)?>/i.test(html)) {
      return html.replace(/<html(?:\s[^>]*)?>/i, `$&<head>${styleTag}</head>`);
    }
    return `${styleTag}${html}`;
  }

  function validateStudioPdfSlideCount(documentRef, options = {}) {
    const expectedSlideCount = Number.isInteger(options.slideCount)
      ? options.slideCount
      : null;
    if (
      expectedSlideCount === null
      || !documentRef
      || typeof documentRef.querySelectorAll !== 'function'
    ) {
      return null;
    }

    const slideSelector = typeof options.slideSelector === 'string' && options.slideSelector.trim()
      ? options.slideSelector.trim()
      : '.slide';
    let actualSlideCount = 0;
    try {
      const slides = documentRef.querySelectorAll(slideSelector);
      actualSlideCount = slides && typeof slides.length === 'number' ? slides.length : 0;
    } catch (error) {
      return new Error('PDF slide selector could not be evaluated: ' + error.message);
    }
    if (actualSlideCount !== expectedSlideCount) {
      return new Error(
        'PDF slide count mismatch: expected ' + expectedSlideCount + ', found ' + actualSlideCount
      );
    }
    return null;
  }

  function waitForStudioPdfPrintResources(documentRef, options = {}) {
    if (!documentRef) return Promise.resolve();

    const timeoutMs = Number.isFinite(options.timeoutMs)
      ? Math.max(0, options.timeoutMs)
      : 5000;
    const waitWithTimeout = (resource, resourceName = 'resource') => new Promise((resolve, reject) => {
      let settled = false;
      const settle = (error = null) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const timeoutId = setTimeout(
        () => settle(new Error(`PDF ${resourceName} resource load timed out`)),
        timeoutMs
      );
      Promise.resolve(resource).then(() => settle(), settle);
    });
    const waitForImage = (image, source = null) => {
      if (!image || typeof image.addEventListener !== 'function') {
        return null;
      }
      const hasImageSource = source !== null
        ? !!source
        : !!(image.currentSrc || image.src);
      const isBrokenCompleteImage = () => (
        image.complete
        && hasImageSource
        && Number.isFinite(image.naturalWidth)
        && image.naturalWidth === 0
      );
      if (source === null && image.complete) {
        return isBrokenCompleteImage()
          ? Promise.reject(new Error('PDF image resource failed to load'))
          : null;
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (error = null) => {
          if (settled) return;
          settled = true;
          if (timeoutId) clearTimeout(timeoutId);
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        };
        const fail = () => settle(new Error('PDF image resource failed to load'));
        const timeoutId = setTimeout(
          () => settle(new Error('PDF image resource load timed out')),
          timeoutMs
        );
        image.addEventListener('load', () => settle(), { once: true });
        image.addEventListener('error', fail, { once: true });
        if (source !== null) {
          try {
            image.src = source;
            if (image.complete) {
              if (isBrokenCompleteImage()) fail();
              else settle();
            }
          } catch (error) {
            settle(error);
          }
        }
      });
    };

    const waits = [];
    const fontsReady = documentRef.fonts && documentRef.fonts.ready;
    if (fontsReady && typeof fontsReady.then === 'function') {
      waits.push(waitWithTimeout(fontsReady, 'font'));
    }

    const images = documentRef.images && typeof documentRef.images.length === 'number'
      ? Array.from(documentRef.images)
      : [];
    images.forEach((image) => {
      const wait = waitForImage(image);
      if (wait) waits.push(wait);
    });

    const getComputedStyle = documentRef.defaultView
      && typeof documentRef.defaultView.getComputedStyle === 'function'
      ? documentRef.defaultView.getComputedStyle.bind(documentRef.defaultView)
      : root && typeof root.getComputedStyle === 'function'
        ? root.getComputedStyle.bind(root)
        : null;
    let elements = [];
    if (typeof documentRef.querySelectorAll === 'function') {
      try {
        elements = Array.from(documentRef.querySelectorAll('*') || []);
      } catch (error) {
        elements = [];
      }
    }
    const backgroundImageUrls = new Set();
    elements.forEach((element) => {
      let style = element && element.style;
      if (getComputedStyle) {
        try {
          style = getComputedStyle(element);
        } catch (error) {
          style = element && element.style;
        }
      }
      const backgroundImage = style && typeof style.backgroundImage === 'string'
        ? style.backgroundImage
        : '';
      const urlPattern = /url\((?:'([^']*)'|"([^"]*)"|([^)]*))\)/gi;
      let match = urlPattern.exec(backgroundImage);
      while (match) {
        const url = (match[1] || match[2] || match[3] || '').trim();
        if (url && !/^(?:data:|blob:|#)/i.test(url)) {
          backgroundImageUrls.add(url);
        }
        match = urlPattern.exec(backgroundImage);
      }
    });
    const createPreloadImage = typeof documentRef.createElement === 'function'
      ? () => {
          try {
            return documentRef.createElement('img');
          } catch (error) {
            return null;
          }
        }
      : root && typeof root.Image === 'function'
        ? () => new root.Image()
        : null;
    if (createPreloadImage) {
      backgroundImageUrls.forEach((url) => {
        const wait = waitForImage(createPreloadImage(), url);
        if (wait) waits.push(wait);
      });
    }

    return Promise.all(waits);
  }

  function openStudioPdfPrintWindow(options = {}) {
    const openWindow = typeof options.openWindow === 'function'
      ? options.openWindow
      : root && typeof root.open === 'function'
        ? root.open.bind(root)
        : null;
    if (Number.isInteger(options.slideCount) && options.slideCount <= 0) {
      return false;
    }
    const html = buildStudioPdfPrintHtml(options.html, options);
    if (!openWindow || !html) {
      return false;
    }

    const printWindow = openWindow('', '_blank', 'noopener,noreferrer');
    if (!printWindow || !printWindow.document) {
      return false;
    }

    let didPrint = false;
    let didLoad = false;
    let loadTimeoutId = null;
    const clearLoadTimeout = () => {
      if (loadTimeoutId) {
        clearTimeout(loadTimeoutId);
        loadTimeoutId = null;
      }
    };
    const closePrintWindow = () => {
      if (typeof printWindow.close === 'function') {
        printWindow.close();
      }
    };
    const reportPrintSuccess = () => {
      if (typeof options.onPrint === 'function') {
        options.onPrint();
      }
    };
    const reportPrintFailure = (error) => {
      clearLoadTimeout();
      closePrintWindow();
      if (typeof options.onError === 'function') {
        options.onError(error);
      }
    };
    const print = () => {
      if (didPrint) return;
      didPrint = true;
      if (typeof printWindow.print !== 'function') {
        reportPrintFailure(new Error('Print dialog is unavailable'));
        return;
      }
      if (typeof printWindow.focus === 'function') {
        printWindow.focus();
      }
      try {
        printWindow.print();
        reportPrintSuccess();
      } catch (error) {
        reportPrintFailure(error);
      }
    };
    const waitForResources = () => {
      waitForStudioPdfPrintResources(printWindow.document, options)
        .then(print)
        .catch(reportPrintFailure);
    };
    const handleLoad = () => {
      if (didLoad) return;
      didLoad = true;
      clearLoadTimeout();
      const slideCountError = validateStudioPdfSlideCount(printWindow.document, options);
      if (slideCountError) {
        reportPrintFailure(slideCountError);
        return;
      }
      waitForResources();
    };

    if (typeof printWindow.addEventListener === 'function') {
      printWindow.addEventListener('load', handleLoad, { once: true });
      const loadTimeoutMs = Number.isFinite(options.loadTimeoutMs)
        ? Math.max(0, options.loadTimeoutMs)
        : DEFAULT_LOAD_TIMEOUT_MS;
      loadTimeoutId = setTimeout(() => {
        if (didLoad || didPrint) return;
        didLoad = true;
        reportPrintFailure(new Error('Print window load timed out'));
      }, loadTimeoutMs);
    }

    try {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      clearLoadTimeout();
      reportPrintFailure(error);
      return false;
    }

    if (typeof printWindow.addEventListener !== 'function') {
      waitForResources();
    }
    return true;
  }

  return {
    DEFAULT_PAGE_WIDTH,
    DEFAULT_PAGE_HEIGHT,
    DEFAULT_LOAD_TIMEOUT_MS,
    normalizeDimension,
    resolveStudioPdfPageDimensions,
    buildStudioPdfPrintStyles,
    buildStudioPdfPrintHtml,
    validateStudioPdfSlideCount,
    waitForStudioPdfPrintResources,
    openStudioPdfPrintWindow
  };
});
