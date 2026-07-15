const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');

test('reorderCanonicalSlides moves a slide after a later target without mutating the source deck', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    metadata: { title: 'Deck' },
    slides: [
      { id: 'slide-1', title: 'One' },
      { id: 'slide-2', title: 'Two' },
      { id: 'slide-3', title: 'Three' }
    ]
  });

  const reorderedDeck = canonicalDeck.reorderCanonicalSlides(sourceDeck, 'slide-1', 'slide-3');

  assert.deepEqual(reorderedDeck.slides.map((slide) => slide.id), ['slide-2', 'slide-3', 'slide-1']);
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
  assert.equal(reorderedDeck.metadata.title, 'Deck');
});

test('reorderCanonicalSlides moves a slide before an earlier target', () => {
  const reorderedDeck = canonicalDeck.reorderCanonicalSlides({
    slides: [
      { id: 'slide-1' },
      { id: 'slide-2' },
      { id: 'slide-3' }
    ]
  }, 'slide-3', 'slide-1');

  assert.deepEqual(reorderedDeck.slides.map((slide) => slide.id), ['slide-3', 'slide-1', 'slide-2']);
});

test('reorderCanonicalSlides rejects missing and unchanged slide ids', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });

  assert.equal(canonicalDeck.reorderCanonicalSlides(deck, 'slide-1', 'slide-1'), null);
  assert.equal(canonicalDeck.reorderCanonicalSlides(deck, 'missing', 'slide-1'), null);
  assert.equal(canonicalDeck.reorderCanonicalSlides(deck, 'slide-1', 'missing'), null);
});

test('removeCanonicalSlide removes a slide without mutating the source deck', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    metadata: { title: 'Deck' },
    slides: [
      { id: 'slide-1' },
      { id: 'slide-2' },
      { id: 'slide-3' }
    ]
  });

  const reducedDeck = canonicalDeck.removeCanonicalSlide(sourceDeck, 'slide-2');

  assert.deepEqual(reducedDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-3']);
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
  assert.equal(reducedDeck.metadata.title, 'Deck');
});

test('removeCanonicalSlide preserves the minimum one-slide deck invariant', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });

  assert.equal(canonicalDeck.removeCanonicalSlide(deck, 'slide-1'), null);
  assert.equal(canonicalDeck.removeCanonicalSlide({ slides: [{ id: 'slide-1' }, { id: 'slide-2' }] }, 'missing'), null);
});

test('appendCanonicalSlide appends a normalized slide without mutating the source deck', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    metadata: { title: 'Deck' },
    slides: [{ id: 'slide-1' }]
  });

  const expandedDeck = canonicalDeck.appendCanonicalSlide(sourceDeck, {
    id: 'slide-2',
    title: 'New Slide',
    nodes: [{ id: 'node-1', tagName: 'h2', text: 'Heading' }]
  });

  assert.deepEqual(expandedDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
  assert.equal(expandedDeck.slides[1].title, 'New Slide');
  assert.equal(expandedDeck.slides[1].nodes[0].text, 'Heading');
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1']);
  assert.equal(expandedDeck.metadata.title, 'Deck');
});

test('appendCanonicalSlide rejects invalid deck or slide input', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });

  assert.equal(canonicalDeck.appendCanonicalSlide(null, { id: 'slide-2' }), null);
  assert.equal(canonicalDeck.appendCanonicalSlide(deck, null), null);
});

test('updateCanonicalNodeVisibility immutably updates nested node visibility by id', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        visibility: { hidden: false, locked: false },
        children: [{
          id: 'child-1',
          visibility: { hidden: false, locked: false }
        }]
      }, {
        id: 'node-2',
        visibility: { hidden: false, locked: false }
      }]
    }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalNodeVisibility(
    sourceDeck,
    ['node-1', 'child-1'],
    { locked: true }
  );

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.equal(sourceDeck.slides[0].nodes[0].visibility.locked, false);
  assert.equal(sourceDeck.slides[0].nodes[0].children[0].visibility.locked, false);
  assert.equal(updatedDeck.slides[0].nodes[0].visibility.locked, true);
  assert.equal(updatedDeck.slides[0].nodes[0].children[0].visibility.locked, true);
  assert.equal(updatedDeck.slides[0].nodes[1].visibility.locked, false);
});

test('updateCanonicalNodeVisibility returns null for no-op or invalid patches', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', visibility: { hidden: true } }]
    }]
  });

  assert.equal(canonicalDeck.updateCanonicalNodeVisibility(deck, ['node-1'], { hidden: true }), null);
  assert.equal(canonicalDeck.updateCanonicalNodeVisibility(deck, ['missing'], { hidden: false }), null);
  assert.equal(canonicalDeck.updateCanonicalNodeVisibility(deck, ['node-1'], { color: true }), null);
});
