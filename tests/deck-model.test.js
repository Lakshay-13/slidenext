const test = require('node:test');
const assert = require('node:assert/strict');

const deckModel = require('../shared/deck-model.js');

test('buildCanonicalLayerSnapshot assigns unique fallback ids across nested canonical nodes', () => {
  const snapshots = deckModel.buildCanonicalLayerSnapshot([
    {
      type: 'text',
      text: 'Intro'
    },
    {
      type: 'group',
      children: [
        {
          type: 'text',
          text: 'Agenda'
        },
        {
          type: 'text',
          text: 'Wrap-up'
        }
      ]
    }
  ]);

  assert.deepEqual(
    snapshots.map((snapshot) => snapshot.id),
    ['node-1', 'node-2', 'node-3', 'node-4']
  );
});

test('buildCanonicalLayerSnapshot skips explicit canonical node ids when generating fallbacks', () => {
  const snapshots = deckModel.buildCanonicalLayerSnapshot([
    {
      id: 'node-2',
      type: 'text',
      text: 'Explicit'
    },
    {
      type: 'group',
      children: [
        {
          type: 'text',
          text: 'Generated first'
        },
        {
          id: 'custom-node',
          type: 'text',
          text: 'Explicit custom'
        },
        {
          type: 'text',
          text: 'Generated second'
        }
      ]
    }
  ]);

  assert.deepEqual(
    snapshots.map((snapshot) => snapshot.id),
    ['node-2', 'node-1', 'node-3', 'custom-node', 'node-4']
  );
});
