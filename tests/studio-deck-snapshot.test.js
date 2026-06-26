const test = require('node:test');
const assert = require('node:assert/strict');

const deckModel = require('../shared/deck-model.js');
const deckSnapshot = require('../shared/studio-deck-snapshot.js');

test('buildDeckSnapshotFromCanonicalDeck falls back to the first slide when activeSlideId is empty', () => {
  const snapshot = deckModel.buildDeckSnapshotFromCanonicalDeck({
    slides: [
      { id: 'slide-1', title: 'Intro', nodes: [{ id: 'node-1' }] },
      { id: 'slide-2', title: 'Agenda', nodes: [{ id: 'node-2' }] }
    ]
  }, {
    activeSlideId: ''
  });

  assert.deepEqual(snapshot, {
    activeSlideId: 'slide-1',
    activeSlideIndex: 0,
    slides: [
      {
        id: 'slide-1',
        index: 0,
        title: 'Intro',
        backgroundLabel: 'Default',
        elementCount: 1
      },
      {
        id: 'slide-2',
        index: 1,
        title: 'Agenda',
        backgroundLabel: 'Default',
        elementCount: 1
      }
    ]
  });
});

test('buildStudioDeckSnapshot prefers the canonical deck snapshot when available', () => {
  const doc = { label: 'doc' };
  const result = deckSnapshot.buildStudioDeckSnapshot(doc, {
    buildCanonicalDeck() {
      return {
        slides: [
          { id: 'slide-1', title: 'Intro', nodes: [{ id: 'node-1' }] },
          { id: 'slide-2', title: 'Agenda', nodes: [{ id: 'node-2' }, { id: 'node-3' }] }
        ]
      };
    },
    buildDomSnapshot() {
      return {
        activeSlideId: 'dom-slide',
        activeSlideIndex: 9,
        slides: [{ id: 'dom-slide', index: 9, title: 'DOM' }]
      };
    },
    getActiveSlide() {
      return { id: 'active-slide-el' };
    },
    getActiveSlideId() {
      return '';
    }
  });

  assert.deepEqual(result, {
    activeSlideId: 'slide-1',
    activeSlideIndex: 0,
    slides: [
      {
        id: 'slide-1',
        index: 0,
        title: 'Intro',
        backgroundLabel: 'Default',
        elementCount: 1
      },
      {
        id: 'slide-2',
        index: 1,
        title: 'Agenda',
        backgroundLabel: 'Default',
        elementCount: 2
      }
    ]
  });
});

test('buildStudioDeckSnapshot merges live layer snapshots onto canonical slides when requested', () => {
  const doc = { label: 'doc' };
  const slideElsById = new Map([
    ['slide-1', { id: 'slide-el-1' }],
    ['slide-2', { id: 'slide-el-2' }]
  ]);

  const result = deckSnapshot.buildStudioDeckSnapshot(doc, {
    includeLayers: true,
    buildCanonicalDeck() {
      return {
        slides: [
          { id: 'slide-1', title: 'Intro', nodes: [{ id: 'node-1' }] },
          { id: 'slide-2', title: 'Agenda', nodes: [{ id: 'node-2' }] }
        ]
      };
    },
    getActiveSlide() {
      return { id: 'active-slide-el' };
    },
    getActiveSlideId() {
      return 'slide-2';
    },
    getSlideById(slideId) {
      return slideElsById.get(slideId) || null;
    },
    buildSlideLayerSnapshot(slideEl, slideSnapshot, nextDoc) {
      return [`layers-for:${slideEl.id}:${slideSnapshot.id}:${nextDoc.label}`];
    }
  });

  assert.deepEqual(result, {
    activeSlideId: 'slide-2',
    activeSlideIndex: 1,
    slides: [
      {
        id: 'slide-1',
        index: 0,
        title: 'Intro',
        backgroundLabel: 'Default',
        elementCount: 1,
        elements: ['layers-for:slide-el-1:slide-1:doc']
      },
      {
        id: 'slide-2',
        index: 1,
        title: 'Agenda',
        backgroundLabel: 'Default',
        elementCount: 1,
        elements: ['layers-for:slide-el-2:slide-2:doc']
      }
    ]
  });
});

test('buildStudioDeckSnapshot preserves canonical layer snapshots when live slide elements are unavailable', () => {
  const result = deckSnapshot.buildStudioDeckSnapshot(null, {
    includeLayers: true,
    buildCanonicalDeck() {
      return {
        slides: [
          {
            id: 'slide-1',
            title: 'Intro',
            nodes: [
              {
                id: 'node-1',
                type: 'heading',
                text: 'Welcome',
                layout: { zIndex: 4 },
                visibility: { hidden: false, locked: false }
              },
              {
                id: 'node-2',
                type: 'image',
                attributes: { src: '/assets/diagram.png' },
                layout: { zIndex: 2 },
                visibility: { hidden: true, locked: true }
              }
            ]
          }
        ]
      };
    },
    getActiveSlide() {
      return null;
    },
    getActiveSlideId() {
      return '';
    }
  });

  assert.deepEqual(result, {
    activeSlideId: 'slide-1',
    activeSlideIndex: 0,
    slides: [
      {
        id: 'slide-1',
        index: 0,
        title: 'Intro',
        backgroundLabel: 'Default',
        elementCount: 2,
        elements: [
          {
            id: 'node-1',
            typeIcon: 'title',
            displayName: 'Heading: "Welcome"',
            zIndex: '4',
            isLocked: false,
            isHidden: false,
            isSelected: false
          },
          {
            id: 'node-2',
            typeIcon: 'image',
            displayName: 'Image: "diagram.png"',
            zIndex: '2',
            isLocked: true,
            isHidden: true,
            isSelected: false
          }
        ]
      }
    ]
  });
});

test('buildStudioDeckSnapshot falls back to the DOM snapshot when the canonical deck is malformed', () => {
  const doc = { label: 'doc' };
  const result = deckSnapshot.buildStudioDeckSnapshot(doc, {
    buildCanonicalDeck() {
      return {
        metadata: {
          title: 'Broken Deck'
        }
      };
    },
    buildDomSnapshot(nextDoc) {
      return {
        activeSlideId: `dom-slide:${nextDoc.label}`,
        activeSlideIndex: 2,
        slides: [
          {
            id: 'dom-slide',
            index: 2,
            title: 'DOM Snapshot'
          }
        ]
      };
    }
  });

  assert.deepEqual(result, {
    activeSlideId: 'dom-slide:doc',
    activeSlideIndex: 2,
    slides: [
      {
        id: 'dom-slide',
        index: 2,
        title: 'DOM Snapshot'
      }
    ]
  });
});
