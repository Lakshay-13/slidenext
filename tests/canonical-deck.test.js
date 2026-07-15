const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');

test('createCanonicalDeck repairs duplicate slide and nested node ids deterministically', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [
      {
        id: 'slide-1',
        nodes: [{ id: 'node-1', children: [{ id: 'node-1' }] }]
      },
      {
        id: 'slide-1',
        nodes: [{ id: 'node-1' }]
      }
    ]
  });

  assert.deepEqual(deck.slides.map((slide) => slide.id), ['slide-1', 'slide-1-2']);
  assert.deepEqual([
    deck.slides[0].nodes[0].id,
    deck.slides[0].nodes[0].children[0].id,
    deck.slides[1].nodes[0].id
  ], ['node-1', 'node-1-2', 'node-1-3']);
});

test('createCanonicalDeck repairs duplicate asset ids without changing asset order', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [
      { id: 'asset-1', src: 'one.png' },
      { id: 'asset-1', src: 'two.png' },
      { src: 'three.png' }
    ]
  });

  assert.deepEqual(deck.assets.map((asset) => [asset.id, asset.src]), [
    ['asset-1', 'one.png'],
    ['asset-1-2', 'two.png'],
    ['asset-3', 'three.png']
  ]);
});

test('createCanonicalDeck repairs duplicate inline script ids across source locations', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    source: {
      headInlineScripts: [
        { id: 'boot', content: 'window.headOne = true;' },
        { id: 'boot', content: 'window.headTwo = true;' },
        { id: ' ', content: 'window.headThree = true;' }
      ],
      bodyInlineScripts: [
        { id: 'boot', content: 'window.bodyOne = true;' },
        { content: 'window.bodyTwo = true;' }
      ]
    }
  });

  assert.deepEqual(deck.source.headInlineScripts.map((script) => script.id), [
    'boot',
    'boot-2',
    'head-inline-script-3'
  ]);
  assert.deepEqual(deck.source.bodyInlineScripts.map((script) => script.id), [
    'boot-3',
    'body-inline-script-2'
  ]);
  assert.equal(canonicalDeck.isCanonicalDeck(deck), true);
});

test('isCanonicalDeck rejects duplicate inline script ids across source locations', () => {
  assert.equal(canonicalDeck.isCanonicalDeck({
    kind: 'slidenext.deck',
    schemaVersion: 1,
    source: {
      headInlineScripts: [{ id: 'boot' }],
      bodyInlineScripts: [{ id: 'boot' }]
    },
    slides: [{ id: 'slide-1', nodes: [] }]
  }), false);
});

test('isCanonicalDeck rejects malformed identity fields and accepts repaired decks', () => {
  const malformedDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 1,
    assets: [{ id: 'asset-1' }, { id: 'asset-1' }],
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', children: [{ id: '' }] }]
    }]
  };

  assert.equal(canonicalDeck.isCanonicalDeck(malformedDeck), false);
  assert.equal(canonicalDeck.isCanonicalDeck(canonicalDeck.createCanonicalDeck(malformedDeck)), true);
});

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

test('insertCanonicalSlide inserts a normalized slide at an index without mutating the source deck', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    metadata: { title: 'Deck' },
    slides: [{ id: 'slide-1' }, { id: 'slide-3' }]
  });

  const expandedDeck = canonicalDeck.insertCanonicalSlide(sourceDeck, {
    id: 'slide-2',
    title: 'Inserted Slide',
    nodes: [{ id: 'node-1', tagName: 'H2', text: 'Heading' }]
  }, 1);

  assert.deepEqual(expandedDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-2', 'slide-3']);
  assert.equal(expandedDeck.slides[1].title, 'Inserted Slide');
  assert.equal(expandedDeck.slides[1].nodes[0].tagName, 'h2');
  assert.deepEqual(sourceDeck.slides.map((slide) => slide.id), ['slide-1', 'slide-3']);
  assert.equal(expandedDeck.metadata.title, 'Deck');
});

test('insertCanonicalSlide accepts the start and end indexes and rejects invalid indexes', () => {
  const deck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });

  assert.deepEqual(
    canonicalDeck.insertCanonicalSlide(deck, { id: 'slide-0' }, 0).slides.map((slide) => slide.id),
    ['slide-0', 'slide-1']
  );
  assert.deepEqual(
    canonicalDeck.insertCanonicalSlide(deck, { id: 'slide-2' }, 1).slides.map((slide) => slide.id),
    ['slide-1', 'slide-2']
  );
  assert.equal(canonicalDeck.insertCanonicalSlide(deck, { id: 'slide-2' }, -1), null);
  assert.equal(canonicalDeck.insertCanonicalSlide(deck, { id: 'slide-2' }, 2), null);
  assert.equal(canonicalDeck.insertCanonicalSlide(deck, { id: 'slide-2' }, 1.5), null);
});

