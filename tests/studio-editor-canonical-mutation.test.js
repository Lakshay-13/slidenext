const test = require('node:test');
const assert = require('node:assert/strict');
const canonicalState = require('../shared/studio-editor-canonical-state.js');
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
    .createStudioEditorMutationCanonicalDeckBuilder({
      buildCanonicalDeck,
      canonicalStateApi: canonicalState
    });

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
      canonicalStateApi: canonicalState,
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

test('mutation canonical builder rebuilds when the live baseline is invalid', () => {
  const documentRef = { id: 'post-mutation-document' };
  const rebuiltCanonicalDeck = { kind: 'slidenext.deck', slides: [] };
  let didBuild = false;
  const buildMutationDeck = canonicalMutation
    .createStudioEditorMutationCanonicalDeckBuilder({
      canonicalStateApi: canonicalState,
      isCanonicalDeck(value) {
        return !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides);
      },
      buildCanonicalDeck(sourceDoc, options) {
        assert.equal(sourceDoc, documentRef);
        didBuild = true;
        assert.equal(options.canonicalDeckBaseline, undefined);
        return rebuiltCanonicalDeck;
      },
      getCanonicalDeckBaseline() {
        return { invalid: true };
      }
    });

  assert.equal(buildMutationDeck(documentRef), rebuiltCanonicalDeck);
  assert.equal(didBuild, true);
});

test('mutation canonical builder rejects invalid rebuilt output', () => {
  const buildMutationDeck = canonicalMutation
    .createStudioEditorMutationCanonicalDeckBuilder({
      isCanonicalDeck(value) {
        return !!value && value.kind === 'slidenext.deck' && Array.isArray(value.slides);
      },
      buildCanonicalDeck() {
        return { invalid: true };
      }
    });

  assert.equal(buildMutationDeck({ id: 'document' }), null);
});

test('mutation canonical builder rejects malformed output without a custom validator', () => {
  const buildMutationDeck = canonicalMutation
    .createStudioEditorMutationCanonicalDeckBuilder({
      buildCanonicalDeck() {
        return { invalid: true };
      }
    });

  assert.equal(buildMutationDeck({ id: 'document' }), null);
});
