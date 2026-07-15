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
  assert.match(markup, /filterCategory\('all'\)/);
  assert.match(markup, /filterCategory\('Research'\)/);
  assert.match(markup, /category-tab active/);
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
  assert.match(markup, /launchPresentation\('presentations\/onboarding\/index.html'\)/);
  assert.match(markup, /launchStudioEditor\('presentations\/onboarding\/index.html'/);

  const emptyContainer = { innerHTML: '' };
  const emptyMarkup = presentationLibraryView.renderPresentationLibraryGrid({
    container: emptyContainer,
    data: [],
    activeCategory: 'all'
  });
  assert.equal(emptyContainer.innerHTML, emptyMarkup);
  assert.match(emptyMarkup, /No presentations found/);
});
