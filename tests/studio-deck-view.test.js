const test = require('node:test');
const assert = require('node:assert/strict');

const deckView = require('../shared/studio-deck-view.js');

test('resolveStudioFallbackActiveSlideId prefers the live active slide id before fallback canonical resolution', () => {
  const calls = [];

  const result = deckView.resolveStudioFallbackActiveSlideId(
    { label: 'iframe-doc' },
    null,
    {
      currentSlideIndex: 1,
      getPersistedActiveSlideId() {
        calls.push('getPersistedActiveSlideId');
        return 'slide-persisted';
      },
      resolveLiveActiveSlideId(doc) {
        calls.push(['resolveLiveActiveSlideId', doc]);
        return 'slide-live';
      },
      resolveCanonicalDeck() {
        calls.push('resolveCanonicalDeck');
        return {
          slides: [
            { id: 'slide-1', nodes: [] },
            { id: 'slide-2', nodes: [] }
          ]
        };
      }
    }
  );

  assert.equal(result, 'slide-live');
  assert.deepEqual(calls, [
    'getPersistedActiveSlideId',
    ['resolveLiveActiveSlideId', { label: 'iframe-doc' }]
  ]);
});

test('resolveStudioFallbackActiveSlideId rebuilds malformed canonical decks before choosing the current session slide', () => {
  const rebuiltCanonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [
      { id: 'slide-1', nodes: [] },
      { id: 'slide-2', nodes: [] }
    ]
  };
  const malformedCanonicalDeck = {
    slides: 'not-an-array'
  };
  const calls = [];

  const result = deckView.resolveStudioFallbackActiveSlideId(
    { label: 'iframe-doc' },
    malformedCanonicalDeck,
    {
      currentSlideIndex: 1,
      getPersistedActiveSlideId() {
        calls.push('getPersistedActiveSlideId');
        return 'slide-persisted';
      },
      resolveLiveActiveSlideId(doc) {
        calls.push(['resolveLiveActiveSlideId', doc]);
        return '';
      },
      resolveCanonicalDeck(doc) {
        calls.push(['resolveCanonicalDeck', doc]);
        return rebuiltCanonicalDeck;
      },
      isCanonicalDeck(deck) {
        calls.push(['isCanonicalDeck', deck]);
        return deck === rebuiltCanonicalDeck;
      }
    }
  );

  assert.equal(result, 'slide-2');
  assert.deepEqual(calls, [
    'getPersistedActiveSlideId',
    ['isCanonicalDeck', malformedCanonicalDeck],
    ['resolveCanonicalDeck', { label: 'iframe-doc' }],
    ['resolveLiveActiveSlideId', { label: 'iframe-doc' }]
  ]);
});

test('buildStudioPreviewHtml falls back when the canonical deck is malformed', () => {
  const result = deckView.buildStudioPreviewHtml(
    { label: 'doc' },
    {
      buildCanonicalDeck() {
        return {
          metadata: {
            title: 'Broken Deck'
          }
        };
      },
      buildFallbackHtml(doc) {
        return `fallback:${doc.label}`;
      }
    }
  );

  assert.equal(result, 'fallback:doc');
});

test('buildStudioPreviewHtml injects a preview base href into raw html fallback content', () => {
  const result = deckView.buildStudioPreviewHtml(
    null,
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      deckHtmlOptions: {
        currentLocationHref: 'http://localhost:3000/'
      },
      buildCanonicalDeck() {
        return {
          metadata: {
            title: 'Broken Deck'
          }
        };
      },
      buildFallbackHtml() {
        return '<html><head><title>Preview</title></head><body><img src="images/hero.png"></body></html>';
      }
    }
  );

  assert.match(result, /<base href=".*\/presentations\/onboarding-presentation\/">/);
  assert.match(result, /<img src="images\/hero\.png">/);
});

test('buildStudioPreviewHtml can render from a canonical deck when the live editor frame is unavailable', () => {
  const result = deckView.buildStudioPreviewHtml(
    null,
    {
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      buildCanonicalDeck(doc) {
        assert.equal(doc, null);
        return {
          slides: [
            { id: 'slide-1', nodes: [] }
          ]
        };
      }
    }
  );

  assert.match(result, /slidesContainer/);
});

test('buildStudioSourceHtml falls back when the canonical deck is malformed', () => {
  const result = deckView.buildStudioSourceHtml(
    { label: 'doc' },
    {
      buildCanonicalDeck() {
        return {
          metadata: {
            title: 'Broken Deck'
          }
        };
      },
      buildFallbackHtml(doc) {
        return `fallback:${doc.label}`;
      }
    }
  );

  assert.equal(result, 'fallback:doc');
});

test('buildStudioSourceHtml can render from a canonical deck when the live editor frame is unavailable', () => {
  const result = deckView.buildStudioSourceHtml(
    null,
    {
      buildCanonicalDeck(doc) {
        assert.equal(doc, null);
        return {
          slides: [
            { id: 'slide-1', nodes: [] }
          ]
        };
      }
    }
  );

  assert.match(result, /slidesContainer/);
});
