const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const INDEX_HTML_PATH = path.join(__dirname, '..', 'index.html');

function extractFunctionSource(fileContent, startMarker, endMarker) {
  const start = fileContent.indexOf(startMarker);
  assert.notEqual(start, -1, 'Missing start marker: ' + startMarker);
  const end = fileContent.indexOf(endMarker, start);
  assert.notEqual(end, -1, 'Missing end marker: ' + endMarker);
  return fileContent.slice(start, end);
}

function createControllerContext(createPresentation) {
  const titleInput = {
    value: '  New Research Deck  '
  };
  const calls = [];
  const context = {
    document: {
      getElementById(id) {
        if (id === 'createPresentationTitle') return titleInput;
        return null;
      }
    },
    SlideNextPresentationCreationView: {
      setPresentationCreationError(options) {
        calls.push(['error', options.message]);
      },
      setPresentationCreationBusyState(options) {
        calls.push(['busy', options.isBusy]);
      },
      closePresentationCreationModal() {
        calls.push(['close']);
        return true;
      }
    },
    SlideNextPresentationLibrary: {
      createPresentation
    },
    async loadPresentations() {
      calls.push(['refresh']);
    },
    launchStudioEditor(...args) {
      calls.push(['launch', ...args]);
    }
  };

  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const controllerSource = extractFunctionSource(
    source,
    'function getPresentationCreationView() {',
    '\n\n    // Render category tab filters'
  );
  vm.createContext(context);
  vm.runInContext(controllerSource, context);
  return { context, titleInput, calls };
}

test('submitCreatePresentation creates, refreshes, and opens the new deck', async () => {
  const { context, titleInput, calls } = createControllerContext(async (options) => {
    assert.equal(options.title, '  New Research Deck  ');
    return {
      url: 'presentations/new-research-deck/index.html',
      title: 'New Research Deck',
      category: 'General'
    };
  });

  const result = await context.submitCreatePresentation({
    preventDefault() {
      calls.push(['preventDefault']);
    }
  });

  assert.equal(result.title, 'New Research Deck');
  assert.equal(titleInput.value, '');
  assert.deepEqual(calls, [
    ['preventDefault'],
    ['error', ''],
    ['busy', true],
    ['close'],
    ['refresh'],
    ['launch', 'presentations/new-research-deck/index.html', 'New Research Deck', 'General'],
    ['busy', false]
  ]);
});

test('submitCreatePresentation keeps the form open and reports creation errors', async () => {
  const { context, calls } = createControllerContext(async () => {
    throw new Error('A presentation with that name already exists');
  });

  const result = await context.submitCreatePresentation({
    preventDefault() {}
  });

  assert.equal(result, null);
  assert.deepEqual(calls, [
    ['error', ''],
    ['busy', true],
    ['error', 'A presentation with that name already exists'],
    ['busy', false]
  ]);
});

test('dashboard markup exposes the new deck control and creation form', () => {
  const source = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  assert.match(source, /id="createPresentationBtn"/);
  assert.match(source, /id="createPresentationModal"/);
  assert.match(source, /id="createPresentationTitle"/);
  assert.match(source, /onsubmit="submitCreatePresentation\(event\)"/);
});
