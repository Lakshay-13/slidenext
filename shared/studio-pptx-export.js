(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioPptxExport = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function normalizeDownloadFilename(value, fallback = 'slidenext-presentation.pptx') {
    const candidate = typeof value === 'string' && value.trim() ? value.trim() : fallback;
    const sanitized = candidate
      .replace(/^.*[/\\]/, '')
      .replace(/\.pptx$/i, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/^\.+$/, 'slidenext-presentation');
    return `${sanitized || 'slidenext-presentation'}.pptx`;
  }

  function readHeader(response, name) {
    return response && response.headers && typeof response.headers.get === 'function'
      ? response.headers.get(name) || ''
      : '';
  }

  function getFilenameFromResponse(response, fallback) {
    const disposition = readHeader(response, 'Content-Disposition');
    const match = disposition.match(/filename\s*=\s*"([^"]+)"/i)
      || disposition.match(/filename\s*=\s*([^;]+)/i);
    return normalizeDownloadFilename(match ? match[1] : fallback);
  }

  function getWarningCount(response) {
    const value = Number.parseInt(readHeader(response, 'X-SlideNext-Pptx-Warning-Count'), 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  function getWarningDetails(response) {
    const encoded = readHeader(response, 'X-SlideNext-Pptx-Warning-Details');
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

  function getResponseFailureFallback(response) {
    const status = Number(response && response.status);
    return Number.isInteger(status) && status >= 400
      ? `PPTX export request failed (HTTP ${status})`
      : 'PPTX export request failed';
  }

  async function getResponseFailureMessage(response) {
    const fallback = getResponseFailureFallback(response);
    if (!response || typeof response.json !== 'function') return fallback;
    try {
      const payload = await response.json();
      const message = payload && typeof payload.error === 'string' ? payload.error.trim() : '';
      return message || fallback;
    } catch (error) {
      return fallback;
    }
  }

  async function exportStudioPptx(options = {}) {
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
      return { success: false, error: 'PPTX browser export dependencies are unavailable' };
    }
    if (!options.canonicalDeck || !Array.isArray(options.canonicalDeck.slides)) {
      return { success: false, error: 'PPTX canonical deck is unavailable' };
    }
    if (options.canonicalDeck.slides.length === 0) {
      return { success: false, error: 'PPTX canonical deck is empty' };
    }

    const endpoint = typeof options.endpoint === 'string' && options.endpoint.trim()
      ? options.endpoint.trim()
      : '/api/export/pptx';
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonicalDeck: options.canonicalDeck,
          sourcePath: options.sourcePath || '',
          filename: options.filename || 'slidenext-presentation.pptx'
        })
      });
      if (!response || response.ok !== true || typeof response.blob !== 'function') {
        return {
          success: false,
          error: await getResponseFailureMessage(response),
          response
        };
      }

      const blob = await response.blob();
      const downloadUrl = urlApi.createObjectURL(blob);
      let anchor = null;
      try {
        anchor = documentRef.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = getFilenameFromResponse(response, options.filename);
        documentRef.body.appendChild(anchor);
        anchor.click();
      } finally {
        if (anchor && typeof anchor.remove === 'function') anchor.remove();
        urlApi.revokeObjectURL(downloadUrl);
      }

      return {
        success: true,
        filename: anchor.download,
        warningCount: getWarningCount(response),
        ...getWarningDetails(response)
      };
    } catch (error) {
      return {
        success: false,
        error: error && typeof error.message === 'string' && error.message.trim()
          ? error.message.trim()
          : 'PPTX export request failed'
      };
    }
  }

  return {
    normalizeDownloadFilename,
    getFilenameFromResponse,
    getWarningCount,
    getWarningDetails,
    getResponseFailureMessage,
    exportStudioPptx
  };
});
