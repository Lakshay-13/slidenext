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

test('createCanonicalDeck normalizes the legacy freeform layout alias to absolute', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    layout: { mode: 'freeform' },
    slides: [{
      layout: { mode: 'freeform' },
      nodes: [{ id: 'node-1', layout: { mode: 'freeform', x: 40, y: 60 } }]
    }]
  });

  assert.equal(deck.layout.mode, 'absolute');
  assert.equal(deck.slides[0].layout.mode, 'absolute');
  assert.equal(deck.slides[0].nodes[0].layout.mode, 'absolute');
});

test('canonical deck validation fails closed for unsupported schema versions', () => {
  const unsupportedDeck = {
    kind: 'slidenext.deck',
    schemaVersion: 2,
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  assert.equal(canonicalDeck.isCanonicalDeck(unsupportedDeck), false);
  const normalizedDeck = canonicalDeck.createCanonicalDeck(unsupportedDeck);
  assert.equal(normalizedDeck.schemaVersion, canonicalDeck.DECK_SCHEMA_VERSION);
  assert.equal(canonicalDeck.isCanonicalDeck(normalizedDeck), true);
});

test('createCanonicalNode preserves an explicit asset reference without requiring one', () => {
  const node = canonicalDeck.createCanonicalNode({
    id: 'image-1',
    assetId: ' asset-1 ',
    backgroundAssetId: ' background-1 '
  });
  const legacyNode = canonicalDeck.createCanonicalNode({ id: 'text-1' });

  assert.equal(node.assetId, 'asset-1');
  assert.equal(node.backgroundAssetId, 'background-1');
  assert.equal(Object.prototype.hasOwnProperty.call(legacyNode, 'assetId'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(legacyNode, 'backgroundAssetId'), false);
});

test('createCanonicalNode preserves optional rendered bounds without adding them to legacy nodes', () => {
  const node = canonicalDeck.createCanonicalNode({
    id: 'flow-node',
    layout: {
      mode: 'flow',
      bounds: { x: 10, y: 20, width: 300, height: 80 }
    }
  });
  const legacyNode = canonicalDeck.createCanonicalNode({ id: 'legacy-node' });

  assert.deepEqual(node.layout.bounds, { x: 10, y: 20, width: 300, height: 80 });
  assert.equal(Object.prototype.hasOwnProperty.call(legacyNode.layout, 'bounds'), false);
});

test('findCanonicalSlideById resolves a normalized slide from canonical or legacy-shaped input', () => {
  const canonical = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Intro' }]
  });

  assert.equal(canonicalDeck.findCanonicalSlideById(canonical, ' slide-1 '), canonical.slides[0]);
  assert.equal(
    canonicalDeck.findCanonicalSlideById({ slides: [{ id: 'slide-2', title: 'Body' }] }, 'slide-2').title,
    'Body'
  );
  assert.equal(canonicalDeck.findCanonicalSlideById(canonical, 'missing'), null);
});

test('createCanonicalSlide preserves an explicit background asset reference without requiring one', () => {
  const slide = canonicalDeck.createCanonicalSlide({
    id: 'slide-1',
    layout: { background: { assetId: ' background-1 ' } }
  });
  const legacySlide = canonicalDeck.createCanonicalSlide({ id: 'slide-2' });

  assert.equal(slide.layout.background.assetId, 'background-1');
  assert.equal(Object.prototype.hasOwnProperty.call(legacySlide.layout.background, 'assetId'), false);
});

