(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextDeckPersistence = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DEFAULT_EMPTY_CONTAINER_IDS = [
    'gitNodesContainer',
    'indicatorDots'
  ];

  const DEFAULT_STYLE_CLEANUPS = [
    { selector: '#slidesContainer', properties: ['transform'] },
    { selector: '#prevBtn, #nextBtn', properties: ['opacity', 'pointer-events'] },
    { selector: '#progressLine', properties: ['width'] }
  ];

  const DEFAULT_EDITOR_TRANSIENT_CLASSES = [
    'editor-selected',
    'editor-hoverable',
    'editor-dragging'
  ];

  function stripInlineStyleProperties(node, properties) {
    if (!node || !node.style) return;
    properties.forEach(property => node.style.removeProperty(property));
    if (!node.getAttribute('style') || !node.getAttribute('style').trim()) {
      node.removeAttribute('style');
    }
  }

  function stripTransientDeckRuntimeState(root, options = {}) {
    if (!root) return;

    const emptyContainerIds = options.emptyContainerIds || DEFAULT_EMPTY_CONTAINER_IDS;
    const styleCleanups = options.styleCleanups || DEFAULT_STYLE_CLEANUPS;
    const usesTailwindCdn = !!root.querySelector('script[src*="cdn.tailwindcss.com"]');

    if (usesTailwindCdn) {
      root.querySelectorAll('style').forEach(styleNode => {
        if ((styleNode.textContent || '').includes('! tailwindcss')) {
          styleNode.remove();
        }
      });
    }

    emptyContainerIds.forEach(nodeId => {
      root.querySelectorAll(`#${nodeId}`).forEach(node => {
        node.replaceChildren();
      });
    });

    root.querySelectorAll('#particlesCanvas, .canvas-particles').forEach(canvas => {
      canvas.removeAttribute('width');
      canvas.removeAttribute('height');
    });

    styleCleanups.forEach(({ selector, properties }) => {
      root.querySelectorAll(selector).forEach(node => {
        stripInlineStyleProperties(node, properties);
      });
    });

    root.querySelectorAll('[data-editor-prev-display=""]').forEach(node => {
      node.removeAttribute('data-editor-prev-display');
    });
    root.querySelectorAll('[class=""]').forEach(node => node.removeAttribute('class'));
    root.querySelectorAll('[style=""]').forEach(node => node.removeAttribute('style'));
  }

  function capturePersistedDeckPlaybackState(doc, options = {}) {
    if (!doc) return null;
    const getSlides = typeof options.getSlides === 'function'
      ? options.getSlides
      : (sourceDoc) => Array.from(sourceDoc.querySelectorAll('.slide'));
    const slideIdAttr = options.slideIdAttr || 'data-slide-id';
    const slides = getSlides(doc);

    return {
      activeSlideIds: slides
        .filter(slide => slide.classList.contains('slide-active'))
        .map(slide => slide.getAttribute(slideIdAttr))
        .filter(Boolean),
      slideCounterText: doc.getElementById('slideNum')?.textContent || ''
    };
  }

  function restorePersistedDeckPlaybackState(root, persistedDeckPlaybackState, options = {}) {
    if (!root || !persistedDeckPlaybackState) return;

    const slideIdAttr = options.slideIdAttr || 'data-slide-id';
    const slides = Array.from(root.querySelectorAll(`.slide[${slideIdAttr}]`));

    if (slides.length > 0) {
      slides.forEach(slide => slide.classList.remove('slide-active'));
      persistedDeckPlaybackState.activeSlideIds.forEach(slideId => {
        const match = root.querySelector(`.slide[${slideIdAttr}="${slideId}"]`);
        if (match) {
          match.classList.add('slide-active');
        }
      });
    }

    const slideNumNode = root.querySelector('#slideNum');
    if (slideNumNode && typeof persistedDeckPlaybackState.slideCounterText === 'string') {
      slideNumNode.textContent = persistedDeckPlaybackState.slideCounterText;
    }
  }

  function buildPersistableDeckHtml(doc, options = {}) {
    if (!doc) return '';

    const clone = doc.documentElement.cloneNode(true);
    const removableEditorNodeIds = [
      'editor-style-tag',
      'editor-theme-override-tag',
      ...(options.editorChromeNodeIds || [])
    ];
    const editorTransientClasses = options.editorTransientClasses || DEFAULT_EDITOR_TRANSIENT_CLASSES;
    const editorElementIdAttr = options.editorElementIdAttr || 'data-editor-id';
    const editorSlideIdAttr = options.editorSlideIdAttr || 'data-slide-id';

    removableEditorNodeIds.forEach(nodeId => {
      clone.querySelectorAll(`#${nodeId}`).forEach(node => node.remove());
    });

    editorTransientClasses.forEach(className => {
      clone.querySelectorAll(`.${className}`).forEach(el => {
        el.classList.remove(className);
      });
    });

    clone.querySelectorAll(`[${editorElementIdAttr}]`).forEach(node => {
      node.removeAttribute(editorElementIdAttr);
    });

    restorePersistedDeckPlaybackState(clone, options.persistedDeckPlaybackState, {
      slideIdAttr: editorSlideIdAttr
    });

    clone.querySelectorAll(`[${editorSlideIdAttr}]`).forEach(node => {
      node.removeAttribute(editorSlideIdAttr);
    });

    stripTransientDeckRuntimeState(clone, options);
    clone.classList.add('dark');

    return '<!DOCTYPE html>\n' + clone.outerHTML;
  }

  return {
    stripTransientDeckRuntimeState,
    capturePersistedDeckPlaybackState,
    restorePersistedDeckPlaybackState,
    buildPersistableDeckHtml
  };
});
