const test = require('node:test');
const assert = require('node:assert/strict');

const deckImport = require('../shared/deck-import.js');

function createElement(tagName, attributes = {}) {
  return {
    tagName,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name)
        ? attributes[name]
        : '';
    }
  };
}

function createStyleDeclaration(properties = {}) {
  const names = Object.keys(properties);
  const styleDeclaration = {
    length: names.length,
    getPropertyValue(name) {
      return Object.prototype.hasOwnProperty.call(properties, name)
        ? properties[name]
        : '';
    },
    item(index) {
      return names[index] || '';
    }
  };
  names.forEach((name, index) => {
    styleDeclaration[index] = name;
  });
  return styleDeclaration;
}

test('collectDeckAssets includes inline style asset urls, skips fragments, and deduplicates sources', () => {
  const imageEl = createElement('IMG', {
    src: 'assets/chart.png'
  });
  const inlineBackgroundEl = createElement('DIV', {
    style: 'background-image: url("assets/hero.png"), url(#noise);'
  });
  const duplicateBackgroundEl = createElement('SECTION', {
    style: "background-image: url('assets/hero.png');"
  });

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href]') {
        return [imageEl];
      }
      if (selector === '[style*="url("]') {
        return [inlineBackgroundEl, duplicateBackgroundEl];
      }
      return [];
    }
  };

  const assets = deckImport.collectDeckAssets(doc);

  assert.deepEqual(assets, [
    {
      id: 'asset-1',
      type: 'image',
      name: 'chart.png',
      src: 'assets/chart.png'
    },
    {
      id: 'asset-2',
      type: 'image',
      name: 'hero.png',
      src: 'assets/hero.png'
    }
  ]);
});

test('collectDeckThemeTokens reads same-origin :root custom properties and ignores inaccessible stylesheets', () => {
  const doc = {
    documentElement: {
      style: createStyleDeclaration({
        '--inline-root-token': '#010203'
      })
    },
    styleSheets: [
      {
        cssRules: [
          {
            selectorText: ':root',
            style: createStyleDeclaration({
              '--color-primary': '#00f2ff',
              '--font-heading': "'Sora', sans-serif",
              color: '#fff'
            })
          },
          {
            cssRules: [
              {
                selectorText: ':root, body',
                style: createStyleDeclaration({
                  '--color-secondary': '#3d5afe'
                })
              }
            ]
          }
        ]
      },
      {
        get cssRules() {
          throw new Error('Cross-origin stylesheet');
        }
      }
    ]
  };

  const tokens = deckImport.collectDeckThemeTokens(doc);

  assert.deepEqual(tokens, {
    '--inline-root-token': '#010203',
    '--color-primary': '#00f2ff',
    '--font-heading': "'Sora', sans-serif",
    '--color-secondary': '#3d5afe'
  });
});
