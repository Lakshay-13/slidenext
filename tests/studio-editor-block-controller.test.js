const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const blockController = require('../shared/studio-editor-block-controller.js');

test('block controller saves the active selection and finalizes persistence hooks', () => {
  const sourceDeck = canonicalDeck.createCanonicalDeck({
    slides: [{
      id: 'slide-1',
      nodes: [{ id: 'node-1', text: 'Heading' }]
    }]
  });
  const calls = [];
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => sourceDeck,
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => ['node-1'],
    saveHistoryState(...args) {
      calls.push(['history', ...args]);
    },
    triggerAutoSave() {
      calls.push(['save']);
    },
    triggerAutoVersion(label) {
      calls.push(['version', label]);
    },
    onBlocksChanged(blocks, nextDeck) {
      calls.push(['blocks', blocks.map((block) => block.id), nextDeck]);
    }
  });

  const result = controller.saveSelection({ id: 'intro', name: 'Intro Block' });

  assert.equal(result.blocks[0].name, 'Intro Block');
  assert.deepEqual(sourceDeck.blocks, undefined);
  assert.equal(calls[0][0], 'history');
  assert.equal(calls[0][1], false);
  assert.equal(calls[0][2], null);
  assert.equal(calls[0][3], result);
  assert.deepEqual(calls.slice(1, 3), [['save'], ['version', 'Auto: Saved Block "Intro Block"']]);
  assert.deepEqual(calls[3][0], 'blocks');
  assert.deepEqual(calls[3][1], ['intro']);
});

test('block controller fails closed when selection or dependencies are unavailable', () => {
  const controller = blockController.createStudioEditorBlockController({
    canonicalDeckApi: canonicalDeck,
    getCanonicalDeck: () => canonicalDeck.createCanonicalDeck({ slides: [{ id: 'slide-1' }] }),
    getActiveSlideId: () => 'slide-1',
    getSelectedNodeIds: () => []
  });

  assert.equal(controller.saveSelection({ name: 'Empty' }), null);
  assert.equal(blockController.createStudioEditorBlockController().saveSelection(), null);
});
