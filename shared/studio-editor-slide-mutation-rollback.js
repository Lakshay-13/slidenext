(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorSlideMutationRollback = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function rollbackStudioEditorSlideMutation(transaction, sourceDoc = null, options = {}) {
    const transactionApi = options.transactionApi && typeof options.transactionApi === 'object'
      ? options.transactionApi
      : null;
    const getIframeDoc = typeof options.getIframeDoc === 'function'
      ? options.getIframeDoc
      : () => null;
    const getSlideById = typeof options.getSlideById === 'function'
      ? options.getSlideById
      : () => null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : () => [];
    const getElementByEditorId = typeof options.getElementByEditorId === 'function'
      ? options.getElementByEditorId
      : () => null;
    const makeElementsHoverable = typeof options.makeElementsHoverable === 'function'
      ? options.makeElementsHoverable
      : () => {};
    const generateThumbnails = typeof options.generateThumbnails === 'function'
      ? options.generateThumbnails
      : () => {};
    const refreshRollbackThumbnailsSafely = () => {
      try {
        generateThumbnails();
      } catch (error) {
        // Thumbnail refresh must not turn a completed rollback into a failure.
      }
    };
    if (!transaction
      || !transactionApi
      || typeof transactionApi.applyStudioEditorTransaction !== 'function') {
      return false;
    }

    try {
      const rollbackSourceDoc = sourceDoc || getIframeDoc();
      const rollbackResult = transactionApi.applyStudioEditorTransaction(transaction, 'undo', {
        getElementById: (elementId) => {
          if (elementId === 'slides-container') {
            return rollbackSourceDoc && typeof rollbackSourceDoc.getElementById === 'function'
              ? rollbackSourceDoc.getElementById('slidesContainer')
              : null;
          }
          if (typeof elementId === 'string'
            && elementId.startsWith('slide:')) {
            return getSlideById(elementId.slice('slide:'.length), rollbackSourceDoc);
          }
          return getElementByEditorId(elementId, rollbackSourceDoc);
        },
        applyMarkupState: (element, markup) => {
          if (!element || typeof markup !== 'string') return false;
          element.innerHTML = markup;
          makeElementsHoverable(element);
          return true;
        },
        applySlideOrderState: (slideIds) => {
          if (!Array.isArray(slideIds)) return false;
          const slidesContainer = rollbackSourceDoc && typeof rollbackSourceDoc.getElementById === 'function'
            ? rollbackSourceDoc.getElementById('slidesContainer')
            : null;
          if (!slidesContainer || typeof slidesContainer.appendChild !== 'function') return false;
          const slideElements = slideIds.map((slideId) => getSlideById(slideId, rollbackSourceDoc));
          if (slideElements.some((slide) => !slide)) return false;
          slideElements.forEach((slide) => slidesContainer.appendChild(slide));
          return true;
        },
        applySlidePresenceState: (slideId, snapshot) => {
          const normalizedSlideId = typeof slideId === 'string' ? slideId.trim() : '';
          if (!normalizedSlideId || !snapshot || typeof snapshot !== 'object') return false;
          const slidesContainer = rollbackSourceDoc && typeof rollbackSourceDoc.getElementById === 'function'
            ? rollbackSourceDoc.getElementById('slidesContainer')
            : null;
          if (!slidesContainer) return false;
          const currentSlide = getSlideById(normalizedSlideId, rollbackSourceDoc);
          if (snapshot.exists !== true) {
            if (!currentSlide) return false;
            if (typeof currentSlide.remove === 'function') {
              currentSlide.remove();
            } else if (currentSlide.parentNode && typeof currentSlide.parentNode.removeChild === 'function') {
              currentSlide.parentNode.removeChild(currentSlide);
            } else {
              return false;
            }
          } else {
            let slide = currentSlide;
            if (!slide) {
              if (!rollbackSourceDoc || typeof rollbackSourceDoc.createElement !== 'function'
                || typeof snapshot.markup !== 'string' || !snapshot.markup.trim()) {
                return false;
              }
              const template = rollbackSourceDoc.createElement('template');
              if (!template) return false;
              template.innerHTML = snapshot.markup;
              slide = template.content && template.content.firstElementChild;
              if (!slide) return false;
            }
            const currentSlides = getSlides(rollbackSourceDoc);
            const beforeNode = Array.isArray(currentSlides) ? currentSlides[snapshot.index] : null;
            if (beforeNode && beforeNode !== slide && typeof slidesContainer.insertBefore === 'function') {
              slidesContainer.insertBefore(slide, beforeNode);
            } else if (typeof slidesContainer.appendChild === 'function') {
              slidesContainer.appendChild(slide);
            } else {
              return false;
            }
            makeElementsHoverable(slide);
          }
          refreshRollbackThumbnailsSafely();
          return true;
        },
        applyElementPresenceState: (elementId, parentId, snapshot) => {
          const normalizedElementId = typeof elementId === 'string' ? elementId.trim() : '';
          const normalizedParentId = typeof parentId === 'string' ? parentId.trim() : '';
          if (!normalizedElementId || !normalizedParentId || !snapshot || typeof snapshot !== 'object') {
            return false;
          }
          const parent = normalizedParentId.startsWith('slide:')
            ? getSlideById(normalizedParentId.slice('slide:'.length), rollbackSourceDoc)
            : getElementByEditorId(normalizedParentId, rollbackSourceDoc);
          if (!parent) return false;
          const currentElement = getElementByEditorId(normalizedElementId, rollbackSourceDoc);
          if (snapshot.exists !== true) {
            if (!currentElement) return false;
            if (typeof currentElement.remove === 'function') {
              currentElement.remove();
            } else if (currentElement.parentNode && typeof currentElement.parentNode.removeChild === 'function') {
              currentElement.parentNode.removeChild(currentElement);
            } else {
              return false;
            }
          } else {
            let element = currentElement;
            if (!element) {
              if (!rollbackSourceDoc || typeof rollbackSourceDoc.createElement !== 'function'
                || typeof snapshot.markup !== 'string' || !snapshot.markup.trim()) {
                return false;
              }
              const template = rollbackSourceDoc.createElement('template');
              if (!template) return false;
              template.innerHTML = snapshot.markup;
              element = template.content && template.content.firstElementChild;
              if (!element) return false;
            }
            const childNodes = parent.children || parent.childNodes || [];
            const beforeNode = childNodes[snapshot.index] || null;
            if (beforeNode && beforeNode !== element && typeof parent.insertBefore === 'function') {
              parent.insertBefore(element, beforeNode);
            } else if (typeof parent.appendChild === 'function') {
              parent.appendChild(element);
            } else {
              return false;
            }
            makeElementsHoverable(element);
          }
          return true;
        }
      });
      return !!(rollbackResult && rollbackResult.didApply);
    } catch (error) {
      return false;
    }
  }

  return {
    rollbackStudioEditorSlideMutation
  };
});
