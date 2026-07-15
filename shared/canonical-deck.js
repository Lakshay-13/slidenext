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
    if (!isCanonicalDeck(deck) || !slideLike || typeof slideLike !== 'object') {
      return null;
    }

    return createCanonicalDeck({
      ...deck,
      slides: [
        ...deck.slides,
        createCanonicalSlide(slideLike, deck.slides.length)
      ]
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
          if (Object.keys(patch).some((key) => currentAttributes[key] !== patch[key])) {
            nextNode = {
              ...nextNode,
              attributes: nextAttributes
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
    isCanonicalDeck,
    reorderCanonicalSlides,
    removeCanonicalSlide,
    appendCanonicalSlide,
    appendCanonicalNode,
    removeCanonicalNodes,
    updateCanonicalNodeVisibility,
    updateCanonicalNodeLayout,
    updateCanonicalNodeText,
    updateCanonicalNodeAttributes,
    updateCanonicalNodeStyle,
    updateCanonicalSlideBackground
  };
});
