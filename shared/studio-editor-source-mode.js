(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSourceMode = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SOURCE_CSS_MARKER_ATTRIBUTE = 'data-slidenext-source-css="custom"';
  const SOURCE_CSS_BLOCK_PATTERN = /<style\b[^>]*data-slidenext-source-css\s*=\s*["']custom["'][^>]*>[\s\S]*?<\/style>/gi;

  function normalizeSourceCss(value) {
    return typeof value === 'string' ? value : '';
  }

  function escapeSourceCssText(value) {
    return normalizeSourceCss(value).replace(/<\/style/gi, '<\\/style');
  }

  function buildStudioSourceCssBlock(css = '') {
    const normalizedCss = normalizeSourceCss(css).trim();
    if (!normalizedCss) return '';
    return `<style ${SOURCE_CSS_MARKER_ATTRIBUTE}>\n${escapeSourceCssText(normalizedCss)}\n</style>`;
  }

  function extractStudioSourceCss(sourceHtml = '') {
    const match = normalizeSourceCss(sourceHtml).match(SOURCE_CSS_BLOCK_PATTERN);
    if (!match) return '';
    const openingTagEnd = match[0].indexOf('>');
    const closingTagStart = match[0].lastIndexOf('</style>');
    if (openingTagEnd < 0 || closingTagStart < 0) return '';
    return match[0]
      .slice(openingTagEnd + 1, closingTagStart)
      .replace(new RegExp('<\\\\/style', 'gi'), '</style')
      .trim();
  }

  function replaceStudioSourceCss(sourceHtml = '', css = '') {
    const normalizedHtml = normalizeSourceCss(sourceHtml);
    if (!normalizedHtml) return normalizedHtml;

    const replacement = buildStudioSourceCssBlock(css);
    SOURCE_CSS_BLOCK_PATTERN.lastIndex = 0;
    if (SOURCE_CSS_BLOCK_PATTERN.test(normalizedHtml)) {
      SOURCE_CSS_BLOCK_PATTERN.lastIndex = 0;
      return normalizedHtml.replace(SOURCE_CSS_BLOCK_PATTERN, replacement);
    }
    SOURCE_CSS_BLOCK_PATTERN.lastIndex = 0;
    if (!replacement) return normalizedHtml;

    if (/<\/head\s*>/i.test(normalizedHtml)) {
      return normalizedHtml.replace(/<\/head\s*>/i, `${replacement}\n</head>`);
    }
    return `${replacement}\n${normalizedHtml}`;
  }

  return {
    SOURCE_CSS_MARKER_ATTRIBUTE,
    buildStudioSourceCssBlock,
    extractStudioSourceCss,
    replaceStudioSourceCss
  };
});
