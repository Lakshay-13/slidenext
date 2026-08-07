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

test('updateActiveSlideNotes delegates to the shared notes action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveSlideNotes(value = \'\') {',
    '\n\n    function pruneEditorChromeNodes'
  );
  let delegatedOptions = null;
  const frame = { id: 'live-frame' };
  const context = {
    SlideNextStudioEditorNotes: {
      id: 'notes-api'
    },
    SlideNextStudioEditorTransaction: { id: 'transaction-api' },
    SlideNextStudioEditorNotesActions: {
      applyStudioSpeakerNotesEdit(value, options) {
        delegatedOptions = { value, options };
        return true;
      }
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    },
    getIframeDoc() {
      return frame;
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getEditorSlideId() {
      return 'slide-1';
    },
    finalizeEditorDeckMutation() {},
    syncStudioChromeToActiveSlide() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveSlideNotes('Cue for slide'), true);
  assert.equal(delegatedOptions.value, 'Cue for slide');
  assert.equal(delegatedOptions.options.notesApi, context.SlideNextStudioEditorNotes);
  assert.equal(delegatedOptions.options.transactionApi, context.SlideNextStudioEditorTransaction);
  assert.equal(delegatedOptions.options.getDocument(), frame);
  assert.equal(delegatedOptions.options.getActiveSlide().id, 'slide-1');
  assert.deepEqual(
    JSON.parse(JSON.stringify(delegatedOptions.options.resolveReadyState())),
    { canUseDeckActions: true }
  );
  assert.equal(delegatedOptions.options.finalizeMutation, context.finalizeEditorDeckMutation);
  assert.equal(delegatedOptions.options.syncChrome, context.syncStudioChromeToActiveSlide);
  assert.equal(delegatedOptions.options.getElementId({}), 'slide:slide-1');
});

test('updateActiveSlideNotes forwards the shared action result', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveSlideNotes(value = \'\') {',
    '\n\n    function pruneEditorChromeNodes'
  );
  let actionCalls = 0;
  const context = {
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: false };
    },
    getIframeDoc() {
      return null;
    },
    getActiveSlide() {
      return null;
    },
    SlideNextStudioEditorNotes: { id: 'notes-api' },
    SlideNextStudioEditorNotesActions: {
      applyStudioSpeakerNotesEdit() {
        actionCalls += 1;
        return false;
      }
    },
    finalizeEditorDeckMutation() {},
    syncStudioChromeToActiveSlide() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveSlideNotes('Cue for slide'), false);
  assert.equal(actionCalls, 1);
});

test('updateActiveSlideSection delegates to the shared section action', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveSlideSection(value = \'\') {',
    '\n\n    function pruneEditorChromeNodes'
  );
  let delegatedOptions = null;
  const context = {
    SlideNextStudioEditorNotes: { id: 'metadata-api' },
    SlideNextStudioEditorNotesActions: {
      applyStudioSlideSectionEdit(value, options) {
        delegatedOptions = { value, options };
        return true;
      }
    },
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    },
    getIframeDoc() {
      return { id: 'frame' };
    },
    getActiveSlide() {
      return { id: 'slide-1' };
    },
    getEditorSlideId() {
      return 'slide-1';
    },
    finalizeEditorDeckMutation() {},
    syncStudioChromeToActiveSlide() {}
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveSlideSection('Research'), true);
  assert.equal(delegatedOptions.value, 'Research');
  assert.equal(delegatedOptions.options.sectionApi, context.SlideNextStudioEditorNotes);
  assert.equal(delegatedOptions.options.getElementId({}), 'slide:slide-1');
});
