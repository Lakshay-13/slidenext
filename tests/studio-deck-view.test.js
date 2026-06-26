const test = require('node:test');
const assert = require('node:assert/strict');

const deckView = require('../shared/studio-deck-view.js');

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
