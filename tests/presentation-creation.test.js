const test = require('node:test');
const assert = require('node:assert/strict');

const canonicalDeck = require('../shared/canonical-deck.js');
const presentationCreation = require('../shared/presentation-creation.js');

test('slugifyPresentationTitle creates safe stable presentation folder names', () => {
  assert.equal(
    presentationCreation.slugifyPresentationTitle('  Research: Café / 2026!  '),
    'research-cafe-2026'
  );
  assert.equal(presentationCreation.slugifyPresentationTitle('!!!'), 'untitled-deck');
  assert.equal(
    presentationCreation.createUniquePresentationSlug('Research', ['research', 'research-2']),
    'research-3'
  );
});

test('buildBlankPresentationArtifacts creates a canonical editable deck and rendered HTML', () => {
  const artifacts = presentationCreation.buildBlankPresentationArtifacts({
    title: 'Team Kickoff',
    existingSlugs: ['team-kickoff']
  });

  assert.equal(artifacts.folder, 'team-kickoff-2');
  assert.equal(artifacts.htmlPath, 'presentations/team-kickoff-2/index.html');
  assert.equal(artifacts.metadataPath, 'presentations/team-kickoff-2/presentation.json');
  assert.equal(canonicalDeck.isCanonicalDeck(artifacts.canonicalDeck), true);
  assert.equal(artifacts.canonicalDeck.slides.length, 1);
  assert.equal(artifacts.canonicalDeck.slides[0].nodes[0].text, 'Team Kickoff');
  assert.match(artifacts.html, /Team Kickoff/);
  assert.match(artifacts.html, /Double-click text to edit this slide/);
  assert.match(artifacts.html, /<script/);
  assert.match(artifacts.html, /studioFrame/);
  assert.equal(artifacts.metadata.canonicalDeck, artifacts.canonicalDeck);
  assert.deepEqual(artifacts.libraryEntry.tags, ['Draft']);
});

test('createBlankCanonicalDeck preserves explicit source and presentation metadata', () => {
  const deck = presentationCreation.createBlankCanonicalDeck({
    id: 'demo-deck',
    title: 'Demo Deck',
    sourcePath: 'presentations/demo-deck/index.html',
    subtitle: 'A subtitle',
    tags: ['Demo']
  });

  assert.equal(deck.metadata.id, 'demo-deck');
  assert.equal(deck.metadata.sourcePath, 'presentations/demo-deck/index.html');
  assert.equal(deck.metadata.subtitle, 'A subtitle');
  assert.deepEqual(deck.metadata.tags, ['Demo']);
  assert.equal(deck.layout.size.width, 1920);
  assert.equal(deck.layout.size.height, 1080);
  assert.equal(deck.source.bodyInlineScripts.length, 1);
});
