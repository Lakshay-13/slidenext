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

  function buildMetaTag(name, content) {
    const normalizedContent = normalizeString(content).trim();
    if (!normalizedContent) {
      return '';
    }
    return `<meta name="${escapeAttribute(name)}" content="${escapeAttribute(normalizedContent)}">`;
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

  function buildRenderedSlideBackgroundStyle(background = {}) {
    const styleFragments = [];
    const backgroundColor = normalizeString(background.color).trim();
    const backgroundImage = normalizeString(background.image).trim();

    if (backgroundColor) {
      styleFragments.push(`background-color: ${backgroundColor};`);
    }
    if (backgroundImage) {
      styleFragments.push(`background-image: ${backgroundImage};`);
    }

    return styleFragments.join(' ');
  }

  function appendStyleDeclaration(styleText, declaration) {
    const normalizedStyleText = normalizeString(styleText).trim();
    const normalizedDeclaration = normalizeString(declaration).trim();
    if (!normalizedDeclaration) {
      return normalizedStyleText;
    }
    if (!normalizedStyleText) {
      return normalizedDeclaration;
    }
    return `${normalizedStyleText}${normalizedStyleText.endsWith(';') ? '' : ';'} ${normalizedDeclaration}`;
  }

  function styleTextHasProperty(styleText, propertyName) {
    const normalizedStyleText = normalizeString(styleText).trim();
    const normalizedPropertyName = normalizeString(propertyName).trim();
    if (!normalizedStyleText || !normalizedPropertyName) {
      return false;
    }
    const escapedPropertyName = normalizedPropertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|;)\\s*${escapedPropertyName}\\s*:`, 'i').test(normalizedStyleText);
  }

  function buildRenderedNodeLayoutStyle(layout = {}) {
    const normalizedLayout = asPlainObject(layout);
    if (normalizeString(normalizedLayout.mode) !== 'absolute') {
      return '';
    }

    const styleFragments = ['position: absolute;'];
    if (Number.isFinite(normalizedLayout.x)) {
      styleFragments.push(`left: ${normalizedLayout.x}px;`);
    }
    if (Number.isFinite(normalizedLayout.y)) {
      styleFragments.push(`top: ${normalizedLayout.y}px;`);
    }
    if (Number.isFinite(normalizedLayout.width)) {
      styleFragments.push(`width: ${normalizedLayout.width}px;`);
    }
    if (Number.isFinite(normalizedLayout.height)) {
      styleFragments.push(`height: ${normalizedLayout.height}px;`);
    }
    if (Number.isFinite(normalizedLayout.zIndex)) {
      styleFragments.push(`z-index: ${normalizedLayout.zIndex};`);
    }

    return styleFragments.join(' ');
  }

  function hasAbsolutePositionedNode(nodes = []) {
    return Array.isArray(nodes) && nodes.some((node) => {
      if (!node || typeof node !== 'object') {
        return false;
      }
      if (normalizeString(node.layout && node.layout.mode) === 'absolute') {
        return true;
      }
      return hasAbsolutePositionedNode(node.children);
    });
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
    if (!attributes.style) {
      const layoutStyle = buildRenderedNodeLayoutStyle(node.layout);
      if (layoutStyle) {
        attributes.style = layoutStyle;
      }
    }
    if (node.visibility && node.visibility.hidden) {
      attributes.hidden = true;
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
    const background = slide.layout ? asPlainObject(slide.layout.background) : {};
    const hasExplicitSourceStyle = !!normalizeString(sourceAttributes.style).trim();
    const needsPositionContext = hasAbsolutePositionedNode(slide.nodes);
    if (!sourceAttributes['data-slide-name'] && slide.name) {
      sourceAttributes['data-slide-name'] = slide.name;
    }
    if (!sourceAttributes['data-speaker-notes'] && !sourceAttributes['data-notes'] && slide.notes) {
      sourceAttributes['data-speaker-notes'] = slide.notes;
    }
    if (!sourceAttributes.class && background.className) {
      sourceAttributes.class = background.className;
    }
    if (!sourceAttributes.style) {
      const backgroundStyle = normalizeString(background.style).trim() || buildRenderedSlideBackgroundStyle(background);
      if (backgroundStyle) {
        sourceAttributes.style = backgroundStyle;
      }
    }
    if (needsPositionContext && !hasExplicitSourceStyle && !styleTextHasProperty(sourceAttributes.style, 'position')) {
      sourceAttributes.style = appendStyleDeclaration(sourceAttributes.style, 'position: relative;');
    }
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
    const metadata = asPlainObject(deck.metadata);
    const title = normalizeString(metadata.title, 'SlideNext Deck');
    const descriptionMetaTag = buildMetaTag('description', metadata.description);
    const keywordsMetaTag = buildMetaTag('keywords', Array.isArray(metadata.tags) ? metadata.tags.join(', ') : '');
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
      descriptionMetaTag,
      keywordsMetaTag,
      ...themeStyleBlocks
    ].filter(Boolean).join('\n');
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
