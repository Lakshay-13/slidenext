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
  const PDF_WARNING_DETAILS_LIMIT = 3;
  const PDF_WARNING_TEXT_LIMIT = 180;

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

  function normalizeSlideSelector(value, fallback = '.slide') {
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    if (!normalizedValue || /[\u0000-\u001f\u007f<>{};]/.test(normalizedValue)) {
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

  function getStudioPdfCanvasSize(canonicalDeck) {
    const size = canonicalDeck
      && canonicalDeck.layout
      && canonicalDeck.layout.size
      && typeof canonicalDeck.layout.size === 'object'
      ? canonicalDeck.layout.size
      : null;
    const width = size && Number.isFinite(size.width) ? size.width : null;
    const height = size && Number.isFinite(size.height) ? size.height : null;
    return width > 0 && height > 0 ? { width, height } : null;
  }

  function getStudioPdfPositionedNodeBounds(node, origin = { x: 0, y: 0 }) {
    const layout = node && node.layout && typeof node.layout === 'object'
      ? node.layout
      : null;
    if (!layout || !['absolute', 'fixed', 'freeform'].includes(layout.mode)) return null;
    const x = Number.isFinite(layout.x) ? layout.x : null;
    const y = Number.isFinite(layout.y) ? layout.y : null;
    const width = Number.isFinite(layout.width) ? layout.width : null;
    const height = Number.isFinite(layout.height) ? layout.height : null;
    if (x === null || y === null || !(width > 0) || !(height > 0)) return null;
    return {
      x: origin.x + x,
      y: origin.y + y,
      width,
      height
    };
  }

  function getStudioPdfNodeBounds(node, origin = { x: 0, y: 0 }) {
    const positionedBounds = getStudioPdfPositionedNodeBounds(node, origin);
    if (positionedBounds) return positionedBounds;

    const layout = node && node.layout && typeof node.layout === 'object'
      ? node.layout
      : null;
    const measuredBounds = layout && layout.bounds && typeof layout.bounds === 'object'
      ? layout.bounds
      : null;
    if (!measuredBounds) return null;
    const x = Number.isFinite(measuredBounds.x) ? measuredBounds.x : null;
    const y = Number.isFinite(measuredBounds.y) ? measuredBounds.y : null;
    const width = Number.isFinite(measuredBounds.width) ? measuredBounds.width : null;
    const height = Number.isFinite(measuredBounds.height) ? measuredBounds.height : null;
    if (x === null || y === null || !(width > 0) || !(height > 0)) return null;
    return {
      x: origin.x + x,
      y: origin.y + y,
      width,
      height
    };
  }

  function extractStudioPdfUrlSources(value) {
    if (typeof value !== 'string' || !value.includes('url(')) return [];
    const sources = [];
    const urlPattern = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^)]*))\s*\)/gi;
    let match;
    while ((match = urlPattern.exec(value))) {
      const source = (match[1] || match[2] || match[3] || '').trim();
      if (source && !source.startsWith('#') && !sources.includes(source)) {
        sources.push(source);
      }
    }
    return sources;
  }

  function extractStudioPdfSrcsetSources(value) {
    if (typeof value !== 'string' || !value.trim()) return [];
    return value
      .split(',')
      .map((candidate) => candidate.trim().split(/\s+/)[0] || '')
      .filter((source) => source && !source.startsWith('#'))
      .filter((source, index, sources) => sources.indexOf(source) === index);
  }

  function readStudioPdfOpeningTagAttribute(html, attributeName) {
    if (typeof html !== 'string' || !html.trim() || !attributeName) return '';
    const openingTag = html.match(/^<[a-z][^>]*>/i);
    if (!openingTag) return '';
    const attributePattern = new RegExp(
      `\\s${attributeName}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
      'i'
    );
    const match = attributePattern.exec(openingTag[0]);
    return match ? (match[1] || match[2] || match[3] || '').trim() : '';
  }

  function getStudioPdfNodeDirectImageSources(node, attributes) {
    const nodeType = typeof node.type === 'string' ? node.type.toLowerCase() : '';
    const nodeTagName = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : '';
    if (nodeType !== 'image' && nodeTagName !== 'img') return [];
    const directSources = [
      attributes.src,
      node.src,
      readStudioPdfOpeningTagAttribute(node.html, 'src')
    ];
    const srcsetSources = [
      attributes.srcset,
      node.srcset,
      readStudioPdfOpeningTagAttribute(node.html, 'srcset')
    ].flatMap((srcset) => extractStudioPdfSrcsetSources(srcset));
    return directSources.concat(srcsetSources)
      .filter((source) => typeof source === 'string' && source.trim())
      .map((source) => source.trim())
      .filter((source, index, sources) => sources.indexOf(source) === index);
  }

  function getStudioPdfNodeStyleText(node, attributes) {
    const attributeStyle = typeof attributes.style === 'string' ? attributes.style.trim() : '';
    if (attributeStyle) return attributeStyle;
    const nodeStyle = typeof node.style === 'string' ? node.style.trim() : '';
    if (nodeStyle) return nodeStyle;
    return readStudioPdfOpeningTagAttribute(node.html, 'style');
  }

  function hasStudioPdfBackgroundProperty(styleText) {
    return typeof styleText === 'string'
      && /(?:^|;)\s*background(?:-[a-z-]+)?\s*:/i.test(styleText);
  }

  function getStudioPdfSlideBackgroundSources(slide, background) {
    const sourceAttributes = slide.source && typeof slide.source.attributes === 'object'
      ? slide.source.attributes
      : {};
    const sourceStyle = typeof sourceAttributes.style === 'string'
      ? sourceAttributes.style.trim()
      : '';
    if (hasStudioPdfBackgroundProperty(sourceStyle)) {
      return extractStudioPdfUrlSources(sourceStyle);
    }

    const backgroundStyle = typeof background.style === 'string' ? background.style.trim() : '';
    if (hasStudioPdfBackgroundProperty(backgroundStyle)) {
      return extractStudioPdfUrlSources(backgroundStyle);
    }
    return extractStudioPdfUrlSources(background.image);
  }

  function preflightStudioPdfExport(canonicalDeck, options = {}) {
    const slides = canonicalDeck && Array.isArray(canonicalDeck.slides)
      ? canonicalDeck.slides
      : [];
    const assets = canonicalDeck && Array.isArray(canonicalDeck.assets)
      ? canonicalDeck.assets
      : [];
    const assetById = new Map(
      assets
        .filter((asset) => asset && typeof asset.id === 'string' && asset.id.trim())
        .map((asset) => [asset.id.trim(), asset])
    );
    const missingAssets = [];
    const overflowNodes = [];
    const canvasSize = getStudioPdfCanvasSize(canonicalDeck);
    const seenReferences = new Set();
    const assetExists = typeof options.assetExists === 'function'
      ? options.assetExists
      : null;

    const addAssetReference = (assetId, owner = {}) => {
      const normalizedAssetId = typeof assetId === 'string' ? assetId.trim() : '';
      if (!normalizedAssetId) return;
      const ownerType = owner.type || 'node';
      const ownerId = owner.id || 'unknown';
      const referenceKey = `${ownerType}:${ownerId}:${normalizedAssetId}`;
      if (seenReferences.has(referenceKey)) return;
      seenReferences.add(referenceKey);

      const asset = assetById.get(normalizedAssetId);
      if (!asset || typeof asset.src !== 'string' || !asset.src.trim()) {
        missingAssets.push({
          id: normalizedAssetId,
          ownerType,
          ownerId
        });
        return;
      }

      if (assetExists) {
        let isAvailable = false;
        try {
          isAvailable = Boolean(assetExists(asset.src.trim(), asset, owner, canonicalDeck));
        } catch (error) {
          isAvailable = false;
        }
        if (!isAvailable) {
          missingAssets.push({
            id: normalizedAssetId,
            ownerType,
            ownerId,
            reason: 'unavailable-source'
          });
        }
      }
    };

    const addDirectSourceReference = (source, owner = {}) => {
      const normalizedSource = typeof source === 'string' ? source.trim() : '';
      if (!normalizedSource || !assetExists) return;
      const ownerType = owner.type || 'node';
      const ownerId = owner.id || 'unknown';
      const referenceKey = `${ownerType}:${ownerId}:source:${normalizedSource}`;
      if (seenReferences.has(referenceKey)) return;
      seenReferences.add(referenceKey);

      let isAvailable = false;
      try {
        isAvailable = Boolean(assetExists(
          normalizedSource,
          { id: normalizedSource, src: normalizedSource, type: 'image' },
          owner,
          canonicalDeck
        ));
      } catch (error) {
        isAvailable = false;
      }
      if (!isAvailable) {
        missingAssets.push({
          id: normalizedSource,
          ownerType,
          ownerId,
          reason: 'unavailable-source'
        });
      }
    };

    const visitNode = (node, slideId, origin = { x: 0, y: 0 }) => {
      if (!node || typeof node !== 'object') return;
      const nodeId = typeof node.id === 'string' && node.id.trim() ? node.id.trim() : 'unknown';
      const bounds = getStudioPdfNodeBounds(node, origin);
      if (canvasSize && bounds
        && (bounds.x < 0
          || bounds.y < 0
          || bounds.x + bounds.width > canvasSize.width
          || bounds.y + bounds.height > canvasSize.height)) {
        overflowNodes.push({
          id: nodeId,
          slideId,
          ...bounds
        });
      }
      addAssetReference(node.assetId, { type: 'node', id: nodeId });
      addAssetReference(node.backgroundAssetId, { type: 'node-background', id: nodeId });
      const attributes = node.attributes && typeof node.attributes === 'object'
        ? node.attributes
        : {};
      addAssetReference(attributes['data-asset-id'] || attributes['data-asset'], {
        type: 'node',
        id: nodeId
      });
      addAssetReference(
        attributes['data-background-asset-id'] || attributes['data-background-asset'],
        { type: 'node-background', id: nodeId }
      );
      const hasResolvedNodeAsset = typeof node.assetId === 'string'
        && assetById.get(node.assetId.trim())
        && typeof assetById.get(node.assetId.trim()).src === 'string'
        && assetById.get(node.assetId.trim()).src.trim();
      if (!hasResolvedNodeAsset) {
        getStudioPdfNodeDirectImageSources(node, attributes)
          .forEach((source) => addDirectSourceReference(source, { type: 'node', id: nodeId }));
      }
      const hasResolvedNodeBackgroundAsset = typeof node.backgroundAssetId === 'string'
        && assetById.get(node.backgroundAssetId.trim())
        && typeof assetById.get(node.backgroundAssetId.trim()).src === 'string'
        && assetById.get(node.backgroundAssetId.trim()).src.trim();
      if (!hasResolvedNodeBackgroundAsset) {
        extractStudioPdfUrlSources(getStudioPdfNodeStyleText(node, attributes))
          .forEach((source) => addDirectSourceReference(source, { type: 'node-background', id: nodeId }));
      }
      (Array.isArray(node.children) ? node.children : []).forEach((child) => {
        visitNode(child, slideId, bounds || origin);
      });
    };

    slides.forEach((slide, index) => {
      if (!slide || typeof slide !== 'object') return;
      const slideId = typeof slide.id === 'string' && slide.id.trim()
        ? slide.id.trim()
        : `slide-${index + 1}`;
      const background = slide.layout
        && slide.layout.background
        && typeof slide.layout.background === 'object'
        ? slide.layout.background
        : {};
      addAssetReference(background.assetId, { type: 'slide-background', id: slideId });
      getStudioPdfSlideBackgroundSources(slide, background)
        .forEach((source) => addDirectSourceReference(source, { type: 'slide-background', id: slideId }));
      (Array.isArray(slide.nodes) ? slide.nodes : []).forEach((node) => {
        visitNode(node, slideId);
      });
    });

    const warnings = [
      ...missingAssets.map((reference) => {
        const ownerLabel = reference.ownerType === 'slide-background'
          ? `slide ${reference.ownerId}`
          : `${reference.ownerType} ${reference.ownerId}`;
        return reference.reason === 'unavailable-source'
          ? `PDF ${ownerLabel} references unavailable asset "${reference.id}"`
          : `PDF ${ownerLabel} references missing asset "${reference.id}"`;
      }),
      ...overflowNodes.map((node) => (
        `PDF node ${node.id} on slide ${node.slideId} extends beyond the slide canvas`
      ))
    ];

    return {
      canExport: slides.length > 0,
      slideCount: slides.length,
      warnings,
      missingAssets,
      overflowNodes
    };
  }

  function buildStudioPdfPrintStyles(options = {}) {
    const pageWidth = normalizeDimension(options.pageWidth, DEFAULT_PAGE_WIDTH);
    const pageHeight = normalizeDimension(options.pageHeight, DEFAULT_PAGE_HEIGHT);
    const slideSelector = normalizeSlideSelector(options.slideSelector);

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

  ${slideSelector} [style*="translate: none"][style*="rotate: none"][style*="scale: none"][style*="opacity:"] {
    opacity: 1 !important;
    transform: none !important;
    translate: none !important;
    rotate: none !important;
    scale: 1 !important;
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

  function normalizeStudioPdfDownloadFilename(value, fallback = 'slidenext-presentation.pdf') {
    const candidate = typeof value === 'string' && value.trim() ? value.trim() : fallback;
    const sanitized = candidate
      .replace(/^.*[/\\]/, '')
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+$/, 'slidenext-presentation');
    return `${sanitized || 'slidenext-presentation'}.pdf`;
  }

  function readStudioPdfHeader(response, name) {
    return response && response.headers && typeof response.headers.get === 'function'
      ? response.headers.get(name) || ''
      : '';
  }

  function getStudioPdfFilenameFromResponse(response, fallback) {
    const disposition = readStudioPdfHeader(response, 'Content-Disposition');
    const match = disposition.match(/filename\s*=\s*"([^"]+)"/i)
      || disposition.match(/filename\s*=\s*([^;]+)/i);
    return normalizeStudioPdfDownloadFilename(match ? match[1] : fallback);
  }

  function getStudioPdfWarningCount(response) {
    const value = Number.parseInt(
      readStudioPdfHeader(response, 'X-SlideNext-Pdf-Warning-Count'),
      10
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function getStudioPdfWarningDetails(response) {
    const encoded = readStudioPdfHeader(response, 'X-SlideNext-Pdf-Warning-Details');
    if (!encoded) return { warnings: [], warningsTruncated: false };
    try {
      const details = JSON.parse(decodeURIComponent(encoded));
      const warnings = Array.isArray(details && details.warnings)
        ? details.warnings.filter(warning => typeof warning === 'string' && warning.trim())
        : [];
      return {
        warnings,
        warningsTruncated: Boolean(details && details.truncated === true)
      };
    } catch (error) {
      return { warnings: [], warningsTruncated: false };
    }
  }

  function createStudioPdfWarningDetailsHeader(warnings = []) {
    const normalizedWarnings = (Array.isArray(warnings) ? warnings : [])
      .filter(warning => typeof warning === 'string' && warning.trim())
      .map(warning => warning.trim());
    const visibleWarnings = normalizedWarnings
      .slice(0, PDF_WARNING_DETAILS_LIMIT)
      .map(warning => warning.length > PDF_WARNING_TEXT_LIMIT
        ? `${warning.slice(0, PDF_WARNING_TEXT_LIMIT - 3)}...`
        : warning);
    const hasTruncatedWarningText = visibleWarnings.some((warning, index) => (
      warning !== normalizedWarnings[index]
    ));
    return encodeURIComponent(JSON.stringify({
      warnings: visibleWarnings,
      truncated: normalizedWarnings.length > visibleWarnings.length || hasTruncatedWarningText
    }));
  }

  function getStudioPdfResponseFailureFallback(response) {
    const status = Number(response && response.status);
    return Number.isInteger(status) && status >= 400
      ? `PDF export request failed (HTTP ${status})`
      : 'PDF export request failed';
  }

  async function getStudioPdfResponseFailureMessage(response) {
    const fallback = getStudioPdfResponseFailureFallback(response);
    if (!response || typeof response.json !== 'function') return fallback;
    try {
      const payload = await response.json();
      const message = payload && typeof payload.error === 'string' ? payload.error.trim() : '';
      return message || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function reportStudioPdfExportProgress(options, phase, percent) {
    if (!options || typeof options.onProgress !== 'function') return;
    try {
      options.onProgress({ phase, completed: percent === 100 ? 2 : 1, total: 2, percent });
    } catch (error) {
      // Progress reporting must not make an otherwise valid download fail.
    }
  }

  async function exportStudioPdf(options = {}) {
    const fetchImpl = typeof options.fetchImpl === 'function'
      ? options.fetchImpl
      : root && typeof root.fetch === 'function'
        ? root.fetch.bind(root)
        : null;
    const documentRef = options.documentRef || (root && root.document);
    const urlApi = options.urlApi || (root && root.URL);
    if (!fetchImpl || !documentRef || !documentRef.body || !urlApi
      || typeof urlApi.createObjectURL !== 'function'
      || typeof urlApi.revokeObjectURL !== 'function') {
      return { success: false, error: 'PDF browser export dependencies are unavailable' };
    }
    if (!options.canonicalDeck || !Array.isArray(options.canonicalDeck.slides)) {
      return { success: false, error: 'PDF canonical deck is unavailable' };
    }
    if (options.canonicalDeck.slides.length === 0) {
      return { success: false, error: 'PDF canonical deck is empty' };
    }

    const endpoint = typeof options.endpoint === 'string' && options.endpoint.trim()
      ? options.endpoint.trim()
      : '/api/export/pdf';
    try {
      reportStudioPdfExportProgress(options, 'request', 0);
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalDeck: options.canonicalDeck,
          sourcePath: options.sourcePath || '',
          ...(options.filename ? { filename: options.filename } : {})
        })
      });
      if (!response || response.ok !== true || typeof response.blob !== 'function') {
        return {
          success: false,
          error: await getStudioPdfResponseFailureMessage(response),
          response
        };
      }

      reportStudioPdfExportProgress(options, 'response', 50);
      const blob = await response.blob();
      reportStudioPdfExportProgress(options, 'download', 75);
      const downloadUrl = urlApi.createObjectURL(blob);
      let anchor = null;
      try {
        anchor = documentRef.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = getStudioPdfFilenameFromResponse(response, options.filename);
        documentRef.body.appendChild(anchor);
        anchor.click();
      } finally {
        if (anchor && typeof anchor.remove === 'function') anchor.remove();
        urlApi.revokeObjectURL(downloadUrl);
      }
      reportStudioPdfExportProgress(options, 'complete', 100);

      return {
        success: true,
        filename: anchor.download,
        warningCount: getStudioPdfWarningCount(response),
        ...getStudioPdfWarningDetails(response)
      };
    } catch (error) {
      return {
        success: false,
        error: error && typeof error.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'PDF export request failed'
      };
    }
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

    const slideSelector = normalizeSlideSelector(options.slideSelector);
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
    let didReportPrintFailure = false;
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
      if (didReportPrintFailure || didReportPrintSuccess) return;
      didReportPrintFailure = true;
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
        if (typeof options.onPrintStart === 'function') {
          try {
            options.onPrintStart();
          } catch (error) {
            // Status reporting must not interrupt the native print flow.
          }
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
    const canUseFallbackLoad = () => {
      if (printWindow.document.readyState === 'complete') return true;
      if (typeof printWindow.document.querySelectorAll !== 'function') return true;
      if (!Number.isInteger(options.slideCount)) return false;
      try {
        const slides = printWindow.document.querySelectorAll(normalizeSlideSelector(options.slideSelector));
        return !!slides && slides.length === options.slideCount;
      } catch (error) {
        return false;
      }
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
        if (didLoad || didPrint || !canUseFallbackLoad()) return;
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
    normalizeSlideSelector,
    resolveStudioPdfPageDimensions,
    preflightStudioPdfExport,
    buildStudioPdfPrintStyles,
    escapeStudioPdfAttribute,
    buildStudioPdfPrintHtml,
    normalizeStudioPdfDownloadFilename,
    getStudioPdfFilenameFromResponse,
    getStudioPdfWarningCount,
    getStudioPdfWarningDetails,
    createStudioPdfWarningDetailsHeader,
    getStudioPdfResponseFailureMessage,
    exportStudioPdf,
    validateStudioPdfSlideCount,
    waitForStudioPdfPrintResources,
    openStudioPdfPrintWindow
  };
});
