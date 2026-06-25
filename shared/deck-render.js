(function (root, factory) {
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const api = factory(canonicalDeck);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckRender = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeck) {
  if (!canonicalDeck) {
    throw new Error('SlideNextCanonicalDeck dependency is required');
  }

  const SELF_CLOSING_TAG_NAMES = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source']);

  function asPlainObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...value };
  }

  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function escapeHtml(value) {
    return normalizeString(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  function escapeStyleText(value) {
    return normalizeString(value).replace(/<\/style/gi, '<\\/style');
  }

  function renderAttributeMap(attributes = {}) {
    return Object.entries(asPlainObject(attributes))
      .filter(([, value]) => value !== null && value !== undefined && value !== false)
      .map(([key, value]) => {
        if (value === true) {
          return ` ${key}`;
        }
        return ` ${key}="${escapeAttribute(String(value))}"`;
      })
      .join('');
  }

  function tokenizeClassNames(className) {
    return normalizeString(className)
      .split(/\s+/)
      .map(token => token.trim())
      .filter(Boolean);
  }

  function buildRenderedSlideClassName(className, isActive) {
    const nextClassNames = tokenizeClassNames(className)
      .filter(token => token !== 'slide' && token !== 'slide-active');
    nextClassNames.unshift('slide');
    if (isActive) {
      nextClassNames.push('slide-active');
    }
    return nextClassNames.join(' ');
  }

  function renderCanonicalNode(node, options = {}) {
    if (!node || typeof node !== 'object') return '';
    if (options.preferNodeSourceHtml !== false && normalizeString(node.html)) {
      return node.html;
    }

    const attributes = asPlainObject(node.attributes);
    if (Array.isArray(node.classes) && node.classes.length > 0 && !attributes.class) {
      attributes.class = node.classes.join(' ');
    }
    if (node.style && !attributes.style) {
      attributes.style = node.style;
    }
    if (node.visibility && node.visibility.hidden) {
      attributes['aria-hidden'] = attributes['aria-hidden'] || 'true';
    }

    const tagName = normalizeString(node.tagName, node.type === 'image' ? 'img' : 'div').toLowerCase();
    const childrenHtml = Array.isArray(node.children)
      ? node.children.map(child => renderCanonicalNode(child, options)).join('')
      : '';
    const textHtml = childrenHtml || escapeHtml(node.text || '');
    const attrs = renderAttributeMap(attributes);

    if (SELF_CLOSING_TAG_NAMES.has(tagName)) {
      return `<${tagName}${attrs}>`;
    }
    return `<${tagName}${attrs}>${textHtml}</${tagName}>`;
  }

  function renderCanonicalSlide(slide, index = 0, options = {}) {
    if (!slide || typeof slide !== 'object') return '';
    if (options.preferSlideSourceHtml !== false && slide.source && normalizeString(slide.source.html)) {
      return slide.source.html;
    }

    const sourceAttributes = slide.source ? asPlainObject(slide.source.attributes) : {};
    sourceAttributes.class = buildRenderedSlideClassName(sourceAttributes.class, index === 0);
    if (!sourceAttributes.id && slide.id) {
      sourceAttributes.id = slide.id;
    }

    const slideHtml = Array.isArray(slide.nodes)
      ? slide.nodes.map(node => renderCanonicalNode(node, options)).join('')
      : '';
    const attrs = renderAttributeMap(sourceAttributes);
    return `<section${attrs}>${slideHtml}</section>`;
  }

  function buildDefaultHeadHtml(deck) {
    const title = normalizeString(deck.metadata && deck.metadata.title, 'SlideNext Deck');
    const themeTokens = asPlainObject(deck.theme && deck.theme.tokens);
    const themeTokenEntries = Object.entries(themeTokens)
      .filter(([tokenName, tokenValue]) => tokenName.startsWith('--') && normalizeString(tokenValue).trim() !== '');
    const themeCustomCss = normalizeString(deck.theme && deck.theme.customCss).trim();
    const themeStyleBlocks = [];

    if (themeTokenEntries.length > 0) {
      const tokenLines = themeTokenEntries
        .map(([tokenName, tokenValue]) => `  ${tokenName}: ${escapeStyleText(String(tokenValue))};`)
        .join('\n');
      themeStyleBlocks.push(`<style>\n:root {\n${tokenLines}\n}\n</style>`);
    }
    if (themeCustomCss) {
      themeStyleBlocks.push(`<style>\n${escapeStyleText(themeCustomCss)}\n</style>`);
    }

    return [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<title>${escapeHtml(title)}</title>`,
      ...themeStyleBlocks
    ].join('\n');
  }

  function buildDefaultBodyHtml(deck, options = {}) {
    const slidesHtml = Array.isArray(deck.slides)
      ? deck.slides.map((slide, index) => renderCanonicalSlide(slide, index, options)).join('\n')
      : '';
    return `<div id="slidesContainer" class="slides-container">${slidesHtml}</div>`;
  }

  function renderCanonicalDeckHtml(deckLike, options = {}) {
    const deck = canonicalDeck.isCanonicalDeck(deckLike)
      ? deckLike
      : canonicalDeck.createCanonicalDeck(deckLike);

    if (options.preferSourceHtml !== false && deck.source && normalizeString(deck.source.html)) {
      return deck.source.html;
    }

    const headHtml = normalizeString(deck.source && deck.source.headHtml) || buildDefaultHeadHtml(deck);
    const bodyAttributes = asPlainObject(deck.source && deck.source.bodyAttributes);
    const bodyHtml = normalizeString(deck.source && deck.source.bodyHtml) || buildDefaultBodyHtml(deck, options);

    return [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      headHtml,
      '</head>',
      `<body${renderAttributeMap(bodyAttributes)}>`,
      bodyHtml,
      '</body>',
      '</html>'
    ].join('\n');
  }

  return {
    buildRenderedSlideClassName,
    renderCanonicalNode,
    renderCanonicalSlide,
    renderCanonicalDeckHtml
  };
});
