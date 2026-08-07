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

test('updateActiveSlideNotes persists a canonical transaction and refreshes the inspector', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveSlideNotes(value = \'\') {',
    '\n\n    function pruneEditorChromeNodes'
  );
  const calls = [];
  const frame = { id: 'live-frame' };
  const slide = { id: 'slide-node' };
  const transaction = { kind: 'slidenext.editor.transaction' };
  const context = {
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: true };
    },
    getIframeDoc() {
      return frame;
    },
    getActiveSlide(nextFrame) {
      calls.push(['getActiveSlide', nextFrame]);
      return slide;
    },
    SlideNextStudioEditorNotes: {
      applyStudioSpeakerNotes(nextSlide, value, options) {
        calls.push([
          'applyStudioSpeakerNotes',
          nextSlide,
          value,
          options.getElementId(nextSlide),
          options.transactionApi
        ]);
        return { didApply: true, transaction };
      }
    },
    SlideNextStudioEditorTransaction: { id: 'transaction-api' },
    getEditorSlideId() {
      return 'slide-1';
    },
    finalizeEditorDeckMutation(label, options) {
      calls.push(['finalizeEditorDeckMutation', label, options]);
    },
    syncStudioChromeToActiveSlide(nextFrame) {
      calls.push(['syncStudioChromeToActiveSlide', nextFrame]);
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveSlideNotes('Cue for slide'), true);
  assert.deepEqual(calls.map(([name]) => name), [
    'getActiveSlide',
    'applyStudioSpeakerNotes',
    'finalizeEditorDeckMutation',
    'syncStudioChromeToActiveSlide'
  ]);
  assert.deepEqual(calls[1].slice(0, 4), [
    'applyStudioSpeakerNotes',
    slide,
    'Cue for slide',
    'slide:slide-1'
  ]);
  assert.equal(calls[1][4], context.SlideNextStudioEditorTransaction);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[2])), [
    'finalizeEditorDeckMutation',
    'Auto: Updated Speaker Notes',
    { refreshThumbnails: false, transaction }
  ]);
  assert.deepEqual(calls[3], ['syncStudioChromeToActiveSlide', frame]);
});

test('updateActiveSlideNotes refuses changes when the deck is not ready', () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const source = extractFunctionSource(
    fileContent,
    'function updateActiveSlideNotes(value = \'\') {',
    '\n\n    function pruneEditorChromeNodes'
  );
  let applyCalls = 0;
  const context = {
    resolveCurrentStudioDeckReadyActionState() {
      return { canUseDeckActions: false };
    },
    SlideNextStudioEditorNotes: {
      applyStudioSpeakerNotes() {
        applyCalls += 1;
        return { didApply: true };
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(source, context);

  assert.equal(context.updateActiveSlideNotes('ignored'), false);
  assert.equal(applyCalls, 0);
});
