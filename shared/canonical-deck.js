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

  function normalizeLayoutMode(value, fallback = DEFAULT_LAYOUT_MODE) {
    const mode = normalizeString(value).trim().toLowerCase();
    if (mode === 'freeform') return 'absolute';
    return mode === 'flow' || mode === 'absolute' ? mode : fallback;
  }

  function normalizeStringArray(values) {
    if (!Array.isArray(values)) return [];
    return values.filter(value => typeof value === 'string' && value.trim() !== '');
  }

  function normalizeFiniteNumber(value, fallback = null) {
    return Number.isFinite(value) ? value : fallback;
  }

  function createUniqueCanonicalId(value, fallback, usedIds) {
    const baseId = normalizeString(value).trim() || fallback;
    let nextId = baseId;
    let suffix = 2;
    while (usedIds.has(nextId)) {
      nextId = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(nextId);
    return nextId;
  }

  function normalizeCanonicalNodeIds(nodes = [], usedIds = new Set()) {
    return (Array.isArray(nodes) ? nodes : []).map((node, index) => {
      const normalizedNode = createCanonicalNode(node, index);
      return {
        ...normalizedNode,
        id: createUniqueCanonicalId(normalizedNode.id, `node-${index + 1}`, usedIds),
        children: normalizeCanonicalNodeIds(normalizedNode.children, usedIds)
      };
    });
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

  function insertCanonicalAsset(deckLike, assetLike = {}, index) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)
      || !assetLike
      || typeof assetLike !== 'object'
      || !Number.isInteger(index)
      || index < 0
      || index > deck.assets.length) {
      return null;
    }

    const nextAssets = [...deck.assets];
    nextAssets.splice(index, 0, createCanonicalAsset(assetLike, index));
    return createCanonicalDeck({
      ...deck,
      assets: nextAssets
    });
  }

  function appendCanonicalAsset(deckLike, assetLike = {}) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)) {
      return null;
    }
    return insertCanonicalAsset(deck, assetLike, deck.assets.length);
  }

  function updateCanonicalAsset(deckLike, assetId, patch = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedAssetId = normalizeString(assetId).trim();
    if (!isCanonicalDeck(deck) || !normalizedAssetId || !patch || typeof patch !== 'object') {
      return null;
    }

    const assetIndex = deck.assets.findIndex((asset) => asset && asset.id === normalizedAssetId);
    if (assetIndex < 0) return null;

    const currentAsset = deck.assets[assetIndex];
    const nextAsset = createCanonicalAsset({
      ...currentAsset,
      ...asPlainObject(patch),
      id: currentAsset.id
    }, assetIndex);
    if (JSON.stringify(currentAsset) === JSON.stringify(nextAsset)) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      assets: deck.assets.map((asset, index) => index === assetIndex ? nextAsset : asset)
    });
  }

  function removeCanonicalAsset(deckLike, assetId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedAssetId = normalizeString(assetId).trim();
    if (!isCanonicalDeck(deck) || !normalizedAssetId) {
      return null;
    }

    const assetIndex = deck.assets.findIndex((asset) => asset && asset.id === normalizedAssetId);
    if (assetIndex < 0) return null;
    const referencesAssetId = (value) => normalizeString(value).trim() === normalizedAssetId;
    const nodeReferencesAsset = (nodes = []) => (Array.isArray(nodes) ? nodes : []).some((node) => {
      if (!node || typeof node !== 'object') return false;
      const attributes = asPlainObject(node.attributes);
      return referencesAssetId(node.assetId)
        || referencesAssetId(node.backgroundAssetId)
        || referencesAssetId(attributes['data-asset-id'])
        || referencesAssetId(attributes['data-asset'])
        || referencesAssetId(attributes['data-background-asset-id'])
        || referencesAssetId(attributes['data-background-asset'])
        || nodeReferencesAsset(node.children);
    });
    const slideReferencesAsset = (slide) => !!slide
      && slide.layout
      && slide.layout.background
      && slide.layout.background.assetId === normalizedAssetId;
    const referencesAsset = [
      ...deck.slides,
      ...(Array.isArray(deck.templates) ? deck.templates.map((template) => template && template.slide) : []),
      ...(Array.isArray(deck.masterSlides)
        ? deck.masterSlides.map((master) => master && master.slide)
        : [])
    ].some((slide) => slideReferencesAsset(slide) || nodeReferencesAsset(slide && slide.nodes))
      || (Array.isArray(deck.blocks) && deck.blocks.some((block) => nodeReferencesAsset(block && block.nodes)));
    if (referencesAsset) return null;

    return createCanonicalDeck({
      ...deck,
      assets: deck.assets.filter((_asset, index) => index !== assetIndex)
    });
  }

  function createCanonicalNode(seed = {}, index = 0) {
    const node = asPlainObject(seed);
    const layout = asPlainObject(node.layout);
    const layoutBounds = asPlainObject(layout.bounds);
    const normalizedBounds = {};
    ['x', 'y', 'width', 'height'].forEach((key) => {
      if (Number.isFinite(layoutBounds[key])) {
        normalizedBounds[key] = layoutBounds[key];
      }
    });
    const visibility = asPlainObject(node.visibility);
    const assetId = normalizeString(node.assetId).trim();
    const backgroundAssetId = normalizeString(node.backgroundAssetId).trim();

    return {
      id: normalizeString(node.id, `node-${index + 1}`),
      type: normalizeString(node.type, DEFAULT_NODE_TYPE),
      name: normalizeString(node.name),
      tagName: normalizeString(node.tagName).toLowerCase(),
      text: normalizeString(node.text),
      html: normalizeString(node.html),
      classes: normalizeStringArray(node.classes),
      attributes: asPlainObject(node.attributes),
      ...(assetId ? { assetId } : {}),
      ...(backgroundAssetId ? { backgroundAssetId } : {}),
      style: normalizeString(node.style),
      layout: {
        mode: normalizeLayoutMode(layout.mode),
        x: normalizeFiniteNumber(layout.x),
        y: normalizeFiniteNumber(layout.y),
        width: normalizeFiniteNumber(layout.width),
        height: normalizeFiniteNumber(layout.height),
        zIndex: normalizeFiniteNumber(layout.zIndex, 0),
        ...(Object.keys(normalizedBounds).length > 0 ? { bounds: normalizedBounds } : {})
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

  function createCanonicalBlock(seed = {}, index = 0) {
    const block = asPlainObject(seed);
    const metadata = asPlainObject(block.metadata);

    return {
      id: normalizeString(block.id, `block-${index + 1}`),
      name: normalizeString(block.name, `Block ${index + 1}`),
      description: normalizeString(block.description),
      nodes: normalizeCanonicalNodeIds(block.nodes, new Set()),
      metadata
    };
  }

  function createCanonicalTemplate(seed = {}, index = 0) {
    const template = asPlainObject(seed);
    const templateSlide = asPlainObject(template.slide);
    const metadata = asPlainObject(template.metadata);

    return {
      id: normalizeString(template.id, `template-${index + 1}`),
      name: normalizeString(template.name, `Template ${index + 1}`),
      description: normalizeString(template.description),
      slide: createCanonicalSlide(templateSlide, index),
      metadata
    };
  }

  function createCanonicalMasterSlide(seed = {}, index = 0) {
    const master = asPlainObject(seed);
    const masterSlide = createCanonicalSlide(asPlainObject(master.slide), index);

    return {
      id: normalizeString(master.id, `master-slide-${index + 1}`),
      name: normalizeString(master.name, `Master Slide ${index + 1}`),
      description: normalizeString(master.description),
      slide: {
        ...masterSlide,
        nodes: normalizeCanonicalNodeIds(masterSlide.nodes, new Set())
      },
      metadata: asPlainObject(master.metadata)
    };
  }

  function createCanonicalSlide(seed = {}, index = 0) {
    const slide = asPlainObject(seed);
    const layout = asPlainObject(slide.layout);
    const background = asPlainObject(layout.background);
    const backgroundAssetId = normalizeString(background.assetId).trim();
    const source = asPlainObject(slide.source);
    const section = normalizeString(slide.section);
    const masterSlideId = normalizeString(slide.masterSlideId).trim();

    return {
      id: normalizeString(slide.id, `slide-${index + 1}`),
      name: normalizeString(slide.name),
      title: normalizeString(slide.title, normalizeString(slide.name, `Slide ${index + 1}`)),
      notes: normalizeString(slide.notes),
      ...(section ? { section } : {}),
      ...(masterSlideId ? { masterSlideId } : {}),
      layout: {
        mode: normalizeLayoutMode(layout.mode),
        background: {
          color: normalizeString(background.color),
          image: normalizeString(background.image),
          className: normalizeString(background.className),
          style: normalizeString(background.style),
          ...(backgroundAssetId ? { assetId: backgroundAssetId } : {})
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

  function normalizeCanonicalInlineScriptIds(scripts, idPrefix, usedIds) {
    return (Array.isArray(scripts) ? scripts : []).map((script, scriptIndex) => {
      const normalizedScript = createCanonicalInlineScript(script, scriptIndex, { idPrefix });
      return {
        ...normalizedScript,
        id: createUniqueCanonicalId(
          normalizedScript.id,
          `${idPrefix}-${scriptIndex + 1}`,
          usedIds
        )
      };
    });
  }

  function createCanonicalDeck(seed = {}) {
    const deck = asPlainObject(seed);
    const metadata = asPlainObject(deck.metadata);
    const theme = asPlainObject(deck.theme);
    const layout = asPlainObject(deck.layout);
    const notes = asPlainObject(deck.notes);
    const exportMeta = asPlainObject(deck.export);
    const source = asPlainObject(deck.source);

    const normalizedSlides = Array.isArray(deck.slides)
      ? deck.slides.map((slide, slideIndex) => createCanonicalSlide(slide, slideIndex))
      : [];
    const normalizedBlocks = Array.isArray(deck.blocks)
      ? deck.blocks.map((block, blockIndex) => createCanonicalBlock(block, blockIndex))
      : [];
    const normalizedTemplates = Array.isArray(deck.templates)
      ? deck.templates.map((template, templateIndex) => createCanonicalTemplate(template, templateIndex))
      : [];
    const normalizedMasterSlides = Array.isArray(deck.masterSlides)
      ? deck.masterSlides.map((master, masterIndex) => createCanonicalMasterSlide(master, masterIndex))
      : [];
    const hasBlocksCollection = Array.isArray(deck.blocks);
    const hasTemplatesCollection = Array.isArray(deck.templates);
    const hasMasterSlidesCollection = Array.isArray(deck.masterSlides);
    const normalizedAssets = Array.isArray(deck.assets)
      ? deck.assets.map((asset, assetIndex) => createCanonicalAsset(asset, assetIndex))
      : [];
    const assetIds = new Set();
    const blockIds = new Set();
    const templateIds = new Set();
    const masterSlideIds = new Set();
    const slideIds = new Set();
    const nodeIds = new Set();
    const inlineScriptIds = new Set();

    return {
      kind: DECK_KIND,
      schemaVersion: DECK_SCHEMA_VERSION,
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
        mode: normalizeLayoutMode(layout.mode),
        size: {
          width: normalizeFiniteNumber(layout.size?.width),
          height: normalizeFiniteNumber(layout.size?.height),
          unit: normalizeString(layout.size?.unit, 'px')
        },
        aspectRatio: normalizeString(layout.aspectRatio)
      },
      assets: normalizedAssets.map((asset, assetIndex) => ({
        ...asset,
        id: createUniqueCanonicalId(asset.id, `asset-${assetIndex + 1}`, assetIds)
      })),
      ...(hasBlocksCollection
        ? {
            blocks: normalizedBlocks.map((block, blockIndex) => ({
              ...block,
              id: createUniqueCanonicalId(block.id, `block-${blockIndex + 1}`, blockIds)
            }))
          }
        : {}),
      ...(hasTemplatesCollection
        ? {
            templates: normalizedTemplates.map((template, templateIndex) => ({
              ...template,
              id: createUniqueCanonicalId(template.id, `template-${templateIndex + 1}`, templateIds)
            }))
          }
        : {}),
      ...(hasMasterSlidesCollection
        ? {
            masterSlides: normalizedMasterSlides.map((master, masterIndex) => ({
              ...master,
              id: createUniqueCanonicalId(
                master.id,
                `master-slide-${masterIndex + 1}`,
                masterSlideIds
              )
            }))
          }
        : {}),
      slides: normalizedSlides.map((slide, slideIndex) => ({
        ...slide,
        id: createUniqueCanonicalId(slide.id, `slide-${slideIndex + 1}`, slideIds),
        nodes: normalizeCanonicalNodeIds(slide.nodes, nodeIds)
      })),
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
        headInlineScripts: normalizeCanonicalInlineScriptIds(
          source.headInlineScripts,
          'head-inline-script',
          inlineScriptIds
        ),
        bodyInlineScripts: normalizeCanonicalInlineScriptIds(
          source.bodyInlineScripts,
          'body-inline-script',
          inlineScriptIds
        )
      }
    };
  }

  function mergeCanonicalDeckRebuildBaseline(deckLike, baselineLike) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)) {
      return null;
    }

    if (!baselineLike || typeof baselineLike !== 'object' || Array.isArray(baselineLike)) {
      return deck;
    }

    const baseline = isCanonicalDeck(baselineLike)
      ? baselineLike
      : createCanonicalDeck(baselineLike);
    if (!isCanonicalDeck(baseline)) {
      return deck;
    }

    const nextAssets = [...deck.assets];
    const assetIds = new Set();
    const assetSources = new Set();
    nextAssets.forEach((asset) => {
      if (asset && asset.id) assetIds.add(asset.id);
      if (asset && asset.src) assetSources.add(asset.src);
    });
    baseline.assets.forEach((asset) => {
      if (!asset
        || assetIds.has(asset.id)
        || (asset.src && assetSources.has(asset.src))) {
        return;
      }
      nextAssets.push(asset);
      if (asset.id) assetIds.add(asset.id);
      if (asset.src) assetSources.add(asset.src);
    });

    const nextDeck = {
      ...deck,
      assets: nextAssets,
      notes: baseline.notes,
      export: baseline.export
    };
    ['blocks', 'templates', 'masterSlides'].forEach((collectionName) => {
      if (Array.isArray(baseline[collectionName])) {
        nextDeck[collectionName] = baseline[collectionName];
      }
    });

    return createCanonicalDeck(nextDeck);
  }

  function hasUniqueCanonicalIds(deck) {
    const assetIds = new Set();
    const blockIds = new Set();
    const templateIds = new Set();
    const masterSlideIds = new Set();
    const slideIds = new Set();
    const nodeIds = new Set();
    const inlineScriptIds = new Set();
    const registerId = (value, usedIds) => {
      if (typeof value !== 'string' || !value.trim() || usedIds.has(value)) {
        return false;
      }
      usedIds.add(value);
      return true;
    };
    const hasUniqueNodeIds = (nodes, usedIds = nodeIds) => {
      if (!Array.isArray(nodes)) return true;
      return nodes.every((node) => {
        return !!node
          && registerId(node.id, usedIds)
          && hasUniqueNodeIds(node.children, usedIds);
      });
    };
    const hasUniqueBlockIds = (blocks) => {
      if (!Array.isArray(blocks)) return true;
      return blocks.every((block) => {
        return !!block
          && registerId(block.id, blockIds)
          && hasUniqueNodeIds(block.nodes, new Set());
      });
    };
    const hasUniqueTemplateIds = (templates) => {
      if (!Array.isArray(templates)) return true;
      return templates.every((template) => {
        return !!template
          && registerId(template.id, templateIds)
          && !!template.slide
          && hasUniqueNodeIds(template.slide.nodes, new Set());
      });
    };
    const hasUniqueMasterSlideIds = (masterSlides) => {
      if (!Array.isArray(masterSlides)) return true;
      return masterSlides.every((master) => {
        return !!master
          && registerId(master.id, masterSlideIds)
          && !!master.slide
          && hasUniqueNodeIds(master.slide.nodes, new Set());
      });
    };
    const hasUniqueInlineScriptIds = (scripts) => {
      if (!Array.isArray(scripts)) return true;
      return scripts.every((script) => {
        return !!script && registerId(script.id, inlineScriptIds);
      });
    };

    if (Array.isArray(deck.assets) && !deck.assets.every((asset) => {
      return !!asset && registerId(asset.id, assetIds);
    })) {
      return false;
    }
    if (!Array.isArray(deck.slides)) return false;
    if (Object.prototype.hasOwnProperty.call(deck, 'blocks')
      && (!Array.isArray(deck.blocks) || !hasUniqueBlockIds(deck.blocks))) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(deck, 'templates')
      && (!Array.isArray(deck.templates) || !hasUniqueTemplateIds(deck.templates))) {
      return false;
    }
    if (Object.prototype.hasOwnProperty.call(deck, 'masterSlides')
      && (!Array.isArray(deck.masterSlides) || !hasUniqueMasterSlideIds(deck.masterSlides))) {
      return false;
    }
    if (deck.source && typeof deck.source === 'object'
      && (!hasUniqueInlineScriptIds(deck.source.headInlineScripts)
        || !hasUniqueInlineScriptIds(deck.source.bodyInlineScripts))) {
      return false;
    }
    return deck.slides.every((slide) => {
      return !!slide
        && registerId(slide.id, slideIds)
        && hasUniqueNodeIds(slide.nodes);
    });
  }

  function isCanonicalDeck(value) {
    return !!value
      && typeof value === 'object'
      && value.kind === DECK_KIND
      && value.schemaVersion === DECK_SCHEMA_VERSION
      && Array.isArray(value.slides)
      && hasUniqueCanonicalIds(value);
  }

  function findCanonicalNodeById(deckLike, nodeId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedNodeId = normalizeString(nodeId).trim();
    if (!isCanonicalDeck(deck) || !normalizedNodeId) return null;

    function findNode(nodes = []) {
      for (const node of Array.isArray(nodes) ? nodes : []) {
        if (node && node.id === normalizedNodeId) return node;
        const nestedNode = findNode(node && node.children);
        if (nestedNode) return nestedNode;
      }
      return null;
    }

    for (const slide of deck.slides) {
      const node = findNode(slide && slide.nodes);
      if (node) return node;
    }
    return null;
  }

  function findCanonicalAssetById(deckLike, assetId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedAssetId = normalizeString(assetId).trim();
    if (!isCanonicalDeck(deck) || !normalizedAssetId) return null;
    return deck.assets.find((asset) => asset && asset.id === normalizedAssetId) || null;
  }

  function findCanonicalSlideById(deckLike, slideId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    if (!isCanonicalDeck(deck) || !normalizedSlideId) return null;
    return deck.slides.find((slide) => slide && slide.id === normalizedSlideId) || null;
  }

  function findCanonicalSlideIndexById(deckLike, slideId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const slide = findCanonicalSlideById(deck, slideId);
    return slide ? deck.slides.indexOf(slide) : -1;
  }

  function reorderCanonicalSlides(deckLike, sourceSlideId, targetSlideId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const sourceId = normalizeString(sourceSlideId).trim();
    const targetId = normalizeString(targetSlideId).trim();
    if (!isCanonicalDeck(deck) || !sourceId || !targetId || sourceId === targetId) {
      return null;
    }

    const sourceIndex = deck.slides.findIndex((slide) => slide && slide.id === sourceId);
    const targetIndex = deck.slides.findIndex((slide) => slide && slide.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return null;
    }

    const nextSlides = [...deck.slides];
    const [sourceSlide] = nextSlides.splice(sourceIndex, 1);
    const nextTargetIndex = nextSlides.findIndex((slide) => slide && slide.id === targetId);
    const insertIndex = sourceIndex < targetIndex ? nextTargetIndex + 1 : nextTargetIndex;
    nextSlides.splice(insertIndex, 0, sourceSlide);

    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function removeCanonicalSlide(deckLike, slideId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    if (!isCanonicalDeck(deck) || deck.slides.length <= 1 || !normalizedSlideId) {
      return null;
    }

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    if (slideIndex < 0) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      slides: deck.slides.filter((_slide, index) => index !== slideIndex)
    });
  }

  function appendCanonicalSlide(deckLike, slideLike = {}) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)) {
      return null;
    }
    return insertCanonicalSlide(deck, slideLike, deck.slides.length);
  }

  function appendCanonicalBlock(deckLike, blockLike = {}) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)) {
      return null;
    }
    return insertCanonicalBlock(deck, blockLike, Array.isArray(deck.blocks) ? deck.blocks.length : 0);
  }

  function insertCanonicalBlock(deckLike, blockLike = {}, index) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const blocks = Array.isArray(deck.blocks) ? deck.blocks : [];
    if (!isCanonicalDeck(deck)
      || !blockLike
      || typeof blockLike !== 'object'
      || !Number.isInteger(index)
      || index < 0
      || index > blocks.length) {
      return null;
    }

    const nextBlocks = [...blocks];
    nextBlocks.splice(index, 0, createCanonicalBlock(blockLike, index));
    return createCanonicalDeck({
      ...deck,
      blocks: nextBlocks
    });
  }

  function removeCanonicalBlock(deckLike, blockId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedBlockId = normalizeString(blockId).trim();
    const blocks = Array.isArray(deck.blocks) ? deck.blocks : [];
    if (!isCanonicalDeck(deck) || !normalizedBlockId) {
      return null;
    }

    const blockIndex = blocks.findIndex((block) => block && block.id === normalizedBlockId);
    if (blockIndex < 0) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      blocks: blocks.filter((_block, index) => index !== blockIndex)
    });
  }

  function appendCanonicalTemplate(deckLike, templateLike = {}) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)) {
      return null;
    }
    return insertCanonicalTemplate(
      deck,
      templateLike,
      Array.isArray(deck.templates) ? deck.templates.length : 0
    );
  }

  function insertCanonicalTemplate(deckLike, templateLike = {}, index) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const templates = Array.isArray(deck.templates) ? deck.templates : [];
    if (!isCanonicalDeck(deck)
      || !templateLike
      || typeof templateLike !== 'object'
      || !Number.isInteger(index)
      || index < 0
      || index > templates.length) {
      return null;
    }

    const nextTemplates = [...templates];
    nextTemplates.splice(index, 0, createCanonicalTemplate(templateLike, index));
    return createCanonicalDeck({
      ...deck,
      templates: nextTemplates
    });
  }

  function removeCanonicalTemplate(deckLike, templateId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedTemplateId = normalizeString(templateId).trim();
    const templates = Array.isArray(deck.templates) ? deck.templates : [];
    if (!isCanonicalDeck(deck) || !normalizedTemplateId) {
      return null;
    }

    const templateIndex = templates.findIndex(
      (template) => template && template.id === normalizedTemplateId
    );
    if (templateIndex < 0) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      templates: templates.filter((_template, index) => index !== templateIndex)
    });
  }

  function appendCanonicalMasterSlide(deckLike, masterLike = {}) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)) {
      return null;
    }
    return insertCanonicalMasterSlide(
      deck,
      masterLike,
      Array.isArray(deck.masterSlides) ? deck.masterSlides.length : 0
    );
  }

  function insertCanonicalMasterSlide(deckLike, masterLike = {}, index) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const masterSlides = Array.isArray(deck.masterSlides) ? deck.masterSlides : [];
    if (!isCanonicalDeck(deck)
      || !masterLike
      || typeof masterLike !== 'object'
      || !Number.isInteger(index)
      || index < 0
      || index > masterSlides.length) {
      return null;
    }

    const nextMasterSlides = [...masterSlides];
    nextMasterSlides.splice(index, 0, createCanonicalMasterSlide(masterLike, index));
    return createCanonicalDeck({
      ...deck,
      masterSlides: nextMasterSlides
    });
  }

  function removeCanonicalMasterSlide(deckLike, masterSlideId) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedMasterSlideId = normalizeString(masterSlideId).trim();
    const masterSlides = Array.isArray(deck.masterSlides) ? deck.masterSlides : [];
    if (!isCanonicalDeck(deck) || !normalizedMasterSlideId) {
      return null;
    }

    const masterSlideIndex = masterSlides.findIndex(
      (master) => master && master.id === normalizedMasterSlideId
    );
    if (masterSlideIndex < 0) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      masterSlides: masterSlides.filter((_master, index) => index !== masterSlideIndex),
      slides: deck.slides.map((slide) => {
        if (!slide || slide.masterSlideId !== normalizedMasterSlideId) {
          return slide;
        }
        const nextSlide = { ...slide };
        delete nextSlide.masterSlideId;
        return nextSlide;
      })
    });
  }

  function updateCanonicalSlideMasterSlide(deckLike, slideId, masterSlideId = '') {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    const normalizedMasterSlideId = normalizeString(masterSlideId).trim();
    const masterSlides = Array.isArray(deck.masterSlides) ? deck.masterSlides : [];
    if (!isCanonicalDeck(deck) || !normalizedSlideId) {
      return null;
    }
    if (normalizedMasterSlideId
      && !masterSlides.some((master) => master && master.id === normalizedMasterSlideId)) {
      return null;
    }

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    if (slideIndex < 0) {
      return null;
    }
    const currentMasterSlideId = normalizeString(deck.slides[slideIndex].masterSlideId).trim();
    if (currentMasterSlideId === normalizedMasterSlideId) {
      return null;
    }

    const nextSlides = deck.slides.map((slide, index) => {
      if (index !== slideIndex) return slide;
      const nextSlide = { ...slide };
      if (normalizedMasterSlideId) {
        nextSlide.masterSlideId = normalizedMasterSlideId;
      } else {
        delete nextSlide.masterSlideId;
      }
      return createCanonicalSlide(nextSlide, index);
    });

    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function saveCanonicalMasterSlideFromSlideId(deckLike, slideId, masterLike = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    if (!isCanonicalDeck(deck) || !normalizedSlideId) {
      return null;
    }

    const slide = deck.slides.find((candidate) => candidate && candidate.id === normalizedSlideId);
    if (!slide) return null;

    return appendCanonicalMasterSlide(deck, {
      ...asPlainObject(masterLike),
      slide
    });
  }

  function insertCanonicalTemplateSlide(deckLike, templateId, index, options = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedTemplateId = normalizeString(templateId).trim();
    const templates = Array.isArray(deck.templates) ? deck.templates : [];
    const template = templates.find(
      (candidate) => candidate && candidate.id === normalizedTemplateId
    );
    if (!isCanonicalDeck(deck)
      || !template
      || !Number.isInteger(index)
      || index < 0
      || index > deck.slides.length) {
      return null;
    }

    const overrides = asPlainObject(options);
    const slide = {
      ...template.slide,
      ...(typeof overrides.id === 'string' && overrides.id.trim()
        ? { id: overrides.id.trim() }
        : {}),
      ...(typeof overrides.name === 'string' ? { name: overrides.name } : {}),
      ...(typeof overrides.title === 'string' ? { title: overrides.title } : {}),
      ...(typeof overrides.notes === 'string' ? { notes: overrides.notes } : {}),
      ...(typeof overrides.section === 'string' ? { section: overrides.section } : {})
    };
    return insertCanonicalSlide(deck, slide, index);
  }

  function saveCanonicalTemplateFromSlideId(deckLike, slideId, templateLike = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    if (!isCanonicalDeck(deck) || !normalizedSlideId) {
      return null;
    }

    const slide = deck.slides.find((candidate) => candidate && candidate.id === normalizedSlideId);
    if (!slide) return null;

    return appendCanonicalTemplate(deck, {
      ...asPlainObject(templateLike),
      slide
    });
  }

  function saveCanonicalBlockFromNodeIds(deckLike, slideId, nodeIds = [], blockLike = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    const normalizedNodeIds = new Set(normalizeStringArray(nodeIds).map((id) => id.trim()));
    if (!isCanonicalDeck(deck) || !normalizedSlideId || normalizedNodeIds.size === 0) {
      return null;
    }

    const slide = deck.slides.find((candidate) => candidate && candidate.id === normalizedSlideId);
    if (!slide) return null;

    const selectedNodes = slide.nodes.filter((node) => node && normalizedNodeIds.has(node.id));
    if (selectedNodes.length !== normalizedNodeIds.size) return null;

    return appendCanonicalBlock(deck, {
      ...asPlainObject(blockLike),
      nodes: selectedNodes
    });
  }

  function insertCanonicalSlide(deckLike, slideLike = {}, index) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck)
      || !slideLike
      || typeof slideLike !== 'object'
      || !Number.isInteger(index)
      || index < 0
      || index > deck.slides.length) {
      return null;
    }

    const nextSlides = [...deck.slides];
    nextSlides.splice(index, 0, createCanonicalSlide(slideLike, index));
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function appendCanonicalNode(deckLike, slideId, nodeLike = {}) {
    if (!deckLike || typeof deckLike !== 'object' || !nodeLike || typeof nodeLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    if (!isCanonicalDeck(deck) || !normalizedSlideId) {
      return null;
    }

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    if (slideIndex < 0) {
      return null;
    }

    const collectNodeIds = (nodes = [], ids = new Set()) => {
      nodes.forEach((node) => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.id === 'string' && node.id.trim()) {
          ids.add(node.id);
        }
        collectNodeIds(Array.isArray(node.children) ? node.children : [], ids);
      });
      return ids;
    };
    const slide = deck.slides[slideIndex];
    const nextNode = createCanonicalNode(nodeLike, slide.nodes.length);
    if (collectNodeIds(deck.slides.flatMap((candidate) => candidate.nodes)).has(nextNode.id)) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      slides: deck.slides.map((candidate, index) => index === slideIndex
        ? {
            ...candidate,
            nodes: [...candidate.nodes, nextNode]
          }
        : candidate)
    });
  }

  function collectCanonicalNodeIds(nodes = [], usedIds = new Set()) {
    (Array.isArray(nodes) ? nodes : []).forEach((node) => {
      if (!node || typeof node !== 'object') return;
      if (typeof node.id === 'string' && node.id.trim()) {
        usedIds.add(node.id);
      }
      collectCanonicalNodeIds(node.children, usedIds);
    });
    return usedIds;
  }

  function cloneCanonicalBlockNode(node, blockId, usedIds, path = [], options = {}) {
    const sourceId = normalizeString(node && node.id).trim();
    const fallbackId = `${blockId}-node-${path.join('-') || '1'}`;
    const nextId = createUniqueCanonicalId(
      `${blockId}-${sourceId || fallbackId}`,
      fallbackId,
      usedIds
    );
    const currentLayout = asPlainObject(node && node.layout);
    const nextLayout = { ...currentLayout };
    const offsetX = normalizeFiniteNumber(options.offsetX, 0);
    const offsetY = normalizeFiniteNumber(options.offsetY, 0);
    if (currentLayout.mode === 'absolute' && Number.isFinite(currentLayout.x)) {
      nextLayout.x = currentLayout.x + offsetX;
    }
    if (currentLayout.mode === 'absolute' && Number.isFinite(currentLayout.y)) {
      nextLayout.y = currentLayout.y + offsetY;
    }

    return createCanonicalNode({
      ...node,
      id: nextId,
      layout: nextLayout,
      children: (Array.isArray(node && node.children) ? node.children : [])
        .map((child, childIndex) => cloneCanonicalBlockNode(
          child,
          blockId,
          usedIds,
          path.concat(childIndex + 1),
          options
        ))
    }, path.length);
  }

  function insertCanonicalBlockInstance(deckLike, slideId, blockId, options = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    const normalizedBlockId = normalizeString(blockId).trim();
    const blocks = Array.isArray(deck.blocks) ? deck.blocks : [];
    if (!isCanonicalDeck(deck) || !normalizedSlideId || !normalizedBlockId) {
      return null;
    }

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    const block = blocks.find((candidate) => candidate && candidate.id === normalizedBlockId);
    if (slideIndex < 0 || !block || !Array.isArray(block.nodes) || block.nodes.length === 0) {
      return null;
    }

    const usedNodeIds = new Set();
    deck.slides.forEach((slide) => collectCanonicalNodeIds(slide && slide.nodes, usedNodeIds));
    const idPrefix = normalizeString(options.idPrefix, normalizedBlockId).trim() || normalizedBlockId;
    const clonedNodes = block.nodes.map((node, nodeIndex) => cloneCanonicalBlockNode(
      node,
      idPrefix,
      usedNodeIds,
      [nodeIndex + 1],
      options
    ));

    return createCanonicalDeck({
      ...deck,
      slides: deck.slides.map((slide, index) => index === slideIndex
        ? { ...slide, nodes: [...slide.nodes, ...clonedNodes] }
        : slide)
    });
  }

  function groupCanonicalNodes(deckLike, slideId, parentNodeId = '', nodeIds = [], groupNodeLike = {}) {
    if (!deckLike || typeof deckLike !== 'object' || !groupNodeLike || typeof groupNodeLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    const normalizedParentNodeId = normalizeString(parentNodeId).trim();
    const normalizedNodeIds = new Set(normalizeStringArray(nodeIds).map((id) => id.trim()));
    if (!isCanonicalDeck(deck) || !normalizedSlideId || normalizedNodeIds.size < 2) {
      return null;
    }

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    if (slideIndex < 0) {
      return null;
    }

    const groupNode = createCanonicalNode(groupNodeLike, 0);
    const groupChildIds = new Set(groupNode.children.map((child) => child && child.id));
    if (!groupNode.id
      || groupChildIds.size !== normalizedNodeIds.size
      || [...normalizedNodeIds].some((id) => !groupChildIds.has(id))) {
      return null;
    }

    const existingNodeIds = new Set();
    function collectNodeIds(nodes = []) {
      nodes.forEach((node) => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.id === 'string' && node.id.trim()) {
          existingNodeIds.add(node.id);
        }
        collectNodeIds(Array.isArray(node.children) ? node.children : []);
      });
    }
    collectNodeIds(deck.slides.map((slide) => slide.nodes).flat());
    if (existingNodeIds.has(groupNode.id)) {
      return null;
    }

    function groupNodes(nodes = []) {
      const selectedIndices = nodes
        .map((node, index) => normalizedNodeIds.has(node && node.id) ? index : -1)
        .filter((index) => index >= 0);
      if (selectedIndices.length !== normalizedNodeIds.size) {
        return null;
      }

      const firstSelectedIndex = selectedIndices[0];
      const retainedBeforeGroup = nodes
        .slice(0, firstSelectedIndex)
        .filter((node) => !normalizedNodeIds.has(node && node.id));
      const nextNodes = nodes.filter((node) => !normalizedNodeIds.has(node && node.id));
      nextNodes.splice(retainedBeforeGroup.length, 0, groupNode);
      return nextNodes;
    }

    let didGroup = false;
    function updateParentNode(nodes = []) {
      return nodes.map((node, index) => {
        if (!node || typeof node !== 'object') return node;
        if (node.id === normalizedParentNodeId) {
          const nextChildren = groupNodes(Array.isArray(node.children) ? node.children : []);
          if (!nextChildren) return node;
          didGroup = true;
          return createCanonicalNode({
            ...node,
            children: nextChildren
          }, index);
        }

        if (!Array.isArray(node.children) || node.children.length === 0) {
          return node;
        }
        const nextChildren = updateParentNode(node.children);
        if (nextChildren.some((child, childIndex) => child !== node.children[childIndex])) {
          didGroup = true;
          return createCanonicalNode({
            ...node,
            children: nextChildren
          }, index);
        }
        return node;
      });
    }

    const slide = deck.slides[slideIndex];
    const nextNodes = normalizedParentNodeId
      ? updateParentNode(slide.nodes)
      : groupNodes(slide.nodes);
    if (!nextNodes || (normalizedParentNodeId && !didGroup)) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      slides: deck.slides.map((candidate, index) => index === slideIndex
        ? { ...candidate, nodes: nextNodes }
        : candidate)
    });
  }

  function ungroupCanonicalNodes(deckLike, slideId, groupChanges = []) {
    if (!deckLike || typeof deckLike !== 'object') {
      return null;
    }
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    if (!isCanonicalDeck(deck) || !normalizedSlideId || !Array.isArray(groupChanges) || groupChanges.length === 0) {
      return null;
    }

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    if (slideIndex < 0) {
      return null;
    }

    const changesById = new Map();
    groupChanges.forEach((change, index) => {
      const groupId = normalizeString(change && (change.groupId || change.id)).trim();
      const parentNodeId = normalizeString(change && change.parentNodeId).trim();
      const children = Array.isArray(change && change.children)
        ? change.children.map((child, childIndex) => createCanonicalNode(child, childIndex))
        : [];
      if (!groupId || children.length === 0 || changesById.has(groupId)) {
        return;
      }
      changesById.set(groupId, {
        groupId,
        parentNodeId,
        children
      });
    });
    if (changesById.size !== groupChanges.length) {
      return null;
    }

    const locationsById = new Map();
    function collectLocations(nodes = [], parentNodeId = '') {
      nodes.forEach((node) => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.id === 'string' && node.id.trim()) {
          if (locationsById.has(node.id)) {
            locationsById.set(node.id, null);
          } else {
            locationsById.set(node.id, { node, parentNodeId });
          }
        }
        collectLocations(Array.isArray(node.children) ? node.children : [], node.id);
      });
    }
    collectLocations(deck.slides[slideIndex].nodes);

    for (const change of changesById.values()) {
      const location = locationsById.get(change.groupId);
      if (!location || location.parentNodeId !== change.parentNodeId) {
        return null;
      }
      const existingChildIds = location.node.children.map((child) => child && child.id);
      const importedChildIds = change.children.map((child) => child && child.id);
      if (existingChildIds.length !== importedChildIds.length
        || new Set(existingChildIds).size !== existingChildIds.length
        || new Set(importedChildIds).size !== importedChildIds.length
        || existingChildIds.some((id, index) => id !== importedChildIds[index])) {
        return null;
      }
      if (change.parentNodeId && changesById.has(change.parentNodeId)) {
        return null;
      }
    }

    let didChange = false;
    function replaceGroups(nodes = [], parentNodeId = '') {
      const nextNodes = [];
      nodes.forEach((node, index) => {
        if (!node || typeof node !== 'object') {
          nextNodes.push(node);
          return;
        }
        const change = changesById.get(node.id);
        if (change && change.parentNodeId === parentNodeId) {
          didChange = true;
          nextNodes.push(...change.children);
          return;
        }

        const currentChildren = Array.isArray(node.children) ? node.children : [];
        if (currentChildren.length === 0) {
          nextNodes.push(node);
          return;
        }
        const nextChildren = replaceGroups(currentChildren, node.id);
        if (nextChildren.some((child, childIndex) => child !== currentChildren[childIndex])
          || nextChildren.length !== currentChildren.length) {
          nextNodes.push(createCanonicalNode({
            ...node,
            children: nextChildren
          }, index));
          return;
        }
        nextNodes.push(node);
      });
      return nextNodes;
    }

    const slide = deck.slides[slideIndex];
    const nextNodes = replaceGroups(slide.nodes);
    if (!didChange) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      slides: deck.slides.map((candidate, index) => index === slideIndex
        ? { ...candidate, nodes: nextNodes }
        : candidate)
    });
  }

  function removeCanonicalNodes(deckLike, nodeIds = []) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedIds = new Set(normalizeStringArray(nodeIds).map((id) => id.trim()));
    if (!isCanonicalDeck(deck) || normalizedIds.size === 0) {
      return null;
    }

    let didChange = false;
    function removeNodes(nodes = []) {
      const nextNodes = [];
      nodes.forEach((node, index) => {
        if (!node || typeof node !== 'object') {
          nextNodes.push(node);
          return;
        }
        if (normalizedIds.has(node.id)) {
          didChange = true;
          return;
        }

        let nextNode = node;
        const currentChildren = Array.isArray(node.children) ? node.children : [];
        if (currentChildren.length > 0) {
          const nextChildren = removeNodes(currentChildren);
          if (nextChildren.length !== currentChildren.length
            || nextChildren.some((child, childIndex) => child !== currentChildren[childIndex])) {
            nextNode = createCanonicalNode({
              ...node,
              children: nextChildren
            }, index);
          }
        }
        nextNodes.push(nextNode);
      });
      return nextNodes;
    }

    const nextSlides = deck.slides.map((slide) => ({
      ...slide,
      nodes: removeNodes(Array.isArray(slide.nodes) ? slide.nodes : [])
    }));
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalNodeVisibility(deckLike, nodeIds = [], visibilityPatch = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedIds = new Set(normalizeStringArray(nodeIds).map((id) => id.trim()));
    const patch = asPlainObject(visibilityPatch);
    const patchKeys = ['hidden', 'locked']
      .filter((key) => Object.prototype.hasOwnProperty.call(patch, key));
    if (!isCanonicalDeck(deck) || normalizedIds.size === 0 || patchKeys.length === 0) {
      return null;
    }

    let didChange = false;
    function updateNodes(nodes = []) {
      return nodes.map((node, index) => {
        if (!node || typeof node !== 'object') return node;
        let nextNode = node;
        let nodeChanged = false;
        if (normalizedIds.has(node.id)) {
          const currentVisibility = asPlainObject(node.visibility);
          const nextVisibility = { ...currentVisibility };
          patchKeys.forEach((key) => {
            const nextValue = !!patch[key];
            if (nextVisibility[key] !== nextValue) {
              nextVisibility[key] = nextValue;
              nodeChanged = true;
            }
          });
          if (nodeChanged) {
            nextNode = {
              ...nextNode,
              visibility: nextVisibility
            };
          }
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
          const nextChildren = updateNodes(node.children);
          if (nextChildren.some((child, childIndex) => child !== node.children[childIndex])) {
            nextNode = {
              ...nextNode,
              children: nextChildren
            };
            nodeChanged = true;
          }
        }

        if (!nodeChanged) return node;
        didChange = true;
        return createCanonicalNode(nextNode, index);
      });
    }

    const nextSlides = deck.slides.map((slide) => ({
      ...slide,
      nodes: updateNodes(Array.isArray(slide.nodes) ? slide.nodes : [])
    }));
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalNodeLayout(deckLike, nodeLayouts = []) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const layoutUpdates = new Map();
    const layoutKeys = ['mode', 'x', 'y', 'width', 'height', 'zIndex'];
    (Array.isArray(nodeLayouts) ? nodeLayouts : []).forEach((entry) => {
      const nodeId = normalizeString(entry && entry.id).trim();
      const patch = asPlainObject(entry && entry.layout);
      if (!nodeId) return;
      const normalizedPatch = {};
      layoutKeys.forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(patch, key)) return;
        if (key === 'mode') {
          const mode = normalizeString(patch[key]).trim();
          if (mode) normalizedPatch[key] = mode;
          return;
        }
        if (Number.isFinite(patch[key])) {
          normalizedPatch[key] = patch[key];
        }
      });
      if (Object.keys(normalizedPatch).length === 0) return;
      layoutUpdates.set(nodeId, {
        ...(layoutUpdates.get(nodeId) || {}),
        ...normalizedPatch
      });
    });
    if (!isCanonicalDeck(deck) || layoutUpdates.size === 0) {
      return null;
    }

    let didChange = false;
    function updateNodes(nodes = []) {
      return nodes.map((node, index) => {
        if (!node || typeof node !== 'object') return node;
        let nextNode = node;
        let nodeChanged = false;
        const patch = layoutUpdates.get(node.id);
        if (patch) {
          const currentLayout = asPlainObject(node.layout);
          const nextLayout = { ...currentLayout };
          Object.keys(patch).forEach((key) => {
            if (nextLayout[key] !== patch[key]) {
              nextLayout[key] = patch[key];
              nodeChanged = true;
            }
          });
          if (nodeChanged) {
            nextNode = {
              ...nextNode,
              layout: nextLayout
            };
          }
        }

        if (Array.isArray(node.children) && node.children.length > 0) {
          const nextChildren = updateNodes(node.children);
          if (nextChildren.some((child, childIndex) => child !== node.children[childIndex])) {
            nextNode = {
              ...nextNode,
              children: nextChildren
            };
            nodeChanged = true;
          }
        }

        if (!nodeChanged) return node;
        didChange = true;
        return createCanonicalNode(nextNode, index);
      });
    }

    const nextSlides = deck.slides.map((slide) => ({
      ...slide,
      nodes: updateNodes(Array.isArray(slide.nodes) ? slide.nodes : [])
    }));
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalNodeText(deckLike, nodeTexts = []) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const textUpdates = new Map();
    (Array.isArray(nodeTexts) ? nodeTexts : []).forEach((entry) => {
      const nodeId = normalizeString(entry && entry.id).trim();
      if (!nodeId || typeof (entry && entry.text) !== 'string') return;
      textUpdates.set(nodeId, entry.text);
    });
    if (!isCanonicalDeck(deck) || textUpdates.size === 0) {
      return null;
    }

    let didChange = false;
    function updateNodes(nodes = []) {
      return nodes.map((node, index) => {
        if (!node || typeof node !== 'object') return node;
        let nextNode = node;
        let nodeChanged = false;
        const currentChildren = Array.isArray(node.children) ? node.children : [];
        const nextChildren = updateNodes(currentChildren);
        if (nextChildren.some((child, childIndex) => child !== currentChildren[childIndex])) {
          nextNode = {
            ...nextNode,
            children: nextChildren
          };
          nodeChanged = true;
        }

        if (textUpdates.has(node.id)) {
          const nextText = textUpdates.get(node.id);
          if (node.text !== nextText || node.html !== '' || nextChildren.length > 0) {
            nextNode = {
              ...nextNode,
              text: nextText,
              html: '',
              children: []
            };
            nodeChanged = true;
          }
        }

        if (!nodeChanged) return node;
        didChange = true;
        return createCanonicalNode(nextNode, index);
      });
    }

    const nextSlides = deck.slides.map((slide) => ({
      ...slide,
      nodes: updateNodes(Array.isArray(slide.nodes) ? slide.nodes : [])
    }));
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalNodeAttributes(deckLike, nodeAttributes = []) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const attributeUpdates = new Map();
    (Array.isArray(nodeAttributes) ? nodeAttributes : []).forEach((entry) => {
      const nodeId = normalizeString(entry && entry.id).trim();
      const patch = asPlainObject(entry && entry.attributes);
      if (!nodeId || Object.keys(patch).length === 0) return;
      attributeUpdates.set(nodeId, patch);
    });
    if (!isCanonicalDeck(deck) || attributeUpdates.size === 0) {
      return null;
    }

    let didChange = false;
    function updateNodes(nodes = []) {
      return nodes.map((node, index) => {
        if (!node || typeof node !== 'object') return node;
        let nextNode = node;
        let nodeChanged = false;
        const currentChildren = Array.isArray(node.children) ? node.children : [];
        const nextChildren = updateNodes(currentChildren);
        if (nextChildren.some((child, childIndex) => child !== currentChildren[childIndex])) {
          nextNode = {
            ...nextNode,
            children: nextChildren
          };
          nodeChanged = true;
        }

        const patch = attributeUpdates.get(node.id);
        if (patch) {
          const currentAttributes = asPlainObject(node.attributes);
          const nextAttributes = { ...currentAttributes, ...patch };
          const didChangeAttributes = Object.keys(patch)
            .some((key) => currentAttributes[key] !== patch[key]);
          if (didChangeAttributes) {
            nextNode = {
              ...nextNode,
              attributes: nextAttributes
            };
            nodeChanged = true;
          }
          const isImageNode = node.type === 'image'
            || normalizeString(node.tagName).toLowerCase() === 'img';
          if (isImageNode
            && Object.prototype.hasOwnProperty.call(patch, 'src')
            && currentAttributes.src !== patch.src
            && Object.prototype.hasOwnProperty.call(node, 'assetId')) {
            nextNode = { ...nextNode };
            delete nextNode.assetId;
            nodeChanged = true;
          }
        }

        if (!nodeChanged) return node;
        didChange = true;
        return createCanonicalNode(nextNode, index);
      });
    }

    const nextSlides = deck.slides.map((slide) => ({
      ...slide,
      nodes: updateNodes(Array.isArray(slide.nodes) ? slide.nodes : [])
    }));
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalNodeAsset(deckLike, slideId, nodeId, assetId = '') {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    const normalizedNodeId = normalizeString(nodeId).trim();
    const normalizedAssetId = normalizeString(assetId).trim();
    if (!isCanonicalDeck(deck) || !normalizedSlideId || !normalizedNodeId) {
      return null;
    }

    const asset = findCanonicalAssetById(deck, normalizedAssetId);
    if (normalizedAssetId && !asset) return null;

    const slideIndex = deck.slides.findIndex((slide) => slide && slide.id === normalizedSlideId);
    if (slideIndex < 0) return null;

    let didFindNode = false;
    let didChange = false;
    const updateNodes = (nodes = []) => (Array.isArray(nodes) ? nodes : []).map((node, index) => {
      if (!node || typeof node !== 'object') return node;
      let nextNode = node;
      let nodeChanged = false;
      const currentChildren = Array.isArray(node.children) ? node.children : [];
      const nextChildren = updateNodes(currentChildren);
      if (nextChildren.some((child, childIndex) => child !== currentChildren[childIndex])) {
        nextNode = {
          ...nextNode,
          children: nextChildren
        };
        nodeChanged = true;
      }

      if (node.id === normalizedNodeId) {
        didFindNode = true;
        if (normalizedAssetId) {
          if (node.assetId !== normalizedAssetId) {
            nextNode = {
              ...nextNode,
              assetId: normalizedAssetId
            };
            nodeChanged = true;
          }
          const isImageNode = node.type === 'image' || normalizeString(node.tagName).toLowerCase() === 'img';
          if (isImageNode && asset && normalizeString(node.attributes && node.attributes.src) !== normalizeString(asset.src)) {
            nextNode = {
              ...nextNode,
              attributes: {
                ...asPlainObject(node.attributes),
                src: asset.src
              }
            };
            nodeChanged = true;
          }
        } else if (Object.prototype.hasOwnProperty.call(node, 'assetId')) {
          nextNode = { ...nextNode };
          delete nextNode.assetId;
          nodeChanged = true;
        }
      }

      if (!nodeChanged) return node;
      didChange = true;
      return createCanonicalNode(nextNode, index);
    });

    const slide = deck.slides[slideIndex];
    const nextNodes = updateNodes(slide.nodes);
    if (!didFindNode || !didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: deck.slides.map((candidate, index) => index === slideIndex
        ? { ...candidate, nodes: nextNodes }
        : candidate)
    });
  }

  function updateCanonicalNodeStyle(deckLike, nodeStyles = []) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const styleUpdates = new Map();
    const splitDeclarations = (styleText = '') => {
      const declarations = [];
      let current = '';
      let quote = '';
      let parenDepth = 0;
      const sourceText = normalizeString(styleText);
      for (let index = 0; index < sourceText.length; index += 1) {
        const char = sourceText[index];
        if (quote) {
          current += char;
          if (char === quote && sourceText[index - 1] !== '\\') quote = '';
          continue;
        }
        if (char === '"' || char === '\'') {
          quote = char;
          current += char;
          continue;
        }
        if (char === '(') parenDepth += 1;
        if (char === ')' && parenDepth > 0) parenDepth -= 1;
        if (char === ';' && parenDepth === 0) {
          if (current.trim()) declarations.push(current.trim());
          current = '';
          continue;
        }
        current += char;
      }
      if (current.trim()) declarations.push(current.trim());
      return declarations;
    };
    (Array.isArray(nodeStyles) ? nodeStyles : []).forEach((entry) => {
      const nodeId = normalizeString(entry && entry.id).trim();
      const property = normalizeString(entry && entry.property).trim().toLowerCase();
      if (!nodeId || !property) return;
      const updates = styleUpdates.get(nodeId) || [];
      updates.push({
        property,
        value: entry && entry.value === null || entry && entry.value === undefined
          ? ''
          : normalizeString(entry.value).trim()
      });
      styleUpdates.set(nodeId, updates);
    });
    if (!isCanonicalDeck(deck) || styleUpdates.size === 0) {
      return null;
    }

    const applyStyleUpdates = (styleText, updates) => {
      let declarations = splitDeclarations(styleText);
      updates.forEach(({ property, value }) => {
        let replaced = false;
        declarations = declarations.reduce((nextDeclarations, declaration) => {
          const separatorIndex = declaration.indexOf(':');
          const declarationProperty = separatorIndex === -1
            ? ''
            : declaration.slice(0, separatorIndex).trim().toLowerCase();
          if (declarationProperty !== property) {
            nextDeclarations.push(`${declaration};`);
            return nextDeclarations;
          }
          if (!replaced && value) {
            nextDeclarations.push(`${property}: ${value};`);
            replaced = true;
          }
          return nextDeclarations;
        }, []);
        if (!replaced && value) {
          declarations.push(`${property}: ${value};`);
        }
      });
      return declarations.join(' ');
    };

    let didChange = false;
    function updateNodes(nodes = []) {
      return nodes.map((node, index) => {
        if (!node || typeof node !== 'object') return node;
        let nextNode = node;
        let nodeChanged = false;
        const currentChildren = Array.isArray(node.children) ? node.children : [];
        const nextChildren = updateNodes(currentChildren);
        if (nextChildren.some((child, childIndex) => child !== currentChildren[childIndex])) {
          nextNode = {
            ...nextNode,
            children: nextChildren
          };
          nodeChanged = true;
        }

        const updates = styleUpdates.get(node.id);
        if (updates) {
          const currentStyle = normalizeString(node.style).trim();
          const nextStyle = applyStyleUpdates(currentStyle, updates);
          if (nextStyle !== currentStyle) {
            nextNode = {
              ...nextNode,
              style: nextStyle
            };
            nodeChanged = true;
          }
        }

        if (!nodeChanged) return node;
        didChange = true;
        return createCanonicalNode(nextNode, index);
      });
    }

    const nextSlides = deck.slides.map((slide) => ({
      ...slide,
      nodes: updateNodes(Array.isArray(slide.nodes) ? slide.nodes : [])
    }));
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalThemeTokens(deckLike, tokenUpdates = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    if (!isCanonicalDeck(deck) || !tokenUpdates || typeof tokenUpdates !== 'object' || Array.isArray(tokenUpdates)) {
      return null;
    }

    const currentTokens = asPlainObject(deck.theme && deck.theme.tokens);
    const nextTokens = { ...currentTokens };
    let didChange = false;
    let didReceiveUpdate = false;

    Object.entries(tokenUpdates).forEach(([rawName, rawValue]) => {
      const tokenName = normalizeString(rawName).trim();
      if (!/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(tokenName)) {
        return;
      }
      didReceiveUpdate = true;

      if (rawValue === null || rawValue === undefined || !normalizeString(rawValue).trim()) {
        if (Object.prototype.hasOwnProperty.call(nextTokens, tokenName)) {
          delete nextTokens[tokenName];
          didChange = true;
        }
        return;
      }

      const tokenValue = normalizeString(rawValue).trim();
      if (nextTokens[tokenName] !== tokenValue) {
        nextTokens[tokenName] = tokenValue;
        didChange = true;
      }
    });

    if (!didReceiveUpdate || !didChange) {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      theme: {
        ...asPlainObject(deck.theme),
        tokens: nextTokens
      }
    });
  }

  function updateCanonicalSlideBackground(deckLike, slideIds = [], background = '') {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideIds = new Set(normalizeStringArray(slideIds).map((id) => id.trim()));
    const nextBackground = normalizeString(background);
    if (!isCanonicalDeck(deck) || normalizedSlideIds.size === 0) {
      return null;
    }

    let didChange = false;
    const nextSlides = deck.slides.map((slide, index) => {
      if (!slide || !normalizedSlideIds.has(slide.id)) return slide;
      const currentLayout = asPlainObject(slide.layout);
      const currentBackground = asPlainObject(currentLayout.background);
      if (currentBackground.style === nextBackground) return slide;
      didChange = true;
      return createCanonicalSlide({
        ...slide,
        layout: {
          ...currentLayout,
          background: {
            ...currentBackground,
            style: nextBackground
          }
        }
      }, index);
    });
    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  function updateCanonicalSlideMetadata(deckLike, slideId, metadata = {}) {
    const deck = isCanonicalDeck(deckLike)
      ? deckLike
      : createCanonicalDeck(deckLike);
    const normalizedSlideId = normalizeString(slideId).trim();
    const patch = asPlainObject(metadata);
    const hasNotes = Object.prototype.hasOwnProperty.call(patch, 'notes');
    const hasSection = Object.prototype.hasOwnProperty.call(patch, 'section');
    if (!isCanonicalDeck(deck) || !normalizedSlideId || (!hasNotes && !hasSection)) {
      return null;
    }

    let didChange = false;
    const nextSlides = deck.slides.map((slide, index) => {
      if (!slide || slide.id !== normalizedSlideId) return slide;

      const nextSlide = { ...slide };
      if (hasNotes) {
        const nextNotes = normalizeString(patch.notes);
        if (slide.notes !== nextNotes) {
          nextSlide.notes = nextNotes;
          didChange = true;
        }
      }
      if (hasSection) {
        const nextSection = normalizeString(patch.section);
        if (normalizeString(slide.section) !== nextSection) {
          nextSlide.section = nextSection;
          didChange = true;
        }
      }

      return didChange ? createCanonicalSlide(nextSlide, index) : slide;
    });

    if (!didChange) return null;
    return createCanonicalDeck({
      ...deck,
      slides: nextSlides
    });
  }

  return {
    DECK_KIND,
    DECK_SCHEMA_VERSION,
    DEFAULT_LAYOUT_MODE,
    DEFAULT_NODE_TYPE,
    normalizeLayoutMode,
    createCanonicalAsset,
    insertCanonicalAsset,
    appendCanonicalAsset,
    updateCanonicalAsset,
    removeCanonicalAsset,
    createCanonicalNode,
    createCanonicalBlock,
    createCanonicalTemplate,
    createCanonicalMasterSlide,
    createCanonicalSlide,
    createCanonicalInlineScript,
    createCanonicalDeck,
    mergeCanonicalDeckRebuildBaseline,
    isCanonicalDeck,
    findCanonicalNodeById,
    findCanonicalAssetById,
    findCanonicalSlideById,
    findCanonicalSlideIndexById,
    reorderCanonicalSlides,
    removeCanonicalSlide,
    appendCanonicalSlide,
    insertCanonicalSlide,
    appendCanonicalBlock,
    insertCanonicalBlock,
    removeCanonicalBlock,
    appendCanonicalTemplate,
    insertCanonicalTemplate,
    removeCanonicalTemplate,
    appendCanonicalMasterSlide,
    insertCanonicalMasterSlide,
    removeCanonicalMasterSlide,
    updateCanonicalSlideMasterSlide,
    saveCanonicalMasterSlideFromSlideId,
    insertCanonicalTemplateSlide,
    saveCanonicalTemplateFromSlideId,
    saveCanonicalBlockFromNodeIds,
    appendCanonicalNode,
    insertCanonicalBlockInstance,
    groupCanonicalNodes,
    ungroupCanonicalNodes,
    removeCanonicalNodes,
    updateCanonicalNodeVisibility,
    updateCanonicalNodeLayout,
    updateCanonicalNodeText,
    updateCanonicalNodeAttributes,
    updateCanonicalNodeAsset,
    updateCanonicalNodeStyle,
    updateCanonicalThemeTokens,
    updateCanonicalSlideBackground,
    updateCanonicalSlideMetadata
  };
});
