(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextCanonicalDeck = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DECK_KIND = 'slidenext.deck';
  const DECK_SCHEMA_VERSION = 1;
  const DEFAULT_LAYOUT_MODE = 'flow';
  const DEFAULT_NODE_TYPE = 'html';

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

  function createCanonicalAsset(seed = {}, index = 0) {
    const asset = asPlainObject(seed);
    return {
      id: normalizeString(asset.id, `asset-${index + 1}`),
      type: normalizeString(asset.type, 'file'),
      name: normalizeString(asset.name),
      src: normalizeString(asset.src),
      mimeType: normalizeString(asset.mimeType),
      meta: asPlainObject(asset.meta)
    };
  }

  function createCanonicalNode(seed = {}, index = 0) {
    const node = asPlainObject(seed);
    const layout = asPlainObject(node.layout);
    const visibility = asPlainObject(node.visibility);

    return {
      id: normalizeString(node.id, `node-${index + 1}`),
      type: normalizeString(node.type, DEFAULT_NODE_TYPE),
      name: normalizeString(node.name),
      tagName: normalizeString(node.tagName).toLowerCase(),
      text: normalizeString(node.text),
      html: normalizeString(node.html),
      classes: normalizeStringArray(node.classes),
      attributes: asPlainObject(node.attributes),
      style: normalizeString(node.style),
      layout: {
        mode: normalizeString(layout.mode, DEFAULT_LAYOUT_MODE),
        x: normalizeFiniteNumber(layout.x),
        y: normalizeFiniteNumber(layout.y),
        width: normalizeFiniteNumber(layout.width),
        height: normalizeFiniteNumber(layout.height),
        zIndex: normalizeFiniteNumber(layout.zIndex, 0)
      },
      visibility: {
        hidden: !!visibility.hidden,
        locked: !!visibility.locked
      },
      children: Array.isArray(node.children)
        ? node.children.map((child, childIndex) => createCanonicalNode(child, childIndex))
        : []
    };
  }

  function createCanonicalSlide(seed = {}, index = 0) {
    const slide = asPlainObject(seed);
    const layout = asPlainObject(slide.layout);
    const background = asPlainObject(layout.background);
    const source = asPlainObject(slide.source);

    return {
      id: normalizeString(slide.id, `slide-${index + 1}`),
      name: normalizeString(slide.name),
      title: normalizeString(slide.title, normalizeString(slide.name, `Slide ${index + 1}`)),
      notes: normalizeString(slide.notes),
      layout: {
        mode: normalizeString(layout.mode, DEFAULT_LAYOUT_MODE),
        background: {
          color: normalizeString(background.color),
          image: normalizeString(background.image),
          className: normalizeString(background.className),
          style: normalizeString(background.style)
        }
      },
      nodes: Array.isArray(slide.nodes)
        ? slide.nodes.map((node, nodeIndex) => createCanonicalNode(node, nodeIndex))
        : [],
      source: {
        html: normalizeString(source.html),
        attributes: asPlainObject(source.attributes)
      }
    };
  }

  function createCanonicalInlineScript(seed = {}, index = 0, options = {}) {
    const script = asPlainObject(seed);
    const idPrefix = normalizeString(options.idPrefix, 'inline-script').trim() || 'inline-script';
    const order = normalizeFiniteNumber(script.order);
    return {
      id: normalizeString(script.id, `${idPrefix}-${index + 1}`),
      content: normalizeString(script.content),
      attributes: asPlainObject(script.attributes),
      ...(order !== null ? { order } : {})
    };
  }

  function createCanonicalDeck(seed = {}) {
    const deck = asPlainObject(seed);
    const metadata = asPlainObject(deck.metadata);
    const theme = asPlainObject(deck.theme);
    const layout = asPlainObject(deck.layout);
    const notes = asPlainObject(deck.notes);
    const exportMeta = asPlainObject(deck.export);
    const source = asPlainObject(deck.source);

    return {
      kind: DECK_KIND,
      schemaVersion: Number.isInteger(deck.schemaVersion) ? deck.schemaVersion : DECK_SCHEMA_VERSION,
      metadata: {
        id: normalizeString(metadata.id),
        title: normalizeString(metadata.title),
        subtitle: normalizeString(metadata.subtitle),
        description: normalizeString(metadata.description),
        icon: normalizeString(metadata.icon),
        tags: normalizeStringArray(metadata.tags),
        sourcePath: normalizeString(metadata.sourcePath)
      },
      theme: {
        tokens: asPlainObject(theme.tokens),
        customCss: normalizeString(theme.customCss)
      },
      layout: {
        mode: normalizeString(layout.mode, DEFAULT_LAYOUT_MODE),
        size: {
          width: normalizeFiniteNumber(layout.size?.width),
          height: normalizeFiniteNumber(layout.size?.height),
          unit: normalizeString(layout.size?.unit, 'px')
        },
        aspectRatio: normalizeString(layout.aspectRatio)
      },
      assets: Array.isArray(deck.assets)
        ? deck.assets.map((asset, assetIndex) => createCanonicalAsset(asset, assetIndex))
        : [],
      slides: Array.isArray(deck.slides)
        ? deck.slides.map((slide, slideIndex) => createCanonicalSlide(slide, slideIndex))
        : [],
      notes: {
        deck: normalizeString(notes.deck)
      },
      export: {
        html: asPlainObject(exportMeta.html),
        pdf: asPlainObject(exportMeta.pdf),
        pptx: asPlainObject(exportMeta.pptx)
      },
      source: {
        html: normalizeString(source.html),
        headHtml: normalizeString(source.headHtml),
        bodyHtml: normalizeString(source.bodyHtml),
        bodyScaffoldHtml: normalizeString(source.bodyScaffoldHtml),
        htmlAttributes: asPlainObject(source.htmlAttributes),
        bodyAttributes: asPlainObject(source.bodyAttributes),
        headInlineScripts: Array.isArray(source.headInlineScripts)
          ? source.headInlineScripts.map((script, scriptIndex) => createCanonicalInlineScript(script, scriptIndex, {
            idPrefix: 'head-inline-script'
          }))
          : [],
        bodyInlineScripts: Array.isArray(source.bodyInlineScripts)
          ? source.bodyInlineScripts.map((script, scriptIndex) => createCanonicalInlineScript(script, scriptIndex, {
            idPrefix: 'body-inline-script'
          }))
          : []
      }
    };
  }

  function isCanonicalDeck(value) {
    return !!value
      && typeof value === 'object'
      && value.kind === DECK_KIND
      && Number.isInteger(value.schemaVersion)
      && Array.isArray(value.slides);
  }

  return {
    DECK_KIND,
    DECK_SCHEMA_VERSION,
    DEFAULT_LAYOUT_MODE,
    DEFAULT_NODE_TYPE,
    createCanonicalAsset,
    createCanonicalNode,
    createCanonicalSlide,
    createCanonicalInlineScript,
    createCanonicalDeck,
    isCanonicalDeck
  };
});
