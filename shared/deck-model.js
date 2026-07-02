(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function truncateLabel(value, maxLength = 15) {
    const text = normalizeString(value).trim();
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.slice(0, maxLength)}...`;
  }

  function resolveElementDisplayMetadata(el) {
    const tagName = el.tagName.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
      const headingText = el.textContent.trim();
      return {
        typeIcon: 'title',
        displayName: `Heading: "${headingText.slice(0, 15)}${headingText.length > 15 ? '...' : ''}"`
      };
    }
    if (tagName === 'img') {
      const srcParts = (el.src || '').split('/');
      const filename = srcParts[srcParts.length - 1] || 'Image';
      return {
        typeIcon: 'image',
        displayName: `Image: "${filename.slice(0, 15)}${filename.length > 15 ? '...' : ''}"`
      };
    }
    if (el.classList.contains('editor-shape')) {
      return {
        typeIcon: 'layers',
        displayName: `Shape (${el.style.backgroundColor || 'colored'})`
      };
    }
    if (tagName === 'table') {
      return { typeIcon: 'grid_on', displayName: 'Data Table' };
    }
    if (tagName === 'pre' || tagName === 'code') {
      return { typeIcon: 'terminal', displayName: 'Code Block' };
    }
    const textValue = el.textContent.trim();
    return {
      typeIcon: 'description',
      displayName: `Text: "${textValue.slice(0, 15)}${textValue.length > 15 ? '...' : ''}"`
    };
  }

  function resolveCanonicalNodeDisplayMetadata(node = {}) {
    const type = normalizeString(node.type).toLowerCase();
    const tagName = normalizeString(node.tagName).toLowerCase();
    const name = normalizeString(node.name).trim();
    const textValue = normalizeString(node.text).trim();
    const src = normalizeString(node.attributes && node.attributes.src);
    const srcParts = src.split('/');
    const filename = srcParts[srcParts.length - 1] || 'Image';

    if (type === 'heading' || /^h[1-6]$/.test(tagName)) {
      return {
        typeIcon: 'title',
        displayName: name || `Heading: "${truncateLabel(textValue || 'Heading')}"`
      };
    }
    if (type === 'image' || tagName === 'img') {
      return {
        typeIcon: 'image',
        displayName: name || `Image: "${truncateLabel(filename || 'Image')}"`
      };
    }
    if (type === 'shape' || type === 'vector' || tagName === 'svg') {
      return {
        typeIcon: 'layers',
        displayName: name || 'Shape'
      };
    }
    if (type === 'table' || tagName === 'table') {
      return {
        typeIcon: 'grid_on',
        displayName: name || 'Data Table'
      };
    }
    if (type === 'code' || tagName === 'pre' || tagName === 'code') {
      return {
        typeIcon: 'terminal',
        displayName: name || 'Code Block'
      };
    }

    return {
      typeIcon: 'description',
      displayName: name || `Text: "${truncateLabel(textValue || node.id || 'Text')}"`
    };
  }

  function buildElementSnapshot(el, options = {}) {
    const { typeIcon, displayName } = resolveElementDisplayMetadata(el);
    return {
      id: typeof options.getElementId === 'function' ? options.getElementId(el) : '',
      typeIcon,
      displayName,
      zIndex: el.style.zIndex || '0',
      isLocked: typeof options.isElementLocked === 'function' ? options.isElementLocked(el) : false,
      isHidden: typeof options.isElementHidden === 'function' ? options.isElementHidden(el) : false,
      isSelected: typeof options.isSelectedElement === 'function' ? options.isSelectedElement(el) : false
    };
  }

  function buildLayerSnapshot(elements, options = {}) {
    const snapshotBuilder = typeof options.buildElementSnapshot === 'function'
      ? options.buildElementSnapshot
      : (el) => buildElementSnapshot(el, options);
    return (elements || []).map((el, index) => snapshotBuilder(el, index));
  }

  function buildCanonicalLayerSnapshot(nodes = [], options = {}) {
    const snapshots = [];
    const usedIds = new Set();
    let fallbackIndex = 1;

    function collectUsedIds(nextNodes = []) {
      nextNodes.forEach((node) => {
        if (!node || typeof node !== 'object') {
          return;
        }
        const nodeId = normalizeString(node.id).trim();
        if (nodeId) {
          usedIds.add(nodeId);
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          collectUsedIds(node.children);
        }
      });
    }

    function reserveFallbackId() {
      let fallbackId = `node-${fallbackIndex}`;
      while (usedIds.has(fallbackId)) {
        fallbackIndex += 1;
        fallbackId = `node-${fallbackIndex}`;
      }
      usedIds.add(fallbackId);
      fallbackIndex += 1;
      return fallbackId;
    }

    collectUsedIds(Array.isArray(nodes) ? nodes : []);

    function appendNodeSnapshots(nextNodes = []) {
      nextNodes.forEach((node) => {
        if (!node || typeof node !== 'object') {
          return;
        }

        const { typeIcon, displayName } = resolveCanonicalNodeDisplayMetadata(node);
        const resolvedId = normalizeString(node.id).trim() || reserveFallbackId();
        snapshots.push({
          id: resolvedId,
          typeIcon,
          displayName,
          zIndex: Number.isFinite(node.layout && node.layout.zIndex)
            ? String(node.layout.zIndex)
            : '0',
          isLocked: !!(node.visibility && node.visibility.locked),
          isHidden: !!(node.visibility && node.visibility.hidden),
          isSelected: typeof options.isSelectedNode === 'function'
            ? !!options.isSelectedNode(node)
            : false
        });

        if (Array.isArray(node.children) && node.children.length > 0) {
          appendNodeSnapshots(node.children);
        }
      });
    }

    appendNodeSnapshots(Array.isArray(nodes) ? nodes : []);
    return snapshots;
  }

  function buildSlideSnapshot(slide, index, options = {}) {
    const slideId = typeof options.getSlideId === 'function'
      ? options.getSlideId(slide, index)
      : slide.id || `slide-${index + 1}`;
    const firstHeading = slide.querySelector('h1, h2, h3');
    const editableElements = typeof options.getSlideEditableElements === 'function'
      ? options.getSlideEditableElements(slide)
      : [];
    const snapshot = {
      id: slideId,
      index,
      title: firstHeading ? firstHeading.textContent.trim() : `Slide ${index + 1}`,
      backgroundLabel: slide.style.background ? 'Gradient/Paint' : 'Default',
      elementCount: editableElements.length
    };

    if (options.includeLayers) {
      const orderedElements = typeof options.getNormalizedSlideLayerOrder === 'function'
        ? options.getNormalizedSlideLayerOrder(slide)
        : editableElements;
      snapshot.elements = buildLayerSnapshot(orderedElements, options.elementSnapshotOptions || options);
    }

    return snapshot;
  }

  function buildDeckSnapshot(doc, options = {}) {
    if (!doc) {
      return {
        activeSlideId: '',
        activeSlideIndex: -1,
        slides: []
      };
    }

    const slides = typeof options.getSlides === 'function'
      ? options.getSlides(doc)
      : Array.from(doc.querySelectorAll('.slide'));
    const activeSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide(doc, slides)
      : doc.querySelector('.slide-active') || slides[0] || null;
    const activeSlideId = activeSlide
      ? (typeof options.getSlideId === 'function'
          ? options.getSlideId(activeSlide, slides.indexOf(activeSlide))
          : activeSlide.id || '')
      : '';
    const slideSnapshots = slides.map((slide, index) => buildSlideSnapshot(slide, index, options));
    const activeSlideIndex = slideSnapshots.findIndex(slide => slide.id === activeSlideId);

    return {
      activeSlideId,
      activeSlideIndex,
      slides: slideSnapshots
    };
  }

  function countCanonicalSlideNodes(nodes = []) {
    return (nodes || []).reduce((count, node) => {
      const childCount = countCanonicalSlideNodes(node && Array.isArray(node.children) ? node.children : []);
      return count + (node ? 1 : 0) + childCount;
    }, 0);
  }

  function buildCanonicalBackgroundLabel(slide) {
    const background = slide && slide.layout && slide.layout.background
      ? slide.layout.background
      : {};
    return background.style || background.image || background.color || background.className
      ? 'Gradient/Paint'
      : 'Default';
  }

  function buildSlideSnapshotFromCanonicalSlide(slide, index, options = {}) {
    const slideId = typeof options.getSlideId === 'function'
      ? options.getSlideId(slide, index)
      : slide.id || `slide-${index + 1}`;
    const snapshot = {
      id: slideId,
      index,
      title: normalizeString(slide.title, normalizeString(slide.name, `Slide ${index + 1}`)),
      backgroundLabel: buildCanonicalBackgroundLabel(slide),
      elementCount: countCanonicalSlideNodes(slide && Array.isArray(slide.nodes) ? slide.nodes : [])
    };

    if (options.includeLayers) {
      snapshot.elements = buildCanonicalLayerSnapshot(slide && Array.isArray(slide.nodes) ? slide.nodes : [], options.canonicalLayerOptions || options);
    }

    return snapshot;
  }

  function buildDeckSnapshotFromCanonicalDeck(deck, options = {}) {
    const slides = deck && Array.isArray(deck.slides) ? deck.slides : [];
    const slideSnapshots = slides.map((slide, index) => buildSlideSnapshotFromCanonicalSlide(slide, index, options));
    const requestedActiveSlideId = normalizeString(options.activeSlideId);
    const activeSlideId = requestedActiveSlideId || (slideSnapshots[0] ? slideSnapshots[0].id : '');
    const activeSlideIndex = slideSnapshots.findIndex(slide => slide.id === activeSlideId);

    return {
      activeSlideId,
      activeSlideIndex,
      slides: slideSnapshots
    };
  }

  return {
    resolveElementDisplayMetadata,
    buildElementSnapshot,
    buildLayerSnapshot,
    buildCanonicalLayerSnapshot,
    buildSlideSnapshot,
    buildDeckSnapshot,
    countCanonicalSlideNodes,
    buildSlideSnapshotFromCanonicalSlide,
    buildDeckSnapshotFromCanonicalDeck
  };
});