test('appendCanonicalNode immutably appends a normalized node to a slide', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    metadata: { title: 'Deck' },
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
  });

  const expandedDeck = canonicalDeck.appendCanonicalNode(sourceDeck, 'slide-1', {
    id: 'node-2',
    tagName: 'H2',
    text: 'Heading'
  });

  assert.deepEqual(expandedDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2']);
  assert.equal(expandedDeck.slides[0].nodes[1].tagName, 'h2');
  assert.equal(expandedDeck.slides[0].nodes[1].text, 'Heading');
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1']);
  assert.equal(expandedDeck.metadata.title, 'Deck');
});

test('appendCanonicalNode rejects missing slides and duplicate node ids', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1', children: [{ id: 'child-1' }] }] }]
  });

  assert.equal(canonicalDeck.appendCanonicalNode(deck, 'missing', { id: 'node-2' }), null);
  assert.equal(canonicalDeck.appendCanonicalNode(deck, 'slide-1', { id: 'node-1' }), null);
  assert.equal(canonicalDeck.appendCanonicalNode(deck, 'slide-1', { id: 'child-1' }), null);
  assert.equal(canonicalDeck.appendCanonicalNode(deck, 'slide-1', null), null);
});

test('groupCanonicalNodes replaces selected siblings with an immutable group node', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'before' },
        { id: 'node-1' },
        { id: 'node-2' },
        { id: 'after' }
      ]
    }]
  });

  const groupedDeck = canonicalDeck.groupCanonicalNodes(
    sourceDeck,
    'slide-1',
    '',
    ['node-1', 'node-2'],
    {
      id: 'group-1',
      tagName: 'div',
      children: [{ id: 'node-1' }, { id: 'node-2' }]
    }
  );

  assert.deepEqual(groupedDeck.slides[0].nodes.map((node) => node.id), ['before', 'group-1', 'after']);
  assert.deepEqual(groupedDeck.slides[0].nodes[1].children.map((node) => node.id), ['node-1', 'node-2']);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['before', 'node-1', 'node-2', 'after']);
});

test('groupCanonicalNodes preserves a nested parent and rejects incomplete groups', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'parent-1',
        children: [{ id: 'node-1' }, { id: 'node-2' }, { id: 'node-3' }]
      }]
    }]
  });
  const group = { id: 'group-1', children: [{ id: 'node-1' }, { id: 'node-2' }] };

  const groupedDeck = canonicalDeck.groupCanonicalNodes(deck, 'slide-1', 'parent-1', ['node-1', 'node-2'], group);

  assert.deepEqual(groupedDeck.slides[0].nodes[0].children.map((node) => node.id), ['group-1', 'node-3']);
  assert.equal(canonicalDeck.groupCanonicalNodes(deck, 'slide-1', 'parent-1', ['node-1'], group), null);
  assert.equal(canonicalDeck.groupCanonicalNodes(deck, 'slide-1', 'missing', ['node-1', 'node-2'], group), null);
  assert.equal(canonicalDeck.groupCanonicalNodes(deck, 'slide-1', 'parent-1', ['node-1', 'node-2'], {
    id: 'node-1',
    children: [{ id: 'node-1' }, { id: 'node-2' }]
  }), null);
});

test('ungroupCanonicalNodes replaces multiple top-level groups with their imported children', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [
        { id: 'before' },
        { id: 'group-1', children: [{ id: 'node-1' }, { id: 'node-2' }] },
        { id: 'between' },
        { id: 'group-2', children: [{ id: 'node-3' }, { id: 'node-4' }] },
        { id: 'after' }
      ]
    }]
  });

  const ungroupedDeck = canonicalDeck.ungroupCanonicalNodes(sourceDeck, 'slide-1', [
    {
      groupId: 'group-1',
      children: [{ id: 'node-1', layout: { x: 10 } }, { id: 'node-2', layout: { x: 20 } }]
    },
    {
      groupId: 'group-2',
      children: [{ id: 'node-3' }, { id: 'node-4' }]
    }
  ]);

  assert.deepEqual(
    ungroupedDeck.slides[0].nodes.map((node) => node.id),
    ['before', 'node-1', 'node-2', 'between', 'node-3', 'node-4', 'after']
  );
  assert.equal(ungroupedDeck.slides[0].nodes[1].layout.x, 10);
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), [
    'before', 'group-1', 'between', 'group-2', 'after'
  ]);
});