test('createCanonicalDeck preserves legacy shape and normalizes master slide ids', () => {
  const legacyDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  assert.equal(Object.prototype.hasOwnProperty.call(legacyDeck, 'masterSlides'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(legacyDeck.slides[0], 'masterSlideId'), false);

  const deck = canonicalDeck.createCanonicalDeck({
    masterSlides: [
      { id: 'master-1', name: 'Title', slide: { nodes: [{ id: 'logo' }] } },
      { id: 'master-1', name: 'Body', slide: { nodes: [{ id: 'logo' }] } }
    ],
    slides: [
      { id: 'slide-1', masterSlideId: 'master-1' },
      { id: 'slide-2', masterSlideId: 'master-1' }
    ]
  });

  assert.deepEqual(deck.masterSlides.map((master) => master.id), ['master-1', 'master-1-2']);
  assert.deepEqual(deck.masterSlides.map((master) => master.slide.nodes[0].id), ['logo', 'logo']);
  assert.deepEqual(deck.slides.map((slide) => slide.masterSlideId), ['master-1', 'master-1']);
  assert.equal(canonicalDeck.isCanonicalDeck(deck), true);
});

test('canonical master slide operations are immutable and keep references valid', () => {
  const source = canonicalDeck.createCanonicalDeck({
    masterSlides: [{ id: 'master-a', name: 'Title' }],
    slides: [{ id: 'slide-1', masterSlideId: 'master-a' }, { id: 'slide-2' }]
  });
  const expanded = canonicalDeck.insertCanonicalMasterSlide(source, {
    id: 'master-b',
    name: 'Body'
  }, 1);
  const assigned = canonicalDeck.updateCanonicalSlideMasterSlide(expanded, 'slide-2', 'master-b');
  const cleared = canonicalDeck.updateCanonicalSlideMasterSlide(assigned, 'slide-2');
  const removed = canonicalDeck.removeCanonicalMasterSlide(assigned, 'master-a');

  assert.deepEqual(source.masterSlides.map((master) => master.id), ['master-a']);
  assert.deepEqual(expanded.masterSlides.map((master) => master.id), ['master-a', 'master-b']);
  assert.deepEqual(assigned.slides.map((slide) => slide.masterSlideId || ''), ['master-a', 'master-b']);
  assert.deepEqual(cleared.slides.map((slide) => slide.masterSlideId || ''), ['master-a', '']);
  assert.deepEqual(removed.masterSlides.map((master) => master.id), ['master-b']);
  assert.deepEqual(removed.slides.map((slide) => slide.masterSlideId || ''), ['', 'master-b']);
  assert.equal(canonicalDeck.updateCanonicalSlideMasterSlide(source, 'slide-2', 'missing'), null);
  assert.equal(canonicalDeck.removeCanonicalMasterSlide(source, 'missing'), null);
  assert.equal(canonicalDeck.isCanonicalDeck(removed), true);
});

test('saveCanonicalMasterSlideFromSlideId captures a slide without mutating the deck', () => {
  const source = canonicalDeck.createCanonicalDeck({
    slides: [{ id: 'slide-1', title: 'Opening', nodes: [{ id: 'logo', text: 'Hello' }] }]
  });

  const saved = canonicalDeck.saveCanonicalMasterSlideFromSlideId(
    source,
    'slide-1',
    { id: 'opening-master', name: 'Opening Master' }
  );

  assert.equal(saved.masterSlides[0].id, 'opening-master');
  assert.equal(saved.masterSlides[0].name, 'Opening Master');
  assert.equal(saved.masterSlides[0].slide.title, 'Opening');
  assert.equal(saved.masterSlides[0].slide.nodes[0].text, 'Hello');
  assert.equal(Object.prototype.hasOwnProperty.call(source, 'masterSlides'), false);
  assert.equal(canonicalDeck.saveCanonicalMasterSlideFromSlideId(source, 'missing'), null);
});

test('createCanonicalDeck normalizes reusable block ids and nested node ids', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    blocks: [
      { id: 'block-1', nodes: [{ id: 'node-1' }, { id: 'node-1' }] },
      { id: 'block-1', name: 'Stats' }
    ],
    slides: [{ id: 'slide-1', nodes: [{ id: 'node-1' }] }]
  });

  assert.deepEqual(deck.blocks.map((block) => block.id), ['block-1', 'block-1-2']);
  assert.deepEqual(deck.blocks[0].nodes.map((node) => node.id), ['node-1', 'node-1-2']);
  assert.equal(deck.slides[0].nodes[0].id, 'node-1');
  assert.equal(canonicalDeck.isCanonicalDeck(deck), true);
});

