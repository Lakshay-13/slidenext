const test = require('node:test');
const assert = require('node:assert/strict');

const deckImport = require('../shared/deck-import.js');

function createElement(tagName, attributes = {}) {
  const attributeEntries = Object.entries(attributes);
  return {
    tagName,
    attributes: attributeEntries.map(([name, value]) => ({ name, value })),
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attributes, name);
    },
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

function createIterableClassList(initialValues = []) {
  const values = [...initialValues];
  values.contains = (value) => values.includes(value);
  return values;
}

function createImportedElement(options = {}) {
  const attributeEntries = Object.entries(options.attributes || {});
  const attributeMap = new Map(attributeEntries);
  const classList = options.classList || createIterableClassList();
  const children = options.children || [];
  return {
    tagName: options.tagName || 'DIV',
    className: options.className || (options.attributes && options.attributes.class) || '',
    classList,
    children,
    childNodes: options.childNodes || [],
    textContent: options.textContent || '',
    outerHTML: options.outerHTML || '',
    style: options.style || {},
    ownerDocument: options.ownerDocument || null,
    hidden: !!options.hidden,
    attributes: attributeEntries.map(([name, value]) => ({ name, value })),
    getAttribute(name) {
      return attributeMap.has(name) ? attributeMap.get(name) : '';
    },
    querySelector(selector) {
      if (typeof options.querySelector === 'function') {
        return options.querySelector(selector);
      }
      return null;
    }
  };
}

function createSanitizableElement(options = {}) {
  const attributeMap = new Map(Object.entries(options.attributes || {}).filter(([name]) => name !== 'class'));
  let classValues = (options.attributes && options.attributes.class
    ? options.attributes.class.split(/\s+/)
    : options.classNames || [])
    .map((className) => className.trim())
    .filter(Boolean);
  const childNodes = options.children || [];
  const element = {
    tagName: options.tagName || 'DIV',
    children: childNodes,
    childNodes: childNodes,
    textContent: options.textContent || '',
    style: options.style || {},
    ownerDocument: options.ownerDocument || null,
    hidden: !!options.hidden,
    removed: false,
    get className() {
      return classValues.join(' ');
    },
    set className(nextValue) {
      classValues = String(nextValue || '')
        .split(/\s+/)
        .map((className) => className.trim())
        .filter(Boolean);
    },
    classList: {
      add(...nextValues) {
        nextValues.forEach((value) => {
          if (!classValues.includes(value)) {
            classValues.push(value);
          }
        });
      },
      remove(...nextValues) {
        classValues = classValues.filter((value) => !nextValues.includes(value));
      },
      contains(value) {
        return classValues.includes(value);
      },
      [Symbol.iterator]: function* iterator() {
        yield* classValues;
      }
    },
    get attributes() {
      const attributes = Array.from(attributeMap.entries()).map(([name, value]) => ({ name, value }));
      if (classValues.length > 0) {
        attributes.unshift({ name: 'class', value: classValues.join(' ') });
      }
      return attributes;
    },
    getAttribute(name) {
      if (name === 'class') {
        return classValues.join(' ');
      }
      return attributeMap.has(name) ? attributeMap.get(name) : '';
    },
    setAttribute(name, value) {
      if (name === 'class') {
        this.className = value;
        return;
      }
      attributeMap.set(name, value);
    },
    removeAttribute(name) {
      if (name === 'class') {
        classValues = [];
        return;
      }
      attributeMap.delete(name);
    },
    remove() {
      this.removed = true;
    },
    querySelector(selector) {
      if (selector === 'h1, h2, h3') {
        return flattenSanitizableDescendants(this).find((node) => /^H[1-3]$/.test(node.tagName)) || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      const descendants = flattenSanitizableDescendants(this);
      if (selector === '*') {
        return descendants;
      }
      if (selector.startsWith('.')) {
        return descendants.filter((node) => node.classList.contains(selector.slice(1)));
      }
      if (selector.startsWith('#')) {
        return descendants.filter((node) => node.getAttribute('id') === selector.slice(1));
      }
      if (/^\[[^\]]+\]$/.test(selector)) {
        const attributeName = selector.slice(1, -1);
        return descendants.filter((node) => node.getAttribute(attributeName) !== '');
      }
      return [];
    },
    cloneNode(deep) {
      return createSanitizableElement({
        tagName: this.tagName,
        attributes: Object.fromEntries(this.attributes.map(({ name, value }) => [name, value])),
        children: deep ? this.children.map((child) => child.cloneNode(true)) : [],
        textContent: this.textContent,
        style: { ...this.style },
        hidden: this.hidden
      });
    },
    get outerHTML() {
      if (this.removed) {
        return '';
      }
      const attrs = this.attributes
        .map(({ name, value }) => ` ${name}="${value}"`)
        .join('');
      const childrenHtml = this.children
        .map((child) => child.outerHTML)
        .filter(Boolean)
        .join('');
      const textHtml = childrenHtml || this.textContent;
      return `<${this.tagName.toLowerCase()}${attrs}>${textHtml}</${this.tagName.toLowerCase()}>`;
    }
  };
  return element;
}

