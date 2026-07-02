const test = require('node:test');
const assert = require('node:assert/strict');

const deckLoader = require('../shared/deck-loader.js');

test('derivePresentationMetadataUrl maps presentation html urls onto presentation.json sidecars', () => {
  assert.equal(
    deckLoader.derivePresentationMetadataUrl('presentations/onboarding-presentation/index.html'),
    'presentations/onboarding-presentation/presentation.json'
  );

  assert.equal(
    deckLoader.derivePresentationMetadataUrl('/presentations/onboarding-presentation/index.html'),
    '/presentations/onboarding-presentation/presentation.json'
  );

  assert.equal(
    deckLoader.derivePresentationMetadataUrl('presentations/onboarding-presentation/slides.html'),
    ''
  );
});

test('buildPresentationMetadataSeed derives stable metadata defaults from a presentation url', () => {
  assert.deepEqual(
    deckLoader.buildPresentationMetadataSeed('presentations/onboarding-presentation/index.html', 'Project Onboarding'),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: 'presentations/onboarding-presentation/index.html'
    }
  );
});

test('normalizeLoadedPresentationMetadata keeps a normalized canonical deck when the sidecar is valid', () => {
  const metadata = deckLoader.normalizeLoadedPresentationMetadata({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: 'Project Onboarding'
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }
  });

  assert.equal(metadata.canonicalDeck.kind, 'slidenext.deck');
  assert.equal(metadata.canonicalDeck.metadata.id, 'onboarding-presentation');
  assert.equal(metadata.canonicalDeck.metadata.title, 'Project Onboarding');
  assert.equal(metadata.canonicalDeck.metadata.sourcePath, 'presentations/onboarding-presentation/index.html');
  assert.equal(metadata.canonicalDeck.slides.length, 1);
});

test('normalizeLoadedPresentationMetadata strips malformed canonical sidecars from fetched metadata', () => {
  const metadata = deckLoader.normalizeLoadedPresentationMetadata({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: 'Broken Deck'
      }
    }
  });

  assert.deepEqual(metadata, {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    sourcePath: 'presentations/onboarding-presentation/index.html'
  });
});

test('buildCanonicalDeckFromDocument forwards shared import options to the canonical deck importer', () => {
  const slide = {
    id: 'custom-slide-1',
    tagName: 'SECTION',
    style: {},
    children: [],
    className: 'custom-slide',
    classList: {
      contains(className) {
        return className === 'custom-slide';
      }
    },
    attributes: [],
    childNodes: [],
    hidden: false,
    ownerDocument: null,
    getAttribute(name) {
      if (name === 'data-slide-name') return '';
      if (name === 'data-speaker-notes') return '';
      if (name === 'data-notes') return '';
      if (name === 'style') return '';
      return '';
    },
    querySelector(selector) {
      if (selector === '.custom-title') {
        return {
          textContent: 'Custom Slide Title'
        };
      }
      return null;
    },
    cloneNode() {
      return {
        outerHTML: '<section class="custom-slide"></section>',
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        }
      };
    },
    get outerHTML() {
      return '<section class="custom-slide"></section>';
    }
  };

  const doc = {
    querySelector(selector) {
      if (selector === 'title') {
        return { textContent: 'Fallback Deck Title' };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.custom-slide') {
        return [slide];
      }
      if (selector === '.slide') {
        return [];
      }
      return [];
    },
    styleSheets: [],
    documentElement: {
      style: {
        length: 0
      },
      cloneNode() {
        return {
          outerHTML: '<html><head></head><body></body></html>',
          querySelector(selector) {
            if (selector === 'head') {
              return { innerHTML: '' };
            }
            if (selector === 'body') {
              return { innerHTML: '', attributes: [] };
            }
            return null;
          },
          querySelectorAll() {
            return [];
          }
        };
      }
    },
    head: {
      innerHTML: ''
    },
    body: {
      innerHTML: '',
      attributes: []
    }
  };
  slide.ownerDocument = doc;

  const deck = deckLoader.buildCanonicalDeckFromDocument(doc, {
    presentationMetadata: {
      id: 'custom-deck'
    },
    sourcePath: '/presentations/custom-deck/index.html',
    slideSelector: '.custom-slide',
    slideTitleSelector: '.custom-title',
    stripTransientDeckRuntimeState() {}
  });

  assert.equal(deck.metadata.id, 'custom-deck');
  assert.equal(deck.metadata.sourcePath, '/presentations/custom-deck/index.html');
  assert.equal(deck.slides.length, 1);
  assert.equal(deck.slides[0].id, 'custom-slide-1');
  assert.equal(deck.slides[0].title, 'Custom Slide Title');
});

