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
  const BODY_SCAFFOLD_PLACEHOLDER = '{{SLIDENEXT_CANONICAL_SLIDES}}';

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

  function escapeScriptText(value) {
    return normalizeString(value).replace(/<\/script/gi, '<\\/script');
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
    if (booleanAttributeNames.has(attributeName)) {
      return true;
    }
    if (!normalizedValue) {
      return attributeName === 'crossorigin' ? true : null;
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

  function buildInlineScriptTags(scripts = []) {
    return (Array.isArray(scripts) ? scripts : [])
      .map((script) => ({
        content: normalizeString(script && script.content),
        attributes: asPlainObject(script && script.attributes)
      }))
      .filter(({ content, attributes }) => content.trim() || Object.keys(attributes).length > 0)
      .map(({ content, attributes }) => {
        const normalizedAttributes = {};
        Object.entries(attributes).forEach(([attributeName, attributeValue]) => {
          if (attributeName === 'src') {
            return;
          }
          const normalizedValue = normalizeAssetMetaAttributeValue(attributeName, attributeValue);
          if (normalizedValue !== null) {
            normalizedAttributes[attributeName] = normalizedValue;
          }
        });
        return `<script${renderAttributeMap(normalizedAttributes)}>${escapeScriptText(content)}</script>`;
      });
  }

  function buildCanonicalOrderedScriptTags(entries = []) {
    const orderedEntries = (Array.isArray(entries) ? entries : [])
      .map((entry, index) => ({
        html: normalizeString(entry && entry.html),
        order: Number.isFinite(entry && entry.order) ? entry.order : null,
        dedupeKey: normalizeString(entry && entry.dedupeKey),
        fallbackGroup: entry && entry.fallbackGroup === 'inline' ? 1 : 0,
        fallbackIndex: Number.isFinite(entry && entry.fallbackIndex) ? entry.fallbackIndex : index
      }))
      .filter((entry) => entry.html)
      .sort((left, right) => {
        const leftSortValue = left.order !== null ? left.order : 100000 + (left.fallbackGroup * 1000) + left.fallbackIndex;
        const rightSortValue = right.order !== null ? right.order : 100000 + (right.fallbackGroup * 1000) + right.fallbackIndex;
        if (leftSortValue !== rightSortValue) {
          return leftSortValue - rightSortValue;
        }
        return left.fallbackIndex - right.fallbackIndex;
      });

    const seenKeys = new Set();
    return orderedEntries
      .filter((entry) => {
        if (!entry.dedupeKey) {
          return true;
        }
        if (seenKeys.has(entry.dedupeKey)) {
          return false;
        }
        seenKeys.add(entry.dedupeKey);
        return true;
      })
      .map((entry) => entry.html);
  }

  function buildCanonicalHeadScriptTags(deck = {}) {
    const headScriptAssetEntries = (Array.isArray(deck.assets) ? deck.assets : [])
      .map((asset, assetIndex) => ({
        asset,
        assetIndex
      }))
      .filter(({ asset }) => asset && asset.type === 'script' && normalizeString(asPlainObject(asset.meta).location).trim().toLowerCase() === 'head')
      .map(({ asset, assetIndex }) => ({
        html: buildScriptAssetTags([asset])[0] || '',
        dedupeKey: normalizeString(asset && asset.src).trim(),
        order: Number.isFinite(asPlainObject(asset.meta).order) ? asPlainObject(asset.meta).order : null,
        fallbackGroup: 'external',
        fallbackIndex: assetIndex
      }));
    const headInlineScriptEntries = (Array.isArray(deck.source && deck.source.headInlineScripts) ? deck.source.headInlineScripts : [])
      .map((script, scriptIndex) => ({
        html: buildInlineScriptTags([script])[0] || '',
        order: Number.isFinite(script && script.order) ? script.order : null,
        fallbackGroup: 'inline',
        fallbackIndex: scriptIndex
      }));

    return buildCanonicalOrderedScriptTags([
      ...headScriptAssetEntries,
      ...headInlineScriptEntries
    ]);
  }

  function buildCanonicalBodyScriptTags(deck = {}) {
    const bodyScriptAssetEntries = (Array.isArray(deck.assets) ? deck.assets : [])
      .map((asset, assetIndex) => ({
        asset,
        assetIndex
      }))
      .filter(({ asset }) => asset && asset.type === 'script' && normalizeString(asPlainObject(asset.meta).location).trim().toLowerCase() !== 'head')
      .map(({ asset, assetIndex }) => ({
        html: buildScriptAssetTags([asset])[0] || '',
        dedupeKey: normalizeString(asset && asset.src).trim(),
        order: Number.isFinite(asPlainObject(asset.meta).order) ? asPlainObject(asset.meta).order : null,
        fallbackGroup: 'external',
        fallbackIndex: assetIndex
      }));
    const bodyInlineScriptEntries = (Array.isArray(deck.source && deck.source.bodyInlineScripts) ? deck.source.bodyInlineScripts : [])
      .map((script, scriptIndex) => ({
        html: buildInlineScriptTags([script])[0] || '',
        order: Number.isFinite(script && script.order) ? script.order : null,
        fallbackGroup: 'inline',
        fallbackIndex: scriptIndex
      }));

    return buildCanonicalOrderedScriptTags([
      ...bodyScriptAssetEntries,
      ...bodyInlineScriptEntries
    ]);
  }

  function buildScriptAssetTags(assets = [], options = {}) {
    const requestedLocation = normalizeString(options.location).trim().toLowerCase();
    const seenSrcs = new Set();
    return (Array.isArray(assets) ? assets : [])
      .filter((asset) => asset && asset.type === 'script')
      .filter((asset) => {
        if (!requestedLocation) {
          return true;
        }
        const assetLocation = normalizeString(asPlainObject(asset.meta).location).trim().toLowerCase();
        if (requestedLocation === 'head') {
          return assetLocation === 'head';
        }
        if (requestedLocation === 'body') {
          return assetLocation !== 'head';
        }
        return true;
      })
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

  function insertCanonicalHeadScriptTags(headHtml = '', scriptTags = []) {
    const normalizedHeadHtml = normalizeString(headHtml);
    const nextScriptTags = (Array.isArray(scriptTags) ? scriptTags : [])
      .filter((scriptTag) => normalizeString(scriptTag).trim())
      .join('\n')
      .trim();
    if (!nextScriptTags) {
      return normalizedHeadHtml;
    }

    const insertionMatch = /<(script\b(?![^>]*\bsrc=)|style\b|link\b(?=[^>]*\brel=(?:"[^"]*\bstylesheet\b[^"]*"|'[^']*\bstylesheet\b[^']*')))/i.exec(normalizedHeadHtml);
    if (!insertionMatch || !Number.isInteger(insertionMatch.index)) {
      return `${normalizedHeadHtml}\n${nextScriptTags}`.trim();
    }

    return `${normalizedHeadHtml.slice(0, insertionMatch.index)}${nextScriptTags}\n${normalizedHeadHtml.slice(insertionMatch.index)}`.trim();
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

  function buildRenderedNodeClassName(className = '', visibility = {}) {
    const nextClassNames = tokenizeClassNames(className)
      .filter((token) => token !== 'hidden');
    if (visibility && visibility.hidden) {
      nextClassNames.push('hidden');
    }
    return nextClassNames.join(' ');
  }

  function buildRenderedNodeAttributes(node = {}, fallbackStyleText = '') {
    const attributes = asPlainObject(node.attributes);
    if (node.type === 'group') {
      attributes['data-editor-group'] = 'true';
    }
    const explicitClassName = normalizeString(attributes.class).trim()
      || (Array.isArray(node.classes) && node.classes.length > 0 ? node.classes.join(' ') : '');
    const renderedClassName = buildRenderedNodeClassName(explicitClassName, node.visibility);
    if (renderedClassName) {
      attributes.class = renderedClassName;
    } else {
      delete attributes.class;
    }
    const explicitStyleText = normalizeString(attributes.style || node.style).trim();
    const mergedStyleText = mergeStyleTextWithFallback(explicitStyleText, fallbackStyleText);
    if (mergedStyleText) {
      attributes.style = mergedStyleText;
    } else {
      delete attributes.style;
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
    const hasExplicitCanonicalClass = !!(
      normalizeString(node && node.attributes && node.attributes.class).trim()
      || (Array.isArray(node.classes) && node.classes.length > 0)
    );
    if (existingClassName && !hasExplicitCanonicalClass) {
      canonicalAttributes.class = buildRenderedNodeClassName(existingClassName, node.visibility);
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

  function styleTextHasBackgroundProperty(styleText) {
    const normalizedStyleText = normalizeString(styleText).trim();
    return /(^|;)\s*background(?:-[a-z-]+)?\s*:/i.test(normalizedStyleText);
  }

  function buildRenderedSlideAttributes(slide = {}, index = 0, options = {}, fallbackAttributes = {}) {
    const sourceAttributes = asPlainObject(slide.source && slide.source.attributes);
    const background = slide.layout ? asPlainObject(slide.layout.background) : {};
    const fallback = asPlainObject(fallbackAttributes);
    const explicitSourceStyleText = normalizeString(sourceAttributes.style).trim();
    const hasExplicitSourceStyle = !!explicitSourceStyleText;
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
    if (!sourceAttributes['data-slide-section'] && slide.section) {
      sourceAttributes['data-slide-section'] = slide.section;
    }
    if (!sourceAttributes['data-speaker-notes'] && !sourceAttributes['data-notes'] && slide.notes) {
      sourceAttributes['data-speaker-notes'] = slide.notes;
    }
    if (!sourceAttributes.class) {
      sourceAttributes.class = normalizeString(background.className).trim() || normalizeString(fallback.class).trim();
    }
    const canonicalBackgroundStyleText = mergeStyleTextWithFallback(
      normalizeString(background.style).trim(),
      buildRenderedSlideBackgroundStyle(background)
    );
    const fallbackStyleText = normalizeString(fallback.style).trim();
    let resolvedStyleText = hasExplicitSourceStyle
      ? (
          styleTextHasBackgroundProperty(explicitSourceStyleText)
            ? explicitSourceStyleText
            : appendStyleDeclaration(explicitSourceStyleText, canonicalBackgroundStyleText)
        )
      : (canonicalBackgroundStyleText || fallbackStyleText);
    if (!sourceAttributes.id) {
      sourceAttributes.id = normalizeString(slide.id).trim() || normalizeString(fallback.id).trim();
    }
    if (needsPositionContext && !styleTextHasProperty(resolvedStyleText, 'position')) {
      resolvedStyleText = appendStyleDeclaration(resolvedStyleText, 'position: relative;');
    }
    if (resolvedStyleText) {
      sourceAttributes.style = resolvedStyleText;
    } else {
      delete sourceAttributes.style;
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

  function mergeStyleTextWithFallback(styleText = '', fallbackStyleText = '') {
    let mergedStyleText = normalizeString(styleText).trim();
    const normalizedFallbackStyleText = normalizeString(fallbackStyleText).trim();
    if (!normalizedFallbackStyleText) {
      return mergedStyleText;
    }
    if (!mergedStyleText) {
      return normalizedFallbackStyleText;
    }

    normalizedFallbackStyleText
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .forEach((declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) {
          return;
        }
        const propertyName = declaration.slice(0, separatorIndex).trim();
        if (!styleTextHasProperty(mergedStyleText, propertyName)) {
          mergedStyleText = appendStyleDeclaration(mergedStyleText, `${declaration};`);
        }
      });

    return mergedStyleText;
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
    const layoutStyleText = buildRenderedNodeLayoutStyle(node.layout);
    if (options.preferNodeSourceHtml !== false && normalizeString(node.html)) {
      return applyCanonicalNodeSourceHtmlState(
        node.html,
        node,
        layoutStyleText
      );
    }

    const attributes = buildRenderedNodeAttributes(node, layoutStyleText);

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
    const headScriptTags = buildCanonicalHeadScriptTags(deck);
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
      ...headScriptTags,
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

  function overlayCanonicalHeadSingletonTag(headHtml = '', matcher, tagHtml = '') {
    const nextTagHtml = normalizeString(tagHtml).trim();
    if (!nextTagHtml) {
      return normalizeString(headHtml);
    }

    const tagMatcher = matcher instanceof RegExp ? matcher : null;
    const normalizedHeadHtml = normalizeString(headHtml);
    if (!tagMatcher) {
      return `${nextTagHtml}\n${normalizedHeadHtml}`.trim();
    }

    const globalFlags = tagMatcher.flags.includes('g')
      ? tagMatcher.flags
      : `${tagMatcher.flags}g`;
    return `${nextTagHtml}\n${normalizedHeadHtml.replace(new RegExp(tagMatcher.source, globalFlags), '')}`.trim();
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
      nextHeadHtml = overlayCanonicalHeadSingletonTag(
        nextHeadHtml,
        /<title\b[^>]*>[\s\S]*?<\/title>\s*/i,
        titleTag
      );
    }

    const descriptionMetaTag = buildMetaTag('description', metadata.description);
    if (descriptionMetaTag) {
      nextHeadHtml = overlayCanonicalHeadSingletonTag(
        nextHeadHtml,
        /<meta\b(?=[^>]*\bname=(?:"description"|'description'))[^>]*>\s*/i,
        descriptionMetaTag
      );
    }

    const keywordsMetaTag = buildMetaTag('keywords', Array.isArray(metadata.tags) ? metadata.tags.join(', ') : '');
    if (keywordsMetaTag) {
      nextHeadHtml = overlayCanonicalHeadSingletonTag(
        nextHeadHtml,
        /<meta\b(?=[^>]*\bname=(?:"keywords"|'keywords'))[^>]*>\s*/i,
        keywordsMetaTag
      );
    }

    const iconHref = normalizeString(metadata.icon).trim();
    const iconLinkTag = looksLikeAssetHref(iconHref)
      ? `<link rel="icon" href="${escapeAttribute(iconHref)}">`
      : '';
    if (iconLinkTag) {
      nextHeadHtml = overlayCanonicalHeadSingletonTag(
        nextHeadHtml,
        /<link\b(?=[^>]*\brel=(?:"[^"]*\bicon\b[^"]*"|'[^']*\bicon\b[^']*'))[^>]*>\s*/i,
        iconLinkTag
      );
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

    const headScriptTags = buildCanonicalHeadScriptTags(deck);
    if (headScriptTags.length > 0) {
      const hasOrderedHeadScripts = (Array.isArray(deck.assets) ? deck.assets : []).some((asset) => asset
        && asset.type === 'script'
        && normalizeString(asPlainObject(asset.meta).location).trim().toLowerCase() === 'head'
        && Number.isFinite(asPlainObject(asset.meta).order))
        || (Array.isArray(deck.source && deck.source.headInlineScripts) ? deck.source.headInlineScripts : [])
          .some((script) => Number.isFinite(script && script.order));
      nextHeadHtml = nextHeadHtml.replace(
        hasOrderedHeadScripts
          ? /<script\b[\s\S]*?<\/script>\s*/gi
          : /<script\b(?=[^>]*\bsrc=)[\s\S]*?<\/script>\s*/gi,
        ''
      );
      nextHeadHtml = insertCanonicalHeadScriptTags(nextHeadHtml, headScriptTags);
    }

    const deckLayoutStyleBlock = buildCanonicalDeckLayoutStyleBlock(deck);
    if (deckLayoutStyleBlock) {
      nextHeadHtml = `${nextHeadHtml}\n${deckLayoutStyleBlock}`.trim();
    }

    const themeStyleBlocks = buildCanonicalDeckThemeStyleBlocks(deck);
    if (themeStyleBlocks.length > 0) {
      nextHeadHtml = `${nextHeadHtml}\n${themeStyleBlocks.join('\n')}`.trim();
    }

    const viewportMetaTag = '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
    nextHeadHtml = overlayCanonicalHeadSingletonTag(
      nextHeadHtml,
      /<meta\b(?=[^>]*\bname=(?:"viewport"|'viewport'))[^>]*>\s*/i,
      viewportMetaTag
    );

    const charsetMetaTag = '<meta charset="utf-8">';
    nextHeadHtml = overlayCanonicalHeadSingletonTag(
      nextHeadHtml,
      /<meta\b(?=[^>]*\bcharset=)[^>]*>\s*/i,
      charsetMetaTag
    );

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
    const bodyScaffoldHtml = normalizeString(deck.source && deck.source.bodyScaffoldHtml).trim();
    const bodyScriptTags = buildCanonicalBodyScriptTags(deck);
    const scaffoldBodyHtml = bodyScaffoldHtml && bodyScaffoldHtml.includes(BODY_SCAFFOLD_PLACEHOLDER)
      ? bodyScaffoldHtml.replace(BODY_SCAFFOLD_PLACEHOLDER, slidesHtml)
      : '';
    return [
      scaffoldBodyHtml || `<div id="slidesContainer" class="slides-container">${slidesHtml}</div>`,
      ...bodyScriptTags
    ].join('\n');
  }

  function applyCanonicalDeckBodySourceHtmlState(bodyHtml = '', deck = {}) {
    let nextBodyHtml = normalizeString(bodyHtml);
    if (!nextBodyHtml) {
      return nextBodyHtml;
    }

    const bodyScriptTags = buildCanonicalBodyScriptTags(deck);
    if (bodyScriptTags.length > 0) {
      const hasOrderedBodyScripts = (Array.isArray(deck.assets) ? deck.assets : []).some((asset) => asset
        && asset.type === 'script'
        && normalizeString(asPlainObject(asset.meta).location).trim().toLowerCase() !== 'head'
        && Number.isFinite(asPlainObject(asset.meta).order))
        || (Array.isArray(deck.source && deck.source.bodyInlineScripts) ? deck.source.bodyInlineScripts : [])
          .some((script) => Number.isFinite(script && script.order));
      nextBodyHtml = nextBodyHtml.replace(
        hasOrderedBodyScripts
          ? /<script\b[\s\S]*?<\/script>\s*/gi
          : /<script\b(?=[^>]*\bsrc=)[\s\S]*?<\/script>\s*/gi,
        ''
      );
      nextBodyHtml = `${nextBodyHtml}\n${bodyScriptTags.join('\n')}`.trim();
    }

    return nextBodyHtml;
  }

  function canReuseCanonicalDeckSourceHtml(options = {}) {
    const requestedActiveSlideId = normalizeString(options.activeSlideId).trim();
    return options.preferSourceHtml !== false
      && !requestedActiveSlideId
      && options.preferHeadSourceHtml !== false
      && options.preferBodySourceHtml !== false
      && options.preferSlideSourceHtml !== false
      && options.preferNodeSourceHtml !== false;
  }

  function canReuseCanonicalDeckBodySourceHtml(options = {}) {
    const requestedActiveSlideId = normalizeString(options.activeSlideId).trim();
    return options.preferBodySourceHtml !== false
      && !requestedActiveSlideId
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
    const htmlAttributes = asPlainObject(deck.source && deck.source.htmlAttributes);
    const bodyAttributes = asPlainObject(deck.source && deck.source.bodyAttributes);
    const bodyHtml = canReuseCanonicalDeckBodySourceHtml(options)
      ? applyCanonicalDeckBodySourceHtmlState(normalizeString(deck.source && deck.source.bodyHtml), deck) || buildDefaultBodyHtml(deck, options)
      : buildDefaultBodyHtml(deck, options);

    return [
      '<!DOCTYPE html>',
      `<html${renderAttributeMap(htmlAttributes)}>`,
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
