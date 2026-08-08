(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThumbnailController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  function createStudioEditorThumbnailController(options = {}) {
    const thumbnailView = options.thumbnailView
      || (root && root.SlideNextStudioEditorThumbnailView)
      || null;
    const documentRef = options.documentRef && typeof options.documentRef === 'object'
      ? options.documentRef
      : null;
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const buildDeckSnapshot = typeof options.buildDeckSnapshot === 'function'
      ? options.buildDeckSnapshot
      : () => ({ slides: [] });
    const getActiveSlideIndex = typeof options.getActiveSlideIndex === 'function'
      ? options.getActiveSlideIndex
      : () => 0;
    const onSelectSlide = typeof options.onSelectSlide === 'function'
      ? options.onSelectSlide
      : () => {};
    const reorderSlidesById = typeof options.reorderSlidesById === 'function'
      ? options.reorderSlidesById
      : () => {};
    let draggedThumbSlideId = '';

    function attach(card) {
      if (!card || typeof card.addEventListener !== 'function') return false;
      const attachSharedDragAndDrop = thumbnailView
        && typeof thumbnailView.attachStudioThumbnailDragAndDrop === 'function'
        ? thumbnailView.attachStudioThumbnailDragAndDrop
        : null;
      if (attachSharedDragAndDrop) {
        return attachSharedDragAndDrop(card, {
          getDraggedSlideId: () => draggedThumbSlideId,
          setDraggedSlideId: (nextSlideId) => {
            draggedThumbSlideId = nextSlideId || '';
          },
          onReorder: reorderSlidesById
        });
      }

      card.addEventListener('dragstart', () => {
        draggedThumbSlideId = card.dataset && card.dataset.slideId
          ? card.dataset.slideId
          : '';
        card.style.opacity = '0.4';
      });
      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
        draggedThumbSlideId = '';
      });
      card.addEventListener('dragover', (event) => {
        event.preventDefault();
        card.classList.add('border-dashed', 'border-[#7028d0]/50');
      });
      card.addEventListener('dragleave', () => {
        card.classList.remove('border-dashed', 'border-[#7028d0]/50');
      });
      card.addEventListener('drop', (event) => {
        event.preventDefault();
        card.classList.remove('border-dashed', 'border-[#7028d0]/50');
        const targetSlideId = card.dataset && card.dataset.slideId
          ? card.dataset.slideId
          : '';
        if (draggedThumbSlideId && draggedThumbSlideId !== targetSlideId) {
          reorderSlidesById(draggedThumbSlideId, targetSlideId);
        }
      });
      return true;
    }

    function render() {
      if (!thumbnailView) return false;
      if (typeof thumbnailView.syncStudioEditorThumbnails === 'function') {
        return thumbnailView.syncStudioEditorThumbnails({
          documentRef,
          getDocument,
          buildDeckSnapshot,
          getActiveSlideIndex: (iframeDoc, deckSnapshot) => (
            !Array.isArray(deckSnapshot && deckSnapshot.slides)
              || deckSnapshot.slides.length === 0
              ? 0
              : getActiveSlideIndex(iframeDoc, deckSnapshot)
          ),
          onSelectSlide,
          setupDragAndDropThumbnail: attach
        });
      }

      const iframeDoc = getDocument();
      const deckSnapshot = buildDeckSnapshot(iframeDoc) || { slides: [] };
      const slides = Array.isArray(deckSnapshot.slides) ? deckSnapshot.slides : [];
      const renderOptions = {
        documentRef,
        deckSnapshot,
        getActiveSlideIndex: () => (
          slides.length === 0 ? 0 : getActiveSlideIndex(iframeDoc, deckSnapshot)
        ),
        canMutateSlides: !!iframeDoc,
        onSelectSlide,
        setupDragAndDropThumbnail: attach
      };
      if (typeof thumbnailView.syncStudioThumbnailList === 'function') {
        return thumbnailView.syncStudioThumbnailList(renderOptions);
      }
      if (typeof thumbnailView.renderStudioThumbnailList !== 'function') return false;
      return thumbnailView.renderStudioThumbnailList({
        ...renderOptions,
        canDeleteSlides: slides.length > 1
      });
    }

    return {
      render,
      attach
    };
  }

  return {
    createStudioEditorThumbnailController
  };
});