function flattenSanitizableDescendants(root) {
  const descendants = [];
  (root.children || []).forEach((child) => {
    if (!child || child.removed) {
      return;
    }
    descendants.push(child);
    descendants.push(...flattenSanitizableDescendants(child));
  });
  return descendants;
}

function createMetadataDocument(options = {}) {
  const selectors = new Map();
  if (options.title) {
    selectors.set('title', {
      textContent: options.title
    });
  }
  if (options.description) {
    selectors.set('meta[name="description"]', createElement('META', {
      content: options.description
    }));
  }
  if (options.ogDescription) {
    selectors.set('meta[property="og:description"]', createElement('META', {
      content: options.ogDescription
    }));
  }
  if (options.keywords) {
    selectors.set('meta[name="keywords"]', createElement('META', {
      content: options.keywords
    }));
  }
  if (options.iconHref) {
    selectors.set('link[rel~="icon"][href]', createElement('LINK', {
      href: options.iconHref
    }));
  }

  const sourceClone = {
    outerHTML: '<html><head></head><body></body></html>',
    querySelector(selector) {
      if (selector === 'head') {
        return { innerHTML: '' };
      }
      if (selector === 'body') {
        return { innerHTML: '', attributes: [] };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  return {
    querySelector(selector) {
      return selectors.get(selector) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.slide') {
        return [];
      }
      return [];
    },
    styleSheets: [],
    documentElement: {
      style: createStyleDeclaration({}),
      cloneNode() {
        return sourceClone;
      }
    },
    head: {
      innerHTML: ''
    },
    body: {
      innerHTML: '',
      attributes: []
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
      if (selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href], link[rel~="preload"][href], video[poster]') {
        return [imageEl];
      }
      if (selector === 'img[srcset], source[srcset]') {
        return [];
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
      src: 'assets/chart.png',
      mimeType: 'image/png'
    },
    {
      id: 'asset-2',
      type: 'image',
      name: 'hero.png',
      src: 'assets/hero.png',
      mimeType: 'image/png'
    }
  ]);
});

test('collectDeckAssets includes srcset and poster asset urls, skips fragments, and deduplicates repeated candidates', () => {
  const posterVideoEl = createElement('VIDEO', {
    poster: 'assets/poster.jpg'
  });
  const srcsetImageEl = createElement('IMG', {
    srcset: 'assets/hero-small.png 1x, assets/hero-large.png 2x, #ignored 3x'
  });
  const duplicateSourceEl = createElement('SOURCE', {
    srcset: 'assets/hero-large.png 1280w, assets/hero-xl.png 1920w'
  });

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href], link[rel~="preload"][href], video[poster]') {
        return [posterVideoEl];
      }
      if (selector === 'img[srcset], source[srcset]') {
        return [srcsetImageEl, duplicateSourceEl];
      }
      if (selector === '[style*="url("]') {
        return [];
      }
      return [];
    }
  };

  const assets = deckImport.collectDeckAssets(doc);

  assert.deepEqual(assets, [
    {
      id: 'asset-1',
      type: 'image',
      name: 'poster.jpg',
      src: 'assets/poster.jpg',
      mimeType: 'image/jpeg'
    },
    {
      id: 'asset-2',
      type: 'image',
      name: 'hero-small.png',
      src: 'assets/hero-small.png',
      mimeType: 'image/png'
    },
    {
      id: 'asset-3',
      type: 'image',
      name: 'hero-large.png',
      src: 'assets/hero-large.png',
      mimeType: 'image/png'
    },
    {
      id: 'asset-4',
      type: 'image',
      name: 'hero-xl.png',
      src: 'assets/hero-xl.png',
      mimeType: 'image/png'
    }
  ]);
});

