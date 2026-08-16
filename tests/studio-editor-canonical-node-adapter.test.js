const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalNodeAdapter = require('../shared/studio-editor-canonical-node-adapter.js');

test('resolveStudioEditorCanonicalNode delegates through the shared resolver factory', () => {
  const element = { id: 'element-1' };
  const canonicalDeck = { slides: [] };
  const canonicalDeckApi = { id: 'canonical-deck-api' };
  let factoryOptions = null;
  let resolverArgs = null;

  const result = canonicalNodeAdapter.resolveStudioEditorCanonicalNode(element, canonicalDeck, {
    canonicalDeckApi,
    canonicalNodeResolverFactory(options) {
      factoryOptions = options;
      return (elementValue, deckValue) => {
        resolverArgs = [elementValue, deckValue];
        return { id: 'node-1' };
      };
    }
  });

  assert.deepEqual(factoryOptions, { canonicalDeckApi });
  assert.deepEqual(resolverArgs, [element, canonicalDeck]);
  assert.deepEqual(result, { id: 'node-1' });
});

test('resolveStudioEditorCanonicalNode falls back to the canonical deck lookup', () => {
  const element = { dataset: { editorId: 'node-1' } };
  const canonicalDeck = { slides: [] };
  const expectedNode = { id: 'node-1' };
  let lookupArgs = null;

  const result = canonicalNodeAdapter.resolveStudioEditorCanonicalNode(element, canonicalDeck, {
    canonicalDeckApi: {
      findCanonicalNodeById(deck, elementId) {
        lookupArgs = [deck, elementId];
        return expectedNode;
      }
    }
  });

  assert.deepEqual(lookupArgs, [canonicalDeck, 'node-1']);
  assert.equal(result, expectedNode);
});

test('createStudioEditorCanonicalNodeResolver reuses canonical dependencies', () => {
  const element = { id: 'element-1' };
  const canonicalDeck = { slides: [] };
  const calls = [];
  const resolver = canonicalNodeAdapter.createStudioEditorCanonicalNodeResolver({
    canonicalStateApi: {
      createStudioEditorCanonicalNodeResolver(options) {
        calls.push(options);
        return (elementValue, deckValue) => ({
          element: elementValue,
          deck: deckValue
        });
      }
    },
    canonicalDeckApi: { id: 'canonical-deck-api' }
  });

  assert.deepEqual(resolver(element, canonicalDeck), { element, deck: canonicalDeck });
  assert.deepEqual(calls, [{ canonicalDeckApi: { id: 'canonical-deck-api' } }]);
});

test('resolveStudioEditorCanonicalNode fails closed when lookup dependencies are unavailable', () => {
  assert.equal(
    canonicalNodeAdapter.resolveStudioEditorCanonicalNode({ dataset: { editorId: 'node-1' } }, { slides: [] }),
    null
  );
});
