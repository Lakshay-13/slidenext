(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorDom = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  let editorElementIdCounter = 0;
  let editorSlideIdCounter = 0;

  function createStudioSlideId(options = {}) {
    const randomUUID = typeof options.randomUUID === 'function'
      ? options.randomUUID
      : root && root.crypto && typeof root.crypto.randomUUID === 'function'
        ? root.crypto.randomUUID.bind(root.crypto)
        : null;
    if (randomUUID) {
      return `sl-${randomUUID()}`;
    }
    const now = typeof options.now === 'function' ? options.now() : Date.now();
    editorSlideIdCounter += 1;
    return `sl-${now.toString(36)}-${editorSlideIdCounter.toString(36)}`;
  }

  function assignStudioSlideId(slide, options = {}) {
    if (!slide || !slide.classList || !slide.classList.contains('slide')) return '';
    const attrName = options.slideAttrName || 'data-slide-id';
    const forceNew = !!options.forceNew;
    const existingId = slide.getAttribute(attrName);
    if (!forceNew && existingId) return existingId;
    const nextId = typeof options.createSlideId === 'function'
      ? options.createSlideId(options)
      : createStudioSlideId(options);
    slide.setAttribute(attrName, nextId);
    return nextId;
  }

  function ensureStudioSlideIds(rootNode, options = {}) {
    if (!rootNode) return [];
    const slides = [];
    if (rootNode.nodeType === 1 && rootNode.classList && rootNode.classList.contains('slide')) {
      slides.push(rootNode);
    }
    if (typeof rootNode.querySelectorAll === 'function') {
      rootNode.querySelectorAll(options.slideSelector || '.slide').forEach((slide) => slides.push(slide));
    }
    slides.forEach((slide) => assignStudioSlideId(slide, options));
    return slides;
  }

  function getStudioSlides(doc, options = {}) {
    if (!doc) return [];
    return ensureStudioSlideIds(doc, options);
  }

  function getStudioSlideById(slideId, doc, options = {}) {
    if (!slideId || !doc) return null;
    const attrName = options.slideAttrName || 'data-slide-id';
    return doc.querySelector(`.slide[${attrName}="${slideId}"]`);
  }

  function getStudioSlideIndexById(slideId, doc, options = {}) {
    return getStudioSlides(doc, options).findIndex((slide) => {
      return slide.getAttribute(options.slideAttrName || 'data-slide-id') === slideId;
    });
  }

  function getStudioActiveSlide(doc, options = {}) {
    if (!doc || typeof doc.querySelector !== 'function') return null;
    const activeSlideSelector = options.activeSlideSelector || '.slide-active';
    const slideSelector = options.slideSelector || '.slide';
    return doc.querySelector(activeSlideSelector) || doc.querySelector(slideSelector);
  }

  function pruneStudioChromeNodes(doc, options = {}) {
    if (!doc || typeof doc.querySelectorAll !== 'function') return;
    const chromeNodeIds = options.chromeNodeIds || [];
    const activeSlide = options.activeSlide || null;

    chromeNodeIds.forEach((nodeId) => {
      const matches = Array.from(doc.querySelectorAll(`#${nodeId}`));
      const keepNode = activeSlide && typeof activeSlide.contains === 'function'
        ? matches.find((node) => activeSlide.contains(node)) || null
        : null;
      matches.forEach((node) => {
        if (keepNode && node === keepNode) return;
        if (node && typeof node.remove === 'function') {
          node.remove();
        }
      });
    });
  }

  function isEligibleEditableElement(el, options = {}) {
    if (!el || el.nodeType !== 1) return false;

    const blockedIds = options.blockedIds || ['editorSelectionOverlay', 'editorGuidesLayer', 'slidesContainer'];
    if (blockedIds.includes(el.id)) return false;

    const blockedClassNames = options.blockedClassNames || ['editor-resize-handle', 'editor-guide-line'];
    if (blockedClassNames.some((className) => el.classList && el.classList.contains(className))) {
      return false;
    }

    if (el.classList && el.classList.contains('slide')) return false;

    const tagName = el.tagName ? el.tagName.toLowerCase() : '';
    const blockedTagNames = options.blockedTagNames || ['html', 'body', 'head', 'style', 'script', 'iframe'];
    if (blockedTagNames.includes(tagName)) return false;

    return true;
  }

  function createStudioElementId(options = {}) {
    const randomUUID = typeof options.randomUUID === 'function'
      ? options.randomUUID
      : root && root.crypto && typeof root.crypto.randomUUID === 'function'
        ? root.crypto.randomUUID.bind(root.crypto)
        : null;
    if (randomUUID) {
      return `el-${randomUUID()}`;
    }
    const now = typeof options.now === 'function' ? options.now() : Date.now();
    editorElementIdCounter += 1;
    return `el-${now.toString(36)}-${editorElementIdCounter.toString(36)}`;
  }

  function assignStudioElementId(el, options = {}) {
    const isEligible = typeof options.isEligibleEditableElement === 'function'
      ? options.isEligibleEditableElement
      : isEligibleEditableElement;
    if (!isEligible(el, options)) return '';
    const attrName = options.elementAttrName || 'data-editor-id';
    const forceNew = !!options.forceNew;
    const existingId = el.getAttribute(attrName);
    if (!forceNew && existingId) return existingId;
    const nextId = typeof options.createElementId === 'function'
      ? options.createElementId(options)
      : createStudioElementId(options);
    el.setAttribute(attrName, nextId);
    return nextId;
  }

  function ensureStudioElementIds(rootNode, options = {}) {
    if (!rootNode) return [];
    const isEligible = typeof options.isEligibleEditableElement === 'function'
      ? options.isEligibleEditableElement
      : isEligibleEditableElement;
    const editableElements = [];
    const selectableSelector = options.selectableSelector || '';

    if (rootNode.nodeType === 1 && rootNode.matches && selectableSelector
      && rootNode.matches(selectableSelector) && isEligible(rootNode, options)) {
      editableElements.push(rootNode);
    }
    if (typeof rootNode.querySelectorAll === 'function' && selectableSelector) {
      rootNode.querySelectorAll(selectableSelector).forEach((el) => {
        if (isEligible(el, options)) {
          editableElements.push(el);
        }
      });
    }
    editableElements.forEach((el) => assignStudioElementId(el, options));
    return editableElements;
  }

  function getElementByEditorId(editorId, doc, options = {}) {
    if (!editorId || !doc) return null;
    const attrName = options.elementAttrName || 'data-editor-id';
    return doc.querySelector(`[${attrName}="${editorId}"]`);
  }

  function getStudioSlideEditableElements(slide, options = {}) {
    if (!slide) return [];
    const isEligible = typeof options.isEligibleEditableElement === 'function'
      ? options.isEligibleEditableElement
      : isEligibleEditableElement;
    const selectableSelector = options.selectableSelector || '';
    if (!selectableSelector) return [];
    return Array.from(slide.querySelectorAll(selectableSelector)).filter((el) => isEligible(el, options));
  }

  function getNormalizedStudioSlideLayerOrder(slide, options = {}) {
    const getEditableElements = typeof options.getSlideEditableElements === 'function'
      ? options.getSlideEditableElements
      : (sourceSlide) => getStudioSlideEditableElements(sourceSlide, options);
    return getEditableElements(slide)
      .map((el, domIndex) => ({
        el,
        domIndex,
        zIndex: parseInt(el.style.zIndex, 10) || 0
      }))
      .sort((a, b) => {
        if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
        return a.domIndex - b.domIndex;
      })
      .map((entry) => entry.el);
  }

  function applyStudioSlideLayerOrder(slide, orderedElements) {
    orderedElements.forEach((el, idx) => {
      el.style.zIndex = String(idx);
    });
    return orderedElements;
  }

  function findPreferredStudioDragContainer(el, options = {}) {
    if (!el || typeof el.closest !== 'function') return null;
    const slideSelector = options.slideSelector || '.slide';
    const parentTargetSelector = options.parentTargetSelector || '';
    if (!parentTargetSelector) return null;
    const slide = el.closest(slideSelector);
    if (!slide) return null;
    const candidate = el.closest(parentTargetSelector);
    if (!candidate || candidate === el) return null;
    if (!slide.contains(candidate)) return null;
    const isEligible = typeof options.isEligibleEditableElement === 'function'
      ? options.isEligibleEditableElement
      : isEligibleEditableElement;
    if (!isEligible(candidate, options)) return null;
    return candidate;
  }

  function resolveStudioEditableTarget(node, options = {}) {
    const selectableSelector = options.selectableSelector || '';
    const inlineTextTags = options.inlineTextTags || [];
    const inlineTagSet = inlineTextTags instanceof Set ? inlineTextTags : new Set(inlineTextTags);
    const isEligible = typeof options.isEligibleEditableElement === 'function'
      ? options.isEligibleEditableElement
      : isEligibleEditableElement;

    let current = node && node.nodeType === 1 ? node : node && node.parentElement ? node.parentElement : null;
    while (current) {
      if (current.matches && selectableSelector && current.matches(selectableSelector) && isEligible(current, options)) {
        const tagName = current.tagName ? current.tagName.toLowerCase() : '';
        if (inlineTagSet.has(tagName)) {
          const preferred = findPreferredStudioDragContainer(current, options);
          if (preferred) return preferred;
        }
        if (tagName === 'th' || tagName === 'td') {
          const table = current.closest('table');
          return table && isEligible(table, options) ? table : null;
        }
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  return {
    createStudioSlideId,
    assignStudioSlideId,
    ensureStudioSlideIds,
    getStudioSlides,
    getStudioSlideById,
    getStudioSlideIndexById,
    getStudioActiveSlide,
    pruneStudioChromeNodes,
    isEligibleEditableElement,
    createStudioElementId,
    assignStudioElementId,
    ensureStudioElementIds,
    getElementByEditorId,
    getStudioSlideEditableElements,
    getNormalizedStudioSlideLayerOrder,
    applyStudioSlideLayerOrder,
    findPreferredStudioDragContainer,
    resolveStudioEditableTarget
  };
});
