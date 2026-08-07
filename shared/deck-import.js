(function (root, factory) {
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const deckPersistence = typeof module === 'object' && module.exports
    ? require('./deck-persistence')
    : null;
  const api = factory(root, canonicalDeck, deckPersistence);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckImport = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, canonicalDeck, deckPersistence) {
  if (!canonicalDeck) {
    throw new Error('SlideNextCanonicalDeck dependency is required');
  }

  const DEFAULT_SKIP_TAG_NAMES = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const DEFAULT_IGNORED_THEME_STYLE_IDS = new Set(['editor-style-tag']);
  const DEFAULT_SOURCE_IGNORED_NODE_IDS = ['editor-style-tag', 'editor-theme-override-tag'];
  const DEFAULT_SOURCE_TRANSIENT_CLASSES = ['editor-selected', 'editor-hoverable', 'editor-dragging'];
  const DEFAULT_IMPORTED_TRANSIENT_ATTRIBUTE_NAMES = new Set([
    'data-editor-id',
    'data-slide-id',
    'data-editor-hidden',
    'data-editor-locked',
    'data-editor-prev-display'
  ]);
  const STYLE_URL_PATTERN = /url\((?:'([^']*)'|"([^"]*)"|([^)]*))\)/gi;
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

  function normalizeStringArray(values) {
    if (!Array.isArray(values)) return [];
    return values.filter(value => typeof value === 'string' && value.trim() !== '');
  }

  function normalizeFiniteNumber(value, fallback = null) {
    return Number.isFinite(value) ? value : fallback;
  }

  function firstFiniteNumber(values, fallback = null) {
    for (const value of values) {
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return fallback;
  }

  function parsePixelValue(value) {
    if (typeof value !== 'string') return null;
    const match = /^(-?\d+(?:\.\d+)?)px$/i.exec(value.trim());
    return match ? Number(match[1]) : null;
  }

  function normalizeWhitespace(value) {
    return normalizeString(value).replace(/\s+/g, ' ').trim();
  }

  function extractCssUrlValues(value) {
    if (typeof value !== 'string' || !value.includes('url(')) {
      return [];
    }

    const urls = [];
    STYLE_URL_PATTERN.lastIndex = 0;
    let match = STYLE_URL_PATTERN.exec(value);
    while (match) {
      const nextUrl = normalizeString(match[1] || match[2] || match[3]).trim();
      if (nextUrl && !nextUrl.startsWith('#')) {
        urls.push(nextUrl);
      }
      match = STYLE_URL_PATTERN.exec(value);
    }

    return urls;
  }

  function extractSrcsetUrlValues(value) {
    if (typeof value !== 'string' || !value.trim()) {
      return [];
    }

    return value
      .split(',')
      .map((candidate) => normalizeString(candidate).trim())
      .filter(Boolean)
      .map((candidate) => normalizeString(candidate.split(/\s+/)[0]).trim())
      .filter((url) => url && !url.startsWith('#'));
  }

  function extractCustomPropertyMap(styleDeclaration) {
    const tokens = {};
    if (!styleDeclaration) {
      return tokens;
    }

    const styleLength = Number.isInteger(styleDeclaration.length)
      ? styleDeclaration.length
      : 0;
    if (styleLength > 0 && typeof styleDeclaration.getPropertyValue === 'function') {
      for (let index = 0; index < styleLength; index += 1) {
        const propertyName = normalizeString(
          styleDeclaration[index],
          typeof styleDeclaration.item === 'function' ? styleDeclaration.item(index) : ''
        ).trim();
        if (!propertyName.startsWith('--')) {
          continue;
        }
        const propertyValue = normalizeWhitespace(styleDeclaration.getPropertyValue(propertyName));
        if (propertyValue) {
          tokens[propertyName] = propertyValue;
        }
      }
      return tokens;
    }

    Object.entries(styleDeclaration).forEach(([propertyName, propertyValue]) => {
      if (!propertyName.startsWith('--')) {
        return;
      }
      const normalizedValue = normalizeWhitespace(propertyValue);
      if (normalizedValue) {
        tokens[propertyName] = normalizedValue;
      }
    });
    return tokens;
  }

  function mergeThemeTokensFromCssRule(rule, tokens) {
    if (!rule || !tokens) {
      return;
    }

    let nestedRules = [];
    try {
      nestedRules = Array.isArray(rule.cssRules)
        ? rule.cssRules
        : rule.cssRules && typeof rule.cssRules.length === 'number'
          ? Array.from(rule.cssRules)
          : [];
    } catch (err) {
      nestedRules = [];
    }
    nestedRules.forEach((nestedRule) => mergeThemeTokensFromCssRule(nestedRule, tokens));

    const selectorText = normalizeString(rule.selectorText).toLowerCase();
    if (!selectorText) {
      return;
    }
    const isRootRule = selectorText
      .split(',')
      .some((selector) => selector.trim() === ':root');
    if (!isRootRule) {
      return;
    }

    Object.assign(tokens, extractCustomPropertyMap(rule.style));
  }

  function collectDeckThemeTokens(doc) {
    const tokens = {};
    if (!doc) {
      return tokens;
    }

    Object.assign(tokens, extractCustomPropertyMap(doc.documentElement && doc.documentElement.style));
    Array.from(doc.styleSheets || []).forEach((styleSheet) => {
      let cssRules = [];
      try {
        cssRules = Array.from(styleSheet.cssRules || styleSheet.rules || []);
      } catch (err) {
        cssRules = [];
      }
      cssRules.forEach((rule) => mergeThemeTokensFromCssRule(rule, tokens));
    });

    return tokens;
  }

  function hasOnlyCustomPropertyDeclarations(styleDeclaration) {
    if (!styleDeclaration) {
      return false;
    }

    const propertyNames = [];
    const styleLength = Number.isInteger(styleDeclaration.length)
      ? styleDeclaration.length
      : 0;
    if (styleLength > 0) {
      for (let index = 0; index < styleLength; index += 1) {
        const propertyName = normalizeString(
          styleDeclaration[index],
          typeof styleDeclaration.item === 'function' ? styleDeclaration.item(index) : ''
        ).trim();
        if (propertyName) {
          propertyNames.push(propertyName);
        }
      }
    } else {
      Object.keys(styleDeclaration)
        .filter((propertyName) => propertyName.startsWith('--'))
        .forEach((propertyName) => propertyNames.push(propertyName));
    }

    return propertyNames.length > 0 && propertyNames.every((propertyName) => propertyName.startsWith('--'));
  }

  function shouldOmitThemeCssRule(rule, options = {}) {
    if (options.nested) {
      return false;
    }

    const selectorText = normalizeString(rule && rule.selectorText).toLowerCase();
    if (!selectorText) {
      return false;
    }

    const selectors = selectorText
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean);
    if (selectors.length === 0 || !selectors.every((selector) => selector === ':root')) {
      return false;
    }

    return hasOnlyCustomPropertyDeclarations(rule.style);
  }

  function serializeCssRule(rule, options = {}) {
    if (!rule) {
      return '';
    }
    if (shouldOmitThemeCssRule(rule, options)) {
      return '';
    }

    const cssText = normalizeString(rule.cssText).trim();
    if (cssText) {
      return cssText;
    }

    let nestedRules = [];
    try {
      nestedRules = Array.isArray(rule.cssRules)
        ? rule.cssRules
        : rule.cssRules && typeof rule.cssRules.length === 'number'
          ? Array.from(rule.cssRules)
          : [];
    } catch (err) {
      nestedRules = [];
    }
    return nestedRules
      .map((nestedRule) => serializeCssRule(nestedRule, { ...options, nested: true }))
      .filter(Boolean)
      .join('\n');
  }

  function collectDeckCustomCss(doc, options = {}) {
    if (!doc) {
      return '';
    }

    const ignoredStyleIds = options.ignoredStyleIds instanceof Set
      ? options.ignoredStyleIds
      : DEFAULT_IGNORED_THEME_STYLE_IDS;
    const cssBlocks = [];

    Array.from(doc.styleSheets || []).forEach((styleSheet) => {
      const ownerNodeId = normalizeString(styleSheet && styleSheet.ownerNode && styleSheet.ownerNode.id);
      if (ignoredStyleIds.has(ownerNodeId)) {
        return;
      }

      let cssRules = [];
      try {
        cssRules = Array.from(styleSheet.cssRules || styleSheet.rules || []);
      } catch (err) {
        cssRules = [];
      }

      const cssText = cssRules
        .map((rule) => serializeCssRule(rule))
        .filter(Boolean)
        .join('\n')
        .trim();
      if (cssText) {
        cssBlocks.push(cssText);
      }
    });

    return cssBlocks.join('\n\n');
  }

  function getGreatestCommonDivisor(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const remainder = x % y;
      x = y;
      y = remainder;
    }
    return x || 1;
  }

  function buildAspectRatio(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return '';
    }
    const roundedWidth = Math.round(width);
    const roundedHeight = Math.round(height);
    const gcd = getGreatestCommonDivisor(roundedWidth, roundedHeight);
    return `${roundedWidth / gcd}:${roundedHeight / gcd}`;
  }

  function extractAttributeMap(el) {
    const attributes = {};
    Array.from(el.attributes || []).forEach(attr => {
      attributes[attr.name] = attr.value;
    });
    return attributes;
  }

  function extractInlineScriptSeeds(rootEl, options = {}) {
    if (!rootEl || typeof rootEl.querySelectorAll !== 'function') {
      return [];
    }
    const idPrefix = normalizeString(options.idPrefix, 'inline-script').trim() || 'inline-script';
    const allScripts = Array.from(rootEl.querySelectorAll('script'));
    const scriptOrderMap = new Map(allScripts.map((scriptEl, index) => [scriptEl, index + 1]));

    return Array.from(rootEl.querySelectorAll('script:not([src])'))
      .map((scriptEl, index) => ({
        id: `${idPrefix}-${index + 1}`,
        content: normalizeString(scriptEl.textContent),
        attributes: extractAttributeMap(scriptEl),
        order: scriptOrderMap.get(scriptEl) || index + 1
      }))
      .filter((scriptSeed) => normalizeString(scriptSeed.content).trim() || Object.keys(asPlainObject(scriptSeed.attributes)).length > 0);
  }

  function resolveImportedBodyScaffoldHost(bodyEl, options = {}) {
    if (!bodyEl) {
      return null;
    }

    if (typeof bodyEl.querySelector === 'function') {
      const slidesContainer = bodyEl.querySelector('#slidesContainer');
      if (slidesContainer) {
        return slidesContainer;
      }
    }

    const slideSelector = normalizeString(options.slideSelector, '.slide').trim() || '.slide';
    const slideNodes = typeof bodyEl.querySelectorAll === 'function'
      ? Array.from(bodyEl.querySelectorAll(slideSelector))
      : [];
    if (slideNodes.length === 0) {
      return null;
    }

    const sharedParent = slideNodes[0] && slideNodes[0].parentElement
      ? slideNodes[0].parentElement
      : null;
    if (!sharedParent || sharedParent === bodyEl) {
      return null;
    }

    return slideNodes.every((slideNode) => slideNode && slideNode.parentElement === sharedParent)
      ? sharedParent
      : null;
  }

  function buildImportedBodyScaffoldHtml(bodyEl, options = {}) {
    if (!bodyEl || typeof bodyEl.cloneNode !== 'function') {
      return '';
    }

    const bodyClone = bodyEl.cloneNode(true);
    if (!bodyClone) {
      return '';
    }

    if (typeof bodyClone.querySelectorAll === 'function') {
      bodyClone.querySelectorAll('script').forEach((scriptEl) => {
        if (scriptEl && typeof scriptEl.remove === 'function') {
          scriptEl.remove();
        }
      });
    }

    const scaffoldHost = resolveImportedBodyScaffoldHost(bodyClone, options);
    if (!scaffoldHost || typeof scaffoldHost.innerHTML !== 'string') {
      return '';
    }

    scaffoldHost.innerHTML = BODY_SCAFFOLD_PLACEHOLDER;
    return normalizeString(bodyClone.innerHTML).trim();
  }

  function resolveImportedTransientClassNames(options = {}) {
    const additionalTransientClassNames = Array.isArray(options.transientClassNames)
      ? options.transientClassNames
      : [];
    return Array.from(new Set([
      ...DEFAULT_SOURCE_TRANSIENT_CLASSES,
      ...additionalTransientClassNames
        .map((className) => normalizeString(className).trim())
        .filter(Boolean)
    ]));
  }

  function sanitizeImportedClassNames(classNamesLike, options = {}) {
    const transientClassNames = new Set(resolveImportedTransientClassNames(options));
    const classNameTokens = Array.isArray(classNamesLike)
      ? classNamesLike
      : typeof classNamesLike === 'string'
        ? classNamesLike.split(/\s+/)
        : Array.from(classNamesLike || []);

    return classNameTokens
      .map((className) => normalizeString(className).trim())
      .filter((className) => className && !transientClassNames.has(className));
  }

  function sanitizeImportedClassNameString(className, options = {}) {
    return sanitizeImportedClassNames(className, options).join(' ');
  }

  function sanitizeImportedSlideBackgroundClassName(className, options = {}) {
    return sanitizeImportedClassNames(className, options)
      .filter((token) => token !== 'slide' && token !== 'slide-active')
      .join(' ');
  }

  function splitInlineStyleDeclarations(styleText = '') {
    const declarations = [];
    const sourceText = normalizeString(styleText);
    let current = '';
    let quote = '';
    let parenDepth = 0;

    for (let index = 0; index < sourceText.length; index += 1) {
      const char = sourceText[index];
      if (quote) {
        current += char;
        if (char === quote && sourceText[index - 1] !== '\\') {
          quote = '';
        }
        continue;
      }
      if (char === '"' || char === '\'') {
        quote = char;
        current += char;
        continue;
      }
      if (char === '(') {
        parenDepth += 1;
        current += char;
        continue;
      }
      if (char === ')' && parenDepth > 0) {
        parenDepth -= 1;
        current += char;
        continue;
      }
      if (char === ';' && parenDepth === 0) {
        const declaration = current.trim();
        if (declaration) {
          declarations.push(declaration);
        }
        current = '';
        continue;
      }
      current += char;
    }

    const trailingDeclaration = current.trim();
    if (trailingDeclaration) {
      declarations.push(trailingDeclaration);
    }
    return declarations;
  }

  function filterInlineStyleDeclarations(styleText = '', predicate = () => true) {
    return splitInlineStyleDeclarations(styleText)
      .filter((declaration) => {
        const separatorIndex = declaration.indexOf(':');
        if (separatorIndex === -1) {
          return false;
        }
        const propertyName = normalizeString(declaration.slice(0, separatorIndex)).trim().toLowerCase();
        const propertyValue = normalizeString(declaration.slice(separatorIndex + 1)).trim();
        return !!predicate(propertyName, propertyValue, declaration);
      })
      .map((declaration) => declaration.endsWith(';') ? declaration : `${declaration};`)
      .join(' ');
  }

  function findImportedStylePropertyValue(styleText = '', propertyName = '') {
    const normalizedPropertyName = normalizeString(propertyName).trim().toLowerCase();
    if (!normalizedPropertyName) {
      return '';
    }

    let matchedValue = '';
    splitInlineStyleDeclarations(styleText).forEach((declaration) => {
      const separatorIndex = declaration.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }
      const nextPropertyName = normalizeString(declaration.slice(0, separatorIndex)).trim().toLowerCase();
      if (nextPropertyName !== normalizedPropertyName) {
        return;
      }
      matchedValue = normalizeString(declaration.slice(separatorIndex + 1)).trim();
    });
    return matchedValue;
  }

  function hasImportedStyleProperty(styleText = '', propertyName = '') {
    const normalizedPropertyName = normalizeString(propertyName).trim().toLowerCase();
    if (!normalizedPropertyName) {
      return false;
    }

    return splitInlineStyleDeclarations(styleText).some((declaration) => {
      const separatorIndex = declaration.indexOf(':');
      if (separatorIndex === -1) {
        return false;
      }
      return normalizeString(declaration.slice(0, separatorIndex)).trim().toLowerCase() === normalizedPropertyName;
    });
  }

  function isImportedSlideBackgroundStyleProperty(propertyName = '') {
    const normalizedPropertyName = normalizeString(propertyName).trim().toLowerCase();
    return normalizedPropertyName === 'background' || normalizedPropertyName.startsWith('background-');
  }

  function isImportedStructuredSlideBackgroundStyleProperty(propertyName = '') {
    const normalizedPropertyName = normalizeString(propertyName).trim().toLowerCase();
    return normalizedPropertyName === 'background-color' || normalizedPropertyName === 'background-image';
  }

  function extractImportedSlideBackgroundStyle(styleText = '') {
    return filterInlineStyleDeclarations(
      styleText,
      (propertyName) => isImportedSlideBackgroundStyleProperty(propertyName)
        && !isImportedStructuredSlideBackgroundStyleProperty(propertyName)
    );
  }

  function stripImportedSlideBackgroundStyle(styleText = '') {
    return filterInlineStyleDeclarations(
      styleText,
      (propertyName) => !isImportedSlideBackgroundStyleProperty(propertyName)
    );
  }

  function isImportedNodeLayoutStyleProperty(propertyName = '') {
    const normalizedPropertyName = normalizeString(propertyName).trim().toLowerCase();
    return normalizedPropertyName === 'position'
      || normalizedPropertyName === 'left'
      || normalizedPropertyName === 'top'
      || normalizedPropertyName === 'width'
      || normalizedPropertyName === 'height'
      || normalizedPropertyName === 'z-index';
  }

  function stripImportedNodeLayoutStyle(styleText = '', layout = {}) {
    if (normalizeString(layout && layout.mode) !== 'absolute') {
      return normalizeString(styleText).trim();
    }
    return filterInlineStyleDeclarations(
      styleText,
      (propertyName) => !isImportedNodeLayoutStyleProperty(propertyName)
    );
  }

  function stripImportedNodeHiddenStyle(styleText = '', visibility = {}) {
    if (!visibility || !visibility.hidden) {
      return normalizeString(styleText).trim();
    }
    return filterInlineStyleDeclarations(
      styleText,
      (propertyName, propertyValue) => {
        const normalizedPropertyName = normalizeString(propertyName).trim().toLowerCase();
        const normalizedPropertyValue = normalizeString(propertyValue).trim().toLowerCase();
        if (normalizedPropertyName === 'display' && normalizedPropertyValue === 'none') {
          return false;
        }
        if (normalizedPropertyName === 'visibility' && normalizedPropertyValue === 'hidden') {
          return false;
        }
        return true;
      }
    );
  }

  function sanitizeImportedAttributeMap(el, options = {}) {
    const transientAttributeNames = options.transientAttributeNames instanceof Set
      ? options.transientAttributeNames
      : DEFAULT_IMPORTED_TRANSIENT_ATTRIBUTE_NAMES;
    const attributes = {};

    Array.from(el && el.attributes ? el.attributes : []).forEach((attr) => {
      if (!attr || transientAttributeNames.has(attr.name)) {
        return;
      }
      if (attr.name === 'class') {
        const className = sanitizeImportedClassNameString(attr.value, options);
        if (className) {
          attributes.class = className;
        }
        return;
      }
      attributes[attr.name] = attr.value;
    });

    return attributes;
  }

  function stripCanonicalNodeAttributeDuplicates(attributes = {}, visibility = {}) {
    const nextAttributes = { ...attributes };
    delete nextAttributes.class;
    delete nextAttributes.style;
    if (visibility && visibility.hidden) {
      delete nextAttributes.hidden;
      delete nextAttributes['aria-hidden'];
      delete nextAttributes['data-editor-hidden'];
    }
    if (visibility && visibility.locked) {
      delete nextAttributes['data-editor-locked'];
    }
    return nextAttributes;
  }

  function stripOpeningTagAttributeText(attributeText = '', attributeNames = []) {
    return attributeNames.reduce((nextAttributeText, attributeName) => nextAttributeText.replace(
      new RegExp(`\\s${attributeName}(?:=(?:"[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'),
      ''
    ), normalizeString(attributeText));
  }

  function stripCanonicalNodeSourceHtmlDuplicates(sourceHtml = '', attributes = {}, visibility = {}) {
    const nextSourceHtml = normalizeString(sourceHtml);
    if (!nextSourceHtml) {
      return nextSourceHtml;
    }

    const attributeNames = ['class', 'style', ...Object.keys(asPlainObject(attributes))];
    if (visibility && visibility.hidden) {
      attributeNames.push('hidden', 'aria-hidden', 'data-editor-hidden');
    }
    if (visibility && visibility.locked) {
      attributeNames.push('data-editor-locked');
    }

    const openingTagMatch = nextSourceHtml.match(/^<([a-z][^\s/>]*)([^>]*?)(\/?)>/i);
    if (!openingTagMatch) {
      return nextSourceHtml;
    }

    const rebuiltOpeningTag = `<${openingTagMatch[1]}${stripOpeningTagAttributeText(openingTagMatch[2], attributeNames)}${openingTagMatch[3] || ''}>`;
    return rebuiltOpeningTag + nextSourceHtml.slice(openingTagMatch[0].length);
  }

  function stripCanonicalSlideAttributeDuplicates(attributes = {}) {
    const nextAttributes = { ...attributes };
    delete nextAttributes.id;
    delete nextAttributes.class;
    delete nextAttributes.style;
    delete nextAttributes['aria-label'];
    delete nextAttributes['data-slide-name'];
    delete nextAttributes['data-slide-section'];
    delete nextAttributes['data-speaker-notes'];
    delete nextAttributes['data-notes'];
    return nextAttributes;
  }

  function stripCanonicalSlideSourceHtmlDuplicates(sourceHtml = '', attributes = {}) {
    const nextSourceHtml = normalizeString(sourceHtml);
    if (!nextSourceHtml) {
      return nextSourceHtml;
    }

    const openingTagMatch = nextSourceHtml.match(/^<([a-z][^\s/>]*)([^>]*?)(\/?)>/i);
    if (!openingTagMatch) {
      return nextSourceHtml;
    }

    const rebuiltOpeningTag = `<${openingTagMatch[1]}${stripOpeningTagAttributeText(openingTagMatch[2], [
      'id',
      'class',
      'style',
      'aria-label',
      'data-slide-name',
      'data-slide-section',
      'data-speaker-notes',
      'data-notes',
      ...Object.keys(asPlainObject(attributes))
    ])}${openingTagMatch[3] || ''}>`;
    return rebuiltOpeningTag + nextSourceHtml.slice(openingTagMatch[0].length);
  }

  function sanitizeImportedDomNode(node, options = {}) {
    if (!node) {
      return;
    }

    const transientAttributeNames = options.transientAttributeNames instanceof Set
      ? options.transientAttributeNames
      : DEFAULT_IMPORTED_TRANSIENT_ATTRIBUTE_NAMES;
    const transientClassNames = resolveImportedTransientClassNames(options);

    if (node.classList && typeof node.classList.remove === 'function') {
      transientClassNames.forEach((className) => {
        node.classList.remove(className);
      });
    }

    if (typeof node.getAttribute === 'function') {
      const className = sanitizeImportedClassNameString(node.getAttribute('class'), options);
      if (className) {
        if (typeof node.setAttribute === 'function') {
          node.setAttribute('class', className);
        }
      } else if (typeof node.removeAttribute === 'function') {
        node.removeAttribute('class');
      }
    }

    if (typeof node.removeAttribute === 'function') {
      transientAttributeNames.forEach((attributeName) => {
        node.removeAttribute(attributeName);
      });
    }
  }

  function sanitizeImportedElementClone(el, options = {}) {
    if (!el || typeof el.cloneNode !== 'function') {
      return null;
    }

    const clone = el.cloneNode(true);
    sanitizeImportedDomNode(clone, options);

    if (clone && typeof clone.querySelectorAll === 'function') {
      Array.from(clone.querySelectorAll('*')).forEach((descendant) => {
        sanitizeImportedDomNode(descendant, options);
      });
    }

    sanitizeDeckSourceClone(clone, options);
    return clone;
  }

  function buildImportedSourceHtml(el, options = {}) {
    if (options.includeSourceHtml === false) {
      return '';
    }

    const sourceClone = sanitizeImportedElementClone(el, options);
    return sourceClone && typeof sourceClone.outerHTML === 'string'
      ? sourceClone.outerHTML
      : normalizeString(el && el.outerHTML);
  }

  function extractDirectText(el) {
    if (!el || !el.childNodes) return '';
    return normalizeWhitespace(
      Array.from(el.childNodes)
        .filter(node => node.nodeType === 3)
        .map(node => node.textContent || '')
        .join(' ')
    );
  }

  function inferImportedNodeType(el) {
    const tagName = el.tagName.toLowerCase();
    if (el.getAttribute('data-editor-group') === 'true') return 'group';
    if (/^h[1-6]$/.test(tagName)) return 'heading';
    if (tagName === 'p' || tagName === 'span' || tagName === 'li' || tagName === 'blockquote') return 'text';
    if (tagName === 'img') return 'image';
    if (tagName === 'table') return 'table';
    if (tagName === 'pre' || tagName === 'code') return 'code';
    if (tagName === 'svg') return 'vector';
    if (tagName === 'video' || tagName === 'audio' || tagName === 'iframe') return 'embed';
    if (el.classList.contains('editor-shape')) return 'shape';
    return el.children.length > 0 ? 'container' : 'html';
  }

  function buildImportedNodeName(el) {
    const tagName = el.tagName.toLowerCase();
    const text = normalizeWhitespace(el.textContent || '');
    if (tagName === 'img') {
      const src = normalizeString(el.getAttribute('src'));
      const srcParts = src.split('/');
      return srcParts[srcParts.length - 1] || 'Image';
    }
    if (/^h[1-6]$/.test(tagName) && text) {
      return `Heading: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`;
    }
    if (text) {
      return `${tagName.toUpperCase()}: "${text.slice(0, 40)}${text.length > 40 ? '...' : ''}"`;
    }
    return tagName.toUpperCase();
  }

  function shouldImportElement(el, options = {}) {
    if (!el || !el.tagName) return false;
    const skipTagNames = options.skipTagNames instanceof Set
      ? options.skipTagNames
      : DEFAULT_SKIP_TAG_NAMES;
    return !skipTagNames.has(el.tagName.toUpperCase());
  }

  function buildImportedLayout(el, win) {
    const computedStyle = win && typeof win.getComputedStyle === 'function'
      ? win.getComputedStyle(el)
      : null;
    const inlineStyle = el.style || {};
    const position = normalizeString(inlineStyle.position || (computedStyle && computedStyle.position));
    const isAbsoluteLayout = position === 'absolute' || position === 'fixed';

    return {
      mode: isAbsoluteLayout
        ? 'absolute'
        : canonicalDeck.DEFAULT_LAYOUT_MODE,
      x: isAbsoluteLayout
        ? firstFiniteNumber([
            parsePixelValue(inlineStyle.left || ''),
            parsePixelValue(computedStyle ? computedStyle.left : '')
          ])
        : null,
      y: isAbsoluteLayout
        ? firstFiniteNumber([
            parsePixelValue(inlineStyle.top || ''),
            parsePixelValue(computedStyle ? computedStyle.top : '')
          ])
        : null,
      width: isAbsoluteLayout
        ? firstFiniteNumber([
            parsePixelValue(inlineStyle.width || ''),
            parsePixelValue(computedStyle ? computedStyle.width : '')
          ])
        : null,
      height: isAbsoluteLayout
        ? firstFiniteNumber([
            parsePixelValue(inlineStyle.height || ''),
            parsePixelValue(computedStyle ? computedStyle.height : '')
          ])
        : null,
      zIndex: isAbsoluteLayout
        ? firstFiniteNumber([
            Number.parseInt(inlineStyle.zIndex || '', 10),
            Number.parseInt(computedStyle ? computedStyle.zIndex : '', 10)
          ], 0)
        : 0
    };
  }

  function getImportedComputedStyle(el, options = {}) {
    const win = options.window || (el && el.ownerDocument && el.ownerDocument.defaultView) || null;
    if (!win || typeof win.getComputedStyle !== 'function') return null;
    try {
      return win.getComputedStyle(el);
    } catch (error) {
      return null;
    }
  }

  function readImportedStyleValue(style, propertyName) {
    if (!style) return '';
    if (typeof style.getPropertyValue === 'function') {
      const value = normalizeString(style.getPropertyValue(propertyName));
      if (value) return value;
    }
    const camelCaseName = propertyName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    return normalizeString(style[propertyName] || style[camelCaseName]);
  }

  function isImportedTransparentColor(value) {
    const normalizedValue = normalizeString(value).trim().toLowerCase();
    return !normalizedValue
      || normalizedValue === 'transparent'
      || /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*0(?:\.0+)?\s*\)$/i.test(normalizedValue);
  }

  function buildImportedComputedNodeBackgroundStyle(el, inlineStyleText, options = {}) {
    const computedStyle = getImportedComputedStyle(el, options);
    if (!computedStyle) {
      return '';
    }

    const declarations = [];
    const hasInlineBackground = hasImportedStyleProperty(inlineStyleText, 'background')
      || hasImportedStyleProperty(inlineStyleText, 'background-image');
    const hasInlineBackgroundColor = hasImportedStyleProperty(inlineStyleText, 'background')
      || hasImportedStyleProperty(inlineStyleText, 'background-color');
    const computedBackgroundColor = readImportedStyleValue(computedStyle, 'background-color');
    if (!hasInlineBackgroundColor && !isImportedTransparentColor(computedBackgroundColor)) {
      declarations.push(`background-color: ${computedBackgroundColor};`);
    }
    const computedBackgroundImage = normalizeImportedComputedCssValue(
      readImportedStyleValue(computedStyle, 'background-image'),
      options
    );
    if (!hasInlineBackground && computedBackgroundImage && computedBackgroundImage.toLowerCase() !== 'none') {
      declarations.push(`background-image: ${computedBackgroundImage};`);
    }

    [
      ['background-size', /^(?:cover|contain)$/i],
      ['background-position', /^(?:center|center\s+center)$/i],
      ['background-repeat', /^no-repeat$/i]
    ].forEach(([propertyName, supportedValuePattern]) => {
      if (hasImportedStyleProperty(inlineStyleText, propertyName)) {
        return;
      }
      const value = readImportedStyleValue(computedStyle, propertyName);
      if (supportedValuePattern.test(value)) {
        declarations.push(`${propertyName}: ${value};`);
      }
    });

    return declarations.join(' ');
  }

  function normalizeImportedComputedCssValue(value, options = {}) {
    const source = normalizeString(value);
    if (!source || !/url\(/i.test(source)) return source;
    const sourcePath = normalizeString(options.sourcePath).replace(/^[/\\]+/, '');
    const sourceDirectoryEnd = sourcePath.lastIndexOf('/');
    const sourceDirectory = sourceDirectoryEnd >= 0 ? sourcePath.slice(0, sourceDirectoryEnd) : '';
    if (!sourceDirectory || typeof URL !== 'function') return source;

    return source.replace(/url\(\s*(?:'([^']*)'|"([^"]*)"|([^)]*))\s*\)/gi, (match, single, double, bare) => {
      const urlValue = normalizeString(single || double || bare);
      if (!/^https?:\/\//i.test(urlValue)) return match;
      try {
        const absolutePath = decodeURIComponent(new URL(urlValue).pathname).replace(/^[/\\]+/, '');
        if (absolutePath.startsWith(`${sourceDirectory}/`)) {
          return `url("${absolutePath.slice(sourceDirectory.length + 1)}")`;
        }
      } catch (error) {
        return match;
      }
      return match;
    });
  }

  function buildImportedVisibility(el, win) {
    const hasHiddenClass = !!(el && el.classList && typeof el.classList.contains === 'function' && el.classList.contains('hidden'));
    return {
      hidden: !!el.hidden
        || hasHiddenClass
        || el.getAttribute('aria-hidden') === 'true'
        || el.getAttribute('data-editor-hidden') === 'true'
        || normalizeString(el.style && el.style.display) === 'none'
        || normalizeString(el.style && el.style.visibility) === 'hidden',
      locked: el.getAttribute('data-editor-locked') === 'true'
    };
  }

  function importElementToCanonicalNode(el, options = {}, context = {}) {
    const win = options.window || (el.ownerDocument && el.ownerDocument.defaultView) || null;
    const childElements = Array.from(el.children || []).filter(child => shouldImportElement(child, options));
    const fallbackNodeId = context.path && context.path.length > 0
      ? `${context.slideId || 'slide'}-node-${context.path.join('-')}`
      : `node-${(context.nodeIndex || 0) + 1}`;
    const importedLayout = buildImportedLayout(el, win);
    const visibility = buildImportedVisibility(el, win);
    const attributes = stripCanonicalNodeAttributeDuplicates(sanitizeImportedAttributeMap(el, options), visibility);
    const inlineStyleText = normalizeString(el.getAttribute('style'));
    const importedStyleText = stripImportedNodeHiddenStyle(
      stripImportedNodeLayoutStyle(inlineStyleText, importedLayout),
      visibility
    );
    const computedBackgroundStyleText = buildImportedComputedNodeBackgroundStyle(el, inlineStyleText, options);
    const canonicalStyleText = [importedStyleText, computedBackgroundStyleText]
      .filter(Boolean)
      .join(' ');

    return canonicalDeck.createCanonicalNode({
      id: typeof options.getNodeId === 'function'
        ? options.getNodeId(el, context)
        : fallbackNodeId,
      type: inferImportedNodeType(el),
      name: buildImportedNodeName(el),
      tagName: el.tagName.toLowerCase(),
      text: normalizeWhitespace(childElements.length === 0 ? (el.textContent || '') : extractDirectText(el)),
      html: stripCanonicalNodeSourceHtmlDuplicates(buildImportedSourceHtml(el, options), attributes, visibility),
      classes: sanitizeImportedClassNames(el.classList || [], options),
      attributes,
      style: canonicalStyleText,
      layout: importedLayout,
      visibility,
      children: childElements.map((child, childIndex) => importElementToCanonicalNode(child, options, {
        slideId: context.slideId,
        nodeIndex: childIndex,
        path: (context.path || []).concat(childIndex + 1)
      }))
    });
  }

  function inferSlideTitle(slide, index, options = {}) {
    if (typeof options.getSlideTitle === 'function') {
      const title = options.getSlideTitle(slide, index);
      if (typeof title === 'string' && title.trim()) {
        return title.trim();
      }
    }

    const titleSelector = normalizeString(options.slideTitleSelector, 'h1, h2, h3');
    const heading = slide.querySelector(titleSelector);
    if (heading) {
      const headingText = normalizeWhitespace(heading.textContent || '');
      if (headingText) return headingText;
    }

    const ariaLabel = normalizeWhitespace(slide.getAttribute('aria-label') || '');
    return ariaLabel || `Slide ${index + 1}`;
  }

  function importSlideToCanonicalSlide(slide, index, options = {}) {
    const slideId = typeof options.getSlideId === 'function'
      ? options.getSlideId(slide, index)
      : normalizeString(slide.id || slide.getAttribute('data-slide-id'), `slide-${index + 1}`);
    const childElements = Array.from(slide.children || []).filter(child => shouldImportElement(child, options));
    const title = inferSlideTitle(slide, index, options);
    const sourceAttributes = stripCanonicalSlideAttributeDuplicates(sanitizeImportedAttributeMap(slide, options));
    const inlineStyleText = normalizeString(slide.getAttribute('style'));
    const computedStyle = getImportedComputedStyle(slide, options);
    const computedBackgroundImage = normalizeImportedComputedCssValue(
      readImportedStyleValue(computedStyle, 'background-image'),
      options
    );
    const backgroundStyleText = [
      extractImportedSlideBackgroundStyle(inlineStyleText),
      ...['background-size', 'background-position', 'background-repeat']
        .map((propertyName) => ({
          propertyName,
          value: readImportedStyleValue(computedStyle, propertyName)
        }))
        .filter(({ propertyName, value }) => {
          if (findImportedStylePropertyValue(inlineStyleText, propertyName)) return false;
          if (propertyName === 'background-size') return /^(?:cover|contain)$/i.test(value);
          if (propertyName === 'background-position') return /^(?:center|center\s+center)$/i.test(value);
          return value.toLowerCase() === 'no-repeat';
        })
        .map(({ propertyName, value }) => `${propertyName}: ${value};`)
    ].filter(Boolean).join(' ');
    const sourceStyleText = stripImportedSlideBackgroundStyle(inlineStyleText);
    const backgroundColor = normalizeString(slide.style && slide.style.backgroundColor)
      || findImportedStylePropertyValue(inlineStyleText, 'background-color')
      || (() => {
        const computedColor = readImportedStyleValue(computedStyle, 'background-color');
        return computedColor && computedColor !== 'transparent'
          && !/^rgba\([^)]*,\s*0\s*\)$/i.test(computedColor)
          ? computedColor
          : '';
      })();
    const backgroundImage = normalizeString(slide.style && slide.style.backgroundImage)
      || findImportedStylePropertyValue(inlineStyleText, 'background-image')
      || (computedBackgroundImage.toLowerCase() === 'none' ? '' : computedBackgroundImage);
    if (sourceStyleText) {
      sourceAttributes.style = sourceStyleText;
    }

    return canonicalDeck.createCanonicalSlide({
      id: slideId,
      name: normalizeString(slide.getAttribute('data-slide-name'), title),
      title,
      section: normalizeString(slide.getAttribute('data-slide-section')),
      notes: normalizeString(slide.getAttribute('data-speaker-notes') || slide.getAttribute('data-notes')),
      layout: {
        mode: canonicalDeck.DEFAULT_LAYOUT_MODE,
        background: {
          color: backgroundColor,
          image: backgroundImage,
          className: sanitizeImportedSlideBackgroundClassName(slide.className, options),
          style: backgroundStyleText
        }
      },
      nodes: childElements.map((child, childIndex) => importElementToCanonicalNode(child, options, {
        slideId,
        nodeIndex: childIndex,
        path: [childIndex + 1]
      })),
      source: {
        html: stripCanonicalSlideSourceHtmlDuplicates(buildImportedSourceHtml(slide, options), sourceAttributes),
        attributes: sourceAttributes
      }
    });
  }

  function inferDeckLayout(doc, slides, options = {}) {
    const layoutSeed = asPlainObject(options.layout);
    const firstSlide = slides[0] || null;
    const win = options.window || (doc && doc.defaultView) || null;
    const computedStyle = firstSlide && win && typeof win.getComputedStyle === 'function'
      ? win.getComputedStyle(firstSlide)
      : null;
    const width = firstFiniteNumber([
      normalizeFiniteNumber(layoutSeed.size && layoutSeed.size.width),
      parsePixelValue(computedStyle ? computedStyle.width : '')
    ]);
    const height = firstFiniteNumber([
      normalizeFiniteNumber(layoutSeed.size && layoutSeed.size.height),
      parsePixelValue(computedStyle ? computedStyle.height : '')
    ]);

    return {
      mode: normalizeString(layoutSeed.mode, canonicalDeck.DEFAULT_LAYOUT_MODE),
      size: {
        width,
        height,
        unit: normalizeString(layoutSeed.size && layoutSeed.size.unit, 'px')
      },
      aspectRatio: normalizeString(layoutSeed.aspectRatio, buildAspectRatio(width, height))
    };
  }

  function inferAssetType(el) {
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'img') return 'image';
    if (tagName === 'video') return 'video';
    if (tagName === 'audio' || tagName === 'source') return 'audio';
    if (tagName === 'script') return 'script';
    if (tagName === 'link') {
      const rel = normalizeString(el.getAttribute('rel')).toLowerCase();
      if (rel.split(/\s+/).includes('stylesheet')) return 'stylesheet';
      if (rel.split(/\s+/).includes('preload')) {
        const asType = normalizeString(el.getAttribute('as')).toLowerCase();
        switch (asType) {
          case 'style': return 'stylesheet';
          case 'script': return 'script';
          case 'image': return 'image';
          case 'video': return 'video';
          case 'audio': return 'audio';
          case 'font': return 'font';
          default:
            return inferAssetTypeFromUrl(el.getAttribute('href'));
        }
      }
    }
    return 'file';
  }

  function buildAssetName(url) {
    const cleanUrl = normalizeString(url).split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1] || cleanUrl || 'asset';
  }

  function inferAssetTypeFromUrl(url, fallbackType = 'file') {
    const cleanUrl = normalizeString(url).split('?')[0].split('#')[0].toLowerCase();
    const extension = cleanUrl.includes('.')
      ? cleanUrl.split('.').pop()
      : '';

    switch (extension) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
      case 'avif':
        return 'image';
      case 'mp4':
      case 'webm':
      case 'ogv':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'm4a':
      case 'aac':
      case 'flac':
        return 'audio';
      case 'woff':
      case 'woff2':
      case 'ttf':
      case 'otf':
      case 'eot':
        return 'font';
      case 'css':
        return 'stylesheet';
      case 'js':
      case 'mjs':
        return 'script';
      default:
        return fallbackType;
    }
  }

  function inferAssetMimeType(seed = {}) {
    const assetType = normalizeString(seed.type).toLowerCase();
    const explicitMimeType = normalizeString(seed.mimeType || seed.typeAttribute).trim().toLowerCase();
    if (explicitMimeType.includes('/')) {
      return explicitMimeType;
    }

    const cleanUrl = normalizeString(seed.src).split('?')[0].split('#')[0].toLowerCase();
    const extension = cleanUrl.includes('.')
      ? cleanUrl.split('.').pop()
      : '';

    switch (extension) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'gif': return 'image/gif';
      case 'webp': return 'image/webp';
      case 'svg': return 'image/svg+xml';
      case 'avif': return 'image/avif';
      case 'mp4': return 'video/mp4';
      case 'webm': return 'video/webm';
      case 'ogv': return 'video/ogg';
      case 'mp3': return 'audio/mpeg';
      case 'wav': return 'audio/wav';
      case 'ogg': return assetType === 'video' ? 'video/ogg' : 'audio/ogg';
      case 'm4a': return 'audio/mp4';
      case 'aac': return 'audio/aac';
      case 'flac': return 'audio/flac';
      case 'woff': return 'font/woff';
      case 'woff2': return 'font/woff2';
      case 'ttf': return 'font/ttf';
      case 'otf': return 'font/otf';
      case 'eot': return 'application/vnd.ms-fontobject';
      case 'css': return 'text/css';
      case 'js':
      case 'mjs': return 'application/javascript';
      default:
        if (assetType === 'stylesheet') return 'text/css';
        if (assetType === 'script') return 'application/javascript';
        return '';
    }
  }

  function hasElementAttribute(el, attributeName) {
    if (!el || typeof attributeName !== 'string' || !attributeName) {
      return false;
    }
    if (typeof el.hasAttribute === 'function') {
      return el.hasAttribute(attributeName);
    }
    return Array.isArray(el.attributes)
      ? el.attributes.some((attribute) => normalizeString(attribute && attribute.name) === attributeName)
      : false;
  }

  function readElementAttributeIfPresent(el, attributeName) {
    if (!hasElementAttribute(el, attributeName) || typeof el.getAttribute !== 'function') {
      return null;
    }
    return el.getAttribute(attributeName);
  }

  function inferImportedScriptLocation(el) {
    if (!el || normalizeString(el.tagName).toLowerCase() !== 'script') {
      return '';
    }

    if (typeof el.closest === 'function') {
      const headAncestor = el.closest('head');
      if (headAncestor) {
        return 'head';
      }
      const bodyAncestor = el.closest('body');
      if (bodyAncestor) {
        return 'body';
      }
    }

    const parentTagName = normalizeString(el.parentElement && el.parentElement.tagName).toLowerCase();
    if (parentTagName === 'head' || parentTagName === 'body') {
      return parentTagName;
    }

    return '';
  }

  function inferImportedScriptOrder(el) {
    if (!el || normalizeString(el.tagName).toLowerCase() !== 'script') {
      return null;
    }

    const parentEl = el.parentElement || null;
    if (!parentEl || typeof parentEl.querySelectorAll !== 'function') {
      return null;
    }

    const scripts = Array.from(parentEl.querySelectorAll('script'));
    const scriptIndex = scripts.indexOf(el);
    return scriptIndex >= 0 ? scriptIndex + 1 : null;
  }

  function buildImportedAssetMeta(el) {
    const tagName = normalizeString(el && el.tagName).toLowerCase();
    if (tagName !== 'link' && tagName !== 'script') {
      return null;
    }

    const meta = {};
    if (tagName === 'link') {
      ['media', 'crossorigin', 'integrity', 'referrerpolicy'].forEach((attributeName) => {
        const attributeValue = readElementAttributeIfPresent(el, attributeName);
        if (attributeValue === null) {
          return;
        }

        const normalizedValue = normalizeString(attributeValue).trim();
        if (attributeName === 'crossorigin') {
          meta[attributeName] = normalizedValue || true;
          return;
        }
        if (normalizedValue) {
          meta[attributeName] = normalizedValue;
        }
      });
    }

    if (tagName === 'script') {
      ['type', 'crossorigin', 'integrity', 'referrerpolicy'].forEach((attributeName) => {
        const attributeValue = readElementAttributeIfPresent(el, attributeName);
        if (attributeValue === null) {
          return;
        }

        const normalizedValue = normalizeString(attributeValue).trim();
        if (attributeName === 'crossorigin') {
          meta[attributeName] = normalizedValue || true;
          return;
        }
        if (normalizedValue) {
          meta[attributeName] = normalizedValue;
        }
      });

      ['async', 'defer', 'nomodule'].forEach((attributeName) => {
        if (hasElementAttribute(el, attributeName)) {
          meta[attributeName] = true;
        }
      });

      const location = inferImportedScriptLocation(el);
      if (location) {
        meta.location = location;
      }
      const order = inferImportedScriptOrder(el);
      if (Number.isFinite(order)) {
        meta.order = order;
      }
    }

    return Object.keys(meta).length > 0 ? meta : null;
  }

  function appendDeckAsset(assetSeeds, seenUrls, seed = {}) {
    const src = normalizeString(seed.src);
    if (!src || seenUrls.has(src)) {
      return;
    }
    seenUrls.add(src);
    const asset = {
      id: `asset-${assetSeeds.length + 1}`,
      type: normalizeString(seed.type, 'file'),
      name: normalizeString(seed.name, buildAssetName(src)),
      src,
      mimeType: inferAssetMimeType(seed)
    };
    const meta = asPlainObject(seed.meta);
    if (Object.keys(meta).length > 0) {
      asset.meta = meta;
    }
    assetSeeds.push(asset);
  }

  function appendDeckCssRuleAssets(rule, assetSeeds, seenUrls) {
    if (!rule) {
      return;
    }

    extractCssUrlValues(normalizeString(rule.cssText)).forEach((src) => {
      appendDeckAsset(assetSeeds, seenUrls, {
        type: inferAssetTypeFromUrl(src),
        src
      });
    });

    let nestedRules = [];
    try {
      nestedRules = Array.isArray(rule.cssRules)
        ? rule.cssRules
        : rule.cssRules && typeof rule.cssRules.length === 'number'
          ? Array.from(rule.cssRules)
          : [];
    } catch (err) {
      nestedRules = [];
    }
    nestedRules.forEach((nestedRule) => appendDeckCssRuleAssets(nestedRule, assetSeeds, seenUrls));
  }

  function collectDeckAssets(doc) {
    const assetSeeds = [];
    const seenUrls = new Set();
    const assetSelectors = [
      'img[src]',
      'video[src]',
      'audio[src]',
      'source[src]',
      'script[src]',
      'link[rel~="stylesheet"][href]',
      'link[rel~="preload"][href]',
      'video[poster]'
    ];

    doc.querySelectorAll(assetSelectors.join(', ')).forEach((el) => {
      appendDeckAsset(assetSeeds, seenUrls, {
        type: el.tagName && el.tagName.toLowerCase() === 'video' && el.getAttribute('poster')
          ? 'image'
          : inferAssetType(el),
        src: el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('poster'),
        typeAttribute: el.getAttribute('type'),
        meta: buildImportedAssetMeta(el)
      });
    });

    doc.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
      extractSrcsetUrlValues(normalizeString(el.getAttribute('srcset'))).forEach((src) => {
        appendDeckAsset(assetSeeds, seenUrls, {
          type: 'image',
          src
        });
      });
    });

    doc.querySelectorAll('[style*="url("]').forEach((el) => {
      extractCssUrlValues(normalizeString(el.getAttribute('style'))).forEach((src) => {
        appendDeckAsset(assetSeeds, seenUrls, {
          type: 'image',
          src
        });
      });
    });

    const ignoredStyleIds = DEFAULT_IGNORED_THEME_STYLE_IDS;
    Array.from(doc.styleSheets || []).forEach((styleSheet) => {
      const ownerNodeId = normalizeString(styleSheet && styleSheet.ownerNode && styleSheet.ownerNode.id);
      if (ignoredStyleIds.has(ownerNodeId)) {
        return;
      }

      let cssRules = [];
      try {
        cssRules = Array.from(styleSheet.cssRules || styleSheet.rules || []);
      } catch (err) {
        cssRules = [];
      }
      cssRules.forEach((rule) => appendDeckCssRuleAssets(rule, assetSeeds, seenUrls));
    });

    return assetSeeds;
  }

  function queryDocumentAttribute(doc, selector, attributeName) {
    if (!doc || typeof doc.querySelector !== 'function') {
      return '';
    }
    const node = doc.querySelector(selector);
    if (!node || typeof node.getAttribute !== 'function') {
      return '';
    }
    return normalizeString(node.getAttribute(attributeName)).trim();
  }

  function parseMetadataTagList(value) {
    if (typeof value !== 'string') {
      return [];
    }
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  function buildDeckMetadata(doc, options = {}) {
    const metadata = asPlainObject(options.presentationMetadata);
    const titleNode = doc.querySelector('title');
    const fallbackDescription = queryDocumentAttribute(doc, 'meta[name="description"]', 'content')
      || queryDocumentAttribute(doc, 'meta[property="og:description"]', 'content');
    const fallbackIcon = queryDocumentAttribute(doc, 'link[rel~="icon"][href]', 'href');
    const fallbackTags = parseMetadataTagList(queryDocumentAttribute(doc, 'meta[name="keywords"]', 'content'));
    const metadataTags = normalizeStringArray(metadata.tags);

    return {
      id: normalizeString(metadata.id),
      title: normalizeString(metadata.title, normalizeString(titleNode && titleNode.textContent)),
      subtitle: normalizeString(metadata.subtitle),
      description: normalizeString(metadata.description, fallbackDescription),
      icon: normalizeString(metadata.icon, fallbackIcon),
      tags: metadataTags.length > 0 ? metadataTags : fallbackTags,
      sourcePath: normalizeString(options.sourcePath, normalizeString(metadata.url))
    };
  }

  function resolveDocumentElement(docOrElement) {
    if (!docOrElement) return null;
    if (docOrElement.documentElement) {
      return docOrElement.documentElement;
    }
    return docOrElement;
  }

  function buildDocumentHtml(docOrElement) {
    const documentElement = resolveDocumentElement(docOrElement);
    if (!documentElement) return '';
    return '<!DOCTYPE html>\n' + documentElement.outerHTML;
  }

  function resolveDeckPersistenceStripper(options = {}) {
    if (typeof options.stripTransientDeckRuntimeState === 'function') {
      return options.stripTransientDeckRuntimeState;
    }
    if (deckPersistence && typeof deckPersistence.stripTransientDeckRuntimeState === 'function') {
      return deckPersistence.stripTransientDeckRuntimeState;
    }
    const runtimeDeckPersistence = root && root.SlideNextDeckPersistence;
    return runtimeDeckPersistence && typeof runtimeDeckPersistence.stripTransientDeckRuntimeState === 'function'
      ? runtimeDeckPersistence.stripTransientDeckRuntimeState
      : null;
  }

  function sanitizeDeckSourceClone(sourceClone, options = {}) {
    if (!sourceClone || typeof sourceClone.querySelectorAll !== 'function') {
      return sourceClone;
    }

    const ignoredNodeIds = Array.isArray(options.ignoredNodeIds)
      ? options.ignoredNodeIds
      : DEFAULT_SOURCE_IGNORED_NODE_IDS;
    const transientClassNames = resolveImportedTransientClassNames(options);
    const editorElementIdAttr = options.editorElementIdAttr || 'data-editor-id';
    const editorSlideIdAttr = options.editorSlideIdAttr || 'data-slide-id';

    ignoredNodeIds.forEach((nodeId) => {
      sourceClone.querySelectorAll(`#${nodeId}`).forEach((node) => node.remove());
    });

    transientClassNames.forEach((className) => {
      sourceClone.querySelectorAll(`.${className}`).forEach((node) => {
        if (node && node.classList && typeof node.classList.remove === 'function') {
          node.classList.remove(className);
        }
      });
    });

    sourceClone.querySelectorAll(`[${editorElementIdAttr}]`).forEach((node) => {
      node.removeAttribute(editorElementIdAttr);
    });
    sourceClone.querySelectorAll(`[${editorSlideIdAttr}]`).forEach((node) => {
      node.removeAttribute(editorSlideIdAttr);
    });

    const stripTransientDeckRuntimeState = resolveDeckPersistenceStripper(options);
    if (stripTransientDeckRuntimeState) {
      stripTransientDeckRuntimeState(sourceClone, options.persistenceOptions || options);
    }

    return sourceClone;
  }

  function buildDeckSource(doc, options = {}) {
    const sourceClone = doc && doc.documentElement && typeof doc.documentElement.cloneNode === 'function'
      ? sanitizeDeckSourceClone(doc.documentElement.cloneNode(true), options)
      : null;
    const sourceHead = sourceClone && typeof sourceClone.querySelector === 'function'
      ? sourceClone.querySelector('head')
      : doc && doc.head ? doc.head : null;
    const sourceBody = sourceClone && typeof sourceClone.querySelector === 'function'
      ? sourceClone.querySelector('body')
      : doc && doc.body ? doc.body : null;
    const sourceHtml = sourceClone || (doc && doc.documentElement) || null;

    return {
      html: buildDocumentHtml(sourceClone || doc),
      headHtml: sourceHead ? sourceHead.innerHTML : '',
      bodyHtml: sourceBody ? sourceBody.innerHTML : '',
      bodyScaffoldHtml: sourceBody ? buildImportedBodyScaffoldHtml(sourceBody, options) : '',
      htmlAttributes: sourceHtml ? extractAttributeMap(sourceHtml) : {},
      bodyAttributes: sourceBody ? extractAttributeMap(sourceBody) : {},
      headInlineScripts: sourceHead ? extractInlineScriptSeeds(sourceHead, {
        ...options,
        idPrefix: 'head-inline-script'
      }) : [],
      bodyInlineScripts: sourceBody ? extractInlineScriptSeeds(sourceBody, {
        ...options,
        idPrefix: 'body-inline-script'
      }) : []
    };
  }

  function importHtmlDeckToCanonicalDeck(doc, options = {}) {
    if (!doc) {
      return canonicalDeck.createCanonicalDeck();
    }

    const slideSelector = normalizeString(options.slideSelector, '.slide');
    const slides = Array.from(doc.querySelectorAll(slideSelector));

    return canonicalDeck.createCanonicalDeck({
      metadata: buildDeckMetadata(doc, options),
      theme: {
        tokens: collectDeckThemeTokens(doc),
        customCss: collectDeckCustomCss(doc)
      },
      layout: inferDeckLayout(doc, slides, options),
      assets: collectDeckAssets(doc),
      slides: slides.map((slide, index) => importSlideToCanonicalSlide(slide, index, options)),
      source: buildDeckSource(doc, options)
    });
  }

  return {
    DEFAULT_SKIP_TAG_NAMES,
    buildDeckSource,
    buildImportedSourceHtml,
    collectDeckCustomCss,
    collectDeckThemeTokens,
    extractCssUrlValues,
    extractSrcsetUrlValues,
    collectDeckAssets,
    inferImportedNodeType,
    stripImportedNodeHiddenStyle,
    stripImportedNodeLayoutStyle,
    sanitizeImportedSlideBackgroundClassName,
    importElementToCanonicalNode,
    importSlideToCanonicalSlide,
    stripCanonicalNodeSourceHtmlDuplicates,
    stripCanonicalSlideSourceHtmlDuplicates,
    stripCanonicalSlideAttributeDuplicates,
    sanitizeDeckSourceClone,
    sanitizeImportedElementClone,
    importHtmlDeckToCanonicalDeck
  };
});
