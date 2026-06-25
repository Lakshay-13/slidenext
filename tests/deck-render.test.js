const test = require('node:test');
const assert = require('node:assert/strict');

const deckRender = require('../shared/deck-render.js');

test('renderCanonicalDeckHtml renders a source-less deck with slidesContainer and an active first slide', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    metadata: {
      title: 'Canonical Deck'
    },
    slides: [
      {
        id: 'slide-1',
        title: 'Intro',
        nodes: [
          {
            tagName: 'h1',
            text: 'Intro'
          }
        ],
        source: {}
      },
      {
        id: 'slide-2',
        title: 'Agenda',
        nodes: [
          {
            tagName: 'p',
            text: 'Agenda'
          }
        ],
        source: {}
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<div id="slidesContainer" class="slides-container">/);
  assert.match(html, /<section class="slide slide-active" id="slide-1">/);
  assert.match(html, /<section class="slide" id="slide-2">/);
  assert.match(html, /<h1>Intro<\/h1>/);
  assert.match(html, /<p>Agenda<\/p>/);
});

test('renderCanonicalDeckHtml preserves explicit slide classes when source attributes already provide them', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        nodes: [],
        source: {
          html: '',
          attributes: {
            class: 'slide custom-slide'
          }
        }
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<section class="slide custom-slide slide-active" id="slide-1"><\/section>/);
});

test('renderCanonicalDeckHtml removes stale slide-active from non-active rendered slides', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        nodes: [],
        source: {
          html: '',
          attributes: {
            class: 'hero-slide'
          }
        }
      },
      {
        id: 'slide-2',
        nodes: [],
        source: {
          html: '',
          attributes: {
            class: 'slide custom-slide slide-active'
          }
        }
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<section class="slide hero-slide slide-active" id="slide-1"><\/section>/);
  assert.match(html, /<section class="slide custom-slide" id="slide-2"><\/section>/);
});

test('renderCanonicalNode uses dedicated class and style fields when attributes omit them', () => {
  const html = deckRender.renderCanonicalNode({
    tagName: 'div',
    text: 'Hero copy',
    classes: ['hero-card'],
    style: 'color: red;',
    attributes: {
      'aria-label': 'Hero'
    }
  }, {
    preferNodeSourceHtml: false
  });

  assert.equal(html, '<div aria-label="Hero" class="hero-card" style="color: red;">Hero copy</div>');
});

test('renderCanonicalDeckHtml emits theme tokens and custom css when rendering without source head html', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    metadata: {
      title: 'Themed Canonical Deck'
    },
    theme: {
      tokens: {
        '--color-primary': '#00f2ff',
        '--font-heading': "'Sora', sans-serif"
      },
      customCss: '.slide { color: var(--color-primary); }'
    },
    slides: [
      {
        id: 'slide-1',
        nodes: [],
        source: {}
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<style>\s*:root\s*\{/);
  assert.match(html, /--color-primary: #00f2ff;/);
  assert.match(html, /--font-heading: 'Sora', sans-serif;/);
  assert.match(html, /<style>\s*\.slide \{ color: var\(--color-primary\); \}\s*<\/style>/);
});

test('renderCanonicalDeckHtml emits canonical description and keyword metadata when source head html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    metadata: {
      title: 'Canonical Metadata Deck',
      description: 'Deck description from canonical metadata',
      tags: ['AI', 'Slides', 'Exports']
    },
    slides: [
      {
        id: 'slide-1',
        nodes: [],
        source: {}
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<meta name="description" content="Deck description from canonical metadata">/);
  assert.match(html, /<meta name="keywords" content="AI, Slides, Exports">/);
});

test('renderCanonicalDeckHtml falls back to canonical slide background metadata when source attributes are absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        layout: {
          background: {
            className: 'hero-slide',
            color: '#101820',
            image: 'linear-gradient(135deg, #101820, #1f2937)'
          }
        },
        nodes: [],
        source: {
          html: '',
          attributes: {}
        }
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<section class="slide hero-slide slide-active" style="background-color: #101820; background-image: linear-gradient\(135deg, #101820, #1f2937\);" id="slide-1"><\/section>/);
});

test('renderCanonicalDeckHtml preserves explicit slide source attributes over canonical background fallbacks', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        layout: {
          background: {
            className: 'hero-slide',
            style: 'background-color: #101820;'
          }
        },
        nodes: [],
        source: {
          html: '',
          attributes: {
            class: 'source-slide',
            style: 'background: black;'
          }
        }
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<section class="slide source-slide slide-active" style="background: black;" id="slide-1"><\/section>/);
});

test('renderCanonicalDeckHtml falls back to canonical slide name and notes attributes when source attributes are absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        name: 'Opening Slide',
        notes: 'Remember to introduce the roadmap.',
        nodes: [],
        source: {
          html: '',
          attributes: {}
        }
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /data-slide-name="Opening Slide"/);
  assert.match(html, /data-speaker-notes="Remember to introduce the roadmap\." class="slide slide-active" id="slide-1"/);
});

test('renderCanonicalDeckHtml preserves explicit slide notes attributes over canonical note fallbacks', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        name: 'Opening Slide',
        notes: 'Canonical notes',
        nodes: [],
        source: {
          html: '',
          attributes: {
            'data-slide-name': 'Imported Slide',
            'data-notes': 'Imported notes'
          }
        }
      }
    ],
    source: {
      html: '',
      headHtml: '',
      bodyHtml: ''
    }
  }, {
    preferSourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /data-slide-name="Imported Slide"/);
  assert.match(html, /data-notes="Imported notes"/);
  assert.doesNotMatch(html, /data-speaker-notes="Canonical notes"/);
});
