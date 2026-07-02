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

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('loadPresentations resets the dashboard to loading state before refreshing the library', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setPresentationLibraryLoadingStateSource = extractFunctionSource(
    fileContent,
    'function setPresentationLibraryLoadingState() {',
    '\n\n    async function loadPresentations() {'
  );
  const loadPresentationsSource = extractFunctionSource(
    fileContent,
    'async function loadPresentations() {',
    '\n\n    // Render category tab filters'
  );

  const sampleLibrary = [
    {
      category: 'General',
      presentations: [
        { title: 'Onboarding' }
      ]
    }
  ];

  const loaderEl = {
    classList: createClassList(['hidden']),
    innerHTML: '<div>Old error</div>'
  };
  const categoryTabsEl = {
    classList: createClassList(),
    innerHTML: '<button>Old tab</button>'
  };
  const gridEl = {
    classList: createClassList(),
    innerHTML: '<div>Old card</div>'
  };

  const documentStub = {
    getElementById(id) {
      switch (id) {
        case 'loader':
          return loaderEl;
        case 'categoryTabs':
          return categoryTabsEl;
        case 'presentationsGrid':
          return gridEl;
        default:
          throw new Error(`Unexpected element lookup: ${id}`);
      }
    }
  };

  const renders = [];
  let committedData = null;
  const context = {
    document: documentStub,
    presentationLibraryData: [],
    presentationLibraryLoadToken: 0,
    renderCategories(data) {
      renders.push(['categories', data]);
    },
    renderGrid(data) {
      renders.push(['grid', data]);
    },
    SlideNextPresentationLibrary: {
      async loadPresentationLibrary(options) {
        assert.equal(loaderEl.classList.contains('hidden'), false);
        assert.equal(categoryTabsEl.classList.contains('hidden'), true);
        assert.equal(gridEl.classList.contains('hidden'), true);
        assert.match(loaderEl.innerHTML, /Loading presentations list/);
        options.commitPresentationLibraryData(sampleLibrary);
        committedData = sampleLibrary;
        options.onSuccess(sampleLibrary);
        return sampleLibrary;
      }
    },
    console
  };

  vm.createContext(context);
  vm.runInContext(`${setPresentationLibraryLoadingStateSource}\n${loadPresentationsSource}`, context);

  await context.loadPresentations();

  assert.deepEqual(context.presentationLibraryData, sampleLibrary);
  assert.deepEqual(committedData, sampleLibrary);
  assert.equal(loaderEl.classList.contains('hidden'), true);
  assert.equal(categoryTabsEl.classList.contains('hidden'), false);
  assert.equal(gridEl.classList.contains('hidden'), false);
  assert.deepEqual(renders, [
    ['categories', sampleLibrary],
    ['grid', sampleLibrary]
  ]);
});

test('loadPresentations tolerates missing dashboard chrome during success and error updates', async () => {
  const fileContent = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const setPresentationLibraryLoadingStateSource = extractFunctionSource(
    fileContent,
    'function setPresentationLibraryLoadingState() {',
    '\n\n    async function loadPresentations() {'
  );
  const loadPresentationsSource = extractFunctionSource(
    fileContent,
    'async function loadPresentations() {',
    '\n\n    // Render category tab filters'
  );

  const sampleLibrary = [
    {
      category: 'General',
      presentations: [
        { title: 'Onboarding' }
      ]
    }
  ];

  const calls = [];
  let committedData = null;
  const context = {
    document: {
      getElementById(id) {
        calls.push(['getElementById', id]);
        if (
          id === 'loader'
          || id === 'categoryTabs'
          || id === 'presentationsGrid'
        ) {
          return null;
        }
        throw new Error(`Unexpected element lookup: ${id}`);
      }
    },
    presentationLibraryData: [],
    presentationLibraryLoadToken: 0,
    renderCategories(data) {
      calls.push(['renderCategories', data]);
    },
    renderGrid(data) {
      calls.push(['renderGrid', data]);
    },
    SlideNextPresentationLibrary: {
      async loadPresentationLibrary(options) {
        options.commitPresentationLibraryData(sampleLibrary);
        committedData = sampleLibrary;
        options.onSuccess(sampleLibrary);
        options.onError(new Error('network failed'));
        return sampleLibrary;
      }
    },
    console: {
      error(...args) {
        calls.push(['console.error', ...args]);
      }
    }
  };

  vm.createContext(context);
  vm.runInContext(`${setPresentationLibraryLoadingStateSource}\n${loadPresentationsSource}`, context);

  await assert.doesNotReject(async () => {
    await context.loadPresentations();
  });

  assert.deepEqual(context.presentationLibraryData, sampleLibrary);
  assert.deepEqual(committedData, sampleLibrary);
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'loader'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'categoryTabs'));
  assert.ok(calls.some(([name, id]) => name === 'getElementById' && id === 'presentationsGrid'));
  assert.ok(calls.some(([name]) => name === 'renderCategories'));
  assert.ok(calls.some(([name]) => name === 'renderGrid'));
  assert.ok(calls.some(([name]) => name === 'console.error'));
});
