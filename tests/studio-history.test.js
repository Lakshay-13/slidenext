const test = require('node:test');
const assert = require('node:assert/strict');

const studioHistory = require('../shared/studio-history.js');

test('createStudioHistoryEntry includes the canonical deck sidecar when provided', () => {
  const doc = { id: 'doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  const entry = studioHistory.createStudioHistoryEntry(doc, {
    buildHistoryHtml() {
      return '<html></html>';
    },
    getActiveSlideId() {
      return 'slide-1';
    },
    getSelectedElementIds() {
      return ['node-1'];
    },
    canonicalDeck
  });

  assert.deepEqual(entry, {
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });
});

test('normalizeStudioHistoryEntry preserves the canonical deck sidecar', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  assert.deepEqual(studioHistory.normalizeStudioHistoryEntry({
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1', '', null],
    canonicalDeck
  }), {
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck
  });
});

test('captureStudioHistoryState keeps model-only history changes when the canonical deck sidecar differs', () => {
  const initialEntry = {
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  };
  const nextEntry = {
    html: '<html></html>',
    activeSlideId: 'slide-1',
    selectedElementIds: ['node-1'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
    }
  };

  const result = studioHistory.captureStudioHistoryState([initialEntry], [], nextEntry);

  assert.equal(result.didCapture, true);
  assert.equal(result.undoStack.length, 2);
  assert.deepEqual(result.undoStack[1], nextEntry);
  assert.deepEqual(result.redoStack, []);
});

test('restoreStudioHistoryFrameSetup falls back to rendered canonical deck html when snapshot html is empty', () => {
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: [{ id: 'slide-1', nodes: [] }]
  };
  const doc = {
    documentElement: {
      innerHTML: ''
    }
  };
  const calls = [];

  const result = studioHistory.restoreStudioHistoryFrameSetup({
    html: '',
    canonicalDeck
  }, {
    doc,
    buildDeckSourceHtml(deck, options) {
      calls.push(['buildDeckSourceHtml', deck, options]);
      return '<html>rendered</html>';
    },
    replaceFrameHtml(nextDoc, html) {
      calls.push(['replaceFrameHtml', nextDoc, html]);
      nextDoc.documentElement.innerHTML = html;
    },
    syncIframeTheme(nextDoc) {
      calls.push(['syncIframeTheme', nextDoc]);
    },
    makeElementsHoverable(nextDoc) {
      calls.push(['makeElementsHoverable', nextDoc]);
    },
    setupIframeDragging(nextDoc) {
      calls.push(['setupIframeDragging', nextDoc]);
    },
    bindDeckNavigationSync(nextDoc) {
      calls.push(['bindDeckNavigationSync', nextDoc]);
    },
    generateThumbnails(nextDoc) {
      calls.push(['generateThumbnails', nextDoc]);
    }
  });

  assert.equal(doc.documentElement.innerHTML, '<html>rendered</html>');
  assert.deepEqual(calls.map(([name]) => name), [
    'buildDeckSourceHtml',
    'replaceFrameHtml',
    'syncIframeTheme',
    'makeElementsHoverable',
    'setupIframeDragging',
    'bindDeckNavigationSync',
    'generateThumbnails'
  ]);
  assert.equal(calls[0][1], canonicalDeck);
  assert.deepEqual(calls[0][2], {});
  assert.equal(calls[1][1], doc);
  assert.equal(calls[1][2], '<html>rendered</html>');
  assert.equal(result.didRestoreDoc, true);
  assert.equal(result.restoredHtmlLength, '<html>rendered</html>'.length);
});

test('restoreStudioHistoryFrameSetup prefers captured history html over canonical deck fallback html', () => {
  let buildDeckSourceHtmlCalls = 0;
  const doc = {
    documentElement: {
      innerHTML: ''
    }
  };

  studioHistory.restoreStudioHistoryFrameSetup({
    html: '<html>captured</html>',
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'slide-1', nodes: [] }]
    }
  }, {
    doc,
    buildDeckSourceHtml() {
      buildDeckSourceHtmlCalls += 1;
      return '<html>rendered</html>';
    }
  });

  assert.equal(doc.documentElement.innerHTML, '<html>captured</html>');
  assert.equal(buildDeckSourceHtmlCalls, 0);
});
