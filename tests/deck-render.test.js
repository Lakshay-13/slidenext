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
  assert.match(html, /<section[^>]*class="slide"[^>]*id="slide-2"[^>]*>/);
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

test('renderCanonicalDeckHtml can rebuild canonical slide bodies and honor a requested active slide when source body html is disabled', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        title: 'Intro',
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
        title: 'Agenda',
        nodes: [],
        source: {
          html: '',
          attributes: {
            class: 'agenda-slide slide-active'
          }
        }
      }
    ],
    source: {
      html: '',
      headHtml: '<style>.deck-shell{color:red;}</style>',
      bodyHtml: '<main>stale body html</main>'
    }
  }, {
    activeSlideId: 'slide-2',
    preferSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });

  assert.match(html, /<style>\.deck-shell\{color:red;\}<\/style>/);
  assert.match(html, /<div id="slidesContainer" class="slides-container">/);
  assert.doesNotMatch(html, /stale body html/);
  assert.match(html, /<section class="slide hero-slide"[^>]*id="slide-1"[^>]*><\/section>/);
  assert.match(html, /<section class="slide agenda-slide slide-active"[^>]*id="slide-2"[^>]*><\/section>/);
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

test('renderCanonicalNode falls back to canonical absolute layout when style is absent', () => {
  const html = deckRender.renderCanonicalNode({
    tagName: 'div',
    text: 'Hero copy',
    layout: {
      mode: 'absolute',
      x: 120,
      y: 80,
      width: 400,
      height: 160,
      zIndex: 4
    }
  }, {
    preferNodeSourceHtml: false
  });

  assert.equal(html, '<div style="position: absolute; left: 120px; top: 80px; width: 400px; height: 160px; z-index: 4;">Hero copy</div>');
});

test('renderCanonicalNode preserves explicit style over canonical layout fallbacks', () => {
  const html = deckRender.renderCanonicalNode({
    tagName: 'div',
    text: 'Hero copy',
    style: 'color: red;',
    layout: {
      mode: 'absolute',
      x: 120,
      y: 80,
      zIndex: 4
    }
  }, {
    preferNodeSourceHtml: false
  });

  assert.equal(html, '<div style="color: red;">Hero copy</div>');
});

test('renderCanonicalNode renders hidden nodes as hidden when canonical visibility marks them hidden', () => {
  const html = deckRender.renderCanonicalNode({
    tagName: 'div',
    text: 'Hidden copy',
    visibility: {
      hidden: true
    }
  }, {
    preferNodeSourceHtml: false
  });

  assert.equal(html, '<div data-editor-hidden="true" hidden aria-hidden="true">Hidden copy</div>');
});

test('renderCanonicalNode emits editor lock metadata when canonical visibility marks the node locked', () => {
  const html = deckRender.renderCanonicalNode({
    tagName: 'div',
    text: 'Locked copy',
    visibility: {
      locked: true
    }
  }, {
    preferNodeSourceHtml: false
  });

  assert.equal(html, '<div data-editor-locked="true">Locked copy</div>');
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

test('renderCanonicalDeckHtml emits canonical deck layout sizing when source head html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    layout: {
      size: {
        width: 1920,
        height: 1080,
        unit: 'px'
      },
      aspectRatio: '16:9'
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

  assert.match(html, /<style>\s*\.slide \{\s*width: 1920px;\s*height: 1080px;\s*aspect-ratio: 16 \/ 9;\s*box-sizing: border-box;\s*overflow: hidden;\s*\}\s*<\/style>/);
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

test('renderCanonicalDeckHtml emits a favicon link when canonical metadata icon is an asset href', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    metadata: {
      title: 'Canonical Icon Deck',
      icon: '/assets/favicon.png'
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

  assert.match(html, /<link rel="icon" href="\/assets\/favicon\.png">/);
});

test('renderCanonicalDeckHtml skips favicon link emission for symbolic canonical metadata icons', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    metadata: {
      title: 'Canonical Icon Deck',
      icon: 'science'
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

  assert.doesNotMatch(html, /<link rel="icon"/);
});

test('renderCanonicalDeckHtml emits canonical stylesheet assets when source head html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    assets: [
      {
        type: 'stylesheet',
        src: '/presentations/demo/styles.css'
      },
      {
        type: 'stylesheet',
        src: '/presentations/demo/styles.css'
      },
      {
        type: 'script',
        src: '/presentations/demo/app.js'
      }
    ],
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

  assert.match(html, /<link rel="stylesheet" href="\/presentations\/demo\/styles\.css">/);
  assert.equal((html.match(/<link rel="stylesheet" href="\/presentations\/demo\/styles\.css">/g) || []).length, 1);
  assert.doesNotMatch(html, /<link rel="stylesheet" href="\/presentations\/demo\/app\.js">/);
});

test('renderCanonicalDeckHtml preserves canonical stylesheet asset metadata when source head html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    assets: [
      {
        type: 'stylesheet',
        src: '/presentations/demo/styles.css',
        meta: {
          media: 'screen and (min-width: 960px)',
          crossorigin: 'anonymous',
          integrity: 'sha384-style',
          referrerpolicy: 'no-referrer'
        }
      }
    ],
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

  assert.match(
    html,
    /<link rel="stylesheet" href="\/presentations\/demo\/styles\.css" media="screen and \(min-width: 960px\)" crossorigin="anonymous" integrity="sha384-style" referrerpolicy="no-referrer">/
  );
});

