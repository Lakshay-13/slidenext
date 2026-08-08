const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalMutation = require('../shared/studio-editor-canonical-mutation.js');

test('mutation canonical builder always rebuilds from the supplied document', () => {
  const documentRef = { id: 'post-mutation-document' };
  let captured = null;
  const canonicalDeck = { kind: 'slidenext.deck', slides: [] };
  const buildCanonicalDeck = (sourceDoc, options) => {
    captured = { sourceDoc, options };
    return canonicalDeck;
  };
  const buildMutationDeck = canonicalMutation
    .createStudioEditorMutationCanonicalDeckBuilder({ buildCanonicalDeck });

  assert.equal(buildMutationDeck(documentRef), canonicalDeck);
  assert.deepEqual(captured, {
    sourceDoc: documentRef,
    options: { preferLiveCanonicalDeck: false }
  });
});

test('mutation canonical builder fails closed without a canonical builder', () => {
  const buildMutationDeck = canonicalMutation
    .createStudioEditorMutationCanonicalDeckBuilder();

  assert.equal(buildMutationDeck({ id: 'document' }), null);
});

test('mutation canonical builder forwards the pre-mutation baseline when available', () => {
  const documentRef = { id: 'post-mutation-document' };
  const canonicalDeckBaseline = { kind: 'slidenext.deck', slides: [] };
  let captured = null;
  const buildMutationDeck = canonicalMutation
    .createStudioEditorMutationCanonicalDeckBuilder({
      buildCanonicalDeck(sourceDoc, options) {
        captured = { sourceDoc, options };
        return { kind: 'slidenext.deck', slides: [] };
      },
      getCanonicalDeckBaseline(sourceDoc) {
        assert.equal(sourceDoc, documentRef);
        return canonicalDeckBaseline;
      }
    });

  buildMutationDeck(documentRef);

  assert.deepEqual(captured, {
    sourceDoc: documentRef,
    options: {
      preferLiveCanonicalDeck: false,
      canonicalDeckBaseline
    }
  });
});
