const test = require('node:test');
const assert = require('node:assert/strict');

const presentationLibraryView = require('../shared/presentation-library-view.js');

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
