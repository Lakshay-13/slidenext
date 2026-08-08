(function (root, factory) {
  const canonicalDeck = typeof module === 'object' && module.exports
    ? require('./canonical-deck')
    : root && root.SlideNextCanonicalDeck;
  const deckRender = typeof module === 'object' && module.exports
    ? require('./deck-render')
    : root && root.SlideNextDeckRender;
  const api = factory(canonicalDeck, deckRender);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextPresentationCreation = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeck, deckRender) {
  const DEFAULT_TITLE = 'Untitled Deck';
  const DEFAULT_SUBTITLE = 'Blank presentation';
  const DEFAULT_DESCRIPTION = 'A new HTML-first presentation deck.';
  const DEFAULT_TAGS = ['Draft'];
  const BLANK_DECK_THEME_CSS = `
html, body {
  margin: 0;
  width: 100%;
  min-height: 100%;
  background: #050505;
  color: #f4f4f5;
  font-family: Geist, system-ui, sans-serif;
}
body {
  overflow: hidden;
}
.slides-container {
  position: relative;
  width: 100vw;
  min-height: 100vh;
}
.slide {
  display: none;
  position: relative;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: hidden;
}
.slide.slide-active {
  display: flex;
}
`.trim();
  const BLANK_DECK_NAVIGATION_SCRIPT = `
(function () {
  if (window.frameElement && window.frameElement.id === 'studioFrame') return;
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (slides.length === 0) return;
  let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('slide-active')));
  const showSlide = (nextIndex) => {
    activeIndex = Math.max(0, Math.min(slides.length - 1, nextIndex));
    slides.forEach((slide, index) => slide.classList.toggle('slide-active', index === activeIndex));
  };
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
      event.preventDefault();
      showSlide(activeIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      showSlide(activeIndex - 1);
    }
  });
})();
`.trim();

  function normalizeString(value, fallback = '') {
    return typeof value === 'string' ? value : fallback;
  }

  function slugifyPresentationTitle(value, fallback = 'untitled-deck') {
    let normalized = normalizeString(value).trim().toLowerCase();
    if (typeof normalized.normalize === 'function') {
      normalized = normalized.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    }
    const slug = normalized
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return slug || fallback;
  }

  function createUniquePresentationSlug(title, existingSlugs = []) {
    const usedSlugs = new Set(
      (Array.isArray(existingSlugs) ? existingSlugs : [])
        .map((value) => slugifyPresentationTitle(value))
    );
    const baseSlug = slugifyPresentationTitle(title);
    let nextSlug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(nextSlug)) {
      nextSlug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    return nextSlug;
  }

  function createBlankCanonicalDeck(options = {}) {
    if (!canonicalDeck || typeof canonicalDeck.createCanonicalDeck !== 'function') {
      return null;
    }
    const title = normalizeString(options.title).trim() || DEFAULT_TITLE;
    const id = slugifyPresentationTitle(options.id || title);
    const sourcePath = normalizeString(options.sourcePath).trim() || `presentations/${id}/index.html`;
    return canonicalDeck.createCanonicalDeck({
      metadata: {
        id,
        title,
        subtitle: normalizeString(options.subtitle).trim() || DEFAULT_SUBTITLE,
        description: normalizeString(options.description).trim() || DEFAULT_DESCRIPTION,
        icon: normalizeString(options.icon).trim() || 'slideshow',
        tags: Array.isArray(options.tags) && options.tags.length > 0 ? options.tags : DEFAULT_TAGS,
        sourcePath
      },
      theme: {
        customCss: BLANK_DECK_THEME_CSS
      },
      layout: {
        mode: 'freeform',
        size: { width: 1920, height: 1080, unit: 'px' },
        aspectRatio: '16:9'
      },
      slides: [{
        id: 'slide-1',
        title: 'Slide 1',
        layout: {
          mode: 'freeform',
          background: { color: '#050505' }
        },
        nodes: [
          {
            id: 'heading-1',
            type: 'heading',
            tagName: 'h1',
            text: title,
            style: 'color: #f4f4f5; font-size: 64px; font-weight: 700; line-height: 1.1;',
            layout: { mode: 'freeform', x: 160, y: 360, width: 1600, height: 96, zIndex: 1 }
          },
          {
            id: 'body-1',
            type: 'text',
            tagName: 'p',
            text: 'Double-click text to edit this slide.',
            style: 'color: #a1a1aa; font-size: 28px; line-height: 1.4;',
            layout: { mode: 'freeform', x: 160, y: 490, width: 1200, height: 56, zIndex: 1 }
          }
        ]
      }],
      source: {
        bodyInlineScripts: [{
          id: 'blank-deck-navigation',
          content: BLANK_DECK_NAVIGATION_SCRIPT,
          order: 1
        }]
      }
    });
  }

  function buildBlankPresentationArtifacts(options = {}) {
    const title = normalizeString(options.title).trim() || DEFAULT_TITLE;
    const folder = createUniquePresentationSlug(title, options.existingSlugs);
    const htmlPath = `presentations/${folder}/index.html`;
    const deck = createBlankCanonicalDeck({
      ...options,
      id: folder,
      title,
      sourcePath: htmlPath
    });
    if (!deck || !deckRender || typeof deckRender.renderCanonicalDeckHtml !== 'function') {
      return null;
    }

    const libraryEntry = {
      id: folder,
      title,
      subtitle: deck.metadata.subtitle,
      description: deck.metadata.description,
      folder,
      icon: deck.metadata.icon,
      tags: [...deck.metadata.tags]
    };
    return {
      folder,
      htmlPath,
      metadataPath: `presentations/${folder}/presentation.json`,
      canonicalDeck: deck,
      html: deckRender.renderCanonicalDeckHtml(deck),
      metadata: {
        ...libraryEntry,
        url: `${folder}/index.html`,
        canonicalDeck: deck
      },
      libraryEntry
    };
  }

  return {
    DEFAULT_TITLE,
    DEFAULT_SUBTITLE,
    DEFAULT_DESCRIPTION,
    BLANK_DECK_THEME_CSS,
    BLANK_DECK_NAVIGATION_SCRIPT,
    slugifyPresentationTitle,
    createUniquePresentationSlug,
    createBlankCanonicalDeck,
    buildBlankPresentationArtifacts
  };
});
