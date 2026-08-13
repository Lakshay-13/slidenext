const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalReaderAdapter = require('../shared/studio-editor-canonical-reader-adapter.js');

test('canonical reader adapter delegates visibility reads with canonical dependencies', () => {
  const calls = [];
  const fallbackReader = () => false;
  const reader = canonicalReaderAdapter.getStudioEditorCanonicalVisibilityReader(
    'locked',
    { id: 'iframe-doc' },
    fallbackReader,
    {
      canonicalStateApi: {
        createStudioEditorCanonicalVisibilityReaderResolver(options) {
          calls.push(options);
          return (property, doc, fallback) => {
            assert.equal(property, 'locked');
            assert.equal(doc.id, 'iframe-doc');
            assert.equal(fallback, fallbackReader);
            return () => true;
          };
        }
      },
      canonicalDeckApi: { id: 'deck-api' },
      getElementId: () => 'node-1',
      resolveCanonicalNode: () => ({ id: 'node-1' }),
      buildCanonicalDeck: () => ({ slides: [] })
    }
  );

  assert.equal(reader({}), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].canonicalDeckApi.id, 'deck-api');
});

test('canonical reader adapter preserves the fallback when visibility assembly fails', () => {
  const fallbackReader = () => true;
  const reader = canonicalReaderAdapter.getStudioEditorCanonicalVisibilityReader(
    'hidden',
    {},
    fallbackReader,
    {
      canonicalStateApi: {
        createStudioEditorCanonicalVisibilityReaderResolver() {
          throw new Error('resolver unavailable');
        }
      }
    }
  );

  assert.equal(reader({}), true);
});

test('canonical reader adapter delegates freeform reads through the shared resolver', () => {
  const fallbackReader = () => false;
  const reader = canonicalReaderAdapter.getStudioEditorCanonicalFreeformReader(
    { id: 'iframe-doc' },
    fallbackReader,
    {
      canonicalStateApi: {
        createStudioEditorCanonicalFreeformReaderResolver() {
          return (_doc, fallback) => {
            assert.equal(fallback, fallbackReader);
            return () => true;
          };
        }
      },
      buildCanonicalDeck: () => ({ slides: [] })
    }
  );

  assert.equal(reader({}), true);
});

test('canonical reader adapter fails closed without the shared reader API', () => {
  const fallbackReader = () => true;
  assert.equal(
    canonicalReaderAdapter.getStudioEditorCanonicalFreeformReader({}, fallbackReader)({}),
    true
  );
  assert.equal(
    canonicalReaderAdapter.getStudioEditorCanonicalVisibilityReader('hidden', {}, fallbackReader)({}),
    true
  );
});
