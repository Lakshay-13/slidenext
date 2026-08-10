const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const launchSource = require('../shared/studio-editor-launch-source.js');
const canonicalDeckApi = require('../shared/canonical-deck.js');
const deckHtmlApi = require('../shared/deck-html.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

const canonicalDeck = {
  kind: 'slidenext.deck',
  schemaVersion: 1,
  slides: []
};

test('launch source resolver renders valid canonical sidecars as srcdoc', () => {
  const resolver = launchSource.createStudioEditorLaunchSourceResolver({
    isCanonicalDeck(value) {
      return value === canonicalDeck;
    },
    buildCanonicalHtml(deck, presentationUrl) {
      return `<html data-source="${presentationUrl}">${deck.kind}</html>`;
    }
  });

  assert.deepEqual(resolver.resolve('/presentations/demo/index.html', { canonicalDeck }), {
    kind: 'srcdoc',
    url: '/presentations/demo/index.html',
    srcdoc: '<html data-source="/presentations/demo/index.html">slidenext.deck</html>',
    canonicalDeck
  });
});

test('launch source resolver preserves the URL fallback without a valid canonical sidecar', () => {
  const resolver = launchSource.createStudioEditorLaunchSourceResolver({
    isCanonicalDeck: () => false,
    buildCanonicalHtml: () => '<html>should not render</html>'
  });

  assert.deepEqual(resolver.resolve('/presentations/legacy/index.html', {}), {
    kind: 'url',
    url: '/presentations/legacy/index.html',
    srcdoc: '',
    canonicalDeck: null
  });
});

test('launch source resolver falls back when canonical rendering fails or is empty', () => {
  const failingResolver = launchSource.createStudioEditorLaunchSourceResolver({
    isCanonicalDeck: () => true,
    buildCanonicalHtml: () => {
      throw new Error('unsupported canonical node');
    }
  });
  const emptyResolver = launchSource.createStudioEditorLaunchSourceResolver({
    isCanonicalDeck: () => true,
    buildCanonicalHtml: () => '  '
  });

  assert.equal(failingResolver.resolve('/deck/index.html', { canonicalDeck }).kind, 'url');
  assert.equal(emptyResolver.resolve('/deck/index.html', { canonicalDeck }).kind, 'url');
});

test('index launch source adapter renders a real canonical deck through the shared HTML builder', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const startMarker = 'function resolveCurrentStudioEditorLaunchSource(metadata, presentationUrl = \'\') {';
  const endMarker = '\n\n    function setCurrentStudioEditorFrameSource(';
  const startIndex = fileContent.indexOf(startMarker);
  const endIndex = fileContent.indexOf(endMarker, startIndex);
  assert.notEqual(startIndex, -1);
  assert.notEqual(endIndex, -1);

  const context = {
    SlideNextCanonicalDeck: canonicalDeckApi,
    SlideNextDeckHtml: {
      ...deckHtmlApi,
      buildDeckPreviewHtml(deck, presentationUrl) {
        return deckHtmlApi.buildDeckPreviewHtml(deck, presentationUrl, {
          currentLocationHref: 'http://localhost/'
        });
      }
    },
    SlideNextStudioEditorLaunchSource: launchSource
  };
  vm.runInNewContext(fileContent.slice(startIndex, endIndex), context);

  const deck = canonicalDeckApi.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [] }]
  });
  const source = context.resolveCurrentStudioEditorLaunchSource(
    { canonicalDeck: deck },
    'http://localhost/presentations/demo/index.html'
  );

  assert.equal(source.kind, 'srcdoc');
  assert.equal(source.canonicalDeck, deck);
  assert.match(source.srcdoc, /<base href=/);
  assert.match(source.srcdoc, /slide-1/);
});
