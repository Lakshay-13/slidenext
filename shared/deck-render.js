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

  function looksLikeAssetHref(value) {
    const normalizedValue = normalizeString(value).trim();
    if (!normalizedValue) {
      return false;
    }
    return /^(?:\/|\.\/|\.\.\/|https?:\/\/|data:|blob:)/i.test(normalizedValue)
      || /[/?#]/.test(normalizedValue)
      || /\.[a-z0-9]{2,8}(?:[?#].*)?$/i.test(normalizedValue);
  }

  function normalizeAssetMetaAttributeValue(attributeName, value) {
    const booleanAttributeNames = new Set(['async', 'defer', 'nomodule']);
    if (value === true) {
      return true;
    }
    if (value === false || value === null || value === undefined) {
      return null;
    }

    const normalizedValue = typeof value === 'string'
      ? value.trim()
      : String(value).trim();
    if (!normalizedValue) {
      return attributeName === 'crossorigin' ? true : null;
    }
    if (booleanAttributeNames.has(attributeName)) {
      return true;
    }
    return normalizedValue;
  }

  function applyAssetMetaAttributes(attributes, assetMeta, attributeNames) {
    const meta = asPlainObject(assetMeta);
    attributeNames.forEach((attributeName) => {
      if (!Object.prototype.hasOwnProperty.call(meta, attributeName)) {
        return;
      }
      const normalizedValue = normalizeAssetMetaAttributeValue(attributeName, meta[attributeName]);
      if (normalizedValue !== null) {
        attributes[attributeName] = normalizedValue;
      }
    });
  }

  function buildStylesheetAssetLinkTags(assets = []) {
    const seenSrcs = new Set();
    return (Array.isArray(assets) ? assets : [])
      .filter((asset) => asset && asset.type === 'stylesheet')
      .map((asset) => ({
        src: normalizeString(asset.src).trim(),
        meta: asPlainObject(asset.meta)
      }))
      .filter(({ src }) => {
        if (!src || seenSrcs.has(src)) {
          return false;
        }
        seenSrcs.add(src);
        return true;
      })
      .map(({ src, meta }) => {
        const attributes = {
          rel: 'stylesheet',
          href: src
        };
        applyAssetMetaAttributes(attributes, meta, ['media', 'crossorigin', 'integrity', 'referrerpolicy']);
        return `<link${renderAttributeMap(attributes)}>`;
      });
  }

  function buildScriptAssetTags(assets = []) {
    const seenSrcs = new Set();
    return (Array.isArray(assets) ? assets : [])
      .filter((asset) => asset && asset.type === 'script')
      .map((asset) => ({
        src: normalizeString(asset.src).trim(),
        meta: asPlainObject(asset.meta)
      }))
      .filter(({ src }) => {
        if (!src || seenSrcs.has(src)) {
          return false;
        }
        seenSrcs.add(src);
        return true;
      })
      .map(({ src, meta }) => {
        const attributes = {
          src
        };
        applyAssetMetaAttributes(attributes, meta, [
          'type',
          'async',
          'defer',
          'nomodule',
          'crossorigin',
          'integrity',
          'referrerpolicy'
        ]);
        return `<script${renderAttributeMap(attributes)}></script>`;
      });
  }

  function buildPreloadAssetLinkTags(assets = []) {
    const preloadAsTypes = {
      font: 'font',
      image: 'image',
      video: 'video',
      audio: 'audio'
    };
    const seenSrcs = new Set();
    return (Array.isArray(assets) ? assets : [])
      .filter((asset) => asset && preloadAsTypes[normalizeString(asset.type).trim()])
      .map((asset) => ({
        src: normalizeString(asset.src).trim(),
        as: preloadAsTypes[normalizeString(asset.type).trim()],
        mimeType: normalizeString(asset.mimeType).trim(),
        meta: asPlainObject(asset.meta)
      }))
      .filter(({ src }) => {
        if (!src || seenSrcs.has(src)) {
          return false;
        }
        seenSrcs.add(src);
        return true;
      })
      .map(({ src, as, mimeType, meta }) => {
        const attributes = {
          rel: 'preload',
          as,
          href: src
        };
        if (mimeType) {
          attributes.type = mimeType;
        }
        applyAssetMetaAttributes(attributes, meta, ['media', 'crossorigin', 'integrity', 'referrerpolicy']);
        if (as === 'font' && !Object.prototype.hasOwnProperty.call(meta, 'crossorigin')) {
          attributes.crossorigin = true;
        }
        return `<link${renderAttributeMap(attributes)}>`;
      });
  }

  function normalizeAspectRatioCssValue(value) {
    const normalizedValue = normalizeString(value).trim();
    if (!normalizedValue) {
      return '';
    }
    return normalizedValue.includes(':')
      ? normalizedValue
        .split(':')
        .map(part => part.trim())
        .filter(Boolean)
        .join(' / ')
      : normalizedValue;
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

  function stripOpeningTagAttributeText(attributeText = '', attributeNames = []) {
    return attributeNames.reduce((nextAttributeText, attributeName) => nextAttributeText.replace(
      new RegExp(`\\s${attributeName}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'),
      ''
    ), normalizeString(attributeText));
  }

  function buildRenderedNodeAttributes(node = {}, fallbackStyleText = '') {
    const attributes = asPlainObject(node.attributes);
    if (Array.isArray(node.classes) && node.classes.length > 0 && !attributes.class) {
      attributes.class = node.classes.join(' ');
    }
    if (node.style && !attributes.style) {
      attributes.style = node.style;
    }
    if (!attributes.style) {
      const normalizedFallbackStyleText = normalizeString(fallbackStyleText).trim();
      if (normalizedFallbackStyleText) {
        attributes.style = normalizedFallbackStyleText;
      }
    }
    if (node.visibility && node.visibility.locked) {
      attributes['data-editor-locked'] = 'true';
    }
    if (node.visibility && node.visibility.hidden) {
      attributes['data-editor-hidden'] = 'true';
      attributes.hidden = true;
      attributes['aria-hidden'] = attributes['aria-hidden'] || 'true';
    }
    return attributes;
  }

  function applyCanonicalNodeSourceHtmlState(html, node = {}, canonicalStyleText = '') {
    const sourceHtml = normalizeString(html);
    if (!sourceHtml) {
      return sourceHtml;
    }

    const openingTagMatch = sourceHtml.match(/^<([a-z][^\s/>]*)([^>]*?)(\/?)>/i);
    if (!openingTagMatch) {
      return sourceHtml;
    }

    const existingClassName = readOpeningTagAttributeValue(openingTagMatch[2], 'class');
    const existingStyleText = readOpeningTagAttributeValue(openingTagMatch[2], 'style');
    const canonicalAttributes = buildRenderedNodeAttributes(node, canonicalStyleText);
    if (!canonicalAttributes.class && existingClassName) {
      canonicalAttributes.class = existingClassName;
    }
    if (!canonicalAttributes.style && existingStyleText) {
      canonicalAttributes.style = existingStyleText;
    }
    const strippedAttributeText = stripOpeningTagAttributeText(
      openingTagMatch[2],
      Array.from(new Set([
        'class',
        'style',
        'hidden',
        'aria-hidden',
        'data-editor-hidden',
        'data-editor-locked',
        ...Object.keys(canonicalAttributes)
      ]))
    );

    const rebuiltOpeningTag = `<${openingTagMatch[1]}${strippedAttributeText}${renderAttributeMap(canonicalAttributes)}${openingTagMatch[3] || ''}>`;
    return rebuiltOpeningTag + sourceHtml.slice(openingTagMatch[0].length);
  }

  function readOpeningTagAttributeValue(attributeText = '', attributeName = '') {
    const attributeMatch = new RegExp(`\\s${attributeName}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
      .exec(normalizeString(attributeText));
    return attributeMatch
      ? normalizeString(attributeMatch[1] || attributeMatch[2] || attributeMatch[3]).trim()
      : '';
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

  function buildRenderedSlideAttributes(slide = {}, index = 0, options = {}, fallbackAttributes = {}) {
    const sourceAttributes = asPlainObject(slide.source && slide.source.attributes);
    const background = slide.layout ? asPlainObject(slide.layout.background) : {};
    const fallback = asPlainObject(fallbackAttributes);
    const hasExplicitSourceStyle = !!normalizeString(sourceAttributes.style).trim();
    const needsPositionContext = hasAbsolutePositionedNode(slide.nodes);
    const requestedActiveSlideId = normalizeString(options.activeSlideId).trim();
    const isActiveSlide = requestedActiveSlideId
      ? normalizeString(slide.id).trim() === requestedActiveSlideId
      : index === 0;
    const slideTitle = normalizeString(slide.title).trim();
    const isDefaultSlideTitle = slideTitle === `Slide ${index + 1}` && !normalizeString(slide.name).trim();

    if (!sourceAttributes['aria-label'] && slideTitle && !hasHeadingNode(slide.nodes) && !isDefaultSlideTitle) {
      sourceAttributes['aria-label'] = slide.title;
    }
    if (!sourceAttributes['data-slide-name'] && slide.name) {
      sourceAttributes['data-slide-name'] = slide.name;
    }
    if (!sourceAttributes['data-speaker-notes'] && !sourceAttributes['data-notes'] && slide.notes) {
      sourceAttributes['data-speaker-notes'] = slide.notes;
    }
    if (!sourceAttributes.class) {
      sourceAttributes.class = normalizeString(background.className).trim() || normalizeString(fallback.class).trim();
    }
    const resolvedStyleText = normalizeString(sourceAttributes.style).trim()
      || normalizeString(background.style).trim()
      || buildRenderedSlideBackgroundStyle(background)
      || normalizeString(fallback.style).trim();
    if (!sourceAttributes.id) {
      sourceAttributes.id = normalizeString(slide.id).trim() || normalizeString(fallback.id).trim();
    }
    if (!sourceAttributes.style) {
      if (resolvedStyleText) {
        sourceAttributes.style = resolvedStyleText;
      }
    }
    if (needsPositionContext && !hasExplicitSourceStyle && !styleTextHasProperty(sourceAttributes.style, 'position')) {
      sourceAttributes.style = appendStyleDeclaration(sourceAttributes.style, 'position: relative;');
    }
    sourceAttributes.class = buildRenderedSlideClassName(sourceAttributes.class, isActiveSlide);

    return sourceAttributes;
  }

  function applyCanonicalSlideSourceHtmlState(sourceHtml = '', slide = {}, index = 0, options = {}) {
    const html = normalizeString(sourceHtml);
    if (!html) {
      return html;
    }

    const openingTagMatch = html.match(/^<([a-z][^\s/>]*)([^>]*?)(\/?)>/i);
    if (!openingTagMatch) {
      return html;
    }

    const rebuiltAttributes = buildRenderedSlideAttributes(slide, index, options, {
      class: readOpeningTagAttributeValue(openingTagMatch[2], 'class'),
      style: readOpeningTagAttributeValue(openingTagMatch[2], 'style'),
      id: readOpeningTagAttributeValue(openingTagMatch[2], 'id')
    });
    const attributeNamesToStrip = Array.from(new Set([
      'class',
      'style',
      'id',
      ...Object.keys(rebuiltAttributes)
    ]));
    if (Object.prototype.hasOwnProperty.call(rebuiltAttributes, 'data-speaker-notes')) {
      attributeNamesToStrip.push('data-notes');
    }
    if (Object.prototype.hasOwnProperty.call(rebuiltAttributes, 'data-notes')) {
      attributeNamesToStrip.push('data-speaker-notes');
    }

    const rebuiltOpeningTag = `<${openingTagMatch[1]}${stripOpeningTagAttributeText(openingTagMatch[2], attributeNamesToStrip)}${renderAttributeMap(rebuiltAttributes)}${openingTagMatch[3] || ''}>`;
    return rebuiltOpeningTag + html.slice(openingTagMatch[0].length);
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

  function hasHeadingNode(nodes = []) {
    return Array.isArray(nodes) && nodes.some((node) => {
      if (!node || typeof node !== 'object') {
        return false;
      }
      if (/^h[1-6]$/i.test(normalizeString(node.tagName))) {
        return true;
      }
      return hasHeadingNode(node.children);
    });
  }

  function renderCanonicalNode(node, options = {}) {
    if (!node || typeof node !== 'object') return '';
    if (options.preferNodeSourceHtml !== false && normalizeString(node.html)) {
      return applyCanonicalNodeSourceHtmlState(
        node.html,
        node,
        !normalizeString(node.style).trim() ? buildRenderedNodeLayoutStyle(node.layout) : ''
      );
    }

    const attributes = buildRenderedNodeAttributes(node, buildRenderedNodeLayoutStyle(node.layout));

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
      return applyCanonicalSlideSourceHtmlState(slide.source.html, slide, index, options);
    }

    const sourceAttributes = buildRenderedSlideAttributes(slide, index, options);

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
    const iconHref = normalizeString(metadata.icon).trim();
    const iconLinkTag = looksLikeAssetHref(iconHref)
      ? `<link rel="icon" href="${escapeAttribute(iconHref)}">`
      : '';
    const preloadAssetLinkTags = buildPreloadAssetLinkTags(deck.assets);
    const stylesheetAssetLinkTags = buildStylesheetAssetLinkTags(deck.assets);
    const deckLayoutStyleBlock = buildCanonicalDeckLayoutStyleBlock(deck);
    const themeStyleBlocks = buildCanonicalDeckThemeStyleBlocks(deck);

    return [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<title>${escapeHtml(title)}</title>`,
      descriptionMetaTag,
      keywordsMetaTag,
      iconLinkTag,
      ...preloadAssetLinkTags,
      ...stylesheetAssetLinkTags,
      deckLayoutStyleBlock,
      ...themeStyleBlocks
    ].filter(Boolean).join('\n');
  }

  function buildCanonicalDeckLayoutStyleBlock(deck = {}) {
    const layout = asPlainObject(deck.layout);
    const layoutSize = asPlainObject(layout.size);
    const layoutCssUnit = normalizeString(layoutSize.unit, 'px').trim() || 'px';
    const layoutAspectRatio = normalizeAspectRatioCssValue(layout.aspectRatio);
    const layoutStyleLines = [];
    if (Number.isFinite(layoutSize.width)) {
      layoutStyleLines.push(`  width: ${layoutSize.width}${layoutCssUnit};`);
    }
    if (Number.isFinite(layoutSize.height)) {
      layoutStyleLines.push(`  height: ${layoutSize.height}${layoutCssUnit};`);
    }
    if (layoutAspectRatio) {
      layoutStyleLines.push(`  aspect-ratio: ${escapeStyleText(layoutAspectRatio)};`);
    }
    if (layoutStyleLines.length > 0) {
      layoutStyleLines.push('  box-sizing: border-box;');
      layoutStyleLines.push('  overflow: hidden;');
    }
    return layoutStyleLines.length > 0
      ? `<style>\n.slide {\n${layoutStyleLines.join('\n')}\n}\n</style>`
      : '';
  }

  function buildCanonicalDeckThemeStyleBlocks(deck = {}) {
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
    return themeStyleBlocks;
  }

  function applyCanonicalDeckHeadSourceHtmlState(headHtml = '', deck = {}) {
    let nextHeadHtml = normalizeString(headHtml);
    if (!nextHeadHtml) {
      return nextHeadHtml;
    }

    const metadata = asPlainObject(deck.metadata);
    const canonicalTitle = normalizeString(metadata.title).trim();
    if (canonicalTitle) {
      const titleTag = `<title>${escapeHtml(canonicalTitle)}</title>`;
      nextHeadHtml = /<title\b[^>]*>[\s\S]*?<\/title>/i.test(nextHeadHtml)
        ? nextHeadHtml.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, titleTag)
        : `${titleTag}\n${nextHeadHtml}`;
    }

    const descriptionMetaTag = buildMetaTag('description', metadata.description);
    if (descriptionMetaTag) {
      nextHeadHtml = /<meta\b(?=[^>]*\bname=(?:"description"|'description'))[^>]*>/i.test(nextHeadHtml)
        ? nextHeadHtml.replace(/<meta\b(?=[^>]*\bname=(?:"description"|'description'))[^>]*>/i, descriptionMetaTag)
        : `${descriptionMetaTag}\n${nextHeadHtml}`;
    }

    const keywordsMetaTag = buildMetaTag('keywords', Array.isArray(metadata.tags) ? metadata.tags.join(', ') : '');
    if (keywordsMetaTag) {
      nextHeadHtml = /<meta\b(?=[^>]*\bname=(?:"keywords"|'keywords'))[^>]*>/i.test(nextHeadHtml)
        ? nextHeadHtml.replace(/<meta\b(?=[^>]*\bname=(?:"keywords"|'keywords'))[^>]*>/i, keywordsMetaTag)
        : `${keywordsMetaTag}\n${nextHeadHtml}`;
    }

    const iconHref = normalizeString(metadata.icon).trim();
    const iconLinkTag = looksLikeAssetHref(iconHref)
      ? `<link rel="icon" href="${escapeAttribute(iconHref)}">`
      : '';
    if (iconLinkTag) {
      nextHeadHtml = /<link\b(?=[^>]*\brel=(?:"[^"]*\bicon\b[^"]*"|'[^']*\bicon\b[^']*'))[^>]*>/i.test(nextHeadHtml)
        ? nextHeadHtml.replace(/<link\b(?=[^>]*\brel=(?:"[^"]*\bicon\b[^"]*"|'[^']*\bicon\b[^']*'))[^>]*>/i, iconLinkTag)
        : `${iconLinkTag}\n${nextHeadHtml}`;
    }

    const stylesheetAssetLinkTags = buildStylesheetAssetLinkTags(deck.assets);
    if (stylesheetAssetLinkTags.length > 0) {
      nextHeadHtml = nextHeadHtml.replace(
        /<link\b(?=[^>]*\brel=(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*'))[^>]*>\s*/gi,
        ''
      );
      nextHeadHtml = `${stylesheetAssetLinkTags.join('\n')}\n${nextHeadHtml}`;
    }

    const preloadAssetLinkTags = buildPreloadAssetLinkTags(deck.assets);
    if (preloadAssetLinkTags.length > 0) {
      nextHeadHtml = nextHeadHtml.replace(
        /<link\b(?=[^>]*\brel=(?:"[^"]*\bpreload\b[^"]*"|'[^']*\bpreload\b[^']*'))[^>]*>\s*/gi,
        ''
      );
      nextHeadHtml = `${preloadAssetLinkTags.join('\n')}\n${nextHeadHtml}`;
    }

    const deckLayoutStyleBlock = buildCanonicalDeckLayoutStyleBlock(deck);
    if (deckLayoutStyleBlock) {
      nextHeadHtml = `${nextHeadHtml}\n${deckLayoutStyleBlock}`.trim();
    }

    return nextHeadHtml;
  }

  function buildDefaultBodyHtml(deck, options = {}) {
    const slides = Array.isArray(deck.slides) ? deck.slides : [];
    const requestedActiveSlideId = normalizeString(options.activeSlideId).trim();
    const resolvedActiveSlideId = requestedActiveSlideId && slides.some((slide) => normalizeString(slide && slide.id).trim() === requestedActiveSlideId)
      ? requestedActiveSlideId
      : normalizeString(slides[0] && slides[0].id).trim();
    const slidesHtml = Array.isArray(deck.slides)
      ? deck.slides.map((slide, index) => renderCanonicalSlide(slide, index, {
        ...options,
        activeSlideId: resolvedActiveSlideId
      })).join('\n')
      : '';
    const scriptAssetTags = buildScriptAssetTags(deck.assets);
    return [
      `<div id="slidesContainer" class="slides-container">${slidesHtml}</div>`,
      ...scriptAssetTags
    ].join('\n');
  }

  function applyCanonicalDeckBodySourceHtmlState(bodyHtml = '', deck = {}) {
    let nextBodyHtml = normalizeString(bodyHtml);
    if (!nextBodyHtml) {
      return nextBodyHtml;
    }

    const scriptAssetTags = buildScriptAssetTags(deck.assets);
    if (scriptAssetTags.length > 0) {
      nextBodyHtml = nextBodyHtml.replace(
        /<script\b(?=[^>]*\bsrc=)[\s\S]*?<\/script>\s*/gi,
        ''
      );
      nextBodyHtml = `${nextBodyHtml}\n${scriptAssetTags.join('\n')}`.trim();
    }

    return nextBodyHtml;
  }

  function canReuseCanonicalDeckSourceHtml(options = {}) {
    return options.preferSourceHtml !== false
      && options.preferHeadSourceHtml !== false
      && options.preferBodySourceHtml !== false
      && options.preferSlideSourceHtml !== false
      && options.preferNodeSourceHtml !== false;
  }

  function canReuseCanonicalDeckBodySourceHtml(options = {}) {
    return options.preferBodySourceHtml !== false
      && options.preferSlideSourceHtml !== false
      && options.preferNodeSourceHtml !== false;
  }

  function renderCanonicalDeckHtml(deckLike, options = {}) {
    const deck = canonicalDeck.isCanonicalDeck(deckLike)
      ? deckLike
      : canonicalDeck.createCanonicalDeck(deckLike);

    if (canReuseCanonicalDeckSourceHtml(options) && deck.source && normalizeString(deck.source.html)) {
      return deck.source.html;
    }

    const headHtml = options.preferHeadSourceHtml === false
      ? buildDefaultHeadHtml(deck)
      : applyCanonicalDeckHeadSourceHtmlState(normalizeString(deck.source && deck.source.headHtml), deck) || buildDefaultHeadHtml(deck);
    const bodyAttributes = asPlainObject(deck.source && deck.source.bodyAttributes);
    const bodyHtml = canReuseCanonicalDeckBodySourceHtml(options)
      ? applyCanonicalDeckBodySourceHtmlState(normalizeString(deck.source && deck.source.bodyHtml), deck) || buildDefaultBodyHtml(deck, options)
      : buildDefaultBodyHtml(deck, options);

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
