(function (root, factory) {
  let defaultPptxGenJS = root && root.PptxGenJS;
  if (typeof module === 'object' && module.exports) {
    defaultPptxGenJS = require('pptxgenjs');
    module.exports = factory(require('./canonical-deck.js'), defaultPptxGenJS);
  } else if (root) {
    root.SlideNextCanonicalPptxExport = factory(root.SlideNextCanonicalDeck, defaultPptxGenJS);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeck, defaultPptxGenJS) {
  const DEFAULT_PPTX_WIDTH = 13.333;
  const DEFAULT_PPTX_HEIGHT = 7.5;
  const DEFAULT_SOURCE_WIDTH = 1920;
  const DEFAULT_SOURCE_HEIGHT = 1080;
  const UNSUPPORTED_NODE_TYPES = new Set(['vector', 'video', 'audio', 'embed', 'script']);
  const UNSUPPORTED_STYLE_PROPERTIES = new Set([
    'backdrop-filter',
    'box-shadow',
    'clip-path',
    'filter',
    'mask',
    'mix-blend-mode',
    'text-shadow',
    'transform'
  ]);

  function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function finitePositive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function normalizePptxExportOptions(options = {}) {
    const source = asObject(options);
    return {
      PptxGenJS: source.PptxGenJS || defaultPptxGenJS,
      pptx: source.pptx || null,
      layout: typeof source.layout === 'string' ? source.layout : 'LAYOUT_WIDE',
      pageWidth: finitePositive(source.pageWidth, DEFAULT_PPTX_WIDTH),
      pageHeight: finitePositive(source.pageHeight, DEFAULT_PPTX_HEIGHT),
      sourceWidth: finitePositive(source.sourceWidth, null),
      sourceHeight: finitePositive(source.sourceHeight, null),
      assetBaseDir: typeof source.assetBaseDir === 'string' ? source.assetBaseDir : '',
      availableFonts: Array.isArray(source.availableFonts)
        ? source.availableFonts.filter(font => typeof font === 'string' && font.trim())
        : []
    };
  }

  function normalizeHexColor(value) {
    if (typeof value !== 'string') return '';
    const input = value.trim();
    if (!input || input === 'transparent' || input === 'currentColor') return '';

    if (/^#[0-9a-f]{3}$/i.test(input)) {
      return input.slice(1).split('').map(part => part + part).join('').toUpperCase();
    }
    if (/^#[0-9a-f]{6}$/i.test(input)) return input.slice(1).toUpperCase();

    const rgb = input.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (!rgb || (rgb[4] !== undefined && Number(rgb[4]) === 0)) return '';
    return [rgb[1], rgb[2], rgb[3]]
      .map(channel => Math.max(0, Math.min(255, Number(channel))).toString(16).padStart(2, '0'))
      .join('').toUpperCase();
  }

  function parseStyle(styleText) {
    if (typeof styleText !== 'string') return {};
    return styleText.split(';').reduce((styles, declaration) => {
      const separator = declaration.indexOf(':');
      if (separator < 0) return styles;
      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim();
      if (property && value) styles[property] = value;
      return styles;
    }, {});
  }

  function parseCssPx(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;
    const match = value.trim().match(/^(-?[\d.]+)(px)?$/i);
    return match ? Number(match[1]) : null;
  }

  function stripHtml(value) {
    if (typeof value !== 'string') return '';
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .trim();
  }

  function getNodeText(node) {
    const text = typeof node.text === 'string' ? node.text.trim() : '';
    return text || stripHtml(node.html);
  }

  function getNestedNodeText(node) {
    const directText = getNodeText(node);
    if (directText) return directText;
    return (Array.isArray(node.children) ? node.children : [])
      .map(getNestedNodeText)
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  function getCanonicalTableRows(node) {
    return (Array.isArray(node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr')
      .map(row => (Array.isArray(row.children) ? row.children : [])
        .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'))
        .map(getNestedNodeText))
      .filter(row => row.length > 0);
  }

  function getNodeBounds(node, context) {
    const layout = asObject(node.layout);
    const x = Number.isFinite(layout.x) ? layout.x : null;
    const y = Number.isFinite(layout.y) ? layout.y : null;
    const width = Number.isFinite(layout.width) ? layout.width : null;
    const height = Number.isFinite(layout.height) ? layout.height : null;
    if ([x, y, width, height].some(value => value === null) || width <= 0 || height <= 0) {
      return null;
    }
    return {
      x: x * context.scaleX,
      y: y * context.scaleY,
      w: width * context.scaleX,
      h: height * context.scaleY
    };
  }

  function getNodeAttribute(node, name) {
    const attributes = asObject(node.attributes);
    return typeof attributes[name] === 'string' ? attributes[name] : '';
  }

  function resolveImageSource(node, deck, options) {
    const directSource = getNodeAttribute(node, 'src');
    const assetId = getNodeAttribute(node, 'data-asset-id') || getNodeAttribute(node, 'data-asset');
    const asset = assetId ? deck.assets.find(item => item.id === assetId) : null;
    const source = directSource || (asset && asset.src) || '';
    if (!source) return '';
    if (/^(data:|https?:\/\/|file:\/\/|\/)/i.test(source) || !options.assetBaseDir) return source;
    return `${options.assetBaseDir.replace(/[\\/]$/, '')}/${source.replace(/^[/\\]+/, '')}`;
  }

  function nodeStyle(node) {
    const style = parseStyle(node.style);
    const attributes = asObject(node.attributes);
    if (typeof attributes.style === 'string') Object.assign(style, parseStyle(attributes.style));
    return style;
  }

  function textOptions(node, bounds) {
    const style = nodeStyle(node);
    const tagName = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : '';
    const cssFontSize = parseCssPx(style['font-size']);
    const defaultFontSize = /^h[1-6]$/.test(tagName)
      ? Math.max(14, 30 - (Number(tagName.slice(1)) - 1) * 3)
      : 14;
    const fontSize = Math.max(6, (cssFontSize === null ? defaultFontSize : cssFontSize) * 0.75);
    const color = normalizeHexColor(style.color) || '000000';
    const fontFace = style['font-family']
      ? style['font-family'].split(',')[0].trim().replace(/^['"]|['"]$/g, '')
      : 'Aptos';
    return {
      ...bounds,
      fontFace,
      fontSize,
      bold: /^h[1-6]$/.test(tagName) || /^(bold|[6-9]00)$/i.test(style['font-weight'] || ''),
      italic: style['font-style'] === 'italic',
      color,
      align: style['text-align'] || 'left',
      margin: 0,
      breakLine: false,
      fit: 'shrink'
    };
  }

  function shapeOptions(node, bounds) {
    const style = nodeStyle(node);
    const fill = normalizeHexColor(style['background-color'] || style.background) || 'FFFFFF';
    const lineColor = normalizeHexColor(style['border-color']) || fill;
    const lineWidth = parseCssPx(style['border-width']);
    return {
      ...bounds,
      fill: { color: fill },
      line: { color: lineColor, width: lineWidth === null ? 0.5 : Math.max(0, lineWidth * 0.75) }
    };
  }

  function getShapeType(pptx, name) {
    const shapeTypes = asObject(pptx && pptx.ShapeType);
    return shapeTypes[name] || name;
  }

  function createExportDiagnostics() {
    return {
      warnings: [],
      unsupportedNodes: [],
      unsupportedStyles: [],
      overflowNodes: [],
      fontSubstitutionRisks: [],
      missingAssets: []
    };
  }

  function getSourceSize(deck, options) {
    return {
      width: finitePositive(options.sourceWidth, finitePositive(deck.layout.size.width, DEFAULT_SOURCE_WIDTH)),
      height: finitePositive(options.sourceHeight, finitePositive(deck.layout.size.height, DEFAULT_SOURCE_HEIGHT))
    };
  }

  function preflightCanonicalPptxExport(deckSeed, options = {}) {
    const deck = canonicalDeck.createCanonicalDeck(deckSeed);
    const normalizedOptions = normalizePptxExportOptions(options);
    const sourceSize = getSourceSize(deck, normalizedOptions);
    const diagnostics = createExportDiagnostics();

    function visit(node) {
      if (!node || node.visibility?.hidden) return;
      const nodeId = node.id || 'unknown';
      const bounds = asObject(node.layout);
      const hasBounds = [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
        && bounds.width > 0
        && bounds.height > 0;
      if (!hasBounds) {
        diagnostics.warnings.push(`Node ${nodeId} has no exportable bounds`);
      } else if (
        bounds.x < 0
        || bounds.y < 0
        || bounds.x + bounds.width > sourceSize.width
        || bounds.y + bounds.height > sourceSize.height
      ) {
        diagnostics.overflowNodes.push({
          id: nodeId,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
        diagnostics.warnings.push(`Node ${nodeId} extends beyond slide bounds`);
      }

      const type = typeof node.type === 'string' ? node.type.toLowerCase() : '';
      if (UNSUPPORTED_NODE_TYPES.has(type)) {
        diagnostics.unsupportedNodes.push({
          id: nodeId,
          type,
          tagName: node.tagName || '',
          reason: `node type ${type}`
        });
        diagnostics.warnings.push(`Node ${nodeId} is not fully supported: node type ${type}`);
      }
      if (type === 'table' || node.tagName === 'table') {
        if (getCanonicalTableRows(node).length === 0) {
          diagnostics.unsupportedNodes.push({
            id: nodeId,
            type: 'table',
            tagName: node.tagName || '',
            reason: 'table has no exportable rows'
          });
          diagnostics.warnings.push(`Node ${nodeId} is not fully supported: table has no exportable rows`);
        }
      }

      const style = nodeStyle(node);
      const unsupportedProperties = Object.keys(style).filter(property => UNSUPPORTED_STYLE_PROPERTIES.has(property));
      if (unsupportedProperties.length > 0) {
        diagnostics.unsupportedStyles.push({ id: nodeId, properties: unsupportedProperties });
        diagnostics.warnings.push(`Node ${nodeId} uses unsupported CSS: ${unsupportedProperties.join(', ')}`);
      }

      const fontFamily = style['font-family'];
      if (fontFamily) {
        const primaryFont = fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
        if (!normalizedOptions.availableFonts.includes(primaryFont)) {
          diagnostics.fontSubstitutionRisks.push({ id: nodeId, fontFamily: primaryFont });
          diagnostics.warnings.push(`Node ${nodeId} may substitute font ${primaryFont}`);
        }
      }

      if (type === 'image' || node.tagName === 'img') {
        if (!resolveImageSource(node, deck, normalizedOptions)) {
          diagnostics.missingAssets.push(nodeId);
        }
      }

      const childNodes = type === 'table' || node.tagName === 'table' ? [] : node.children;
      (Array.isArray(childNodes) ? childNodes : []).forEach(visit);
    }

    deck.slides.forEach(slide => {
      const background = asObject(slide.layout).background || {};
      if (background.image) {
        diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} background image was not exported`);
      }
      slide.nodes.forEach(visit);
    });

    return { deck, options: normalizedOptions, sourceSize, diagnostics };
  }

  function renderNode(node, context) {
    if (!node || node.visibility?.hidden) return;
    const children = Array.isArray(node.children) ? node.children : [];
    const tagName = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : '';
    const type = typeof node.type === 'string' ? node.type.toLowerCase() : '';
    const bounds = getNodeBounds(node, context);
    const imageNode = type === 'image' || tagName === 'img';
    const shapeNode = type === 'shape' || node.classes?.includes('editor-shape');
    const tableNode = type === 'table' || tagName === 'table';

    if (tableNode) {
      const rows = getCanonicalTableRows(node);
      if (rows.length > 0 && bounds && typeof context.slide.addTable === 'function') {
        context.slide.addTable(rows, {
          ...bounds,
          border: { type: 'solid', color: 'D1D5DB', pt: 0.75 },
          color: '000000',
          fill: 'FFFFFF',
          fontFace: 'Aptos',
          fontSize: 11,
          margin: 0.04
        });
      }
    } else if (imageNode) {
      const source = resolveImageSource(node, context.deck, context.options);
      if (source && bounds) {
        const imageOptions = source.startsWith('data:')
          ? { data: source, ...bounds }
          : { path: source, ...bounds };
        context.slide.addImage(imageOptions);
      }
    } else if (shapeNode) {
      if (bounds) context.slide.addShape(getShapeType(context.pptx, 'rect'), shapeOptions(node, bounds));
    } else if (!UNSUPPORTED_NODE_TYPES.has(type) && getNodeText(node) && children.length === 0) {
      if (bounds) context.slide.addText(getNodeText(node), textOptions(node, bounds));
    }

    children.forEach(child => renderNode(child, context));
  }

  function renderSlide(slide, context) {
    const background = asObject(slide.layout).background || {};
    const color = normalizeHexColor(background.color);
    if (color) context.slide.background = { color };
    if (slide.notes && typeof context.slide.addNotes === 'function') context.slide.addNotes(slide.notes);
    slide.nodes.forEach(node => renderNode(node, context));
  }

  function createCanonicalPptxExport(deckSeed, options = {}) {
    const preflight = preflightCanonicalPptxExport(deckSeed, options);
    const { deck, options: normalizedOptions, sourceSize, diagnostics } = preflight;
    const PptxGenJS = normalizedOptions.PptxGenJS;
    const pptx = normalizedOptions.pptx || (typeof PptxGenJS === 'function' ? new PptxGenJS() : null);
    if (!pptx) {
      diagnostics.warnings.push('PptxGenJS is unavailable');
      return { deck, pptx: null, slideCount: 0, diagnostics };
    }

    pptx.layout = normalizedOptions.layout;
    if (deck.metadata.title) pptx.title = deck.metadata.title;
    if (deck.metadata.description) pptx.subject = deck.metadata.description;
    const contextBase = {
      deck,
      pptx,
      options: normalizedOptions,
      diagnostics,
      scaleX: normalizedOptions.pageWidth / sourceSize.width,
      scaleY: normalizedOptions.pageHeight / sourceSize.height
    };

    deck.slides.forEach(slide => {
      if (typeof pptx.addSlide !== 'function') {
        diagnostics.warnings.push('PptxGenJS instance cannot add slides');
        return;
      }
      const outputSlide = pptx.addSlide();
      renderSlide(slide, { ...contextBase, slide: outputSlide });
    });

    return {
      deck,
      pptx,
      slideCount: deck.slides.length,
      diagnostics
    };
  }

  return {
    DEFAULT_PPTX_WIDTH,
    DEFAULT_PPTX_HEIGHT,
    DEFAULT_SOURCE_WIDTH,
    DEFAULT_SOURCE_HEIGHT,
    normalizePptxExportOptions,
    normalizeHexColor,
    preflightCanonicalPptxExport,
    createCanonicalPptxExport
  };
});