test('collectDeckAssets includes asset urls from accessible stylesheet rules and ignores editor chrome stylesheets', () => {
  const doc = {
    querySelectorAll(selector) {
      if (
        selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href], link[rel~="preload"][href], video[poster]'
        || selector === 'img[srcset], source[srcset]'
        || selector === '[style*="url("]'
      ) {
        return [];
      }
      return [];
    },
    styleSheets: [
      {
        ownerNode: {
          id: 'editor-style-tag'
        },
        cssRules: [
          {
            cssText: '.editor-selected { background-image: url("/chrome.png"); }'
          }
        ]
      },
      {
        ownerNode: {
          id: 'deck-style-tag'
        },
        cssRules: [
          {
            cssText: '@font-face { font-family: "Deck Sans"; src: url("/fonts/deck-sans.woff2") format("woff2"); }'
          },
          {
            cssRules: [
              {
                cssText: '.hero { background-image: url("/images/hero-bg.webp"), url(#noise); }'
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

  const assets = deckImport.collectDeckAssets(doc);

  assert.deepEqual(assets, [
    {
      id: 'asset-1',
      type: 'font',
      name: 'deck-sans.woff2',
      src: '/fonts/deck-sans.woff2',
      mimeType: 'font/woff2'
    },
    {
      id: 'asset-2',
      type: 'image',
      name: 'hero-bg.webp',
      src: '/images/hero-bg.webp',
      mimeType: 'image/webp'
    }
  ]);
});

test('collectDeckAssets includes preload assets and infers their canonical types from the as attribute', () => {
  const preloadFontEl = createElement('LINK', {
    rel: 'preload',
    as: 'font',
    href: '/fonts/deck-sans.woff2',
    type: 'font/woff2'
  });
  const preloadImageEl = createElement('LINK', {
    rel: 'preload',
    as: 'image',
    href: '/images/hero.avif'
  });

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href], link[rel~="preload"][href], video[poster]') {
        return [preloadFontEl, preloadImageEl];
      }
      if (selector === 'img[srcset], source[srcset]' || selector === '[style*="url("]') {
        return [];
      }
      return [];
    }
  };

  const assets = deckImport.collectDeckAssets(doc);

  assert.deepEqual(assets, [
    {
      id: 'asset-1',
      type: 'font',
      name: 'deck-sans.woff2',
      src: '/fonts/deck-sans.woff2',
      mimeType: 'font/woff2'
    },
    {
      id: 'asset-2',
      type: 'image',
      name: 'hero.avif',
      src: '/images/hero.avif',
      mimeType: 'image/avif'
    }
  ]);
});

test('collectDeckAssets preserves link asset metadata needed by canonical stylesheet and preload tags', () => {
  const stylesheetEl = createElement('LINK', {
    rel: 'stylesheet',
    href: '/styles/deck.css',
    media: 'screen and (min-width: 960px)',
    crossorigin: 'anonymous',
    integrity: 'sha384-style',
    referrerpolicy: 'no-referrer'
  });
  const preloadFontEl = createElement('LINK', {
    rel: 'preload',
    as: 'font',
    href: '/fonts/deck-sans.woff2',
    type: 'font/woff2',
    crossorigin: 'use-credentials',
    integrity: 'sha384-font'
  });

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href], link[rel~="preload"][href], video[poster]') {
        return [stylesheetEl, preloadFontEl];
      }
      if (selector === 'img[srcset], source[srcset]' || selector === '[style*="url("]') {
        return [];
      }
      return [];
    }
  };

  const assets = deckImport.collectDeckAssets(doc);

  assert.deepEqual(assets, [
    {
      id: 'asset-1',
      type: 'stylesheet',
      name: 'deck.css',
      src: '/styles/deck.css',
      mimeType: 'text/css',
      meta: {
        media: 'screen and (min-width: 960px)',
        crossorigin: 'anonymous',
        integrity: 'sha384-style',
        referrerpolicy: 'no-referrer'
      }
    },
    {
      id: 'asset-2',
      type: 'font',
      name: 'deck-sans.woff2',
      src: '/fonts/deck-sans.woff2',
      mimeType: 'font/woff2',
      meta: {
        crossorigin: 'use-credentials',
        integrity: 'sha384-font'
      }
    }
  ]);
});