test('renderCanonicalDeckHtml emits canonical preload asset tags when source head html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    assets: [
      {
        type: 'font',
        src: '/presentations/demo/fonts/deck-sans.woff2',
        mimeType: 'font/woff2'
      },
      {
        type: 'image',
        src: '/presentations/demo/images/hero.avif',
        mimeType: 'image/avif'
      },
      {
        type: 'font',
        src: '/presentations/demo/fonts/deck-sans.woff2',
        mimeType: 'font/woff2'
      },
      {
        type: 'stylesheet',
        src: '/presentations/demo/styles.css'
      }
    ],
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

  assert.match(html, /<link rel="preload" as="font" href="\/presentations\/demo\/fonts\/deck-sans\.woff2" type="font\/woff2" crossorigin>/);
  assert.equal((html.match(/rel="preload" as="font" href="\/presentations\/demo\/fonts\/deck-sans\.woff2"/g) || []).length, 1);
  assert.match(html, /<link rel="preload" as="image" href="\/presentations\/demo\/images\/hero\.avif" type="image\/avif">/);
  assert.doesNotMatch(html, /rel="preload" as="style" href="\/presentations\/demo\/styles\.css"/);
});

test('renderCanonicalDeckHtml preserves canonical preload asset metadata when source head html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    assets: [
      {
        type: 'font',
        src: '/presentations/demo/fonts/deck-sans.woff2',
        mimeType: 'font/woff2',
        meta: {
          media: 'screen',
          crossorigin: 'use-credentials',
          integrity: 'sha384-font',
          referrerpolicy: 'origin'
        }
      }
    ],
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

  assert.match(
    html,
    /<link rel="preload" as="font" href="\/presentations\/demo\/fonts\/deck-sans\.woff2" type="font\/woff2" media="screen" crossorigin="use-credentials" integrity="sha384-font" referrerpolicy="origin">/
  );
});

test('renderCanonicalDeckHtml emits canonical script assets when source body html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    assets: [
      {
        type: 'script',
        src: '/presentations/demo/app.js'
      },
      {
        type: 'script',
        src: '/presentations/demo/app.js'
      },
      {
        type: 'stylesheet',
        src: '/presentations/demo/styles.css'
      }
    ],
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

  assert.match(html, /<script src="\/presentations\/demo\/app\.js"><\/script>/);
  assert.equal((html.match(/<script src="\/presentations\/demo\/app\.js"><\/script>/g) || []).length, 1);
  assert.doesNotMatch(html, /<script[^>]*styles\.css/);
});

test('renderCanonicalDeckHtml preserves canonical script asset metadata when source body html is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    assets: [
      {
        type: 'script',
        src: '/presentations/demo/app.js',
        meta: {
          type: 'module',
          async: true,
          defer: true,
          nomodule: true,
          crossorigin: 'anonymous',
          integrity: 'sha384-script',
          referrerpolicy: 'origin'
        }
      }
    ],
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

  assert.match(
    html,
    /<script src="\/presentations\/demo\/app\.js" type="module" async defer nomodule crossorigin="anonymous" integrity="sha384-script" referrerpolicy="origin"><\/script>/
  );
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

test('renderCanonicalDeckHtml falls back to canonical slide title through aria-label when source attributes are absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        title: 'Quarterly Roadmap',
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

  assert.match(html, /aria-label="Quarterly Roadmap"/);
});

test('renderCanonicalDeckHtml adds slide positioning context for canonical absolute layout nodes when source slide style is absent', () => {
  const html = deckRender.renderCanonicalDeckHtml({
    slides: [
      {
        id: 'slide-1',
        nodes: [
          {
            tagName: 'div',
            text: 'Hero copy',
            layout: {
              mode: 'absolute',
              x: 120,
              y: 80,
              width: 400,
              height: 160,
              zIndex: 3
            },
            source: {}
          }
        ],
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

  assert.match(html, /<section style="position: relative;" class="slide slide-active" id="slide-1">/);
  assert.match(html, /<div style="position: absolute; left: 120px; top: 80px; width: 400px; height: 160px; z-index: 3;">Hero copy<\/div>/);
});
