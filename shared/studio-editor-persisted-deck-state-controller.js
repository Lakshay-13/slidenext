(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SlideNextStudioEditorPersistedDeckStateController = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function createStudioEditorPersistedDeckStateController(options = {}) {
    let deckHtml = Object.prototype.hasOwnProperty.call(options, 'initialDeckHtml')
      ? options.initialDeckHtml
      : '';
    let canonicalDeck = Object.prototype.hasOwnProperty.call(options, 'initialCanonicalDeck')
      ? options.initialCanonicalDeck
      : null;
    let playbackState = Object.prototype.hasOwnProperty.call(options, 'initialPlaybackState')
      ? options.initialPlaybackState
      : null;

    function getState() {
      return {
        deckHtml,
        canonicalDeck,
        playbackState
      };
    }

    function clear() {
      deckHtml = '';
      canonicalDeck = null;
      playbackState = null;
      return getState();
    }

    return {
      getState,
      getDeckHtml: () => deckHtml,
      getCanonicalDeck: () => canonicalDeck,
      getPlaybackState: () => playbackState,
      setDeckHtml(nextDeckHtml) {
        deckHtml = nextDeckHtml;
        return deckHtml;
      },
      setCanonicalDeck(nextCanonicalDeck) {
        canonicalDeck = nextCanonicalDeck;
        return canonicalDeck;
      },
      setPlaybackState(nextPlaybackState) {
        playbackState = nextPlaybackState;
        return playbackState;
      },
      clear
    };
  }

  return { createStudioEditorPersistedDeckStateController };
});
