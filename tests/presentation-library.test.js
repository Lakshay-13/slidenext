const test = require('node:test');
const assert = require('node:assert/strict');

const presentationLibrary = require('../shared/presentation-library.js');

const sampleLibrary = [
  {
    category: 'General',
    presentations: [
      { id: 'onboarding' },
      { id: 'ai-tools' }
    ]
  },
  {
    category: 'Research',
    presentations: [
      { id: 'pinns' }
    ]
  }
];

test('normalizePresentationLibraryData returns only valid groups', () => {
  assert.deepEqual(
    presentationLibrary.normalizePresentationLibraryData([sampleLibrary[0], null, 'bad', sampleLibrary[1]]),
    sampleLibrary
  );
  assert.deepEqual(presentationLibrary.normalizePresentationLibraryData(null), []);
});

test('listPresentationLibraryCategories preserves server ordering and prefixes all', () => {
  assert.deepEqual(
    presentationLibrary.listPresentationLibraryCategories(sampleLibrary),
    ['all', 'General', 'Research']
  );
});

test('resolvePresentationLibraryItems returns all or category-filtered presentations', () => {
  assert.deepEqual(
    presentationLibrary.resolvePresentationLibraryItems(sampleLibrary, 'all'),
    [
      { id: 'onboarding' },
      { id: 'ai-tools' },
      { id: 'pinns' }
    ]
  );

  assert.deepEqual(
    presentationLibrary.resolvePresentationLibraryItems(sampleLibrary, 'Research'),
    [
      { id: 'pinns' }
    ]
  );

  assert.deepEqual(
    presentationLibrary.resolvePresentationLibraryItems(sampleLibrary, 'Missing'),
    []
  );
});
