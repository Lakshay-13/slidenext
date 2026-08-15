const test = require('node:test');
const assert = require('node:assert/strict');

const mutation = require('../shared/studio-editor-layout-conversion-mutation.js');

test('applyStudioLayoutConversionStyles applies and restores reversible style patches', () => {
  const element = { style: { position: '', left: '' } };
  const items = [{
    element,
    beforeStyle: { position: '', left: '' },
    afterStyle: { position: 'absolute', left: '20px' }
  }];

  assert.equal(mutation.applyStudioLayoutConversionStyles(items), true);
  assert.deepEqual(element.style, { position: 'absolute', left: '20px' });
  assert.equal(mutation.restoreStudioLayoutConversionStyles(items), true);
  assert.deepEqual(element.style, { position: '', left: '' });
});

test('applyStudioLayoutConversionStyles rolls back earlier items when a patch is invalid', () => {
  const first = { style: { position: '', left: '' } };
  const items = [
    {
      element: first,
      beforeStyle: { position: '', left: '' },
      afterStyle: { position: 'absolute', left: '20px' }
    },
    {
      beforeStyle: { position: '' },
      afterStyle: { position: 'absolute' }
    }
  ];

  assert.equal(mutation.applyStudioLayoutConversionStyles(items), false);
  assert.deepEqual(first.style, { position: '', left: '' });
});
