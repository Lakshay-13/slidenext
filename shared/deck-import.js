(function (root, factory) {
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const api = factory(canonicalDeck);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckImport = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeck) {
  if (!canonicalDeck) {
    throw new Error('SlideNextCanonicalDeck dependency is required');
  }

  const DEFAULT_SKIP_TAG_NAMES = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);

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

    return {
      mode: position === 'absolute' || position === 'fixed'
        ? 'absolute'
        : canonicalDeck.DEFAULT_LAYOUT_MODE,
      x: firstFiniteNumber([
        parsePixelValue(inlineStyle.left || ''),
        parsePixelValue(computedStyle ? computedStyle.left : '')
      ]),
      y: firstFiniteNumber([
        parsePixelValue(inlineStyle.top || ''),
        parsePixelValue(computedStyle ? computedStyle.top : '')
      ]),
      width: firstFiniteNumber([
        parsePixelValue(inlineStyle.width || ''),
        parsePixelValue(computedStyle ? computedStyle.width : '')
      ]),
      height: firstFiniteNumber([
        parsePixelValue(inlineStyle.height || ''),
        parsePixelValue(computedStyle ? computedStyle.height : '')
      ]),
      zIndex: firstFiniteNumber([
        Number.parseInt(inlineStyle.zIndex || '', 10),
        Number.parseInt(computedStyle ? computedStyle.zIndex : '', 10)
      ], 0)
    };
  }

  function buildImportedVisibility(el, win) {
    const computedStyle = win && typeof win.getComputedStyle === 'function'
      ? win.getComputedStyle(el)
      : null;
    return {
      hidden: !!el.hidden
        || el.getAttribute('aria-hidden') === 'true'
        || el.getAttribute('data-editor-hidden') === 'true'
        || normalizeString(el.style && el.style.display) === 'none'
        || normalizeString(computedStyle && computedStyle.display) === 'none'
        || normalizeString(computedStyle && computedStyle.visibility) === 'hidden',
      locked: el.getAttribute('data-editor-locked') === 'true'
    };
  }

  function importElementToCanonicalNode(el, options = {}, context = {}) {
    const win = options.window || (el.ownerDocument && el.ownerDocument.defaultView) || null;
    const childElements = Array.from(el.children || []).filter(child => shouldImportElement(child, options));
    const fallbackNodeId = context.path && context.path.length > 0
      ? `${context.slideId || 'slide'}-node-${context.path.join('-')}`
      : `node-${(context.nodeIndex || 0) + 1}`;

    return canonicalDeck.createCanonicalNode({
      id: typeof options.getNodeId === 'function'
        ? options.getNodeId(el, context)
        : fallbackNodeId,
      type: inferImportedNodeType(el),
      name: buildImportedNodeName(el),
      tagName: el.tagName.toLowerCase(),
      text: normalizeWhitespace(childElements.length === 0 ? (el.textContent || '') : extractDirectText(el)),
      html: options.includeSourceHtml === false ? '' : el.outerHTML,
      classes: Array.from(el.classList || []),
      attributes: extractAttributeMap(el),
      style: normalizeString(el.getAttribute('style')),
      layout: buildImportedLayout(el, win),
      visibility: buildImportedVisibility(el, win),
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

    return canonicalDeck.createCanonicalSlide({
      id: slideId,
      name: normalizeString(slide.getAttribute('data-slide-name'), title),
      title,
      notes: normalizeString(slide.getAttribute('data-speaker-notes') || slide.getAttribute('data-notes')),
      layout: {
        mode: canonicalDeck.DEFAULT_LAYOUT_MODE,
        background: {
          color: normalizeString(slide.style && slide.style.backgroundColor),
          image: normalizeString(slide.style && slide.style.backgroundImage),
          className: normalizeString(slide.className),
          style: normalizeString(slide.getAttribute('style'))
        }
      },
      nodes: childElements.map((child, childIndex) => importElementToCanonicalNode(child, options, {
        slideId,
        nodeIndex: childIndex,
        path: [childIndex + 1]
      })),
      source: {
        html: options.includeSourceHtml === false ? '' : slide.outerHTML,
        attributes: extractAttributeMap(slide)
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
    if (tagName === 'link') return 'stylesheet';
    return 'file';
  }

  function buildAssetName(url) {
    const cleanUrl = normalizeString(url).split('?')[0].split('#')[0];
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1] || cleanUrl || 'asset';
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
      'link[rel~="stylesheet"][href]'
    ];

    doc.querySelectorAll(assetSelectors.join(', ')).forEach((el) => {
      const src = normalizeString(el.getAttribute('src') || el.getAttribute('href'));
      if (!src || seenUrls.has(src)) return;
      seenUrls.add(src);
      assetSeeds.push({
        id: `asset-${assetSeeds.length + 1}`,
        type: inferAssetType(el),
        name: buildAssetName(src),
        src
      });
    });

    return assetSeeds;
  }

  function buildDeckMetadata(doc, options = {}) {
    const metadata = asPlainObject(options.presentationMetadata);
    const titleNode = doc.querySelector('title');

    return {
      id: normalizeString(metadata.id),
      title: normalizeString(metadata.title, normalizeString(titleNode && titleNode.textContent)),
      subtitle: normalizeString(metadata.subtitle),
      description: normalizeString(metadata.description),
      icon: normalizeString(metadata.icon),
      tags: normalizeStringArray(metadata.tags),
      sourcePath: normalizeString(options.sourcePath, normalizeString(metadata.url))
    };
  }

  function buildDocumentHtml(doc) {
    if (!doc || !doc.documentElement) return '';
    return '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
  }

  function buildDeckSource(doc) {
    return {
      html: buildDocumentHtml(doc),
      headHtml: doc.head ? doc.head.innerHTML : '',
      bodyHtml: doc.body ? doc.body.innerHTML : '',
      bodyAttributes: doc.body ? extractAttributeMap(doc.body) : {}
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
      layout: inferDeckLayout(doc, slides, options),
      assets: collectDeckAssets(doc),
      slides: slides.map((slide, index) => importSlideToCanonicalSlide(slide, index, options)),
      source: buildDeckSource(doc)
    });
  }

  return {
    DEFAULT_SKIP_TAG_NAMES,
    inferImportedNodeType,
    importElementToCanonicalNode,
    importSlideToCanonicalSlide,
    importHtmlDeckToCanonicalDeck
  };
});
