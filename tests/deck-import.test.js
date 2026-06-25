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

function createClassList(initialValues = []) {
  const values = new Set(initialValues);
  return {
    add(...nextValues) {
      nextValues.forEach((value) => values.add(value));
    },
    remove(...nextValues) {
      nextValues.forEach((value) => values.delete(value));
    },
    contains(value) {
      return values.has(value);
    }
  };
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

test('collectDeckCustomCss serializes accessible deck styles and skips editor chrome stylesheets', () => {
  const doc = {
    styleSheets: [
      {
        ownerNode: {
          id: 'editor-style-tag'
        },
        cssRules: [
          {
            cssText: '.editor-selected { outline: 2px solid #7028d0; }'
          }
        ]
      },
      {
        ownerNode: {
          id: 'deck-style-tag'
        },
        cssRules: [
          {
            cssText: ':root { --color-primary: #00f2ff; }'
          },
          {
            cssText: '.slides-container { transition: transform 0.8s ease; }'
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

  const customCss = deckImport.collectDeckCustomCss(doc);

  assert.equal(customCss.includes('.editor-selected'), false);
  assert.match(customCss, /:root \{ --color-primary: #00f2ff; \}/);
  assert.match(customCss, /\.slides-container \{ transition: transform 0\.8s ease; \}/);
});

test('sanitizeDeckSourceClone removes editor chrome nodes, ids, and transient classes before serialization', () => {
  const removedNodeIds = [];
  const hoverableNode = {
    classList: createClassList(['hero', 'editor-hoverable'])
  };
  const selectedNode = {
    classList: createClassList(['editor-selected'])
  };
  const editorIdNode = {
    removedAttributes: [],
    removeAttribute(name) {
      this.removedAttributes.push(name);
    }
  };
  const slideIdNode = {
    removedAttributes: [],
    removeAttribute(name) {
      this.removedAttributes.push(name);
    }
  };
  const sourceClone = {
    querySelectorAll(selector) {
      if (selector === '#editor-style-tag') {
        return [{
          remove() {
            removedNodeIds.push('editor-style-tag');
          }
        }];
      }
      if (selector === '#editor-theme-override-tag') {
        return [{
          remove() {
            removedNodeIds.push('editor-theme-override-tag');
          }
        }];
      }
      if (selector === '.editor-hoverable') {
        return [hoverableNode];
      }
      if (selector === '.editor-selected') {
        return [selectedNode];
      }
      if (selector === '.editor-dragging') {
        return [];
      }
      if (selector === '[data-editor-id]') {
        return [editorIdNode];
      }
      if (selector === '[data-slide-id]') {
        return [slideIdNode];
      }
      return [];
    }
  };

  deckImport.sanitizeDeckSourceClone(sourceClone, {
    stripTransientDeckRuntimeState(root) {
      root.didStripTransientRuntimeState = true;
    }
  });

  assert.deepEqual(removedNodeIds, ['editor-style-tag', 'editor-theme-override-tag']);
  assert.equal(hoverableNode.classList.contains('editor-hoverable'), false);
  assert.equal(selectedNode.classList.contains('editor-selected'), false);
  assert.deepEqual(editorIdNode.removedAttributes, ['data-editor-id']);
  assert.deepEqual(slideIdNode.removedAttributes, ['data-slide-id']);
  assert.equal(sourceClone.didStripTransientRuntimeState, true);
});

test('buildDeckSource serializes the sanitized clone instead of the live editor document', () => {
  const sourceClone = {
    outerHTML: '<html><head><style>.deck{}</style></head><body class="deck-body"><main>clean</main></body></html>',
    querySelector(selector) {
      if (selector === 'head') {
        return { innerHTML: '<style>.deck{}</style>' };
      }
      if (selector === 'body') {
        return {
          innerHTML: '<main>clean</main>',
          attributes: [{ name: 'class', value: 'deck-body' }]
        };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const doc = {
    documentElement: {
      cloneNode() {
        return sourceClone;
      }
    },
    head: {
      innerHTML: '<style id="editor-style-tag">dirty</style>'
    },
    body: {
      innerHTML: '<main>dirty</main>',
      attributes: [{ name: 'class', value: 'dirty-body' }]
    }
  };

  const source = deckImport.buildDeckSource(doc, {
    stripTransientDeckRuntimeState(root) {
      root.wasSanitized = true;
    }
  });

  assert.equal(sourceClone.wasSanitized, true);
  assert.equal(source.html, '<!DOCTYPE html>\n<html><head><style>.deck{}</style></head><body class="deck-body"><main>clean</main></body></html>');
  assert.equal(source.headHtml, '<style>.deck{}</style>');
  assert.equal(source.bodyHtml, '<main>clean</main>');
  assert.deepEqual(source.bodyAttributes, { class: 'deck-body' });
});
