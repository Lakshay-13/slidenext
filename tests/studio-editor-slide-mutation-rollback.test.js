const test = require('node:test');
const assert = require('node:assert/strict');

const rollback = require('../shared/studio-editor-slide-mutation-rollback.js');
const transactionApi = require('../shared/studio-editor-transaction.js');

test('slide mutation rollback preserves slide presence recovery when thumbnail refresh throws', () => {
  let removed = false;
  const slide = {
    remove() {
      removed = true;
    }
  };
  const slidesContainer = {};
  const sourceDoc = {
    getElementById(id) {
      return id === 'slidesContainer' ? slidesContainer : null;
    }
  };
  const transaction = transactionApi.createStudioSlidePresenceTransaction([{
    slideId: 'slide-2',
    before: { exists: false, index: 1, markup: '' },
    after: { exists: true, index: 1, markup: '<section id="slide-2"></section>' }
  }]);

  const result = rollback.rollbackStudioEditorSlideMutation(transaction, sourceDoc, {
    transactionApi,
    getSlideById(slideId) {
      return slideId === 'slide-2' ? slide : null;
    },
    generateThumbnails() {
      throw new Error('thumbnail refresh failed');
    }
  });

  assert.equal(result, true);
  assert.equal(removed, true);
});
