const test = require('node:test');
const assert = require('node:assert/strict');

const dashboardController = require('../shared/presentation-dashboard-controller.js');

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

function createDocumentStub() {
  const elements = {
    loader: {
      classList: createClassList(['hidden']),
      innerHTML: '<p>old error</p>'
    },
    categoryTabs: {
      classList: createClassList(['hidden']),
      innerHTML: ''
    },
    presentationsGrid: {
      classList: createClassList(['hidden']),
      innerHTML: ''
    }
  };
  const tabs = [
    { textContent: 'All Decks', classList: createClassList(['active']) },
    { textContent: 'Research', classList: createClassList() }
  ];
  return {
    elements,
    tabs,
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll(selector) {
      return selector === '.category-tab' ? tabs : [];
    }
  };
}

test('dashboard controller loads data and renders the loaded state', async () => {
  const documentRef = createDocumentStub();
  const calls = [];
  const data = [{ category: 'General', presentations: [{ title: 'Deck' }] }];
  const controller = dashboardController.createPresentationDashboardController({
    documentRef,
    presentationLibraryView: {
      setPresentationLibraryLoadingState(options) {
        calls.push(['loading', options.documentRef === documentRef]);
        return true;
      },
      renderPresentationLibraryCategories(options) {
        calls.push(['categories', options.data, options.activeCategory, options.filterCategory]);
        return 'categories';
      },
      renderPresentationLibraryGrid(options) {
        calls.push(['grid', options.data, options.activeCategory]);
        return 'grid';
      }
    },
    presentationLibrary: {
      async loadPresentationLibrary(options) {
        options.commitPresentationLibraryData(data);
        options.onSuccess(data);
        return data;
      }
    }
  });

  assert.deepEqual(await controller.load(), data);
  assert.deepEqual(controller.getPresentationLibraryData(), data);
  assert.equal(documentRef.elements.loader.classList.contains('hidden'), true);
  assert.equal(documentRef.elements.categoryTabs.classList.contains('hidden'), false);
  assert.equal(documentRef.elements.presentationsGrid.classList.contains('hidden'), false);
  assert.deepEqual(calls, [
    ['loading', true],
    ['categories', data, 'all', controller.filter],
    ['grid', data, 'all']
  ]);
});

test('dashboard controller filters current data and updates active tab state', async () => {
  const documentRef = createDocumentStub();
  let renderedCategory = '';
  const data = [{ category: 'Research', presentations: [{ title: 'PINNs' }] }];
  const controller = dashboardController.createPresentationDashboardController({
    documentRef,
    presentationLibraryView: {
      renderPresentationLibraryGrid(options) {
        renderedCategory = options.activeCategory;
        return 'filtered';
      }
    },
    presentationLibrary: {
      async loadPresentationLibrary(options) {
        options.commitPresentationLibraryData(data);
        return data;
      }
    }
  });

  await controller.load();
  assert.equal(controller.filter('Research'), 'filtered');
  assert.equal(controller.getActiveCategory(), 'Research');
  assert.equal(renderedCategory, 'Research');
  assert.equal(documentRef.tabs[0].classList.contains('active'), false);
  assert.equal(documentRef.tabs[1].classList.contains('active'), true);
});

test('dashboard controller reports current load failures with the legacy fallback state', async () => {
  const documentRef = createDocumentStub();
  const errors = [];
  const controller = dashboardController.createPresentationDashboardController({
    documentRef,
    consoleRef: {
      error(...args) {
        errors.push(args);
      }
    },
    presentationLibraryView: {
      setPresentationLibraryLoadingState() {
        return true;
      }
    },
    presentationLibrary: {
      loadPresentationLibrary() {
        return Promise.reject(new Error('network failed'));
      }
    }
  });

  assert.deepEqual(await controller.load(), []);
  assert.equal(errors.length, 1);
  assert.match(errors[0][1].message, /network failed/);
  assert.match(documentRef.elements.loader.innerHTML, /Failed to load SlideNext workspace/);
});

test('dashboard controller delegates load failures to the shared retryable error state', async () => {
  const documentRef = createDocumentStub();
  const errors = [];
  const renderedErrors = [];
  const controller = dashboardController.createPresentationDashboardController({
    documentRef,
    consoleRef: {
      error(...args) {
        errors.push(args);
      }
    },
    presentationLibraryView: {
      setPresentationLibraryLoadingState() {
        return true;
      },
      setPresentationLibraryErrorState(options) {
        renderedErrors.push(options);
        return true;
      }
    },
    presentationLibrary: {
      loadPresentationLibrary(options) {
        options.onError(new Error('network failed'));
        return Promise.resolve([]);
      }
    }
  });

  assert.deepEqual(await controller.load(), []);
  assert.equal(errors.length, 1);
  assert.deepEqual(renderedErrors, [{
    documentRef,
    message: 'Failed to load SlideNext workspace',
    loadPresentations: controller.load
  }]);
});
