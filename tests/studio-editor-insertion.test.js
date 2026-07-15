const test = require('node:test');
const assert = require('node:assert/strict');

const insertion = require('../shared/studio-editor-insertion.js');

function createDocument() {
  return {
    createElement(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        style: {},
        children: [],
        appendChild(child) {
          this.children.push(child);
          return child;
        }
      };
    }
  };
}

test('createStudioInsertedElement creates the existing text, image, and shape defaults', () => {
  const documentRef = createDocument();
  const heading = insertion.createStudioInsertedElement('h2', { documentRef, offset: 30 });
  const paragraph = insertion.createStudioInsertedElement('p', { documentRef, offset: 30 });
  const image = insertion.createStudioInsertedElement('img', { documentRef, offset: 30 });
  const shape = insertion.createStudioInsertedElement('shape', { documentRef, offset: 30 });

  assert.equal(heading.tagName, 'H2');
  assert.equal(heading.textContent, 'New Heading');
  assert.equal(heading.style.left, 'calc(30% + 30px)');
  assert.equal(paragraph.textContent, 'Enter text descriptions here.');
  assert.equal(paragraph.style.top, 'calc(50% + 30px)');
  assert.match(image.src, /^https:\/\/images\.unsplash\.com\//);
  assert.equal(shape.className, 'editor-shape');
  assert.equal(shape.style.width, '200px');
});

test('createStudioInsertedElement creates the existing table and code defaults', () => {
  const documentRef = createDocument();
  const table = insertion.createStudioInsertedElement('table', { documentRef, offset: 15 });
  const code = insertion.createStudioInsertedElement('code', { documentRef, offset: 15 });

  assert.equal(table.tagName, 'TABLE');
  assert.equal(table.style.left, 'calc(30% + 15px)');
  assert.match(table.innerHTML, /Metric/);
  assert.equal(code.tagName, 'PRE');
  assert.equal(code.children[0].tagName, 'CODE');
  assert.match(code.children[0].textContent, /trainEpoch/);
});

test('createStudioInsertedElement returns null for unsupported types or missing documents', () => {
  assert.equal(insertion.createStudioInsertedElement('unknown', { documentRef: createDocument() }), null);
  assert.equal(insertion.createStudioInsertedElement('h2'), null);
});

test('applyStudioElementInsertion prepares, appends, and captures the inserted element mutation', () => {
  const documentRef = createDocument();
  const calls = [];
  const slide = {
    innerHTML: '<p>Before</p>',
    appendChild(element) {
      calls.push(['appendChild', element]);
      this.innerHTML += '<h2>New Heading</h2>';
      return element;
    }
  };
  const transactionCapture = {
    createTransaction() {
      calls.push(['createTransaction']);
      return { kind: 'test.transaction' };
    }
  };

  const result = insertion.applyStudioElementInsertion('h2', {
    documentRef,
    slide,
    offset: 15,
    prepareElement(element) {
      calls.push(['prepareElement', element]);
    },
    transactionElementId: 'slide:slide-1',
    createMarkupTransactionCapture(items, options) {
      calls.push(['capture', items, options]);
      assert.equal(items[0].element, slide);
      assert.equal(items[0].elementId, 'slide:slide-1');
      return transactionCapture;
    }
  });

  assert.equal(result.element.tagName, 'H2');
  assert.deepEqual(result.transaction, { kind: 'test.transaction' });
  assert.deepEqual(calls.map(([name]) => name), [
    'prepareElement',
    'capture',
    'appendChild',
    'createTransaction'
  ]);
});
