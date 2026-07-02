const test = require('node:test');
const assert = require('node:assert/strict');

const deckPersistence = require('../shared/deck-persistence.js');

test('normalizePersistedDeckPlaybackState upgrades legacy activeSlideId values to activeSlideIds', () => {
  assert.deepEqual(
    deckPersistence.normalizePersistedDeckPlaybackState({
      activeSlideId: 'slide-2',
      slideCounterText: '2 / 5'
    }),
    {
      activeSlideIds: ['slide-2'],
      slideCounterText: '2 / 5'
    }
  );
});

test('resolvePersistedDeckActiveSlideId returns the first normalized active slide id and tolerates missing playback state', () => {
  assert.equal(
    deckPersistence.resolvePersistedDeckActiveSlideId({
      activeSlideIds: ['slide-2', 'slide-3'],
      slideCounterText: '2 / 5'
    }),
    'slide-2'
  );

  assert.equal(
    deckPersistence.resolvePersistedDeckActiveSlideId({
      activeSlideId: 'slide-legacy'
    }),
    'slide-legacy'
  );

  assert.equal(deckPersistence.resolvePersistedDeckActiveSlideId(null), '');
});

test('restorePersistedDeckPlaybackState accepts legacy activeSlideId values', () => {
  const slideNumNode = { textContent: '' };
  const slides = [
    {
      id: 'slide-1',
      classList: {
        _values: new Set(['slide', 'slide-active']),
        add(value) {
          this._values.add(value);
        },
        remove(value) {
          this._values.delete(value);
        },
        contains(value) {
          return this._values.has(value);
        }
      }
    },
    {
      id: 'slide-2',
      classList: {
        _values: new Set(['slide']),
        add(value) {
          this._values.add(value);
        },
        remove(value) {
          this._values.delete(value);
        },
        contains(value) {
          return this._values.has(value);
        }
      }
    }
  ];
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.slide[data-slide-id]');
      return slides;
    },
    querySelector(selector) {
      if (selector === '#slideNum') {
        return slideNumNode;
      }
      const match = selector.match(/\.slide\[data-slide-id="([^"]+)"\]/);
      if (!match) {
        return null;
      }
      return slides.find((slide) => slide.id === match[1]) || null;
    }
  };

  deckPersistence.restorePersistedDeckPlaybackState(root, {
    activeSlideId: 'slide-2',
    slideCounterText: '2 / 2'
  });

  assert.equal(slides[0].classList.contains('slide-active'), false);
  assert.equal(slides[1].classList.contains('slide-active'), true);
  assert.equal(slideNumNode.textContent, '2 / 2');
});