test('collectDeckAssets preserves script asset metadata needed by canonical script tags', () => {
  const scriptEl = createElement('SCRIPT', {
    src: '/scripts/deck.js',
    type: 'module',
    async: '',
    defer: '',
    nomodule: '',
    crossorigin: 'anonymous',
    integrity: 'sha384-script',
    referrerpolicy: 'origin'
  });

  const doc = {
    querySelectorAll(selector) {
      if (selector === 'img[src], video[src], audio[src], source[src], script[src], link[rel~="stylesheet"][href], link[rel~="preload"][href], video[poster]') {
        return [scriptEl];
      }
      if (selector === 'img[srcset], source[srcset]' || selector === '[style*="url("]') {
        return [];
      }
      return [];
    }
  };

  const assets = deckImport.collectDeckAssets(doc);

  assert.deepEqual(assets, [
    {
      id: 'asset-1',
      type: 'script',
      name: 'deck.js',
      src: '/scripts/deck.js',
      mimeType: 'application/javascript',
      meta: {
        type: 'module',
        crossorigin: 'anonymous',
        integrity: 'sha384-script',
        referrerpolicy: 'origin',
        async: true,
        defer: true,
        nomodule: true
      }
    }
  ]);
});

test('importHtmlDeckToCanonicalDeck falls back to head metadata for missing description, icon, and tags', () => {
  const deck = deckImport.importHtmlDeckToCanonicalDeck(createMetadataDocument({
    title: 'HTML Deck Title',
    description: 'Deck description from meta',
    keywords: 'AI, Slides,  Workshops ',
    iconHref: '/logo.png'
  }), {
    presentationMetadata: {
      id: 'html-only-deck'
    },
    sourcePath: '/presentations/html-only-deck/index.html',
    stripTransientDeckRuntimeState() {}
  });

  assert.deepEqual(deck.metadata, {
    id: 'html-only-deck',
    title: 'HTML Deck Title',
    subtitle: '',
    description: 'Deck description from meta',
    icon: '/logo.png',
    tags: ['AI', 'Slides', 'Workshops'],
    sourcePath: '/presentations/html-only-deck/index.html'
  });
});

