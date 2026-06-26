const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return fileContent.slice(start, end);
}

test('updateEditorPersistedDeckState updates only the provided persisted baseline fields', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideId: 'slide-1' },
    Object
  };

  vm.createContext(context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);

  context.updateEditorPersistedDeckState({
    cleanHtml: '<html>new</html>',
    playbackState: { activeSlideId: 'slide-2' }
  });

  assert.equal(context.lastPersistedDeckHtml, '<html>new</html>');
  assert.deepEqual(context.lastPersistedCanonicalDeck, { id: 'old-deck' });
  assert.deepEqual(context.persistedDeckPlaybackState, { activeSlideId: 'slide-2' });
});

test('resetEditorDeckPersistenceState clears the persisted baseline through the shared helper', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const updateEditorPersistedDeckStateSource = extractFunctionSource(
    fileContent,
    'function updateEditorPersistedDeckState(nextState = {}) {',
    '\n\n    function resetEditorDeckPersistenceState() {'
  );
  const resetEditorDeckPersistenceStateSource = extractFunctionSource(
    fileContent,
    'function resetEditorDeckPersistenceState() {',
    '\n\n    function resetEditorHistoryState(options = {}) {'
  );

  const context = {
    lastPersistedDeckHtml: '<html>old</html>',
    lastPersistedCanonicalDeck: { id: 'old-deck' },
    persistedDeckPlaybackState: { activeSlideId: 'slide-1' },
    Object
  };

  vm.createContext(context);
  vm.runInContext(updateEditorPersistedDeckStateSource, context);
  vm.runInContext(resetEditorDeckPersistenceStateSource, context);

  context.resetEditorDeckPersistenceState();

  assert.equal(context.lastPersistedDeckHtml, '');
  assert.equal(context.lastPersistedCanonicalDeck, null);
  assert.equal(context.persistedDeckPlaybackState, null);
});