test('canonical block operations are immutable and preserve block order', () => {
  const source = canonicalDeck.createCanonicalDeck({
    blocks: [{ id: 'block-1', name: 'Hero' }],
    slides: [{ id: 'slide-1' }]
  });
  const expanded = canonicalDeck.insertCanonicalBlock(source, {
    id: 'block-2',
    name: 'Stats',
    nodes: [{ id: 'node-2', type: 'text' }]
  }, 1);
  const reduced = canonicalDeck.removeCanonicalBlock(expanded, 'block-1');

  assert.deepEqual(expanded.blocks.map((block) => block.id), ['block-1', 'block-2']);
  assert.equal(expanded.blocks[1].nodes[0].type, 'text');
  assert.deepEqual(source.blocks.map((block) => block.id), ['block-1']);
  assert.deepEqual(reduced.blocks.map((block) => block.id), ['block-2']);
  assert.equal(canonicalDeck.appendCanonicalBlock(source, null), null);
  assert.equal(canonicalDeck.removeCanonicalBlock(source, 'missing'), null);
});

test('canonical slide templates normalize ids and instantiate immutable slides', () => {
  const legacyDeck = canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] });
  assert.equal(Object.prototype.hasOwnProperty.call(legacyDeck, 'templates'), false);

  const source = canonicalDeck.createCanonicalDeck({
    templates: [
      {
        id: 'template-1',
        name: 'Hero',
        slide: {
          id: 'hero-slide',
          section: 'Opening',
          nodes: [{ id: 'title', tagName: 'h1', text: 'Hero' }]
        }
      },
      { id: 'template-1', name: 'Stats', slide: { nodes: [{ id: 'metric' }] } }
    ],
    slides: [{ id: 'slide-1', nodes: [{ id: 'title' }] }]
  });
  const inserted = canonicalDeck.insertCanonicalTemplateSlide(
    source,
    'template-1',
    1,
    { id: 'slide-2', title: 'Inserted Hero', section: 'Body' }
  );
  const removed = canonicalDeck.removeCanonicalTemplate(source, 'template-1');

  assert.deepEqual(source.templates.map((template) => template.id), ['template-1', 'template-1-2']);
  assert.equal(source.templates[0].slide.nodes[0].id, 'title');
  assert.deepEqual(inserted.slides.map((slide) => slide.id), ['slide-1', 'slide-2']);
  assert.equal(inserted.slides[1].title, 'Inserted Hero');
  assert.equal(inserted.slides[1].section, 'Body');
  assert.equal(inserted.slides[1].nodes[0].id, 'title-2');
  assert.deepEqual(removed.templates.map((template) => template.id), ['template-1-2']);
  assert.equal(canonicalDeck.insertCanonicalTemplateSlide(source, 'missing', 0), null);
  assert.equal(canonicalDeck.appendCanonicalTemplate(source, null), null);
  assert.equal(canonicalDeck.isCanonicalDeck(inserted), true);
});

test('saveCanonicalTemplateFromSlideId captures a slide without mutating the deck', () => {
  const source = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      title: 'Opening',
      nodes: [{ id: 'title', text: 'Hello' }]
    }]
  });

  const saved = canonicalDeck.saveCanonicalTemplateFromSlideId(
    source,
    'slide-1',
    { id: 'opening', name: 'Opening Template' }
  );

  assert.equal(saved.templates[0].id, 'opening');
  assert.equal(saved.templates[0].name, 'Opening Template');
  assert.equal(saved.templates[0].slide.title, 'Opening');
  assert.equal(saved.templates[0].slide.nodes[0].text, 'Hello');
  assert.equal(Object.prototype.hasOwnProperty.call(source, 'templates'), false);
  assert.equal(canonicalDeck.saveCanonicalTemplateFromSlideId(source, 'missing'), null);
});

