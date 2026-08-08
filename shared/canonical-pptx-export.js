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
  const DEFAULT_PPTX_ASPECT_RATIO = DEFAULT_PPTX_WIDTH / DEFAULT_PPTX_HEIGHT;
  const CUSTOM_PPTX_LAYOUT_NAME = 'SLIDENEXT_CANVAS';
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
  const PPTX_WARNING_DETAILS_LIMIT = 3;
  const PPTX_WARNING_TEXT_LIMIT = 180;

  function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function createPptxWarningDetailsHeader(warnings = []) {
    const normalizedWarnings = (Array.isArray(warnings) ? warnings : [])
      .filter(warning => typeof warning === 'string' && warning.trim())
      .map(warning => warning.trim());
    const visibleWarnings = normalizedWarnings
      .slice(0, PPTX_WARNING_DETAILS_LIMIT)
      .map(warning => warning.length > PPTX_WARNING_TEXT_LIMIT
        ? `${warning.slice(0, PPTX_WARNING_TEXT_LIMIT - 3)}...`
        : warning);
    const hasTruncatedWarningText = visibleWarnings.some((warning, index) => warning !== normalizedWarnings[index]);
    return encodeURIComponent(JSON.stringify({
      warnings: visibleWarnings,
      truncated: normalizedWarnings.length > visibleWarnings.length || hasTruncatedWarningText
    }));
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
      assetExists: typeof source.assetExists === 'function' ? source.assetExists : null,
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

  function resolvePptxFillColor(value) {
    if (typeof value !== 'string' || !value.trim()) return null;
    const input = value.trim();
    if (input.toLowerCase() === 'transparent') {
      return { color: 'FFFFFF', transparency: 100 };
    }

    const rgba = input.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/i);
    if (rgba) {
      const alpha = Math.max(0, Math.min(1, Number(rgba[4])));
      const color = normalizeHexColor(`rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`);
      if (!color) return null;
      return {
        color,
        ...(alpha < 1 ? { transparency: Math.round((1 - alpha) * 100) } : {})
      };
    }

    const color = normalizeHexColor(input);
    return color ? { color } : null;
  }

  function resolvePptxTransparency(value) {
    if (typeof value !== 'string' && typeof value !== 'number') return 0;
    const input = `${value}`.trim();
    const parsed = Number.parseFloat(input);
    if (!Number.isFinite(parsed)) return 0;
    const opacity = input.endsWith('%') ? parsed / 100 : parsed;
    return Math.round((1 - Math.max(0, Math.min(1, opacity))) * 100);
  }

  function mergePptxTransparency(options, transparency) {
    const extraTransparency = Math.max(0, Math.min(100, Number(transparency) || 0));
    if (!options || typeof options !== 'object' || !extraTransparency) return options;
    const currentTransparency = Math.max(
      0,
      Math.min(100, Number(options && options.transparency) || 0)
    );
    const combinedTransparency = Math.round(
      (1 - ((1 - currentTransparency / 100) * (1 - extraTransparency / 100))) * 100
    );
    return {
      ...options,
      transparency: combinedTransparency
    };
  }

  function parseStyle(styleText) {
    if (typeof styleText !== 'string') return {};
    const declarations = [];
    let current = '';
    let quote = '';
    let parenDepth = 0;
    for (let index = 0; index < styleText.length; index += 1) {
      const char = styleText[index];
      if (quote) {
        current += char;
        if (char === quote && styleText[index - 1] !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === '\'') {
        quote = char;
        current += char;
        continue;
      }
      if (char === '(') parenDepth += 1;
      if (char === ')' && parenDepth > 0) parenDepth -= 1;
      if (char === ';' && parenDepth === 0) {
        declarations.push(current);
        current = '';
        continue;
      }
      current += char;
    }
    declarations.push(current);
    return declarations.reduce((styles, declaration) => {
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
    if (!match) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
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

  function isTextContainerNode(node) {
    const type = typeof node?.type === 'string' ? node.type.toLowerCase() : '';
    const tagName = typeof node?.tagName === 'string' ? node.tagName.toLowerCase() : '';
    return type === 'text'
      || type === 'heading'
      || type === 'code'
      || /^h[1-6]$/.test(tagName)
      || ['blockquote', 'code', 'li', 'p', 'pre', 'span'].includes(tagName);
  }

  function getCanonicalTableRows(node) {
    return (Array.isArray(node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr')
      .map(row => (Array.isArray(row.children) ? row.children : [])
        .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'))
        .map(getNestedNodeText))
      .filter(row => row.length > 0);
  }

  function getPptxRenderOrder(nodes = []) {
    return (Array.isArray(nodes) ? nodes : [])
      .map((node, index) => ({
        node,
        index,
        zIndex: Number.isFinite(node && node.layout && node.layout.zIndex)
          ? node.layout.zIndex
          : 0
      }))
      .sort((left, right) => left.zIndex - right.zIndex || left.index - right.index)
      .map(entry => entry.node);
  }

  function getNodeCanvasLayout(node, origin = {}) {
    const layout = asObject(node.layout);
    const x = Number.isFinite(layout.x) ? layout.x : null;
    const y = Number.isFinite(layout.y) ? layout.y : null;
    const width = Number.isFinite(layout.width) ? layout.width : null;
    const height = Number.isFinite(layout.height) ? layout.height : null;
    return {
      x: x === null ? null : x + (Number.isFinite(origin.x) ? origin.x : 0),
      y: y === null ? null : y + (Number.isFinite(origin.y) ? origin.y : 0),
      width,
      height
    };
  }

  function getNodeBounds(node, context, origin = {}) {
    const layout = getNodeCanvasLayout(node, origin);
    if (!layout || [layout.x, layout.y, layout.width, layout.height].some(value => value === null)
      || layout.width <= 0 || layout.height <= 0) {
      return null;
    }
    return {
      x: layout.x * context.scaleX,
      y: layout.y * context.scaleY,
      w: layout.width * context.scaleX,
      h: layout.height * context.scaleY
    };
  }

  function getNodeChildOrigin(node, origin = {}) {
    const layout = getNodeCanvasLayout(node, origin);
    return {
      x: Number.isFinite(layout.x) ? layout.x : (Number.isFinite(origin.x) ? origin.x : 0),
      y: Number.isFinite(layout.y) ? layout.y : (Number.isFinite(origin.y) ? origin.y : 0)
    };
  }

  function hasExportableChildBounds(children, origin = {}) {
    return (Array.isArray(children) ? children : []).some((child) => {
      const layout = getNodeCanvasLayout(child, origin);
      return [layout.x, layout.y, layout.width, layout.height].every(Number.isFinite)
        && layout.width > 0
        && layout.height > 0;
    });
  }

  function getNodeAttribute(node, name) {
    const attributes = asObject(node.attributes);
    return typeof attributes[name] === 'string' ? attributes[name] : '';
  }

  function resolveAssetSource(source, options) {
    if (!source) return '';
    if (/^(data:|https?:\/\/|file:\/\/|\/)/i.test(source) || !options.assetBaseDir) return source;
    return `${options.assetBaseDir.replace(/[\\/]$/, '')}/${source.replace(/^[/\\]+/, '')}`;
  }

  function resolveImageSource(node, deck, options) {
    const directSource = getNodeAttribute(node, 'src');
    const assetId = getNodeAttribute(node, 'data-asset-id') || getNodeAttribute(node, 'data-asset');
    const asset = assetId ? deck.assets.find(item => item.id === assetId) : null;
    return resolveAssetSource(directSource || (asset && asset.src) || '', options);
  }

  function extractCssImageSource(value) {
    if (typeof value !== 'string') return '';
    const match = value.match(/url\(\s*(?:'([^']*)'|"([^"]*)"|([^)]*))\s*\)/i);
    const source = (match && (match[1] || match[2] || match[3]) || '').trim();
    return source && !source.startsWith('#') ? source : '';
  }

  function resolveSlideBackgroundImageSource(background, options) {
    return resolveAssetSource(extractCssImageSource(background && background.image), options);
  }

  function resolveNodeBackgroundImageSource(node, options) {
    const style = nodeStyle(node);
    return resolveAssetSource(
      extractCssImageSource(style['background-image'] || style.background),
      options
    );
  }

  function resolveSlideBackgroundImageSizing(background, options) {
    const styles = parseStyle(background && background.style);
    const type = typeof styles['background-size'] === 'string'
      ? styles['background-size'].trim().toLowerCase()
      : '';
    if (type !== 'cover' && type !== 'contain') return null;
    const position = (styles['background-position'] || '').trim().toLowerCase();
    if (position && !/^(?:center|center\s+center)$/.test(position)) return null;
    const repeat = (styles['background-repeat'] || '').trim().toLowerCase();
    if (repeat && repeat !== 'no-repeat') return null;
    return {
      type,
      x: 0,
      y: 0,
      w: options.pageWidth,
      h: options.pageHeight
    };
  }

  function hasSupportedSlideBackgroundStyle(background, imageSource) {
    if (!imageSource) return false;
    const styles = parseStyle(background && background.style);
    const properties = Object.keys(styles);
    if (properties.length === 0) return false;
    return properties.every((property) => {
      if (property === 'background-size') {
        return ['cover', 'contain'].includes(styles[property].trim().toLowerCase());
      }
      if (property === 'background-position') {
        return /^(?:center|center\s+center)$/i.test(styles[property].trim());
      }
      return property === 'background-repeat' && styles[property].trim().toLowerCase() === 'no-repeat';
    });
  }

  function getBackgroundAssetDiagnosticId(slide) {
    return `${slide && slide.id ? slide.id : 'unknown'}:background`;
  }

  function getNodeBackgroundAssetDiagnosticId(node) {
    return `${node && node.id ? node.id : 'unknown'}:background`;
  }

  function nodeStyle(node) {
    const style = parseStyle(node.style);
    const attributes = asObject(node.attributes);
    if (typeof attributes.style === 'string') Object.assign(style, parseStyle(attributes.style));
    return style;
  }

  function nodeTransparency(node) {
    return resolvePptxTransparency(nodeStyle(node).opacity);
  }

  function resolveNodeImageSizing(node, bounds) {
    const objectFit = (nodeStyle(node)['object-fit'] || '').trim().toLowerCase();
    if (objectFit !== 'cover' && objectFit !== 'contain') return null;
    return {
      type: objectFit,
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h
    };
  }

  function resolveNodeBackgroundImageSizing(node, bounds) {
    const styles = nodeStyle(node);
    const type = (styles['background-size'] || '').trim().toLowerCase();
    if (type !== 'cover' && type !== 'contain') return null;
    const position = (styles['background-position'] || '').trim().toLowerCase();
    if (position && !/^(?:center|center\s+center)$/.test(position)) return null;
    const repeat = (styles['background-repeat'] || '').trim().toLowerCase();
    if (repeat && repeat !== 'no-repeat') return null;
    return {
      type,
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h
    };
  }

  function resolveSlideBackgroundColor(background = {}) {
    const directColor = normalizeHexColor(background.color);
    if (directColor) return directColor;
    const backgroundStyle = typeof background.style === 'string' ? background.style : '';
    const styleColor = normalizeHexColor(backgroundStyle);
    if (styleColor) return styleColor;
    const parsedStyle = parseStyle(backgroundStyle);
    return normalizeHexColor(parsedStyle['background-color'] || parsedStyle.background);
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
    return mergePptxTransparency({
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
    }, nodeTransparency(node));
  }

  function shapeOptions(node, bounds) {
    const style = nodeStyle(node);
    const fill = resolvePptxFillColor(style['background-color'] || style.background) || { color: 'FFFFFF' };
    const lineColor = normalizeHexColor(style['border-color']) || fill.color;
    const lineWidth = parseCssPx(style['border-width']);
    const transparency = nodeTransparency(node);
    return {
      ...bounds,
      fill: mergePptxTransparency(fill, transparency),
      line: mergePptxTransparency({
        color: lineColor,
        width: lineWidth === null ? 0.5 : Math.max(0, lineWidth * 0.75)
      }, transparency)
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
      missingAssets: [],
      missingBackgroundAssets: [],
      missingNodeBackgroundAssets: []
    };
  }

  function getSourceSize(deck, options) {
    return {
      width: finitePositive(options.sourceWidth, finitePositive(deck.layout.size.width, DEFAULT_SOURCE_WIDTH)),
      height: finitePositive(options.sourceHeight, finitePositive(deck.layout.size.height, DEFAULT_SOURCE_HEIGHT))
    };
  }

  function resolvePptxExportOptions(deck, options = {}) {
    const normalizedOptions = normalizePptxExportOptions(options);
    const sourceSize = getSourceSize(deck, normalizedOptions);
    const sourceAspectRatio = sourceSize.width / sourceSize.height;
    const requestedPageHeight = finitePositive(options.pageHeight, null);

    if (
      requestedPageHeight === null
      && normalizedOptions.layout === 'LAYOUT_WIDE'
      && Number.isFinite(sourceAspectRatio)
      && sourceAspectRatio > 0
      && Math.abs(sourceAspectRatio - DEFAULT_PPTX_ASPECT_RATIO) > 0.001
    ) {
      normalizedOptions.pageHeight = normalizedOptions.pageWidth / sourceAspectRatio;
    }

    const outputAspectRatio = normalizedOptions.pageWidth / normalizedOptions.pageHeight;
    if (
      normalizedOptions.layout === 'LAYOUT_WIDE'
      && Number.isFinite(outputAspectRatio)
      && Math.abs(outputAspectRatio - DEFAULT_PPTX_ASPECT_RATIO) > 0.001
    ) {
      normalizedOptions.layout = CUSTOM_PPTX_LAYOUT_NAME;
      normalizedOptions.customLayout = {
        name: CUSTOM_PPTX_LAYOUT_NAME,
        width: normalizedOptions.pageWidth,
        height: normalizedOptions.pageHeight
      };
    } else {
      normalizedOptions.customLayout = null;
    }

    return { options: normalizedOptions, sourceSize };
  }

  function preflightCanonicalPptxExport(deckSeed, options = {}) {
    const deck = canonicalDeck.createCanonicalDeck(deckSeed);
    const resolvedExportOptions = resolvePptxExportOptions(deck, options);
    const normalizedOptions = resolvedExportOptions.options;
    const sourceSize = resolvedExportOptions.sourceSize;
    const diagnostics = createExportDiagnostics();

    function visit(node, origin = {}) {
      if (!node || node.visibility?.hidden) return;
      const nodeId = node.id || 'unknown';
      const bounds = getNodeCanvasLayout(node, origin);
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
      const imageNode = type === 'image' || node.tagName === 'img';
      const style = nodeStyle(node);
      const nodeBackgroundValue = style['background-image'] || style.background || '';
      const nodeBackgroundSource = resolveNodeBackgroundImageSource(node, normalizedOptions);
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

      if (imageNode) {
        const objectFit = (style['object-fit'] || '').trim().toLowerCase();
        if (objectFit && !['fill', 'cover', 'contain'].includes(objectFit)) {
          diagnostics.unsupportedStyles.push({ id: nodeId, properties: ['object-fit'] });
          diagnostics.warnings.push(`Node ${nodeId} uses unsupported image fit: ${objectFit}`);
        }
      }

      if (nodeBackgroundValue && /(?:url\(|gradient\()/i.test(nodeBackgroundValue)) {
        if (!nodeBackgroundSource) {
          diagnostics.unsupportedStyles.push({ id: nodeId, properties: ['background-image'] });
          diagnostics.warnings.push(`Node ${nodeId} background image is not an exportable image URL`);
        } else {
          let hasMissingAsset = false;
          if (normalizedOptions.assetExists) {
            try {
              hasMissingAsset = !normalizedOptions.assetExists(
                nodeBackgroundSource,
                { id: getNodeBackgroundAssetDiagnosticId(node), type: 'background-image' },
                deck
              );
            } catch (err) {
              hasMissingAsset = true;
            }
          }
          if (hasMissingAsset) {
            const diagnosticId = getNodeBackgroundAssetDiagnosticId(node);
            diagnostics.missingNodeBackgroundAssets.push(diagnosticId);
            diagnostics.warnings.push(`Node ${nodeId} references a missing background image asset`);
          }
        }
      }

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
        const imageSource = resolveImageSource(node, deck, normalizedOptions);
        let hasMissingAsset = !imageSource;
        if (!hasMissingAsset && normalizedOptions.assetExists) {
          try {
            hasMissingAsset = !normalizedOptions.assetExists(imageSource, node, deck);
          } catch (err) {
            hasMissingAsset = true;
          }
        }
        if (hasMissingAsset) {
          diagnostics.missingAssets.push(nodeId);
          diagnostics.warnings.push(`Node ${nodeId} references a missing image asset`);
        }
      }

      const childNodes = type === 'table' || node.tagName === 'table' ? [] : node.children;
      const childOrigin = getNodeChildOrigin(node, origin);
      if (isTextContainerNode(node)
        && getNestedNodeText(node)
        && !hasExportableChildBounds(childNodes, childOrigin)) {
        return;
      }
      getPptxRenderOrder(childNodes).forEach(child => visit(child, childOrigin));
    }

    deck.slides.forEach(slide => {
      const background = asObject(slide.layout).background || {};
      const backgroundImageSource = resolveSlideBackgroundImageSource(background, normalizedOptions);
      const supportsBackgroundStyle = hasSupportedSlideBackgroundStyle(background, backgroundImageSource);
      if (background.style && !resolveSlideBackgroundColor(background) && !supportsBackgroundStyle) {
        diagnostics.unsupportedStyles.push({
          id: slide.id || 'unknown',
          properties: ['background']
        });
        diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} uses unsupported CSS background styling`);
      }
      if (background.image && !backgroundImageSource) {
        diagnostics.unsupportedStyles.push({
          id: slide.id || 'unknown',
          properties: ['background-image']
        });
        diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} background image is not an exportable image URL`);
      } else if (backgroundImageSource) {
        let hasMissingAsset = false;
        if (normalizedOptions.assetExists) {
          try {
            hasMissingAsset = !normalizedOptions.assetExists(backgroundImageSource, {
              id: getBackgroundAssetDiagnosticId(slide),
              type: 'background-image'
            }, deck);
          } catch (err) {
            hasMissingAsset = true;
          }
        }
        if (hasMissingAsset) {
          const diagnosticId = getBackgroundAssetDiagnosticId(slide);
          diagnostics.missingBackgroundAssets.push(diagnosticId);
          diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} references a missing background image asset`);
        }
      }
      slide.nodes.forEach(visit);
    });

    return { deck, options: normalizedOptions, sourceSize, diagnostics };
  }

  function renderNode(node, context, origin = {}) {
    if (!node || node.visibility?.hidden) return;
    const children = Array.isArray(node.children) ? node.children : [];
    const tagName = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : '';
    const type = typeof node.type === 'string' ? node.type.toLowerCase() : '';
    const bounds = getNodeBounds(node, context, origin);
    const imageNode = type === 'image' || tagName === 'img';
    const shapeNode = type === 'shape' || node.classes?.includes('editor-shape');
    const tableNode = type === 'table' || tagName === 'table';
    const childOrigin = getNodeChildOrigin(node, origin);
    const hasExportableChildren = hasExportableChildBounds(children, childOrigin);
    const text = getNestedNodeText(node);
    const style = nodeStyle(node);
    const transparency = nodeTransparency(node);
    const nodeBackgroundFill = mergePptxTransparency(
      resolvePptxFillColor(style['background-color'] || style.background),
      transparency
    );
    const nodeBackgroundSource = resolveNodeBackgroundImageSource(node, context.options);
    const missingNodeBackground = context.diagnostics
      && Array.isArray(context.diagnostics.missingNodeBackgroundAssets)
      && context.diagnostics.missingNodeBackgroundAssets.includes(getNodeBackgroundAssetDiagnosticId(node));

    if (nodeBackgroundFill && nodeBackgroundFill.transparency !== 100 && bounds && !shapeNode && typeof context.slide.addShape === 'function') {
      context.slide.addShape(getShapeType(context.pptx, 'rect'), {
        ...bounds,
        fill: nodeBackgroundFill,
        line: { color: nodeBackgroundFill.color, transparency: 100, width: 0 }
      });
    }

    if (nodeBackgroundSource && bounds && !missingNodeBackground && typeof context.slide.addImage === 'function') {
      const backgroundOptions = nodeBackgroundSource.startsWith('data:')
        ? { data: nodeBackgroundSource, ...bounds }
        : { path: nodeBackgroundSource, ...bounds };
      const sizing = resolveNodeBackgroundImageSizing(node, bounds);
      if (sizing) backgroundOptions.sizing = sizing;
      context.slide.addImage(mergePptxTransparency(backgroundOptions, transparency));
    }

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
      const missingAsset = context.diagnostics
        && Array.isArray(context.diagnostics.missingAssets)
        && context.diagnostics.missingAssets.includes(node.id);
      if (source && bounds && !missingAsset) {
        const imageOptions = source.startsWith('data:')
          ? { data: source, ...bounds }
          : { path: source, ...bounds };
        const sizing = resolveNodeImageSizing(node, bounds);
        if (sizing) imageOptions.sizing = sizing;
        context.slide.addImage(mergePptxTransparency(imageOptions, transparency));
      }
    } else if (shapeNode) {
      if (bounds) context.slide.addShape(getShapeType(context.pptx, 'rect'), shapeOptions(node, bounds));
    } else if (!UNSUPPORTED_NODE_TYPES.has(type)
      && text
      && bounds
      && (children.length === 0 || (isTextContainerNode(node) && !hasExportableChildren))) {
      context.slide.addText(text, textOptions(node, bounds));
    }

    getPptxRenderOrder(children).forEach(child => renderNode(child, context, childOrigin));
  }

  function renderSlide(slide, context) {
    const background = asObject(slide.layout).background || {};
    const color = resolveSlideBackgroundColor(background);
    if (color) context.slide.background = { color };
    const backgroundSource = resolveSlideBackgroundImageSource(background, context.options);
    const backgroundId = getBackgroundAssetDiagnosticId(slide);
    const missingBackground = context.diagnostics
      && Array.isArray(context.diagnostics.missingBackgroundAssets)
      && context.diagnostics.missingBackgroundAssets.includes(backgroundId);
    if (backgroundSource && !missingBackground && typeof context.slide.addImage === 'function') {
      const bounds = {
        x: 0,
        y: 0,
        w: context.options.pageWidth,
        h: context.options.pageHeight
      };
      const imageOptions = backgroundSource.startsWith('data:')
        ? { data: backgroundSource, ...bounds }
        : { path: backgroundSource, ...bounds };
      const sizing = resolveSlideBackgroundImageSizing(background, context.options);
      if (sizing) imageOptions.sizing = sizing;
      context.slide.addImage(imageOptions);
    }
    if (slide.notes && typeof context.slide.addNotes === 'function') context.slide.addNotes(slide.notes);
    getPptxRenderOrder(slide.nodes).forEach(node => renderNode(node, context));
  }

  function createCanonicalPptxExport(deckSeed, options = {}) {
    const preflight = preflightCanonicalPptxExport(deckSeed, options);
    const { deck, options: normalizedOptions, sourceSize, diagnostics } = preflight;
    if (deck.slides.length === 0) {
      diagnostics.warnings.push('Canonical deck has no slides');
      return { deck, pptx: null, slideCount: 0, diagnostics };
    }
    const PptxGenJS = normalizedOptions.PptxGenJS;
    const pptx = normalizedOptions.pptx || (typeof PptxGenJS === 'function' ? new PptxGenJS() : null);
    if (!pptx) {
      diagnostics.warnings.push('PptxGenJS is unavailable');
      return { deck, pptx: null, slideCount: 0, diagnostics };
    }

    if (normalizedOptions.customLayout) {
      if (typeof pptx.defineLayout !== 'function') {
        diagnostics.warnings.push('PptxGenJS custom layouts are unavailable; using the default wide layout');
        normalizedOptions.layout = 'LAYOUT_WIDE';
        normalizedOptions.pageWidth = DEFAULT_PPTX_WIDTH;
        normalizedOptions.pageHeight = DEFAULT_PPTX_HEIGHT;
      } else {
        try {
          pptx.defineLayout(normalizedOptions.customLayout);
        } catch (error) {
          diagnostics.warnings.push('PptxGenJS custom layout could not be defined; using the default wide layout');
          normalizedOptions.layout = 'LAYOUT_WIDE';
          normalizedOptions.pageWidth = DEFAULT_PPTX_WIDTH;
          normalizedOptions.pageHeight = DEFAULT_PPTX_HEIGHT;
        }
      }
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

    const sectionTitles = [];
    const seenSectionTitles = new Set();
    deck.slides.forEach((slide) => {
      const sectionTitle = typeof slide.section === 'string' ? slide.section.trim() : '';
      if (sectionTitle && !seenSectionTitles.has(sectionTitle)) {
        seenSectionTitles.add(sectionTitle);
        sectionTitles.push(sectionTitle);
      }
    });
    let canExportSections = sectionTitles.length > 0;
    if (canExportSections && typeof pptx.addSection !== 'function') {
      diagnostics.warnings.push('PptxGenJS sections are unavailable; slide section metadata was not exported');
      canExportSections = false;
    }
    if (canExportSections) {
      try {
        sectionTitles.forEach(title => pptx.addSection({ title }));
      } catch (error) {
        diagnostics.warnings.push('PptxGenJS sections could not be created; slide section metadata was not exported');
        canExportSections = false;
      }
    }

    deck.slides.forEach(slide => {
      if (typeof pptx.addSlide !== 'function') {
        diagnostics.warnings.push('PptxGenJS instance cannot add slides');
        return;
      }
      const sectionTitle = typeof slide.section === 'string' ? slide.section.trim() : '';
      const outputSlide = canExportSections && sectionTitle
        ? pptx.addSlide({ sectionTitle })
        : pptx.addSlide();
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
    DEFAULT_PPTX_ASPECT_RATIO,
    CUSTOM_PPTX_LAYOUT_NAME,
    DEFAULT_SOURCE_WIDTH,
    DEFAULT_SOURCE_HEIGHT,
    createPptxWarningDetailsHeader,
    normalizePptxExportOptions,
    resolvePptxExportOptions,
    normalizeHexColor,
    preflightCanonicalPptxExport,
    createCanonicalPptxExport
  };
});
