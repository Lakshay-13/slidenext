const test = require('node:test');
const assert = require('node:assert/strict');

const readerComposition = require('../shared/studio-editor-canonical-reader-composition.js');

test('canonical reader composition prefers the shared resolver pair', () => {
  const calls = [];
  const fallback = () => 'fallback';
  const visibilityReader = () => 'visibility';
  const freeformReader = () => 'freeform';
  const composition = readerComposition.createStudioEditorCanonicalReaderComposition({
    canonicalReaderResolvers: {
      getStudioEditorCanonicalVisibilityReader(property, doc, fallbackReader) {
        calls.push(['visibility', property, doc, fallbackReader]);
        return visibilityReader;
      },
      getStudioEditorCanonicalFreeformReader(doc, fallbackReader) {
        calls.push(['freeform', doc, fallbackReader]);
        return freeformReader;
      }
    },
    canonicalReaderAdapter: {
      getStudioEditorCanonicalVisibilityReader() {
        throw new Error('adapter should not run');
      }
    }
  });

  const doc = { id: 'doc' };
  assert.equal(
    composition.getStudioEditorCanonicalVisibilityReader('hidden', doc, fallback),
    visibilityReader
  );
  assert.equal(composition.getStudioEditorCanonicalFreeformReader(doc, fallback), freeformReader);
  assert.deepEqual(calls, [
    ['visibility', 'hidden', doc, fallback],
    ['freeform', doc, fallback]
  ]);
});

test('canonical reader composition passes canonical dependencies to the adapter', () => {
  const canonicalStateApi = { name: 'state' };
  const canonicalDeckApi = { name: 'deck' };
  const getElementId = () => 'node-1';
  const resolveCanonicalNode = () => ({ id: 'node-1' });
  const buildCanonicalDeck = () => ({ slides: [] });
  const calls = [];
  const fallback = () => false;
  const composition = readerComposition.createStudioEditorCanonicalReaderComposition({
    canonicalStateApi,
    canonicalDeckApi,
    getElementId,
    resolveCanonicalNode,
    resolveCanonicalDeck: buildCanonicalDeck,
    canonicalReaderAdapter: {
      getStudioEditorCanonicalVisibilityReader(property, doc, fallbackReader, options) {
        calls.push(['visibility', property, doc, fallbackReader, options]);
        return fallbackReader;
      },
      getStudioEditorCanonicalFreeformReader(doc, fallbackReader, options) {
        calls.push(['freeform', doc, fallbackReader, options]);
        return fallbackReader;
      }
    }
  });

  const doc = { id: 'doc' };
  composition.getStudioEditorCanonicalVisibilityReader('locked', doc, fallback);
  composition.getStudioEditorCanonicalFreeformReader(doc, fallback);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0][4], {
    canonicalStateApi,
    canonicalDeckApi,
    getElementId,
    resolveCanonicalNode,
    buildCanonicalDeck
  });
  assert.deepEqual(calls[1][3], calls[0][4]);
});

test('canonical reader composition preserves fallbacks when dependencies are unavailable', () => {
  const fallback = () => false;
  const composition = readerComposition.createStudioEditorCanonicalReaderComposition();

  assert.equal(composition.getStudioEditorCanonicalVisibilityReader('hidden', null, fallback), fallback);
  assert.equal(composition.getStudioEditorCanonicalFreeformReader(null, fallback), fallback);
});
