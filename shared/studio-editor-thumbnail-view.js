(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorThumbnailView = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  const thumbnailDragBindings = new WeakMap();

  function setStudioThumbnailSlideCount(options = {}) {
    const documentRef = options.documentRef;
    const slideCountLabel = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('slideCountLabel')
      : null;
    if (!slideCountLabel) return false;
    slideCountLabel.textContent = typeof options.label === 'string' ? options.label : '';
    return true;
  }

  function escapeStudioThumbnailMarkup(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderStudioThumbnailList(options = {}) {
    const documentRef = options.documentRef;
    const listContainer = documentRef && typeof documentRef.getElementById === 'function'
      ? documentRef.getElementById('thumbnailsList')
      : null;
    if (listContainer) {
      listContainer.innerHTML = '';
    }

    const deckSnapshot = options.deckSnapshot || {};
    const slides = Array.isArray(deckSnapshot.slides) ? deckSnapshot.slides : [];
    const activeSlideIndex = typeof options.getActiveSlideIndex === 'function'
      ? options.getActiveSlideIndex()
      : (Number.isInteger(options.activeSlideIndex) ? options.activeSlideIndex : 0);
    const visibleIndex = slides.length === 0 ? 0 : activeSlideIndex + 1;
    setStudioThumbnailSlideCount({
      documentRef,
      label: `${visibleIndex} / ${slides.length}`
    });
    if (!listContainer || !documentRef || typeof documentRef.createElement !== 'function') {
      return false;
    }

    const fragment = typeof documentRef.createDocumentFragment === 'function'
      ? documentRef.createDocumentFragment()
      : null;
    const renderTarget = fragment && typeof fragment.appendChild === 'function'
      ? fragment
      : listContainer;

    const canMutateSlides = !!options.canMutateSlides;
    const canDeleteSlides = !!options.canDeleteSlides && slides.length > 1;
    const onSelectSlide = typeof options.onSelectSlide === 'function'
      ? options.onSelectSlide
      : () => {};
    const onDeleteSlide = typeof options.onDeleteSlide === 'function'
      ? options.onDeleteSlide
      : root && typeof root.deleteSlideNodeById === 'function'
        ? root.deleteSlideNodeById
        : () => {};
    const setupDragAndDropThumbnail = typeof options.setupDragAndDropThumbnail === 'function'
      ? options.setupDragAndDropThumbnail
      : () => {};
    const hasSections = slides.some((slide) => typeof slide.section === 'string' && slide.section.trim());
    let previousSection = null;

    slides.forEach((slide) => {
      const section = typeof slide.section === 'string' ? slide.section.trim() : '';
      if (hasSections && section !== previousSection) {
        const sectionLabel = documentRef.createElement('div');
        sectionLabel.className = 'text-[9px] font-mono uppercase tracking-widest text-zinc-500 px-1 pt-2 pb-0.5';
        sectionLabel.textContent = section || 'Unsectioned';
        renderTarget.appendChild(sectionLabel);
      }
      previousSection = section;

      const isActive = slide.id === deckSnapshot.activeSlideId;
      const thumbCard = documentRef.createElement('div');
      thumbCard.className = `glass-card p-3 border ${canMutateSlides ? 'cursor-pointer' : 'cursor-default'} relative group flex items-start gap-3 select-none transition-all ${
        isActive ? 'border-[#7028d0] bg-[#7028d0]/5 shadow-[0_0_15px_rgba(112,40,208,0.1)]' : 'border-white/5 bg-[#0a0a0a]/40 hover:border-white/20'
      }`;
      if (thumbCard.style) {
        thumbCard.style.contentVisibility = 'auto';
        thumbCard.style.containIntrinsicSize = '72px';
      }
      thumbCard.draggable = canMutateSlides;
      thumbCard.dataset.index = slide.index;
      thumbCard.dataset.slideId = slide.id;

      thumbCard.innerHTML = `
          <div class="w-6 h-6 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center font-mono text-xs text-[#7028d0] font-bold">
            ${String(slide.index + 1).padStart(2, '0')}
          </div>
          <div class="flex-grow overflow-hidden">
            <h4 class="text-xs font-semibold text-white truncate font-sans">${escapeStudioThumbnailMarkup(slide.title)}</h4>
            <p class="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">${escapeStudioThumbnailMarkup(slide.backgroundLabel)}</p>
          </div>
        `;

      if (canDeleteSlides && canMutateSlides && typeof documentRef.createElement === 'function'
        && typeof thumbCard.appendChild === 'function') {
        const deleteButton = documentRef.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded transition-all absolute right-2 top-2.5';
        deleteButton.title = 'Delete Slide';
        deleteButton.innerHTML = '<span class="material-symbols-outlined text-[15px]">delete</span>';
        deleteButton.addEventListener('click', (event) => {
          event.stopPropagation();
          onDeleteSlide(slide.id);
        });
        thumbCard.appendChild(deleteButton);
      }

      if (canMutateSlides) {
        thumbCard.addEventListener('click', () => onSelectSlide(slide.id));
        setupDragAndDropThumbnail(thumbCard);
      }

      renderTarget.appendChild(thumbCard);
    });
    if (renderTarget !== listContainer) {
      listContainer.appendChild(renderTarget);
    }
    return true;
  }

  function syncStudioThumbnailList(options = {}) {
    const deckSnapshot = options.deckSnapshot || {};
    const slides = Array.isArray(deckSnapshot.slides) ? deckSnapshot.slides : [];
    const canDeleteSlides = typeof options.canDeleteSlides === 'boolean'
      ? options.canDeleteSlides
      : slides.length > 1;
    return renderStudioThumbnailList({
      ...options,
      canDeleteSlides
    });
  }

  function syncStudioEditorThumbnails(options = {}) {
    const getDocument = typeof options.getDocument === 'function'
      ? options.getDocument
      : () => null;
    const buildDeckSnapshot = typeof options.buildDeckSnapshot === 'function'
      ? options.buildDeckSnapshot
      : () => ({ slides: [] });
    const iframeDoc = getDocument();
    const deckSnapshot = buildDeckSnapshot(iframeDoc) || { slides: [] };
    const slides = Array.isArray(deckSnapshot.slides) ? deckSnapshot.slides : [];
    const getActiveSlideIndex = typeof options.getActiveSlideIndex === 'function'
      ? () => options.getActiveSlideIndex(iframeDoc, deckSnapshot)
      : () => (slides.length === 0 ? 0 : 0);

    return syncStudioThumbnailList({
      ...options,
      deckSnapshot,
      getActiveSlideIndex,
      canMutateSlides: Object.prototype.hasOwnProperty.call(options, 'canMutateSlides')
        ? !!options.canMutateSlides
        : !!iframeDoc
    });
  }

  function attachStudioThumbnailDragAndDrop(card, options = {}) {
    if (!card || typeof card.addEventListener !== 'function') return false;

    const getSlideId = typeof options.getSlideId === 'function'
      ? options.getSlideId
      : (targetCard) => targetCard && targetCard.dataset
        ? targetCard.dataset.slideId || ''
        : '';
    const getDraggedSlideId = typeof options.getDraggedSlideId === 'function'
      ? options.getDraggedSlideId
      : () => '';
    const setDraggedSlideId = typeof options.setDraggedSlideId === 'function'
      ? options.setDraggedSlideId
      : () => {};
    const onReorder = typeof options.onReorder === 'function'
      ? options.onReorder
      : null;

    let binding = thumbnailDragBindings.get(card);
    if (!binding) {
      binding = {
        getSlideId,
        getDraggedSlideId,
        setDraggedSlideId,
        onReorder
      };
      binding.handleDragStart = () => {
        binding.setDraggedSlideId(binding.getSlideId(card));
        card.style.opacity = '0.4';
      };
      binding.handleDragEnd = () => {
        card.style.opacity = '1';
        binding.setDraggedSlideId('');
      };
      binding.handleDragOver = (event) => {
        event.preventDefault();
        card.classList.add('border-dashed', 'border-[#7028d0]/50');
      };
      binding.handleDragLeave = () => {
        card.classList.remove('border-dashed', 'border-[#7028d0]/50');
      };
      binding.handleDrop = (event) => {
        event.preventDefault();
        card.classList.remove('border-dashed', 'border-[#7028d0]/50');

        const draggedSlideId = binding.getDraggedSlideId();
        const targetSlideId = binding.getSlideId(card);
        if (binding.onReorder && draggedSlideId && draggedSlideId !== targetSlideId) {
          binding.onReorder(draggedSlideId, targetSlideId);
        }
      };
      card.addEventListener('dragstart', binding.handleDragStart);
      card.addEventListener('dragend', binding.handleDragEnd);
      card.addEventListener('dragover', binding.handleDragOver);
      card.addEventListener('dragleave', binding.handleDragLeave);
      card.addEventListener('drop', binding.handleDrop);
      thumbnailDragBindings.set(card, binding);
    } else {
      binding.getSlideId = getSlideId;
      binding.getDraggedSlideId = getDraggedSlideId;
      binding.setDraggedSlideId = setDraggedSlideId;
      binding.onReorder = onReorder;
    }

    return true;
  }

  return {
    setStudioThumbnailSlideCount,
    renderStudioThumbnailList,
    syncStudioThumbnailList,
    syncStudioEditorThumbnails,
    attachStudioThumbnailDragAndDrop
  };
});
