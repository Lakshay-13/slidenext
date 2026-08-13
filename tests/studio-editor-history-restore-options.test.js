const test = require('node:test');
const assert = require('node:assert/strict');

const restoreOptions = require('../shared/studio-editor-history-restore-options.js');

test('history restore options preserve element resolution paths', () => {
  const slidesContainer = { id: 'slides-container' };
  const slide = { id: 'slide-2' };
  const element = { id: 'node-3' };
  const iframeDoc = {
    getElementById(id) {
      return id === 'slidesContainer' ? slidesContainer : null;
    }
  };
  const calls = [];
  const options = restoreOptions.createStudioEditorHistoryRestoreOptions({
    getSlideById(id, doc) {
      calls.push(['slide', id, doc]);
      return slide;
    },
    getElementByEditorId(id, doc) {
      calls.push(['element', id, doc]);
      return element;
    }
  });

  assert.equal(options.resolveElementById('slides-container', iframeDoc), slidesContainer);
  assert.equal(options.resolveElementById('slide:slide-2', iframeDoc), slide);
  assert.equal(options.resolveElementById('node-3', iframeDoc), element);
  assert.deepEqual(calls, [
    ['slide', 'slide-2', iframeDoc],
    ['element', 'node-3', iframeDoc]
  ]);
});

test('history restore options expose canonical rebuild and view callbacks', () => {
  const iframeDoc = { id: 'iframe-document' };
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const validator = (value) => value === canonicalDeck;
  const buildCalls = [];
  const buildViewCalls = [];
  const buildDeckSourceHtml = () => '<main>canonical</main>';
  const options = restoreOptions.createStudioEditorHistoryRestoreOptions({
    getIframeDoc: () => iframeDoc,
    buildEditorCanonicalDeck(doc) {
      buildCalls.push(doc);
      return canonicalDeck;
    },
    getEditorCanonicalDeckValidator: () => validator,
    buildDeckSourceHtml,
    createEditorDeckViewBuildOptions(doc, viewOptions) {
      buildViewCalls.push([doc, viewOptions]);
      return { deckHtmlOptions: { activeSlideId: viewOptions.activeSlideId } };
    }
  });

  assert.equal(options.buildCanonicalDeck(), canonicalDeck);
  assert.deepEqual(buildCalls, [iframeDoc]);
  assert.equal(options.isCanonicalDeck, validator);

  const historyEntry = { activeSlideId: 'slide-2', canonicalDeck };
  assert.deepEqual(options.buildDeckViewOptions(historyEntry), {
    deckHtmlOptions: { activeSlideId: 'slide-2' },
    buildDeckSourceHtml
  });
  assert.equal(buildViewCalls.length, 1);
  assert.equal(buildViewCalls[0][0], null);
  assert.equal(buildViewCalls[0][1].activeSlideId, 'slide-2');
  assert.equal(buildViewCalls[0][1].buildCanonicalDeck(), canonicalDeck);
  assert.equal(buildViewCalls[0][1].buildFallbackHtml(), '');
});

test('history restore options omit the optional source builder when unavailable', () => {
  const options = restoreOptions.createStudioEditorHistoryRestoreOptions({
    createEditorDeckViewBuildOptions() {
      return { deckHtmlOptions: {} };
    }
  });

  assert.deepEqual(options.buildDeckViewOptions({ activeSlideId: '' }), {
    deckHtmlOptions: {}
  });
});

test('history restore options fail closed for optional application callbacks', () => {
  const options = restoreOptions.createStudioEditorHistoryRestoreOptions();

  assert.equal(options.getCurrentSlideIndex(), 0);
  assert.equal(options.getIframeDoc(), null);
  assert.equal(options.resolveElementById('node-1', null), null);
  assert.equal(options.buildCanonicalDeck, null);
  assert.equal(options.buildDeckViewOptions, null);
});
