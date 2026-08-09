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
  const DEFAULT_AFTER_PRINT_TIMEOUT_MS = 2000;

  function hasStudioPdfTimerHandle(timerId) {
    return timerId !== null && typeof timerId !== 'undefined';
  }

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
  #indicatorDots,
  #prev-btn,
  #next-btn,
  nav {
    display: none !important;
  }
}
`.trim();
  }

  function escapeStudioPdfAttribute(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function buildStudioPdfPrintHtml(html, options = {}) {
    if (typeof html !== 'string' || !html.trim()) {
      return '';
    }

    const baseHref = typeof options.baseHref === 'string' ? options.baseHref.trim() : '';
    const baseTag = baseHref && !/[\u0000-\u001f\u007f]/.test(baseHref)
      ? `<base href="${escapeStudioPdfAttribute(baseHref)}">`
      : '';
    const styleTag = `<style data-slidenext-pdf-print="true">\n${buildStudioPdfPrintStyles(options)}\n</style>`;
    let printHtml = html;
    if (baseTag && /<base\b[^>]*>/i.test(printHtml)) {
      printHtml = printHtml.replace(/<base\b[^>]*>/i, baseTag);
    }
    const baseTagForInsertion = baseTag && !/<base\b[^>]*>/i.test(printHtml)
      ? baseTag
      : '';
    if (/<\/head\s*>/i.test(printHtml)) {
      return printHtml.replace(/<\/head\s*>/i, `${baseTagForInsertion}${styleTag}</head>`);
    }
    if (/<head(?:\s[^>]*)?>/i.test(printHtml)) {
      return printHtml.replace(/<head(?:\s[^>]*)?>/i, `$&${baseTagForInsertion}${styleTag}`);
    }
    if (/<html(?:\s[^>]*)?>/i.test(printHtml)) {
      return printHtml.replace(/<html(?:\s[^>]*)?>/i, `$&<head>${baseTagForInsertion}${styleTag}</head>`);
    }
    return `${baseTagForInsertion}${styleTag}${printHtml}`;
  }

  function validateStudioPdfSlideCount(documentRef, options = {}) {
    const expectedSlideCount = Number.isInteger(options.slideCount)
      ? options.slideCount
      : null;
    if (expectedSlideCount === null) {
      return null;
    }
    if (!documentRef) return new Error('PDF print document is unavailable');
    if (typeof documentRef.querySelectorAll !== 'function') {
      return new Error('PDF slide selector could not be evaluated: querySelectorAll is unavailable');
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
    const reportProgress = (completed, total) => {
      if (typeof options.onProgress !== 'function') return;
      const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
      try {
        options.onProgress({
          phase: 'resources',
          completed,
          total,
          percent
        });
      } catch (error) {
        // Progress reporting must not interrupt an otherwise valid export.
      }
    };
    if (!documentRef) {
      reportProgress(0, 0);
      return Promise.resolve();
    }

    const timeoutMs = Number.isFinite(options.timeoutMs)
      ? Math.max(0, options.timeoutMs)
      : 5000;
    const waitWithTimeout = (resource, resourceName = 'resource') => new Promise((resolve, reject) => {
      let settled = false;
      const settle = (error = null) => {
        if (settled) return;
        settled = true;
        if (hasStudioPdfTimerHandle(timeoutId)) clearTimeout(timeoutId);
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
          if (hasStudioPdfTimerHandle(timeoutId)) clearTimeout(timeoutId);
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

    const stylesheetLinks = typeof documentRef.querySelectorAll === 'function'
      ? Array.from(documentRef.querySelectorAll('link[rel~="stylesheet"]') || [])
      : [];
    stylesheetLinks.forEach((link) => {
      if (!link || typeof link.addEventListener !== 'function') return;
      let hasLoadedStylesheet = false;
      try {
        hasLoadedStylesheet = !!link.sheet;
      } catch (error) {
        hasLoadedStylesheet = false;
      }
      if (hasLoadedStylesheet) return;

      waits.push(new Promise((resolve, reject) => {
        let settled = false;
        const settle = (error = null) => {
          if (settled) return;
          settled = true;
          if (hasStudioPdfTimerHandle(timeoutId)) clearTimeout(timeoutId);
          if (error) reject(error);
          else resolve();
        };
        const timeoutId = setTimeout(
          () => settle(new Error('PDF stylesheet resource load timed out')),
          timeoutMs
        );
        link.addEventListener('load', () => settle(), { once: true });
        link.addEventListener(
          'error',
          () => settle(new Error('PDF stylesheet resource failed to load')),
          { once: true }
        );
      }));
    });

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

    const total = waits.length;
    let completed = 0;
    let didFail = false;
    reportProgress(0, total);
    if (total === 0) return Promise.resolve();

    return Promise.all(waits.map((wait) => Promise.resolve(wait).then(
      (value) => {
        if (!didFail) {
          completed += 1;
          reportProgress(completed, total);
        }
        return value;
      },
      (error) => {
        didFail = true;
        throw error;
      }
    )));
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

    // The print flow needs the WindowProxy so it can write the prepared deck and call print().
    let printWindow = null;
    try {
      printWindow = openWindow('', '_blank');
    } catch (error) {
      return false;
    }
    if (!printWindow || !printWindow.document) {
      return false;
    }
    try {
      printWindow.opener = null;
    } catch (error) {
      // Some test doubles and restricted window proxies do not expose opener.
    }

    let didPrint = false;
    let didReportPrintSuccess = false;
    let didLoad = false;
    let loadTimeoutId = null;
    let fallbackLoadTimeoutId = null;
    let afterPrintTimeoutId = null;
    const clearLoadTimeout = () => {
      if (hasStudioPdfTimerHandle(loadTimeoutId)) {
        clearTimeout(loadTimeoutId);
        loadTimeoutId = null;
      }
      if (hasStudioPdfTimerHandle(fallbackLoadTimeoutId)) {
        clearTimeout(fallbackLoadTimeoutId);
        fallbackLoadTimeoutId = null;
      }
    };
    const clearAfterPrintTimeout = () => {
      if (hasStudioPdfTimerHandle(afterPrintTimeoutId)) {
        clearTimeout(afterPrintTimeoutId);
        afterPrintTimeoutId = null;
      }
    };
    const closePrintWindow = () => {
      if (typeof printWindow.close === 'function') {
        printWindow.close();
      }
    };
    const reportPrintSuccess = () => {
      if (didReportPrintSuccess) return;
      didReportPrintSuccess = true;
      clearAfterPrintTimeout();
      if (typeof options.onPrint === 'function') {
        options.onPrint();
      }
    };
    const handleAfterPrint = () => {
      if (didReportPrintSuccess) return;
      reportPrintSuccess();
      closePrintWindow();
    };
    const reportPrintFailure = (error) => {
      clearLoadTimeout();
      clearAfterPrintTimeout();
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
        if (typeof printWindow.addEventListener === 'function') {
          printWindow.addEventListener('afterprint', handleAfterPrint, { once: true });
        }
        printWindow.print();
        if (typeof printWindow.addEventListener === 'function') {
          if (!didReportPrintSuccess) {
            const afterPrintTimeoutMs = Number.isFinite(options.afterPrintTimeoutMs)
              ? Math.max(0, options.afterPrintTimeoutMs)
              : DEFAULT_AFTER_PRINT_TIMEOUT_MS;
            // Some embedded browsers never dispatch afterprint after print().
            afterPrintTimeoutId = setTimeout(handleAfterPrint, afterPrintTimeoutMs);
          }
        } else {
          reportPrintSuccess();
        }
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
      const fallbackLoadTimeoutMs = Number.isFinite(options.fallbackLoadTimeoutMs)
        ? Math.max(0, options.fallbackLoadTimeoutMs)
        : 250;
      fallbackLoadTimeoutId = setTimeout(() => {
        if (didLoad || didPrint) return;
        handleLoad();
      }, fallbackLoadTimeoutMs);
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

    if (
      typeof printWindow.addEventListener === 'function'
      && printWindow.document.readyState === 'complete'
    ) {
      handleLoad();
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
    DEFAULT_AFTER_PRINT_TIMEOUT_MS,
    normalizeDimension,
    resolveStudioPdfPageDimensions,
    buildStudioPdfPrintStyles,
    escapeStudioPdfAttribute,
    buildStudioPdfPrintHtml,
    validateStudioPdfSlideCount,
    waitForStudioPdfPrintResources,
    openStudioPdfPrintWindow
  };
});