test('insertCanonicalBlockInstance clones block nodes with collision-free ids and offsets', () => {
  const source = canonicalDeck.createCanonicalDeck({
    blocks: [{
      id: 'hero',
      nodes: [{
        id: 'title',
        type: 'heading',
        layout: { mode: 'absolute', x: 10, y: 20 },
        children: [{ id: 'accent', type: 'shape' }]
      }]
    }],
    slides: [{ id: 'slide-1', nodes: [{ id: 'hero-title' }] }]
  });

  const first = canonicalDeck.insertCanonicalBlockInstance(source, 'slide-1', 'hero', {
    offsetX: 40,
    offsetY: 50
  });
  const second = canonicalDeck.insertCanonicalBlockInstance(first, 'slide-1', 'hero');
  const inserted = first.slides[0].nodes[1];
  const insertedAgain = second.slides[0].nodes[2];

  assert.equal(inserted.id, 'hero-title-2');
  assert.equal(inserted.children[0].id, 'hero-accent');
  assert.deepEqual([inserted.layout.x, inserted.layout.y], [50, 70]);
  assert.notEqual(insertedAgain.id, inserted.id);
  assert.deepEqual(source.slides[0].nodes.map((node) => node.id), ['hero-title']);
  assert.equal(first.blocks[0].nodes[0].id, 'title');
  assert.equal(canonicalDeck.insertCanonicalBlockInstance(source, 'missing', 'hero'), null);
  assert.equal(canonicalDeck.insertCanonicalBlockInstance(source, 'slide-1', 'missing'), null);
});

test('saveCanonicalBlockFromNodeIds captures selected top-level nodes without mutating the slide', () => {
  const source = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'before' }, { id: 'selected-1' }, { id: 'selected-2' }, { id: 'after' }]
    }]
  });
  const saved = canonicalDeck.saveCanonicalBlockFromNodeIds(
    source,
    'slide-1',
    ['selected-2', 'selected-1'],
    { id: 'metrics', name: 'Metrics Block' }
  );

  assert.equal(saved.blocks[0].id, 'metrics');
  assert.equal(saved.blocks[0].name, 'Metrics Block');
  assert.deepEqual(saved.blocks[0].nodes.map((node) => node.id), ['selected-1', 'selected-2']);
  assert.deepEqual(source.slides[0].nodes.map((node) => node.id), [
    'before', 'selected-1', 'selected-2', 'after'
  ]);
  assert.equal(canonicalDeck.saveCanonicalBlockFromNodeIds(source, 'slide-1', ['missing']), null);
});

test('createCanonicalDeck preserves optional slide sections without changing empty slide shape', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [
      { id: 'slide-1', section: 'Opening' },
      { id: 'slide-2' }
    ]
  });

  assert.equal(deck.slides[0].section, 'Opening');
  assert.equal(Object.prototype.hasOwnProperty.call(deck.slides[1], 'section'), false);
});

