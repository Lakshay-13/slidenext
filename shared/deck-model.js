(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckModel = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
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

  return {
    resolveElementDisplayMetadata,
    buildElementSnapshot,
    buildLayerSnapshot,
    buildSlideSnapshot,
    buildDeckSnapshot
  };
});
