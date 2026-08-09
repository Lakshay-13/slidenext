const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('../shared/studio-editor-source.js');

function createParser(documentRef) {
  return class DOMParser {
    parseFromString(sourceHtml, mimeType) {
      assert.equal(sourceHtml, '<html><body><section class="slide">Edited</section></body></html>');
      assert.equal(mimeType, 'text/html');
      return documentRef;
    }
  };
}

test('applyStudioEditorSource sanitizes, imports, and restores source through canonical history state', () => {
  const sourceRoot = {
    innerHTML: '<body><section class="slide">Edited</section></body>',
    ownerDocument: null
  };
  const parsedDocument = { documentElement: sourceRoot };
  const currentDocument = { id: 'live-frame' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    slides: [{ id: 'slide-edited' }]
  };
  const calls = [];

  const result = source.applyStudioEditorSource(
    '<html><body><section class="slide">Edited</section></body></html>',
    {
      DOMParser: createParser(parsedDocument),
      sanitizeSourceRoot(root) {
        calls.push(['sanitize', root]);
        root.innerHTML = '<body><section class="slide">Edited</section></body>';
      },
      buildCanonicalDeck(documentRef, options) {
        calls.push(['buildCanonicalDeck', documentRef, options]);
        return canonicalDeck;
      },
      isCanonicalDeck(value) {
        return value === canonicalDeck;
      },
      getCurrentDocument() {
        calls.push(['getCurrentDocument']);
        return currentDocument;
      },
      resolveActiveSlideId(documentRef, deck) {
        calls.push(['resolveActiveSlideId', documentRef, deck]);
        return 'slide-edited';
      },
      beforeApply(historyEntry) {
        calls.push(['beforeApply', historyEntry]);
      },
      restoreHistoryEntry(historyEntry) {
        calls.push(['restoreHistoryEntry', historyEntry]);
      },
      afterApply(deck, historyEntry) {
        calls.push(['afterApply', deck, historyEntry]);
      }
    }
  );

  assert.equal(result.success, true);
  assert.equal(result.canonicalDeck, canonicalDeck);
  assert.deepEqual(result.historyEntry, {
    html: '<body><section class="slide">Edited</section></body>',
    activeSlideId: 'slide-edited',
    selectedElementIds: [],
    canonicalDeck
  });
  assert.deepEqual(calls.map(([name]) => name), [
    'sanitize',
    'buildCanonicalDeck',
    'getCurrentDocument',
    'resolveActiveSlideId',
    'beforeApply',
    'restoreHistoryEntry',
    'afterApply'
  ]);
  assert.deepEqual(calls[1][2], { preferLiveCanonicalDeck: false });
});

test('applyStudioEditorSource fails before mutation when the source has no slides', () => {
  const result = source.applyStudioEditorSource('<html></html>', {
    DOMParser: class DOMParser {
      parseFromString() {
        return { documentElement: { innerHTML: '' } };
      }
    },
    buildCanonicalDeck() {
      return { kind: 'slidenext.deck', slides: [] };
    },
    getCurrentDocument() {
      throw new Error('live editor should not be queried for an invalid deck');
    }
  });

  assert.deepEqual(result, {
    success: false,
    error: 'Source HTML must contain at least one slide'
  });
});

