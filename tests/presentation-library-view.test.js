const test = require('node:test');
const assert = require('node:assert/strict');

const presentationLibraryView = require('../shared/presentation-library-view.js');

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach(value => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach(value => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
}

test('setPresentationLibraryLoadingState resets dashboard chrome and returns whether it applied', () => {
  const loader = { classList: createClassList(['hidden']), innerHTML: '<p>old error</p>' };
  const categoryTabs = { classList: createClassList() };
  const presentationsGrid = { classList: createClassList() };
  const elements = { loader, categoryTabs, presentationsGrid };

  const didApply = presentationLibraryView.setPresentationLibraryLoadingState({
    documentRef: {
      getElementById(id) {
        return elements[id];
      }
    }
  });

  assert.equal(didApply, true);
  assert.equal(loader.classList.contains('hidden'), false);
  assert.match(loader.innerHTML, /Loading presentations list/);
  assert.equal(categoryTabs.classList.contains('hidden'), true);
  assert.equal(presentationsGrid.classList.contains('hidden'), true);
});

test('setPresentationLibraryLoadingState safely skips an unavailable document', () => {
  assert.equal(presentationLibraryView.setPresentationLibraryLoadingState(), false);
});

test('setPresentationLibraryErrorState renders a retryable error state', () => {
  const loader = { classList: createClassList(['hidden']), innerHTML: '' };
  const categoryTabs = { classList: createClassList() };
  const presentationsGrid = { classList: createClassList() };
  const elements = { loader, categoryTabs, presentationsGrid };

  const didApply = presentationLibraryView.setPresentationLibraryErrorState({
    documentRef: {
      getElementById(id) {
        return elements[id];
      }
    },
    message: 'Workspace unavailable'
  });

  assert.equal(didApply, true);
  assert.equal(loader.classList.contains('hidden'), false);
  assert.match(loader.innerHTML, /Workspace unavailable/);
  assert.match(loader.innerHTML, /Try again/);
  assert.match(loader.innerHTML, /data-presentation-library-action="retry"/);
  assert.doesNotMatch(loader.innerHTML, /onclick=/);
  assert.equal(categoryTabs.classList.contains('hidden'), true);
  assert.equal(presentationsGrid.classList.contains('hidden'), true);
});

test('presentation library view delegates retry actions without duplicate listeners', () => {
  const loader = {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
  const calls = [];
  const documentRef = {
    getElementById(id) {
      return id === 'loader' ? loader : null;
    }
  };

  assert.equal(presentationLibraryView.bindPresentationLibraryActions({
    documentRef,
    loadPresentations() {
      calls.push('initial');
    }
  }), true);
  assert.equal(presentationLibraryView.bindPresentationLibraryActions({
    documentRef,
    loadPresentations() {
      calls.push('updated');
    }
  }), true);
  loader.listeners.click({
    target: {
      dataset: { presentationLibraryAction: 'retry' },
      parentNode: loader
    }
  });
  assert.deepEqual(calls, ['updated']);
});

test('renderPresentationLibraryCategories renders active and inactive category tabs', () => {
  const container = { innerHTML: '' };
  const markup = presentationLibraryView.renderPresentationLibraryCategories({
    container,
    activeCategory: 'Research',
    data: [
      { category: 'General', presentations: [] },
      { category: 'Research', presentations: [] }
    ]
  });

  assert.equal(container.innerHTML, markup);
  assert.match(markup, /data-presentation-library-action="filter"/);
  assert.match(markup, /data-presentation-library-category="all"/);
  assert.match(markup, /data-presentation-library-category="Research"/);
  assert.doesNotMatch(markup, /onclick=/);
  assert.match(markup, /category-tab active/);
});

test('presentation library view delegates category filtering through the view', () => {
  const container = {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
  const calls = [];
  assert.equal(presentationLibraryView.bindPresentationLibraryCategoryActions({
    container,
    filterCategory(category) {
      calls.push(category);
    }
  }), true);
  container.listeners.click({
    target: {
      dataset: {
        presentationLibraryAction: 'filter',
        presentationLibraryCategory: 'Research'
      },
      parentNode: container
    }
  });
  assert.deepEqual(calls, ['Research']);
});

test('renderPresentationLibraryGrid renders presentation actions and empty state', () => {
  const container = { innerHTML: '' };
  const markup = presentationLibraryView.renderPresentationLibraryGrid({
    container,
    activeCategory: 'General',
    data: [{
      category: 'General',
      presentations: [{
        title: 'Onboarding',
        subtitle: 'Start here',
        description: 'Workspace guide',
        url: 'presentations/onboarding/index.html',
        tags: ['Guide']
      }]
    }]
  });

  assert.equal(container.innerHTML, markup);
  assert.match(markup, /Onboarding/);
  assert.match(markup, /data-presentation-library-action="launch"/);
  assert.match(markup, /data-presentation-library-action="edit"/);
  assert.match(markup, /data-presentation-library-url="presentations\/onboarding\/index.html"/);
  assert.doesNotMatch(markup, /onclick=/);
  assert.match(markup, /content-visibility: auto/);
  assert.match(markup, /contain-intrinsic-size: 240px/);

  const emptyContainer = { innerHTML: '' };
  const emptyMarkup = presentationLibraryView.renderPresentationLibraryGrid({
    container: emptyContainer,
    data: [],
    activeCategory: 'all'
  });
  assert.equal(emptyContainer.innerHTML, emptyMarkup);
  assert.match(emptyMarkup, /No presentations found/);
});

test('renderPresentationLibraryGrid escapes user-controlled metadata and handler arguments', () => {
  const markup = presentationLibraryView.renderPresentationLibraryGrid({
    data: [{
      category: 'General',
      presentations: [{
        title: 'Quarterly "Review" <Draft>',
        subtitle: "Owner's notes",
        description: '<img src=x onerror=alert(1)>',
        url: 'presentations/review/quote"deck/index.html',
        tags: ['R&D']
      }]
    }],
    activeCategory: 'all'
  });

  assert.match(markup, /Quarterly &quot;Review&quot; &lt;Draft&gt;/);
  assert.match(markup, /Owner&#39;s notes/);
  assert.match(markup, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(markup, /data-presentation-library-url="presentations\/review\/quote&quot;deck\/index.html"/);
  assert.doesNotMatch(markup, /<img src=x/);
});

test('presentation library view delegates launch actions through the view', () => {
  const container = {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    }
  };
  const calls = [];
  assert.equal(presentationLibraryView.bindPresentationLibraryGridActions({
    container,
    launchPresentation(url) {
      calls.push(['launch', url]);
    },
    launchStudioEditor(...args) {
      calls.push(['edit', ...args]);
    }
  }), true);
  const dispatch = (action, dataset) => {
    container.listeners.click({
      target: {
        dataset: { presentationLibraryAction: action, ...dataset },
        parentNode: container
      }
    });
  };
  dispatch('launch', { presentationLibraryUrl: '/deck/index.html' });
  dispatch('edit', {
    presentationLibraryUrl: '/deck/index.html',
    presentationLibraryTitle: 'Deck',
    presentationLibraryCategory: 'Research'
  });
  assert.deepEqual(calls, [
    ['launch', '/deck/index.html'],
    ['edit', '/deck/index.html', 'Deck', 'Research']
  ]);
});
