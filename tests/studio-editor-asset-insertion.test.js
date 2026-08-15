const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assetInsertion = require('../shared/studio-editor-asset-insertion.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

test('asset insertion resolves canonical metadata and prepares the inserted image', () => {
  const calls = [];
  const attributes = {};
  const element = {
    setAttribute(name, value) {
      attributes[name] = value;
    }
  };
  const documentRef = { id: 'iframe-document' };
  const controller = assetInsertion.createStudioEditorAssetInsertionController({
    canonicalDeckApi: {
      findCanonicalAssetById(deck, assetId) {
        assert.equal(deck.id, 'canonical-deck');
        return assetId === 'hero'
          ? { id: 'hero', name: 'Hero Image', src: '/images/hero.png' }
          : null;
      }
    },
    getDocument: () => documentRef,
    resolveCanonicalDeck(sourceDocument) {
      assert.equal(sourceDocument, documentRef);
      return { id: 'canonical-deck' };
    },
    insertionController: {
      insert(type, options) {
        calls.push([type, options.versionLabel]);
        options.prepareElement(element);
        return true;
      }
    }
  });

  assert.equal(controller.insert(' hero '), true);
  assert.deepEqual(calls, [['img', 'Auto: Inserted Asset "Hero Image"']]);
  assert.equal(attributes['data-asset-id'], 'hero');
  assert.equal(element.src, '/images/hero.png');
});

test('asset insertion fails closed for missing metadata or insertion dependencies', () => {
  const canonicalDeckApi = {
    findCanonicalAssetById() {
      return null;
    }
  };
  const controller = assetInsertion.createStudioEditorAssetInsertionController({
    canonicalDeckApi,
    resolveCanonicalDeck: () => ({ slides: [] }),
    insertionController: { insert() { throw new Error('should not insert'); } }
  });

  assert.equal(controller.insert('missing'), false);
  assert.equal(assetInsertion.createStudioEditorAssetInsertionController({
    canonicalDeckApi,
    resolveCanonicalDeck: () => ({ slides: [] })
  }).insert('missing'), false);
});

test('asset insertion fails closed when canonical lookup throws', () => {
  const controller = assetInsertion.createStudioEditorAssetInsertionController({
    canonicalDeckApi: {
      findCanonicalAssetById() {
        throw new Error('canonical lookup failed');
      }
    },
    resolveCanonicalDeck: () => ({ slides: [] }),
    insertionController: { insert() { throw new Error('should not insert'); } }
  });

  assert.equal(controller.insert('hero'), false);
});

test('editor loads the asset insertion bridge and keeps a thin compatibility handler', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

  assert.match(source, /<script src="\/shared\/studio-editor-asset-insertion\.js"><\/script>/);
  assert.match(source, /<script src="\/shared\/studio-editor-asset-insertion-shell-runtime\.js"><\/script>/);
  assert.match(source, /createStudioEditorAssetInsertionShellRuntime/);
  assert.match(
    source,
    /studioEditorAssetInsertionController = studioEditorAssetInsertionShellRuntime/
  );
  assert.match(source, /studioEditorAssetInsertionController\.insert\(assetId\)/);
  assert.doesNotMatch(source, /function insertAssetToActiveSlide\(assetId\) \{[\s\S]*findCanonicalAssetById/);
});
