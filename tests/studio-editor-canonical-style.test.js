const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const canonicalStyle = require('../shared/studio-editor-canonical-style.js');

function createSourceDeck() {
  return canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        text: 'Before',
        html: '<p>Before</p>',
        attributes: { src: 'before.png' },
        style: 'color: #000000;',
        layout: { zIndex: 1 }
      }]
    }]
  });
}

function createElement() {
  return {
    dataset: { editorId: 'node-1' },
    textContent: 'After',
    src: 'after.png',
    style: { color: '#ffffff', zIndex: '9' },
    getAttribute(name) {
      return name === 'src' ? this.src : null;
    }
  };
}

test('buildStudioCanonicalStyleMutation maps text, source, style, and z-index edits to the model', () => {
  const sourceDeck = createSourceDeck();
  const element = createElement();
  const options = {
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: sourceDeck,
    selection: [element],
    getElementId: (node) => node.dataset.editorId
  };

  const textDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'text', value: 'Fallback' });
  assert.equal(textDeck.slides[0].nodes[0].text, 'After');
  assert.equal(sourceDeck.slides[0].nodes[0].text, 'Before');

  const sourceDeckUpdate = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'src', value: 'fallback.png' });
  assert.equal(sourceDeckUpdate.slides[0].nodes[0].attributes.src, 'after.png');

  const styleDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'color', value: '#ffffff' });
  assert.equal(styleDeck.slides[0].nodes[0].style, 'color: #ffffff;');

  const zIndexDeck = canonicalStyle.buildStudioCanonicalStyleMutation({ ...options, prop: 'zIndex', value: '9' });
  assert.equal(zIndexDeck.slides[0].nodes[0].layout.zIndex, 9);
});

test('buildStudioCanonicalStyleMutation returns null without a canonical model or supported property', () => {
  const element = createElement();
  assert.equal(canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    selection: [element],
    prop: 'color'
  }), null);
  assert.equal(canonicalStyle.buildStudioCanonicalStyleMutation({
    canonicalDeckApi: canonicalDeck,
    canonicalDeckBeforeMutation: createSourceDeck(),
    selection: [element],
    prop: 'unsupported'
  }), null);
});
