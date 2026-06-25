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
