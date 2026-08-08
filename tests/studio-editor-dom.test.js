const test = require('node:test');
const assert = require('node:assert/strict');

const domState = require('../shared/studio-editor-dom.js');

function createClassList(classNames = []) {
  const values = new Set(classNames);
  return {
    contains(value) {
      return values.has(value);
    }
  };
}

function createElement(tagName, options = {}) {
  return {
    tagName,
    parentElement: options.parentElement || null,
    classList: createClassList(options.classNames || []),
    style: options.style || {}
  };
}

test('getStudioClosestPositionedAncestor returns the nearest slide or positioned ancestor', () => {
  const body = createElement('BODY');
  const slide = createElement('SECTION', {
    parentElement: body,
    classNames: ['slide']
  });
  const positioned = createElement('DIV', {
    parentElement: slide,
    style: { position: 'relative' }
  });
  const element = createElement('P', {
    parentElement: positioned
  });

  const doc = {
    body,
    defaultView: {
      getComputedStyle(node) {
        return node.style || { position: 'static' };
      }
    }
  };
  body.ownerDocument = doc;
  slide.ownerDocument = doc;
  positioned.ownerDocument = doc;
  element.ownerDocument = doc;

  assert.equal(domState.getStudioClosestPositionedAncestor(element), positioned);

  const unpositionedWrapper = createElement('DIV', {
    parentElement: slide,
    style: { position: 'static' }
  });
  const inlineElement = createElement('SPAN', {
    parentElement: unpositionedWrapper
  });
  unpositionedWrapper.ownerDocument = doc;
  inlineElement.ownerDocument = doc;

  assert.equal(domState.getStudioClosestPositionedAncestor(inlineElement), slide);
});

test('getStudioClosestPositionedAncestor falls back to body when no positioned parent exists', () => {
  const body = createElement('BODY');
  const html = createElement('HTML', {
    parentElement: null
  });
  body.parentElement = html;
  const wrapper = createElement('DIV', {
    parentElement: body,
    style: { position: 'static' }
  });
  const element = createElement('DIV', {
    parentElement: wrapper
  });

  const doc = {
    body,
    defaultView: {
      getComputedStyle(node) {
        return node.style || { position: 'static' };
      }
    }
  };
  body.ownerDocument = doc;
  html.ownerDocument = doc;
  wrapper.ownerDocument = doc;
  element.ownerDocument = doc;

  assert.equal(domState.getStudioClosestPositionedAncestor(element), body);
  assert.equal(domState.getStudioClosestPositionedAncestor(null), null);
});

test('makeStudioElementsHoverable assigns ids and adds the editor hover class', () => {
  const classNames = new Set();
  const element = {
    nodeType: 1,
    classList: {
      contains(value) {
        return classNames.has(value);
      },
      add(value) {
        classNames.add(value);
      }
    },
    matches(selector) {
      return selector === '.editable';
    },
    getAttribute() {
      return '';
    },
    setAttribute(name, value) {
      assert.equal(name, 'data-editor-id');
      assert.match(value, /^el-/);
    }
  };
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.editable');
      return [element];
    }
  };

  const result = domState.makeStudioElementsHoverable(root, {
    selectableSelector: '.editable',
    isEligibleEditableElement: () => true,
    now: () => 123
  });

  assert.deepEqual(result, [element]);
  assert.equal(classNames.has('editor-hoverable'), true);
});

test('resolveStudioEditableTarget selects a chart frame from its inline title', () => {
  const slide = createElement('SECTION', { classNames: ['slide'] });
  const chart = createElement('DIV', {
    parentElement: slide,
    classNames: ['editor-chart']
  });
  const title = createElement('SPAN', { parentElement: chart });
  chart.matches = (selector) => selector === '.editor-chart';
  title.matches = () => false;
  chart.nodeType = 1;
  title.nodeType = 1;

  assert.equal(
    domState.resolveStudioEditableTarget(title, {
      selectableSelector: '.editor-chart',
      inlineTextTags: new Set(['span'])
    }),
    chart
  );
});

test('resolveStudioEditableTarget selects an embed placeholder frame', () => {
  const placeholder = createElement('DIV', {
    classNames: ['editor-embed-placeholder']
  });
  placeholder.nodeType = 1;
  placeholder.matches = (selector) => selector === '.editor-embed-placeholder';

  assert.equal(
    domState.resolveStudioEditableTarget(placeholder, {
      selectableSelector: '.editor-embed-placeholder'
    }),
    placeholder
  );
});
