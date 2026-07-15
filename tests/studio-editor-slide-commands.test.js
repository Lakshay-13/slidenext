const test = require('node:test');
const assert = require('node:assert/strict');

const slideCommands = require('../shared/studio-editor-slide-commands.js');

test('prepareStudioSlideDuplication sanitizes, re-identifies, and decorates a cloned slide', () => {
  const duplicateSlide = {
    classList: {
      remove(className) {
        assert.equal(className, 'slide-active');
      }
    }
  };
  const sourceSlide = {
    cloneNode(deep) {
      assert.equal(deep, true);
      return duplicateSlide;
    }
  };
  const calls = [];

  const result = slideCommands.prepareStudioSlideDuplication(sourceSlide, {
    sanitizeDuplicatedSubtree(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push('sanitize');
    },
    assignSlideId(slide, options) {
      assert.equal(slide, duplicateSlide);
      assert.deepEqual(options, { forceNew: true });
      calls.push('assign');
      return 'slide-2';
    },
    makeElementsHoverable(slide) {
      assert.equal(slide, duplicateSlide);
      calls.push('hoverable');
    }
  });

  assert.deepEqual(result, { slide: duplicateSlide, slideId: 'slide-2' });
  assert.deepEqual(calls, ['sanitize', 'assign', 'hoverable']);
});

test('prepareStudioSlideDuplication rejects missing clone or slide-id capabilities', () => {
  assert.equal(slideCommands.prepareStudioSlideDuplication(null), null);
  assert.equal(slideCommands.prepareStudioSlideDuplication({ cloneNode() {} }), null);
  assert.equal(slideCommands.prepareStudioSlideDuplication({ cloneNode: () => ({}) }, {
    assignSlideId() {
      return '';
    }
  }), null);
});