test('ungroupCanonicalNodes preserves a nested parent and rejects mismatched children', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'parent-1',
        children: [
          { id: 'before' },
          { id: 'group-1', children: [{ id: 'node-1' }, { id: 'node-2' }] },
          { id: 'after' }
        ]
      }]
    }]
  });

  const ungroupedDeck = canonicalDeck.ungroupCanonicalNodes(sourceDeck, 'slide-1', [{
    groupId: 'group-1',
    parentNodeId: 'parent-1',
    children: [{ id: 'node-1' }, { id: 'node-2' }]
  }]);

  assert.deepEqual(ungroupedDeck.slides[0].nodes[0].children.map((node) => node.id), [
    'before', 'node-1', 'node-2', 'after'
  ]);
  assert.equal(canonicalDeck.ungroupCanonicalNodes(sourceDeck, 'slide-1', [{
    groupId: 'group-1',
    parentNodeId: 'wrong-parent',
    children: [{ id: 'node-1' }, { id: 'node-2' }]
  }]), null);
  assert.equal(canonicalDeck.ungroupCanonicalNodes(sourceDeck, 'slide-1', [{
    groupId: 'group-1',
    children: [{ id: 'node-2' }, { id: 'node-1' }]
  }]), null);
});

test('removeCanonicalNodes immutably removes top-level and nested nodes by id', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        children: [{ id: 'child-1' }, { id: 'child-2' }]
      }, { id: 'node-2' }]
    }]
  });

  const updatedDeck = canonicalDeck.removeCanonicalNodes(sourceDeck, ['node-2', 'child-1']);

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.deepEqual(sourceDeck.slides[0].nodes.map((node) => node.id), ['node-1', 'node-2']);
  assert.deepEqual(sourceDeck.slides[0].nodes[0].children.map((node) => node.id), ['child-1', 'child-2']);
  assert.deepEqual(updatedDeck.slides[0].nodes.map((node) => node.id), ['node-1']);
  assert.deepEqual(updatedDeck.slides[0].nodes[0].children.map((node) => node.id), ['child-2']);
});

test('removeCanonicalNodes returns null for no-op or invalid node ids', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
  });

  assert.equal(canonicalDeck.removeCanonicalNodes(deck, ['missing']), null);
  assert.equal(canonicalDeck.removeCanonicalNodes(deck, []), null);
  assert.equal(canonicalDeck.removeCanonicalNodes(null, ['node-1']), null);
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

test('updateCanonicalNodeLayout immutably updates nested node positions by id', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        layout: { mode: 'absolute', x: 10, y: 20 },
        children: [{
          id: 'child-1',
          layout: { mode: 'absolute', x: 5, y: 6 }
        }]
      }]
    }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalNodeLayout(sourceDeck, [
    { id: 'node-1', layout: { x: 120, y: 80 } },
    { id: 'child-1', layout: { x: 30, y: 40 } }
  ]);

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.equal(sourceDeck.slides[0].nodes[0].layout.x, 10);
  assert.equal(sourceDeck.slides[0].nodes[0].children[0].layout.x, 5);
  assert.equal(updatedDeck.slides[0].nodes[0].layout.x, 120);
  assert.equal(updatedDeck.slides[0].nodes[0].layout.y, 80);
  assert.equal(updatedDeck.slides[0].nodes[0].children[0].layout.x, 30);
  assert.equal(updatedDeck.slides[0].nodes[0].children[0].layout.y, 40);
});

test('updateCanonicalNodeLayout returns null for no-op or invalid layout updates', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', layout: { x: 10, y: 20 } }]
    }]
  });

  assert.equal(canonicalDeck.updateCanonicalNodeLayout(deck, [
    { id: 'node-1', layout: { x: 10 } }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeLayout(deck, [
    { id: 'missing', layout: { x: 30 } }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeLayout(deck, [
    { id: 'node-1', layout: { x: '30px' } }
  ]), null);
});

test('updateCanonicalNodeText immutably replaces source HTML and children after text edits', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        text: 'Before',
        html: '<div>Before</div>',
        children: [{ id: 'child-1', text: 'Nested' }]
      }]
    }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalNodeText(sourceDeck, [{
    id: 'node-1',
    text: 'After'
  }]);

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.equal(sourceDeck.slides[0].nodes[0].text, 'Before');
  assert.equal(sourceDeck.slides[0].nodes[0].html, '<div>Before</div>');
  assert.equal(sourceDeck.slides[0].nodes[0].children.length, 1);
  assert.equal(updatedDeck.slides[0].nodes[0].text, 'After');
  assert.equal(updatedDeck.slides[0].nodes[0].html, '');
  assert.deepEqual(updatedDeck.slides[0].nodes[0].children, []);
});