test('applyStudioEditorSource preserves raw HTML when canonical import fails', () => {
  const sourceRoot = {
    innerHTML: '<section class="slide">Legacy content</section>',
    querySelectorAll(selector) {
      assert.equal(selector, '.slide');
      return [{}];
    }
  };
  const parsedDocument = { documentElement: sourceRoot };
  let restoredEntry = null;

  const result = source.applyStudioEditorSource('<html>legacy</html>', {
    DOMParser: class DOMParser {
      parseFromString() {
        return parsedDocument;
      }
    },
    buildCanonicalDeck() {
      throw new Error('legacy deck is not canonicalizable');
    },
    getCurrentDocument() {
      return { id: 'live-frame' };
    },
    restoreHistoryEntry(historyEntry) {
      restoredEntry = historyEntry;
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.canonicalDeck, null);
  assert.deepEqual(restoredEntry, {
    html: '<section class="slide">Legacy content</section>',
    activeSlideId: '',
    selectedElementIds: [],
    canonicalDeck: null
  });
});

test('applyStudioEditorSource fails closed when restoring source history throws', () => {
  let afterApplyCalls = 0;
  const result = source.applyStudioEditorSource('<html>edited</html>', {
    DOMParser: class DOMParser {
      parseFromString() {
        return {
          documentElement: {
            innerHTML: '<section class="slide">Edited</section>',
            querySelectorAll() {
              return [{}];
            }
          }
        };
      }
    },
    getCurrentDocument() {
      return { id: 'live-frame' };
    },
    restoreHistoryEntry() {
      throw new Error('restore failed');
    },
    afterApply() {
      afterApplyCalls += 1;
    }
  });

  assert.deepEqual(result, {
    success: false,
    error: 'Source HTML could not be applied to the editor'
  });
  assert.equal(afterApplyCalls, 0);
});

test('applyStudioEditorSource fails closed when the pre-apply callback throws', () => {
  let restoreCalls = 0;
  const result = source.applyStudioEditorSource('<html>edited</html>', {
    DOMParser: class DOMParser {
      parseFromString() {
        return {
          documentElement: {
            innerHTML: '<section class="slide">Edited</section>',
            querySelectorAll() {
              return [{}];
            }
          }
        };
      }
    },
    getCurrentDocument() {
      return { id: 'live-frame' };
    },
    beforeApply() {
      throw new Error('transaction setup failed');
    },
    restoreHistoryEntry() {
      restoreCalls += 1;
    }
  });

  assert.deepEqual(result, {
    success: false,
    error: 'Source HTML could not start an editor transaction'
  });
  assert.equal(restoreCalls, 0);
});

test('applyStudioEditorSource falls back when active-slide resolution throws', () => {
  let restoredEntry = null;
  const result = source.applyStudioEditorSource('<html>edited</html>', {
    DOMParser: class DOMParser {
      parseFromString() {
        return {
          documentElement: {
            innerHTML: '<section class="slide">Edited</section>',
            querySelectorAll() {
              return [{}];
            }
          }
        };
      }
    },
    buildCanonicalDeck() {
      return {
        kind: 'slidenext.deck',
        slides: [{ id: 'slide-1' }]
      };
    },
    getCurrentDocument() {
      return { id: 'live-frame' };
    },
    resolveActiveSlideId() {
      throw new Error('active slide unavailable');
    },
    restoreHistoryEntry(historyEntry) {
      restoredEntry = historyEntry;
    }
  });

  assert.equal(result.success, true);
  assert.equal(result.historyEntry.activeSlideId, 'slide-1');
  assert.equal(restoredEntry.activeSlideId, 'slide-1');
});

test('applyStudioEditorSource forwards the canonical rebuild baseline', () => {
  const sourceRoot = {
    innerHTML: '<section class="slide">Edited</section>',
    querySelectorAll() {
      return [{}];
    }
  };
  const parsedDocument = { documentElement: sourceRoot };
  const canonicalDeckBaseline = { kind: 'slidenext.deck', slides: [] };
  let capturedOptions = null;

  const result = source.applyStudioEditorSource('<html>edited</html>', {
    DOMParser: class DOMParser {
      parseFromString() {
        return parsedDocument;
      }
    },
    canonicalDeckBaseline,
    buildCanonicalDeck(_documentRef, options) {
      capturedOptions = options;
      return { kind: 'slidenext.deck', slides: [{ id: 'slide-1' }] };
    },
    getCurrentDocument() {
      return { id: 'live-frame' };
    },
    restoreHistoryEntry() {}
  });

  assert.equal(result.success, true);
  assert.deepEqual(capturedOptions, {
    preferLiveCanonicalDeck: false,
    canonicalDeckBaseline
  });
});

test('applyStudioEditorSource reports unavailable parser and empty source without invoking callbacks', () => {
  let callbackCalls = 0;
  const options = {
    buildCanonicalDeck() {
      callbackCalls += 1;
      return { slides: [{ id: 'slide-1' }] };
    }
  };

  assert.deepEqual(source.applyStudioEditorSource('', options), {
    success: false,
    error: 'Source HTML is empty'
  });
  assert.deepEqual(source.applyStudioEditorSource('<html></html>', options), {
    success: false,
    error: 'Source HTML parser is unavailable'
  });
  assert.equal(callbackCalls, 0);
});