test('updateCanonicalSlideMetadata updates notes and sections immutably', () => {
  const source = canonicalDeck.createCanonicalDeck({
    slides: [
      { id: 'slide-1', notes: 'Before', section: 'Opening' },
      { id: 'slide-2', notes: 'Other', section: 'Body' }
    ]
  });

  const updated = canonicalDeck.updateCanonicalSlideMetadata(source, 'slide-1', {
    notes: 'After',
    section: ''
  });

  assert.equal(source.slides[0].notes, 'Before');
  assert.equal(source.slides[0].section, 'Opening');
  assert.equal(updated.slides[0].notes, 'After');
  assert.equal(Object.prototype.hasOwnProperty.call(updated.slides[0], 'section'), false);
  assert.deepEqual(updated.slides[1], source.slides[1]);
  assert.equal(canonicalDeck.updateCanonicalSlideMetadata(source, 'slide-1', {
    notes: 'Before'
  }), null);
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

test('mergeCanonicalDeckRebuildBaseline preserves deck-owned metadata while keeping rebuilt slides', () => {
  const rebuilt = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'asset-current', src: 'current.png' }],
    slides: [{ id: 'slide-current', nodes: [] }]
  });
  const baseline = canonicalDeck.createCanonicalDeck({
    assets: [
      { id: 'asset-current', src: 'current.png', name: 'Current asset' },
      { id: 'asset-library', src: 'library.png', name: 'Library asset' }
    ],
    blocks: [{ id: 'block-1', name: 'Reusable block', nodes: [] }],
    templates: [{ id: 'template-1', name: 'Reusable template', slide: { nodes: [] } }],
    masterSlides: [{ id: 'master-1', name: 'Reusable master', slide: { nodes: [] } }],
    notes: { deck: 'Speaker notes' },
    export: { pdf: { pageSize: 'wide' } },
    slides: [{ id: 'slide-before', nodes: [] }]
  });

  const merged = canonicalDeck.mergeCanonicalDeckRebuildBaseline(rebuilt, baseline);

  assert.equal(merged.slides[0].id, 'slide-current');
  assert.deepEqual(merged.assets.map((asset) => asset.id), ['asset-current', 'asset-library']);
  assert.deepEqual(merged.blocks.map((block) => block.id), ['block-1']);
  assert.deepEqual(merged.templates.map((template) => template.id), ['template-1']);
  assert.deepEqual(merged.masterSlides.map((master) => master.id), ['master-1']);
  assert.deepEqual(merged.notes, baseline.notes);
  assert.deepEqual(merged.export, baseline.export);
  assert.equal(rebuilt.slides[0].id, 'slide-current');
  assert.equal(Object.prototype.hasOwnProperty.call(rebuilt, 'blocks'), false);
});

test('canonical asset operations are immutable and protect referenced assets', () => {
  const source = canonicalDeck.createCanonicalDeck({
    assets: [
      { id: 'asset-a', name: 'Unused', src: 'unused.png' },
      { id: 'asset-b', name: 'Used', src: 'used.png' }
    ],
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'image-1', type: 'image', assetId: 'asset-b' }]
    }]
  });
  const inserted = canonicalDeck.insertCanonicalAsset(source, {
    id: 'asset-c',
    name: 'Inserted',
    src: 'inserted.png'
  }, 1);
  const updated = canonicalDeck.updateCanonicalAsset(inserted, 'asset-c', {
    id: 'ignored-change',
    name: 'Updated',
    src: 'updated.png'
  });
  const removed = canonicalDeck.removeCanonicalAsset(updated, 'asset-a');

  assert.deepEqual(source.assets.map((asset) => asset.id), ['asset-a', 'asset-b']);
  assert.deepEqual(inserted.assets.map((asset) => asset.id), ['asset-a', 'asset-c', 'asset-b']);
  assert.deepEqual(updated.assets.map((asset) => [asset.id, asset.name, asset.src]), [
    ['asset-a', 'Unused', 'unused.png'],
    ['asset-c', 'Updated', 'updated.png'],
    ['asset-b', 'Used', 'used.png']
  ]);
  assert.deepEqual(removed.assets.map((asset) => asset.id), ['asset-c', 'asset-b']);
  assert.equal(canonicalDeck.removeCanonicalAsset(updated, 'asset-b'), null);
  assert.equal(canonicalDeck.updateCanonicalAsset(source, 'missing', { name: 'Missing' }), null);
  assert.equal(canonicalDeck.updateCanonicalAsset(source, 'asset-a', { name: 'Unused' }), null);
  assert.equal(canonicalDeck.isCanonicalDeck(removed), true);
});

test('removeCanonicalAsset protects legacy node asset attributes', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    assets: [
      { id: 'image-asset', src: 'image.png' },
      { id: 'background-asset', src: 'background.png' }
    ],
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': ' image-asset ' }
      }, {
        id: 'panel-1',
        type: 'shape',
        attributes: { 'data-background-asset': 'background-asset' }
      }]
    }]
  });

  assert.equal(canonicalDeck.removeCanonicalAsset(deck, 'image-asset'), null);
  assert.equal(canonicalDeck.removeCanonicalAsset(deck, 'background-asset'), null);
});

