const test = require('node:test');
const assert = require('node:assert/strict');

const deckReady = require('../shared/studio-deck-ready.js');

test('resolveStudioDeckReadyActionState enables deck actions only when a session and deck content are available', () => {
  assert.deepEqual(
    deckReady.resolveStudioDeckReadyActionState({
      doc: null,
      presentationUrl: '',
      persistedDeckStateWithContent: null,
      storedCanonicalDeck: null
    }),
    {
      hasDeckDocument: false,
      hasPresentationSession: false,
      hasPersistedDeckContent: false,
      hasStoredCanonicalDeck: false,
      hasDeckContent: false,
      canUseDeckActions: false,
      canLaunchPreview: false
    }
  );

  assert.deepEqual(
    deckReady.resolveStudioDeckReadyActionState({
      doc: null,
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      persistedDeckStateWithContent: { cleanHtml: '<html>persisted</html>' },
      storedCanonicalDeck: null
    }),
    {
      hasDeckDocument: false,
      hasPresentationSession: true,
      hasPersistedDeckContent: true,
      hasStoredCanonicalDeck: false,
      hasDeckContent: true,
      canUseDeckActions: true,
      canLaunchPreview: true
    }
  );
});

test('resolveStudioDeckReadyActionState treats a live deck document or stored canonical deck as usable deck content', () => {
  assert.equal(
    deckReady.resolveStudioDeckReadyActionState({
      doc: { documentElement: {} },
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      persistedDeckStateWithContent: null,
      storedCanonicalDeck: null
    }).canUseDeckActions,
    true
  );

  assert.equal(
    deckReady.resolveStudioDeckReadyActionState({
      doc: null,
      presentationUrl: '/presentations/onboarding-presentation/index.html',
      persistedDeckStateWithContent: null,
      storedCanonicalDeck: { kind: 'slidenext.deck', slides: [] }
    }).canUseDeckActions,
    true
  );
});