test('importHtmlDeckToCanonicalDeck preserves explicit metadata over head fallbacks', () => {
  const deck = deckImport.importHtmlDeckToCanonicalDeck(createMetadataDocument({
    title: 'HTML Deck Title',
    description: 'Deck description from meta',
    keywords: 'AI, Slides',
    iconHref: '/logo.png'
  }), {
    presentationMetadata: {
      id: 'metadata-deck',
      title: 'Metadata Title',
      description: 'Metadata description',
      icon: 'science',
      tags: ['Research']
    },
    sourcePath: '/presentations/metadata-deck/index.html',
    stripTransientDeckRuntimeState() {}
  });

  assert.deepEqual(deck.metadata, {
    id: 'metadata-deck',
    title: 'Metadata Title',
    subtitle: '',
    description: 'Metadata description',
    icon: 'science',
    tags: ['Research'],
    sourcePath: '/presentations/metadata-deck/index.html'
  });
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
            selectorText: ':root',
            style: createStyleDeclaration({
              '--color-primary': '#00f2ff'
            }),
            cssText: ':root { --color-primary: #00f2ff; }'
          },
          {
            selectorText: ':root, body',
            style: createStyleDeclaration({
              colorScheme: 'dark'
            }),
            cssText: ':root, body { color-scheme: dark; }'
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
  assert.equal(customCss.includes(':root { --color-primary: #00f2ff; }'), false);
  assert.match(customCss, /:root, body \{ color-scheme: dark; \}/);
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

test('importElementToCanonicalNode strips editor-only classes and attributes from the canonical node payload', () => {
  const element = createImportedElement({
    tagName: 'DIV',
    classList: createIterableClassList(['hero-card', 'editor-hoverable']),
    hidden: true,
    attributes: {
      class: 'hero-card editor-hoverable',
      hidden: '',
      'aria-hidden': 'false',
      'data-editor-id': 'node-1',
      'data-editor-hidden': 'true',
      'aria-label': 'Hero'
    },
    textContent: 'Hero copy',
    outerHTML: '<div class="hero-card editor-hoverable" data-editor-id="node-1">Hero copy</div>'
  });

  const node = deckImport.importElementToCanonicalNode(element);

  assert.deepEqual(node.classes, ['hero-card']);
  assert.deepEqual(node.attributes, {
    'aria-label': 'Hero'
  });
  assert.deepEqual(node.visibility, {
    hidden: true,
    locked: false
  });
});

test('importElementToCanonicalNode sanitizes stored node html fragments', () => {
  const child = createSanitizableElement({
    tagName: 'SPAN',
    attributes: {
      class: 'eyebrow editor-selected',
      'data-editor-id': 'child-node'
    },
    textContent: 'Eyebrow'
  });
  const element = createSanitizableElement({
    tagName: 'DIV',
    attributes: {
      class: 'hero-card editor-hoverable',
      'data-editor-id': 'node-1'
    },
    children: [child]
  });

  const node = deckImport.importElementToCanonicalNode(element);

  assert.equal(node.html.includes('editor-hoverable'), false);
  assert.equal(node.html.includes('editor-selected'), false);
  assert.equal(node.html.includes('data-editor-id'), false);
  assert.match(node.html, /class="hero-card"/);
  assert.match(node.html, /class="eyebrow"/);
});

test('importSlideToCanonicalSlide strips canonical duplicate slide attributes while preserving custom attrs', () => {
  const heading = createImportedElement({
    tagName: 'H1',
    classList: createIterableClassList(['editor-hoverable']),
    textContent: 'Intro',
    attributes: {
      class: 'editor-hoverable'
    },
    outerHTML: '<h1 class="editor-hoverable">Intro</h1>'
  });
  const slide = createImportedElement({
    tagName: 'SECTION',
    classList: createIterableClassList(['slide', 'editor-selected']),
    children: [heading],
    textContent: 'Intro',
    attributes: {
      class: 'slide editor-selected',
      style: 'background: black;',
      'aria-label': 'Imported Intro',
      'data-slide-id': 'slide-runtime-1',
      'data-slide-name': 'Imported Slide',
      'data-speaker-notes': 'Key message',
      'data-transition': 'fade'
    },
    outerHTML: '<section class="slide editor-selected" data-slide-id="slide-runtime-1"><h1 class="editor-hoverable">Intro</h1></section>',
    querySelector(selector) {
      return selector === 'h1, h2, h3' ? heading : null;
    }
  });

  const canonicalSlide = deckImport.importSlideToCanonicalSlide(slide, 0);

  assert.equal(canonicalSlide.layout.background.className, 'slide');
  assert.equal(canonicalSlide.layout.background.style, 'background: black;');
  assert.equal(canonicalSlide.name, 'Imported Slide');
  assert.equal(canonicalSlide.notes, 'Key message');
  assert.deepEqual(canonicalSlide.source.attributes, {
    'data-transition': 'fade'
  });
});

test('importSlideToCanonicalSlide sanitizes stored slide source html fragments', () => {
  const heading = createSanitizableElement({
    tagName: 'H1',
    attributes: {
      class: 'title editor-hoverable',
      'data-editor-id': 'heading-node'
    },
    textContent: 'Intro'
  });
  const slide = createSanitizableElement({
    tagName: 'SECTION',
    attributes: {
      class: 'slide editor-selected',
      'data-slide-id': 'slide-runtime-1',
      'data-speaker-notes': 'Key message'
    },
    children: [heading]
  });

  const canonicalSlide = deckImport.importSlideToCanonicalSlide(slide, 0);

  assert.equal(canonicalSlide.source.html.includes('editor-selected'), false);
  assert.equal(canonicalSlide.source.html.includes('editor-hoverable'), false);
  assert.equal(canonicalSlide.source.html.includes('data-slide-id'), false);
  assert.equal(canonicalSlide.source.html.includes('data-editor-id'), false);
  assert.match(canonicalSlide.source.html, /class="slide"/);
  assert.match(canonicalSlide.source.html, /class="title"/);
  assert.match(canonicalSlide.source.html, /data-speaker-notes="Key message"/);
});
