const test = require('node:test');
const assert = require('node:assert/strict');
const layoutMode = require('../shared/studio-editor-layout-mode.js');

test('normalizeStudioLayoutMode keeps canonical modes and legacy freeform alias', () => {
  assert.equal(layoutMode.normalizeStudioLayoutMode('flow'), 'flow');
  assert.equal(layoutMode.normalizeStudioLayoutMode(' FREEFORM '), 'absolute');
  assert.equal(layoutMode.normalizeStudioLayoutMode('unsupported'), '');
});

test('resolveStudioCanonicalLayoutMode preserves the existing insertion precedence', () => {
  assert.equal(
    layoutMode.resolveStudioCanonicalLayoutMode({
      layout: { mode: 'flow' },
      slides: [{ id: 'slide-1', layout: { mode: 'flow' }, nodes: [] }]
    }, 'slide-1'),
    'flow'
  );
  assert.equal(
    layoutMode.resolveStudioCanonicalLayoutMode({
      layout: { mode: 'flow' },
      slides: [{
        id: 'slide-1',
        layout: { mode: 'flow' },
        nodes: [{ layout: { mode: 'freeform' } }]
      }]
    }, 'slide-1'),
    'absolute'
  );
  assert.equal(
    layoutMode.resolveStudioCanonicalLayoutMode({
      layout: { mode: 'absolute' },
      slides: [{ id: 'slide-1', layout: { mode: 'flow' }, nodes: [] }]
    }, 'slide-1'),
    'absolute'
  );
});

test('resolveStudioCanonicalLayoutMode supports an explicit fallback for unavailable decks', () => {
  assert.equal(
    layoutMode.resolveStudioCanonicalLayoutMode(null, 'slide-1', { fallbackMode: 'flow' }),
    'flow'
  );
  assert.equal(
    layoutMode.resolveStudioCanonicalLayoutMode(null, 'slide-1'),
    'absolute'
  );
});

test('resolveStudioCanonicalLayoutMode delegates slide lookup to the canonical deck API', () => {
  const calls = [];
  const resolvedSlide = { id: 'slide-1', layout: { mode: 'flow' }, nodes: [] };

  assert.equal(
    layoutMode.resolveStudioCanonicalLayoutMode({
      layout: { mode: 'flow' },
      slides: [resolvedSlide]
    }, 'slide-1', {
      canonicalDeckApi: {
        findCanonicalSlideById(deck, slideId) {
          calls.push([deck, slideId]);
          return resolvedSlide;
        }
      }
    }),
    'flow'
  );
  assert.deepEqual(calls, [[
    {
      layout: { mode: 'flow' },
      slides: [resolvedSlide]
    },
    'slide-1'
  ]]);
});
