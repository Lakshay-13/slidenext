(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorBlockController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorBlockController(options = {}) {
    const canonicalDeckApi = options.canonicalDeckApi
      || (root && root.SlideNextCanonicalDeck)
      || null;
    const canonicalStateApi = options.canonicalStateApi
      || (root && root.SlideNextStudioEditorCanonicalState)
      || null;
    const renderApi = options.renderApi
      || (root && root.SlideNextDeckRender)
      || null;
    const getCanonicalDeck = typeof options.getCanonicalDeck === 'function'
      ? options.getCanonicalDeck
      : () => null;
    const getCanonicalDeckBaseline = typeof options.getCanonicalDeckBaseline === 'function'
      ? options.getCanonicalDeckBaseline
      : null;
    const getActiveSlideId = typeof options.getActiveSlideId === 'function'
      ? options.getActiveSlideId
      : () => '';
    const getSelectedNodeIds = typeof options.getSelectedNodeIds === 'function'
      ? options.getSelectedNodeIds
      : () => [];
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const resolveActiveSlideId = () => getActiveSlideId(getDocument());
    const getActiveSlide = typeof options.getActiveSlide === 'function'
      ? options.getActiveSlide
      : () => null;
    const prepareElement = typeof options.prepareElement === 'function'
      ? options.prepareElement
      : null;
    const createMarkupTransactionCapture = typeof options.createMarkupTransactionCapture === 'function'
      ? options.createMarkupTransactionCapture
      : null;
    const getElementId = typeof options.getElementId === 'function'
      ? options.getElementId
      : (element) => element && element.dataset && element.dataset.editorId;
    const finalizeInsertedElements = typeof options.finalizeInsertedElements === 'function'
      ? options.finalizeInsertedElements
      : null;
    const finalizeMutation = typeof options.finalizeMutation === 'function'
      ? options.finalizeMutation
      : null;
    const saveHistoryState = typeof options.saveHistoryState === 'function'
      ? options.saveHistoryState
      : null;
    const triggerAutoSave = typeof options.triggerAutoSave === 'function'
      ? options.triggerAutoSave
      : null;
    const triggerAutoVersion = typeof options.triggerAutoVersion === 'function'
      ? options.triggerAutoVersion
      : null;
    const onBlocksChanged = typeof options.onBlocksChanged === 'function'
      ? options.onBlocksChanged
      : null;

    function findCanonicalSlide(deck, slideId) {
      if (!deck || !Array.isArray(deck.slides)) return null;
      if (canonicalDeckApi && typeof canonicalDeckApi.findCanonicalSlideById === 'function') {
        try {
          const resolvedSlide = canonicalDeckApi.findCanonicalSlideById(deck, slideId);
          if (resolvedSlide) return resolvedSlide;
        } catch (err) {
          // Preserve the legacy in-memory lookup when the shared resolver is unavailable.
        }
      }
      return deck.slides.find((slide) => slide && slide.id === slideId) || null;
    }

    function isValidCanonicalDeck(value) {
      if (!value) return false;
      const validate = canonicalDeckApi
        && typeof canonicalDeckApi.isCanonicalDeck === 'function'
        ? canonicalDeckApi.isCanonicalDeck
        : (candidate) => !!candidate
          && typeof candidate === 'object'
          && !Array.isArray(candidate)
          && Array.isArray(candidate.slides);
      try {
        return validate(value) === true;
      } catch (err) {
        return false;
      }
    }

    const readCanonicalDeckBaseline = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckBaselineReader({
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : () => {
          if (!getCanonicalDeckBaseline) return null;
          try {
            const liveCanonicalDeck = getCanonicalDeckBaseline();
            return isValidCanonicalDeck(liveCanonicalDeck)
              ? liveCanonicalDeck
              : null;
          } catch (err) {
            return null;
          }
        };

    const sharedCanonicalDeckResolver = canonicalStateApi
      && typeof canonicalStateApi.createStudioEditorCanonicalDeckResolver === 'function'
      ? canonicalStateApi.createStudioEditorCanonicalDeckResolver({
          getCanonicalDeck,
          getCanonicalDeckBaseline,
          isCanonicalDeck: canonicalDeckApi
            && typeof canonicalDeckApi.isCanonicalDeck === 'function'
            ? canonicalDeckApi.isCanonicalDeck
            : null
        })
      : null;

    function resolveCanonicalDeck(sourceDocument) {
      if (typeof sharedCanonicalDeckResolver === 'function') {
        return sharedCanonicalDeckResolver(sourceDocument);
      }
      const liveCanonicalDeck = readCanonicalDeckBaseline(sourceDocument);
      if (isValidCanonicalDeck(liveCanonicalDeck)) return liveCanonicalDeck;
      const fallbackCanonicalDeck = getCanonicalDeck(sourceDocument);
      return isValidCanonicalDeck(fallbackCanonicalDeck)
        ? fallbackCanonicalDeck
        : null;
    }

    function commitDeck(nextCanonicalDeck, versionLabel = '') {
      if (finalizeMutation) {
        const finalizeResult = finalizeMutation(versionLabel, null, nextCanonicalDeck);
        if (finalizeResult === false) return null;
      } else {
        if (saveHistoryState) saveHistoryState(false, null, nextCanonicalDeck);
        if (triggerAutoSave) triggerAutoSave();
        if (triggerAutoVersion && versionLabel) triggerAutoVersion(versionLabel);
      }
      if (onBlocksChanged) onBlocksChanged(nextCanonicalDeck.blocks, nextCanonicalDeck);
      return nextCanonicalDeck;
    }

    function saveSelection(blockLike = {}) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.saveCanonicalBlockFromNodeIds !== 'function') {
        return null;
      }

      const canonicalDeck = resolveCanonicalDeck();
      const slideId = resolveActiveSlideId();
      const nodeIds = getSelectedNodeIds();
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.saveCanonicalBlockFromNodeIds(
          canonicalDeck,
          slideId,
          nodeIds,
          blockLike
        );
      } catch (err) {
        return null;
      }
      if (!nextCanonicalDeck) return null;

      const block = nextCanonicalDeck.blocks[nextCanonicalDeck.blocks.length - 1] || null;
      return commitDeck(
        nextCanonicalDeck,
        `Auto: Saved Block${block && block.name ? ` "${block.name}"` : ''}`
      );
    }

    function removeBlock(blockId) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.removeCanonicalBlock !== 'function') {
        return null;
      }

      const canonicalDeck = resolveCanonicalDeck();
      const normalizedBlockId = typeof blockId === 'string' ? blockId.trim() : '';
      const block = canonicalDeck
        && Array.isArray(canonicalDeck.blocks)
        ? canonicalDeck.blocks.find((candidate) => candidate && candidate.id === normalizedBlockId)
        : null;
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.removeCanonicalBlock(
          canonicalDeck,
          normalizedBlockId
        );
      } catch (err) {
        return null;
      }
      if (!nextCanonicalDeck) return null;

      return commitDeck(
        nextCanonicalDeck,
        `Auto: Removed Block${block && block.name ? ` "${block.name}"` : normalizedBlockId ? ` "${normalizedBlockId}"` : ''}`
      );
    }

    function assignRenderedNodeIds(element, node) {
      if (!element || !node) return;
      if (element.dataset) {
        element.dataset.editorId = node.id;
      }
      const childElements = Array.from(element.children || []);
      (Array.isArray(node.children) ? node.children : []).forEach((child, index) => {
        assignRenderedNodeIds(childElements[index], child);
      });
    }

    function renderCanonicalNodeElement(documentRef, node) {
      try {
        if (!documentRef
          || typeof documentRef.createElement !== 'function'
          || !renderApi
          || typeof renderApi.renderCanonicalNode !== 'function') {
          return null;
        }
        const html = renderApi.renderCanonicalNode(node, { preferNodeSourceHtml: true });
        if (typeof html !== 'string' || !html.trim()) return null;
        const template = documentRef.createElement('template');
        if (!template) return null;
        template.innerHTML = html;
        const element = template.content && template.content.firstElementChild;
        if (!element) return null;
        assignRenderedNodeIds(element, node);
        if (prepareElement) prepareElement(element);
        return element;
      } catch (err) {
        return null;
      }
    }

    function removeInsertedElements(insertedElements, fallbackParent) {
      insertedElements.slice().reverse().forEach((element) => {
        if (!element) return;
        if (typeof element.remove === 'function') {
          element.remove();
          return;
        }
        const parent = element.parentNode || fallbackParent;
        if (parent && typeof parent.removeChild === 'function') {
          try {
            parent.removeChild(element);
          } catch (err) {
            // The element may already have been detached by a host callback.
          }
        }
      });
    }

    function insertBlock(blockId, insertionOptions = {}) {
      if (!canonicalDeckApi
        || typeof canonicalDeckApi.insertCanonicalBlockInstance !== 'function') {
        return false;
      }

      const canonicalDeck = resolveCanonicalDeck();
      const documentRef = getDocument();
      const activeSlide = getActiveSlide(documentRef);
      const slideId = resolveActiveSlideId();
      if (!canonicalDeck || !documentRef || !activeSlide || !slideId) return false;

      const sourceSlide = findCanonicalSlide(canonicalDeck, slideId);
      let nextCanonicalDeck = null;
      try {
        nextCanonicalDeck = canonicalDeckApi.insertCanonicalBlockInstance(
          canonicalDeck,
          slideId,
          blockId,
          insertionOptions
        );
      } catch (err) {
        return false;
      }
      const nextSlide = findCanonicalSlide(nextCanonicalDeck, slideId);
      if (!sourceSlide || !nextSlide) return false;

      const insertedNodes = nextSlide.nodes.slice(sourceSlide.nodes.length);
      const insertedElements = insertedNodes
        .map((node) => renderCanonicalNodeElement(documentRef, node))
        .filter(Boolean);
      if (insertedElements.length !== insertedNodes.length || insertedElements.length === 0) return false;

      const markupCapture = createMarkupTransactionCapture
        ? createMarkupTransactionCapture([{
            element: activeSlide,
            elementId: slideId
          }], { getElementId })
        : null;
      insertedElements.forEach((element) => activeSlide.appendChild(element));
      const transaction = markupCapture && typeof markupCapture.createTransaction === 'function'
        ? markupCapture.createTransaction()
        : null;
      const versionLabel = `Auto: Inserted Block${blockId ? ` "${blockId}"` : ''}`;
      if (finalizeInsertedElements) {
        return !!finalizeInsertedElements(insertedElements, versionLabel, transaction, nextCanonicalDeck);
      }
      if (saveHistoryState && saveHistoryState(false, transaction, nextCanonicalDeck) === false) {
        removeInsertedElements(insertedElements, activeSlide);
        return false;
      }
      if (triggerAutoSave) triggerAutoSave();
      if (triggerAutoVersion) triggerAutoVersion(versionLabel);
      return true;
    }

    return {
      saveSelection,
      removeBlock,
      insertBlock
    };
  }

  return {
    createStudioEditorBlockController
  };
});
