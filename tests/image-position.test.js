const test = require('node:test');
const assert = require('node:assert/strict');

const imagePosition = require('../shared/image-position.js');

test('parseImagePosition normalizes CSS keyword and percentage positions', () => {
  assert.deepEqual(imagePosition.parseImagePosition('right bottom'), { x: 1, y: 1 });
  assert.deepEqual(imagePosition.parseImagePosition('25% 75%'), { x: 0.25, y: 0.75 });
  assert.deepEqual(imagePosition.parseImagePosition('top left'), { x: 0, y: 0 });
  assert.deepEqual(imagePosition.parseImagePosition('center'), { x: 0.5, y: 0.5 });
});

test('parseImagePosition rejects unsupported values', () => {
  assert.equal(imagePosition.parseImagePosition('10px 20px'), null);
  assert.equal(imagePosition.parseImagePosition('120% 50%'), null);
  assert.equal(imagePosition.parseImagePosition('left 20% top 10%'), null);
});

test('isCenteredImagePosition recognizes implicit and explicit center values', () => {
  assert.equal(imagePosition.isCenteredImagePosition(''), true);
  assert.equal(imagePosition.isCenteredImagePosition('50% center'), true);
  assert.equal(imagePosition.isCenteredImagePosition('right center'), false);
});