test('buildCanonicalDeckFromDocument applies metadata-configured transient class stripping to canonical nodes', () => {
  const node = {
    tagName: 'DIV',
    style: {},
    children: [],
    className: 'hero-card editor-hoverable revealed',
    classList: {
      contains(className) {
        return ['hero-card', 'editor-hoverable', 'revealed'].includes(className);
      },
      [Symbol.iterator]: function* iterator() {
        yield 'hero-card';
        yield 'editor-hoverable';
        yield 'revealed';
      }
    },
    attributes: [
      { name: 'class', value: 'hero-card editor-hoverable revealed' }
    ],
    childNodes: [],
    hidden: false,
    ownerDocument: null,
    textContent: 'Hero copy',
    getAttribute(name) {
      if (name === 'class') return 'hero-card editor-hoverable revealed';
      if (name === 'style') return '';
      return '';
    },
    querySelector() {
      return null;
    },
    cloneNode() {
      return {
        outerHTML: '<div class="hero-card editor-hoverable revealed">Hero copy</div>',
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        }
      };
    },
    get outerHTML() {
      return '<div class="hero-card editor-hoverable revealed">Hero copy</div>';
    }
  };
  const slide = {
    id: 'custom-slide-1',
    tagName: 'SECTION',
    style: {},
    children: [node],
    className: 'custom-slide',
    classList: {
      contains(className) {
        return className === 'custom-slide';
      }
    },
    attributes: [],
    childNodes: [],
    hidden: false,
    ownerDocument: null,
    getAttribute(name) {
      if (name === 'data-slide-name') return '';
      if (name === 'data-speaker-notes') return '';
      if (name === 'data-notes') return '';
      if (name === 'style') return '';
      return '';
    },
    querySelector(selector) {
      if (selector === '.custom-title') {
        return {
          textContent: 'Custom Slide Title'
        };
      }
      return null;
    },
    cloneNode() {
      return {
        outerHTML: '<section class="custom-slide"><div class="hero-card editor-hoverable revealed">Hero copy</div></section>',
        querySelector() {
          return null;
        },
        querySelectorAll() {
          return [];
        }
      };
    },
    get outerHTML() {
      return '<section class="custom-slide"><div class="hero-card editor-hoverable revealed">Hero copy</div></section>';
    }
  };

  const doc = {
    querySelector(selector) {
      if (selector === 'title') {
        return { textContent: 'Fallback Deck Title' };
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '.custom-slide') {
        return [slide];
      }
      if (selector === '.slide') {
        return [];
      }
      return [];
    },
    styleSheets: [],
    documentElement: {
      style: {
        length: 0
      },
      cloneNode() {
        return {
          outerHTML: '<html><head></head><body></body></html>',
          querySelector(selector) {
            if (selector === 'head') {
              return { innerHTML: '' };
            }
            if (selector === 'body') {
              return { innerHTML: '', attributes: [] };
            }
            return null;
          },
          querySelectorAll() {
            return [];
          }
        };
      }
    },
    head: {
      innerHTML: ''
    },
    body: {
      innerHTML: '',
      attributes: []
    }
  };
  slide.ownerDocument = doc;
  node.ownerDocument = doc;

  const deck = deckLoader.buildCanonicalDeckFromDocument(doc, {
    presentationMetadata: {
      id: 'custom-deck',
      persistence: {
        transientClassNames: ['revealed']
      }
    },
    sourcePath: '/presentations/custom-deck/index.html',
    slideSelector: '.custom-slide',
    slideTitleSelector: '.custom-title',
    stripTransientDeckRuntimeState() {}
  });

  assert.deepEqual(deck.slides[0].nodes[0].classes, ['hero-card']);
});