test('updateCanonicalNodeText returns null for no-op or invalid text updates', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Same' }]
    }]
  });

  assert.equal(canonicalDeck.updateCanonicalNodeText(deck, [
    { id: 'node-1', text: 'Same' }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeText(deck, [
    { id: 'missing', text: 'New' }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeText(deck, [
    { id: 'node-1', text: 42 }
  ]), null);
});

test('updateCanonicalNodeAttributes immutably updates nested source attributes', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        html: '<img src="before.png">',
        attributes: { src: 'before.png', alt: 'Preview' },
        children: [{
          id: 'child-1',
          attributes: { src: 'child-before.png' }
        }]
      }]
    }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalNodeAttributes(sourceDeck, [
    { id: 'node-1', attributes: { src: 'after.png' } },
    { id: 'child-1', attributes: { src: 'child-after.png' } }
  ]);

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.equal(sourceDeck.slides[0].nodes[0].attributes.src, 'before.png');
  assert.equal(sourceDeck.slides[0].nodes[0].children[0].attributes.src, 'child-before.png');
  assert.equal(updatedDeck.slides[0].nodes[0].attributes.src, 'after.png');
  assert.equal(updatedDeck.slides[0].nodes[0].attributes.alt, 'Preview');
  assert.equal(updatedDeck.slides[0].nodes[0].children[0].attributes.src, 'child-after.png');
});

test('updateCanonicalNodeAttributes returns null for no-op or invalid attribute updates', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', attributes: { src: 'same.png' } }]
    }]
  });

  assert.equal(canonicalDeck.updateCanonicalNodeAttributes(deck, [
    { id: 'node-1', attributes: { src: 'same.png' } }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeAttributes(deck, [
    { id: 'missing', attributes: { src: 'new.png' } }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeAttributes(deck, [
    { id: 'node-1', attributes: null }
  ]), null);
});

test('updateCanonicalNodeStyle immutably upserts CSS declarations on nested nodes', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'node-1',
        style: 'color: red; background: linear-gradient(red, blue);',
        children: [{ id: 'child-1', style: 'border-width: 1px;' }]
      }]
    }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalNodeStyle(sourceDeck, [
    { id: 'node-1', property: 'color', value: '#fff' },
    { id: 'child-1', property: 'border-width', value: '4px' }
  ]);

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.equal(sourceDeck.slides[0].nodes[0].style, 'color: red; background: linear-gradient(red, blue);');
  assert.equal(updatedDeck.slides[0].nodes[0].style, 'color: #fff; background: linear-gradient(red, blue);');
  assert.equal(updatedDeck.slides[0].nodes[0].children[0].style, 'border-width: 4px;');
});

test('updateCanonicalNodeStyle returns null for no-op or invalid style updates', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', style: 'color: red;' }]
    }]
  });

  assert.equal(canonicalDeck.updateCanonicalNodeStyle(deck, [
    { id: 'node-1', property: 'color', value: 'red' }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeStyle(deck, [
    { id: 'missing', property: 'color', value: 'blue' }
  ]), null);
  assert.equal(canonicalDeck.updateCanonicalNodeStyle(deck, [
    { id: 'node-1', property: '', value: 'blue' }
  ]), null);
});

test('updateCanonicalSlideBackground immutably updates selected slide backgrounds', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      layout: { background: { color: '#ffffff', style: 'white' } }
    }, {
      id: 'slide-2',
      layout: { background: { color: '#000000', style: 'black' } }
    }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalSlideBackground(
    sourceDeck,
    ['slide-1', 'slide-2'],
    'linear-gradient(red, blue)'
  );

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.equal(sourceDeck.slides[0].layout.background.style, 'white');
  assert.equal(updatedDeck.slides[0].layout.background.style, 'linear-gradient(red, blue)');
  assert.equal(updatedDeck.slides[1].layout.background.style, 'linear-gradient(red, blue)');
  assert.equal(updatedDeck.slides[0].layout.background.color, '#ffffff');
});

test('updateCanonicalSlideBackground returns null for no-op or unknown slide ids', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      layout: { background: { style: 'white' } }
    }]
  });

  assert.equal(canonicalDeck.updateCanonicalSlideBackground(deck, ['slide-1'], 'white'), null);
  assert.equal(canonicalDeck.updateCanonicalSlideBackground(deck, ['missing'], 'black'), null);
  assert.equal(canonicalDeck.updateCanonicalSlideBackground(deck, [], 'black'), null);
});
