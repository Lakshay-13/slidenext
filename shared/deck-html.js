(function (root, factory) {
  const deckRender = typeof module === 'object' && module.exports
    ? require('./deck-render')
    : root && root.SlideNextDeckRender;
  const api = factory(deckRender, root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckHtml = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (deckRender, root) {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function buildPresentationBaseHref(presentationUrl, options = {}) {
    if (!presentationUrl) return '';
    const currentLocationHref = normalizeString(
      options.currentLocationHref,
      root && root.location ? root.location.href : ''
    );

    try {
      return new URL('./', new URL(presentationUrl, currentLocationHref)).href;
    } catch (err) {
      return '';
    }
  }

  function injectBaseHrefIntoHtml(html, baseHref) {
    if (!html || !baseHref) return html;
    const baseTag = `<base href="${baseHref}">`;
    if (/<base\b/i.test(html)) {
      return html.replace(/<base\b[^>]*>/i, baseTag);
    }
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
    }
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${baseTag}</head>`);
  }

  function buildDeckSourceHtml(deckLike, options = {}) {
    const renderDeckHtml = typeof options.renderDeckHtml === 'function'
      ? options.renderDeckHtml
      : deckRender && typeof deckRender.renderCanonicalDeckHtml === 'function'
        ? deckRender.renderCanonicalDeckHtml
        : null;

    if (!renderDeckHtml) return '';
    return renderDeckHtml(deckLike, options.renderOptions || {});
  }

  function buildDeckPreviewHtml(deckLike, presentationUrl, options = {}) {
    const sourceHtml = buildDeckSourceHtml(deckLike, options);
    const baseHref = buildPresentationBaseHref(presentationUrl, options);
    return injectBaseHrefIntoHtml(sourceHtml, baseHref);
  }

  return {
    buildPresentationBaseHref,
    injectBaseHrefIntoHtml,
    buildDeckSourceHtml,
    buildDeckPreviewHtml
  };
});
