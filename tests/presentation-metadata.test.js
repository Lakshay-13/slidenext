const test = require('node:test');
const assert = require('node:assert/strict');

const presentationMetadata = require('../shared/presentation-metadata.js');

test('derivePresentationMetadataPath maps presentation html files to presentation.json sidecars', () => {
  assert.equal(
    presentationMetadata.derivePresentationMetadataPath('presentations/onboarding-presentation/index.html'),
    'presentations/onboarding-presentation/presentation.json'
  );
  assert.equal(
    presentationMetadata.derivePresentationMetadataPath('/presentations/onboarding-presentation/index.html'),
    '/presentations/onboarding-presentation/presentation.json'
  );
  assert.equal(
    presentationMetadata.derivePresentationMetadataPath('presentations/onboarding-presentation/slides.html'),
    ''
  );
});

test('buildPresentationMetadataSeed derives stable metadata defaults from an html path', () => {
  assert.deepEqual(
    presentationMetadata.buildPresentationMetadataSeed('presentations/onboarding-presentation/index.html', 'Project Onboarding'),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      sourcePath: 'presentations/onboarding-presentation/index.html'
    }
  );
});

test('resolvePresentationCanonicalDeck normalizes valid canonical sidecars and rejects malformed ones', () => {
  assert.deepEqual(
    presentationMetadata.resolvePresentationCanonicalDeck({
      canonicalDeck: {
        metadata: {
          title: 'Project Onboarding'
        },
        slides: [
          {
            id: 'slide-1',
            nodes: []
          }
        ]
      }
    }),
    {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      metadata: {
        id: '',
        title: 'Project Onboarding',
        subtitle: '',
        description: '',
        icon: '',
        tags: [],
        sourcePath: ''
      },
      theme: {
        tokens: {},
        customCss: ''
      },
      layout: {
        mode: 'flow',
        size: {
          width: null,
          height: null,
          unit: 'px'
        },
        aspectRatio: ''
      },
      assets: [],
      slides: [
        {
          id: 'slide-1',
          name: '',
          title: 'Slide 1',
          notes: '',
          layout: {
            mode: 'flow',
            background: {
              color: '',
              image: '',
              className: '',
              style: ''
            }
          },
          nodes: [],
          source: {
            html: '',
            attributes: {}
          }
        }
      ],
      notes: {
        deck: ''
      },
      export: {
        html: {},
        pdf: {},
        pptx: {}
      },
      source: {
        html: '',
        headHtml: '',
        bodyHtml: '',
        bodyScaffoldHtml: '',
        htmlAttributes: {},
        bodyAttributes: {},
        headInlineScripts: [],
        bodyInlineScripts: []
      }
    }
  );

  assert.equal(
    presentationMetadata.resolvePresentationCanonicalDeck({
      canonicalDeck: {
        metadata: {
          title: 'Broken Deck'
        }
      }
    }),
    null
  );
});

test('resolvePresentationCanonicalDeck fills missing canonical metadata fields from surrounding presentation metadata', () => {
  const canonicalDeck = presentationMetadata.resolvePresentationCanonicalDeck({
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    subtitle: 'Getting Started',
    description: 'Deck description',
    icon: 'science',
    tags: ['Onboarding'],
    sourcePath: 'presentations/onboarding-presentation/index.html',
    canonicalDeck: {
      metadata: {
        title: '',
        tags: []
      },
      slides: [
        {
          id: 'slide-1',
          nodes: []
        }
      ]
    }
  });

  assert.equal(canonicalDeck.metadata.id, 'onboarding-presentation');
  assert.equal(canonicalDeck.metadata.title, 'Project Onboarding');
  assert.equal(canonicalDeck.metadata.subtitle, 'Getting Started');
  assert.equal(canonicalDeck.metadata.description, 'Deck description');
  assert.equal(canonicalDeck.metadata.icon, 'science');
  assert.deepEqual(canonicalDeck.metadata.tags, ['Onboarding']);
  assert.equal(canonicalDeck.metadata.sourcePath, 'presentations/onboarding-presentation/index.html');
});

test('mergePresentationCanonicalDeck preserves metadata and normalizes valid canonical sidecars', () => {
  const metadata = {
    id: 'onboarding-presentation',
    title: 'Project Onboarding',
    tags: ['Onboarding'],
    canonicalDeck: {
      kind: 'slidenext.deck',
      schemaVersion: 1,
      slides: [{ id: 'stale-slide' }]
    }
  };
  const nextCanonicalDeck = {
    metadata: {
      title: 'Project Onboarding'
    },
    slides: [{ id: 'slide-1', nodes: [] }]
  };

  assert.deepEqual(
    presentationMetadata.mergePresentationCanonicalDeck(metadata, nextCanonicalDeck),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      tags: ['Onboarding'],
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        metadata: {
          id: '',
          title: 'Project Onboarding',
          subtitle: '',
          description: '',
          icon: '',
          tags: [],
          sourcePath: ''
        },
        theme: {
          tokens: {},
          customCss: ''
        },
        layout: {
          mode: 'flow',
          size: {
            width: null,
            height: null,
            unit: 'px'
          },
          aspectRatio: ''
        },
        assets: [],
        slides: [
          {
            id: 'slide-1',
            name: '',
            title: 'Slide 1',
            notes: '',
            layout: {
              mode: 'flow',
              background: {
                color: '',
                image: '',
                className: '',
                style: ''
              }
            },
            nodes: [],
            source: {
              html: '',
              attributes: {}
            }
          }
        ],
        notes: {
          deck: ''
        },
        export: {
          html: {},
          pdf: {},
          pptx: {}
        },
        source: {
          html: '',
          headHtml: '',
          bodyHtml: '',
          bodyScaffoldHtml: '',
          htmlAttributes: {},
          bodyAttributes: {},
          headInlineScripts: [],
          bodyInlineScripts: []
        }
      }
    }
  );

  assert.deepEqual(
    presentationMetadata.mergePresentationCanonicalDeck(metadata, {
      metadata: {
        title: 'Broken Deck'
      }
    }, {
      isCanonicalDeck: () => false
    }),
    metadata
  );
});

test('stripPresentationCanonicalDeck removes stale canonical sidecars without disturbing other metadata', () => {
  assert.deepEqual(
    presentationMetadata.stripPresentationCanonicalDeck({
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      tags: ['Onboarding'],
      canonicalDeck: {
        kind: 'slidenext.deck',
        schemaVersion: 1,
        slides: [{ id: 'slide-1' }]
      }
    }),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding',
      tags: ['Onboarding']
    }
  );

  assert.deepEqual(
    presentationMetadata.stripPresentationCanonicalDeck({
      id: 'onboarding-presentation',
      title: 'Project Onboarding'
    }),
    {
      id: 'onboarding-presentation',
      title: 'Project Onboarding'
    }
  );
});
