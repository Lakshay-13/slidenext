const test = require('node:test');
const assert = require('node:assert/strict');

const deckHtml = require('../shared/deck-html.js');

test('buildCanonicalDeckRenderOptions defaults canonical rendering away from raw source fragments', () => {
  assert.deepEqual(
    deckHtml.buildCanonicalDeckRenderOptions(),
    {
      preferSourceHtml: false,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: false
    }
  );
});

test('buildCanonicalDeckRenderOptions preserves explicit caller overrides', () => {
  assert.deepEqual(
    deckHtml.buildCanonicalDeckRenderOptions({
      preferSourceHtml: true,
      preferNodeSourceHtml: true,
      activeSlideId: 'slide-2'
    }),
    {
      preferSourceHtml: true,
      preferHeadSourceHtml: false,
      preferBodySourceHtml: false,
      preferSlideSourceHtml: false,
      preferNodeSourceHtml: true,
      activeSlideId: 'slide-2'
    }
  );
});

test('buildDeckSourceHtml forwards canonical render defaults to the renderer', () => {
  const calls = [];

  const html = deckHtml.buildDeckSourceHtml(
    {
      slides: [{ id: 'slide-1', nodes: [] }]
    },
    {
      renderDeckHtml(deck, options) {
        calls.push([deck, options]);
        return '<html><body><main>rendered</main></body></html>';
      }
    }
  );

  assert.equal(html, '<html><body><main>rendered</main></body></html>');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], {
    preferSourceHtml: false,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false
  });
});

test('buildDeckPreviewHtml preserves explicit render overrides while injecting a base href', () => {
  const calls = [];

  const html = deckHtml.buildDeckPreviewHtml(
    {
      slides: [{ id: 'slide-1', nodes: [] }]
    },
    '/presentations/demo/index.html',
    {
      currentLocationHref: 'http://localhost:3000/studio',
      renderDeckHtml(deck, options) {
        calls.push([deck, options]);
        return '<!DOCTYPE html><html><head><title>Deck</title></head><body><main>rendered</main></body></html>';
      },
      renderOptions: {
        preferSourceHtml: true,
        activeSlideId: 'slide-3'
      }
    }
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], {
    preferSourceHtml: true,
    preferHeadSourceHtml: false,
    preferBodySourceHtml: false,
    preferSlideSourceHtml: false,
    preferNodeSourceHtml: false,
    activeSlideId: 'slide-3'
  });
  assert.match(html, /<base href="http:\/\/localhost:3000\/presentations\/demo\/">/);
  assert.match(html, /<main>rendered<\/main>/);
});
