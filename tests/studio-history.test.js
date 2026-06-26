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
