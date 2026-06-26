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