test('updateCanonicalNodeAsset binds image nodes to canonical assets and can clear safely', () => {
  const source = canonicalDeck.createCanonicalDeck({
    assets: [{ id: 'hero', type: 'image', src: '/images/hero.png' }],
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'group-1',
        type: 'group',
        children: [{ id: 'image-1', type: 'image', tagName: 'img', attributes: { src: '/old.png' } }]
      }]
    }]
  });

  const bound = canonicalDeck.updateCanonicalNodeAsset(source, 'slide-1', 'image-1', 'hero');
  const cleared = canonicalDeck.updateCanonicalNodeAsset(bound, 'slide-1', 'image-1');

  assert.equal(source.slides[0].nodes[0].children[0].assetId, undefined);
  assert.equal(bound.slides[0].nodes[0].children[0].assetId, 'hero');
  assert.equal(bound.slides[0].nodes[0].children[0].attributes.src, '/images/hero.png');
  assert.equal(Object.prototype.hasOwnProperty.call(cleared.slides[0].nodes[0].children[0], 'assetId'), false);
  assert.equal(cleared.slides[0].nodes[0].children[0].attributes.src, '/images/hero.png');
  assert.equal(canonicalDeck.updateCanonicalNodeAsset(source, 'slide-1', 'image-1', 'missing'), null);
  assert.equal(canonicalDeck.updateCanonicalNodeAsset(source, 'slide-1', 'missing', 'hero'), null);
  assert.equal(canonicalDeck.isCanonicalDeck(cleared), true);
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

test('updateCanonicalThemeTokens immutably updates and removes valid CSS custom properties', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    theme: {
      tokens: {
        '--color-primary': '#7028d0',
        '--space-md': '16px'
      }
    },
    slides: [{ id: 'slide-1' }]
  });

  const updatedDeck = canonicalDeck.updateCanonicalThemeTokens(sourceDeck, {
    '--color-primary': '#10b981',
    '--font-heading': "'Geist', sans-serif",
    '--space-md': null
  });

  assert.ok(canonicalDeck.isCanonicalDeck(updatedDeck));
  assert.deepEqual(sourceDeck.theme.tokens, {
    '--color-primary': '#7028d0',
    '--space-md': '16px'
  });
  assert.deepEqual(updatedDeck.theme.tokens, {
    '--color-primary': '#10b981',
    '--font-heading': "'Geist', sans-serif"
  });
});

test('updateCanonicalThemeTokens ignores unsafe names and no-op values', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    theme: { tokens: { '--color-primary': '#7028d0' } },
    slides: [{ id: 'slide-1' }]
  });

  assert.equal(canonicalDeck.updateCanonicalThemeTokens(deck, {
    'color-primary': 'red',
    '--1invalid': 'red',
    '--color-primary': '#7028d0'
  }), null);
  assert.equal(canonicalDeck.updateCanonicalThemeTokens(deck, {
    '--missing-token': null
  }), null);
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

test('findCanonicalNodeById resolves nested slide nodes without exposing DOM state', () => {
  const deck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{
        id: 'group-1',
        children: [{ id: 'node-1', text: 'Nested' }]
      }]
    }]
  });

  assert.deepEqual(canonicalDeck.findCanonicalNodeById(deck, 'node-1'), {
    id: 'node-1',
    type: 'html',
    name: '',
    tagName: '',
    text: 'Nested',
    html: '',
    classes: [],
    attributes: {},
    style: '',
    layout: {
      mode: 'flow',
      x: null,
      y: null,
      width: null,
      height: null,
      zIndex: 0
    },
    visibility: {
      hidden: false,
      locked: false
    },
    children: []
  });
  assert.equal(canonicalDeck.findCanonicalNodeById(deck, 'missing-node'), null);
});
