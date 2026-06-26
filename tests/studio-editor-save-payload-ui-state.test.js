const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const canonicalDeckModel = require('../shared/canonical-deck.js');
const editorPersistence = require('../shared/studio-editor-persistence.js');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('buildEditorSaveRequestBody includes a canonical deck sidecar for save requests', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const buildEditorSaveRequestBodySource = extractFunctionSource(
    fileContent,
    'function buildEditorSaveRequestBody(doc = getIframeDoc(), cleanHtml = buildPersistableDeckHtml(doc), options = {}) {',
    '\n\n    function isCurrentDeckHtmlPersisted(cleanHtml) {'
  );

  const doc = { label: 'iframe-doc' };
  const canonicalDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    slides: []
  };
  const context = {
    SlideNextStudioEditorPersistence: editorPersistence,
    SlideNextCanonicalDeck: {
      isCanonicalDeck(deck) {
        return !!deck && deck.kind === 'slidenext.deck' && Array.isArray(deck.slides);
      }
    },
    currentPresentationUrl: 'presentations/onboarding-presentation/index.html',
    buildPersistableDeckHtml(nextDoc) {
      assert.equal(nextDoc, doc);
      return '<html>persisted</html>';
    },
    buildEditorCanonicalDeck(nextDoc) {
      assert.equal(nextDoc, doc);
      return canonicalDeck;
    },
    getIframeDoc() {
      return doc;
    }
  };

  vm.createContext(context);
  vm.runInContext(buildEditorSaveRequestBodySource, context);

  assert.deepEqual(
    context.buildEditorSaveRequestBody(doc, '<html>persisted</html>', {
      presentationUrl: 'presentations/onboarding-presentation/index.html',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck'
    }),
    {
      htmlPath: 'presentations/onboarding-presentation/index.html',
      htmlContent: '<html>persisted</html>',
      isAutoSave: true,
      versionLabel: 'Auto: Updated Deck',
      canonicalDeck: canonicalDeckModel.createCanonicalDeck(canonicalDeck)
    }
  );
});
