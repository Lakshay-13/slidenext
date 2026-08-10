(function (root, factory) {
  let defaultPptxGenJS = root && root.PptxGenJS;
  if (typeof module === 'object' && module.exports) {
    defaultPptxGenJS = require('pptxgenjs');
    module.exports = factory(require('./canonical-deck.js'), defaultPptxGenJS, require('./image-position'));
  } else if (root) {
    root.SlideNextCanonicalPptxExport = factory(
      root.SlideNextCanonicalDeck,
      defaultPptxGenJS,
      root.SlideNextImagePosition
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (canonicalDeck, defaultPptxGenJS, imagePosition) {
  if (!imagePosition) throw new Error('SlideNextImagePosition dependency is required');
  const DEFAULT_PPTX_WIDTH = 13.333;
  const DEFAULT_PPTX_HEIGHT = 7.5;
  const DEFAULT_PPTX_ASPECT_RATIO = DEFAULT_PPTX_WIDTH / DEFAULT_PPTX_HEIGHT;
  const CUSTOM_PPTX_LAYOUT_NAME = 'SLIDENEXT_CANVAS';
  const DEFAULT_SOURCE_WIDTH = 1920;
  const DEFAULT_SOURCE_HEIGHT = 1080;
  const UNSUPPORTED_NODE_TYPES = new Set(['vector', 'video', 'audio', 'embed', 'chart', 'script']);
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
      assetRootDir: typeof source.assetRootDir === 'string' ? source.assetRootDir : '',
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

  function resolveCssGradientFallbackColor(value) {
    if (typeof value !== 'string' || !/gradient\(/i.test(value)) return '';
    const colorCandidates = value.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)/gi) || [];
    for (const candidate of colorCandidates) {
      const color = normalizeHexColor(candidate);
      if (color) return color;
    }
    return '';
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
    if (color) return { color };
    const gradientFallbackColor = resolveCssGradientFallbackColor(input);
    return gradientFallbackColor ? { color: gradientFallbackColor } : null;
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

  function findCssFunctionEnd(value, startIndex) {
    let depth = 0;
    let quote = '';
    for (let index = startIndex; index < value.length; index += 1) {
      const char = value[index];
      if (quote) {
        if (char === quote && value[index - 1] !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '(') depth += 1;
      if (char === ')') {
        depth -= 1;
        if (depth === 0) return index;
      }
    }
    return -1;
  }

  function splitCssFunctionArguments(value) {
    let depth = 0;
    let quote = '';
    for (let index = 0; index < value.length; index += 1) {
      const char = value[index];
      if (quote) {
        if (char === quote && value[index - 1] !== '\\') quote = '';
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === '(') depth += 1;
      if (char === ')' && depth > 0) depth -= 1;
      if (char === ',' && depth === 0) {
        return [value.slice(0, index), value.slice(index + 1)];
      }
    }
    return [value, ''];
  }

  function resolveCssVariables(value, themeTokens = {}, resolving = new Set()) {
    if (typeof value !== 'string' || !value.toLowerCase().includes('var(')) return value;
    const tokens = asObject(themeTokens);
    let output = '';
    let cursor = 0;
    const variablePattern = /var\s*\(/gi;
    let match;
    while ((match = variablePattern.exec(value))) {
      const start = match.index;
      const end = findCssFunctionEnd(value, start + match[0].length - 1);
      if (end < 0) break;
      output += value.slice(cursor, start);
      const [rawName, rawFallback] = splitCssFunctionArguments(
        value.slice(start + match[0].length, end)
      );
      const tokenName = rawName.trim();
      const fallback = rawFallback.trim();
      const hasToken = Object.prototype.hasOwnProperty.call(tokens, tokenName)
        && typeof tokens[tokenName] === 'string'
        && tokens[tokenName].trim() !== '';
      if (/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(tokenName)
        && hasToken
        && !resolving.has(tokenName)) {
        const nextResolving = new Set(resolving);
        nextResolving.add(tokenName);
        output += resolveCssVariables(tokens[tokenName], tokens, nextResolving);
      } else if (fallback) {
        output += resolveCssVariables(fallback, tokens, resolving);
      } else {
        output += value.slice(start, end + 1);
      }
      cursor = end + 1;
      variablePattern.lastIndex = end + 1;
    }
    return output + value.slice(cursor);
  }

  function collectUnresolvedCssVariables(value) {
    if (typeof value !== 'string' || !value.toLowerCase().includes('var(')) return [];
    const unresolved = [];
    const variablePattern = /var\s*\(/gi;
    let match;
    while ((match = variablePattern.exec(value))) {
      const end = findCssFunctionEnd(value, match.index + match[0].length - 1);
      if (end < 0) break;
      const [rawName] = splitCssFunctionArguments(
        value.slice(match.index + match[0].length, end)
      );
      const tokenName = rawName.trim();
      if (/^--[A-Za-z_][A-Za-z0-9_-]*$/.test(tokenName) && !unresolved.includes(tokenName)) {
        unresolved.push(tokenName);
      }
      variablePattern.lastIndex = end + 1;
    }
    return unresolved;
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

  function isStructuralInlineBreakNode(node) {
    const tagName = typeof node?.tagName === 'string' ? node.tagName.toLowerCase() : '';
    return tagName === 'br' || tagName === 'wbr';
  }

  function getCanonicalTableRows(node, themeTokens = {}) {
    return (Array.isArray(node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr')
      .map(row => (Array.isArray(row.children) ? row.children : [])
        .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'))
        .map(cell => {
          const text = getNestedNodeText(cell);
          const cellStyle = nodeStyle(cell, themeTokens);
          const cellAttributes = asObject(cell.attributes);
          const cellOptions = {};
          const cellFill = resolvePptxFillColor(cellStyle['background-color'] || cellStyle.background);
          const cellColor = normalizeHexColor(cellStyle.color);
          const cellBorderColor = normalizeHexColor(cellStyle['border-color']);
          const cellBorderStyle = typeof cellStyle['border-style'] === 'string'
            ? cellStyle['border-style'].trim().toLowerCase()
            : '';
          const cellBorderType = {
            solid: 'solid',
            dashed: 'dash',
            dotted: 'dash',
            none: 'none',
            hidden: 'none'
          }[cellBorderStyle] || 'solid';
          const cellCssBorderWidth = parseCssPx(cellStyle['border-width']);
          const cellBorderWidth = cellCssBorderWidth === null
            ? 0.75
            : Math.max(0, cellCssBorderWidth * 0.75);
          const cellFontFace = typeof cellStyle['font-family'] === 'string'
            ? cellStyle['font-family'].split(',')[0].trim().replace(/^['"]|['"]$/g, '')
            : '';
          const cssFontSize = parseCssPx(cellStyle['font-size']);
          const cellFontSize = cssFontSize === null ? null : Math.max(6, cssFontSize * 0.75);
          const cellFontWeight = typeof cellStyle['font-weight'] === 'string'
            ? cellStyle['font-weight'].trim().toLowerCase()
            : '';
          const cellPadding = parseCssPx(cellStyle.padding);
          const cellTextDecoration = resolvePptxTextDecoration(
            [cellStyle['text-decoration'], cellStyle['text-decoration-line']].filter(Boolean).join(' ')
          );
          const cellItalic = typeof cellStyle['font-style'] === 'string'
            && cellStyle['font-style'].trim().toLowerCase() === 'italic';
          const colspan = Number.parseInt(cell.colspan || cellAttributes.colspan, 10);
          const rowspan = Number.parseInt(cell.rowspan || cellAttributes.rowspan, 10);
          if (Number.isInteger(colspan) && colspan > 1) cellOptions.colspan = colspan;
          if (Number.isInteger(rowspan) && rowspan > 1) cellOptions.rowspan = rowspan;
          if (cellPadding !== null && cellPadding >= 0) cellOptions.margin = cellPadding / 96;
          if (cell.tagName === 'th' || /^(bold|[6-9]00)$/.test(cellFontWeight)) {
            cellOptions.bold = true;
          }
          if (cellFill) cellOptions.fill = cellFill;
          if (cellColor) cellOptions.color = cellColor;
          if (cellBorderColor || cellBorderStyle) {
            cellOptions.border = {
              type: cellBorderType,
              color: cellBorderColor || 'D1D5DB',
              pt: cellBorderWidth
            };
          }
          if (cellFontFace) cellOptions.fontFace = cellFontFace;
          if (cellFontSize !== null) cellOptions.fontSize = cellFontSize;
          Object.assign(cellOptions, cellTextDecoration);
          if (cellItalic) cellOptions.italic = true;
          if (typeof cellStyle['text-align'] === 'string' && cellStyle['text-align'].trim()) {
            cellOptions.align = resolvePptxTextAlignment(cellStyle['text-align']);
          }
          const verticalAlignment = typeof cellStyle['vertical-align'] === 'string'
            ? cellStyle['vertical-align'].trim().toLowerCase()
            : '';
          if (['top', 'middle', 'bottom'].includes(verticalAlignment)) {
            cellOptions.valign = verticalAlignment;
          }
          return Object.keys(cellOptions).length > 0
            ? { text, options: cellOptions }
            : text;
        }))
      .filter(row => row.length > 0);
  }

  function getCanonicalTableFontSubstitutionRisks(node, availableFonts = [], themeTokens = {}) {
    const tableNodeId = node && node.id ? node.id : 'unknown';
    const knownFonts = Array.isArray(availableFonts) ? availableFonts : [];
    const risks = [];
    (Array.isArray(node && node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr')
      .forEach((row, rowIndex) => {
        (Array.isArray(row.children) ? row.children : [])
          .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'))
          .forEach((cell, cellIndex) => {
            const fontFamily = nodeStyle(cell, themeTokens)['font-family'];
            if (!fontFamily) return;
            const primaryFont = fontFamily.split(',')[0].trim().replace(/^['"]|['"]$/g, '');
            if (!primaryFont || knownFonts.includes(primaryFont)) return;
            risks.push({
              id: `${tableNodeId}:cell-${rowIndex + 1}-${cellIndex + 1}`,
              fontFamily: primaryFont
            });
          });
      });
    return risks;
  }

  function getPptxBorderStyleFallback(
    styleValue,
    supportedStyles = ['solid', 'dashed', 'none', 'hidden']
  ) {
    const borderStyle = typeof styleValue === 'string' ? styleValue.trim().toLowerCase() : '';
    if (!borderStyle || supportedStyles.includes(borderStyle)) return null;
    return {
      borderStyle,
      fallbackStyle: borderStyle === 'dotted' ? 'dashed' : 'solid'
    };
  }

  function getCanonicalTableBorderStyleRisks(node, themeTokens = {}) {
    const tableNodeId = node && node.id ? node.id : 'unknown';
    const risks = [];
    const addRisk = (id, styleValue, scope) => {
      const fallback = getPptxBorderStyleFallback(styleValue);
      if (fallback) risks.push({ id, scope, ...fallback });
    };
    addRisk(tableNodeId, nodeStyle(node, themeTokens)['border-style'], 'table');
    (Array.isArray(node && node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr')
      .forEach((row, rowIndex) => {
        (Array.isArray(row.children) ? row.children : [])
          .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'))
          .forEach((cell, cellIndex) => {
            addRisk(
              `${tableNodeId}:cell-${rowIndex + 1}-${cellIndex + 1}`,
              nodeStyle(cell, themeTokens)['border-style'],
              'table cell'
            );
          });
      });
    return risks;
  }

  function getCanonicalTableColumnWidths(node, tableWidth, themeTokens = {}) {
    if (!(Number.isFinite(tableWidth) && tableWidth > 0)) return null;
    const rows = (Array.isArray(node && node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr');
    const rowWithWidths = rows.find((row) => {
      const cells = (Array.isArray(row.children) ? row.children : [])
        .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'));
      return cells.length > 0 && cells.every((cell) => {
        const attributes = asObject(cell.attributes);
        const colspan = Number.parseInt(cell.colspan || attributes.colspan, 10);
        const width = parseCssPx(nodeStyle(cell, themeTokens).width);
        return (!Number.isInteger(colspan) || colspan <= 1) && Number.isFinite(width) && width > 0;
      });
    });
    if (!rowWithWidths) return null;

    const widths = rowWithWidths.children
      .filter(cell => cell && (cell.tagName === 'td' || cell.tagName === 'th'))
      .map(cell => parseCssPx(nodeStyle(cell, themeTokens).width));
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    if (!(totalWidth > 0)) return null;
    return widths.map(width => tableWidth * (width / totalWidth));
  }

  function getCanonicalTableRowHeights(node, tableHeight, themeTokens = {}) {
    if (!(Number.isFinite(tableHeight) && tableHeight > 0)) return null;
    const rows = (Array.isArray(node && node.children) ? node.children : [])
      .filter(row => row && row.tagName === 'tr');
    if (rows.length === 0) return null;
    const heights = rows.map(row => parseCssPx(nodeStyle(row, themeTokens).height));
    if (!heights.every(height => Number.isFinite(height) && height > 0)) return null;
    const totalHeight = heights.reduce((sum, height) => sum + height, 0);
    if (!(totalHeight > 0)) return null;
    return heights.map(height => tableHeight * (height / totalHeight));
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
    const bounds = asObject(layout.bounds);
    const x = Number.isFinite(layout.x)
      ? layout.x
      : Number.isFinite(bounds.x) ? bounds.x : null;
    const y = Number.isFinite(layout.y)
      ? layout.y
      : Number.isFinite(bounds.y) ? bounds.y : null;
    const width = Number.isFinite(layout.width)
      ? layout.width
      : Number.isFinite(bounds.width) ? bounds.width : null;
    const height = Number.isFinite(layout.height)
      ? layout.height
      : Number.isFinite(bounds.height) ? bounds.height : null;
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

  function parseCanonicalChartNumberList(value) {
    if (typeof value !== 'string' || !value.trim()) return [];
    const parts = value.split(',').map(part => part.trim()).filter(Boolean);
    const values = parts.map(Number);
    return values.length > 0 && values.every(Number.isFinite) ? values : [];
  }

  function hasCanonicalNodeClass(node, className) {
    const classes = Array.isArray(node && node.classes) ? node.classes : [];
    const classAttribute = getNodeAttribute(node, 'class');
    return classes.includes(className) || classAttribute.split(/\s+/).includes(className);
  }

  function isCanonicalEmbedPlaceholder(node) {
    return hasCanonicalNodeClass(node, 'editor-embed-placeholder')
      || getNodeAttribute(node, 'data-embed-placeholder').trim().toLowerCase() === 'true';
  }

  function encodePptxBase64(value) {
    if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
      return Buffer.from(value, 'utf8').toString('base64');
    }
    if (typeof btoa !== 'function') return '';
    try {
      const binary = encodeURIComponent(value).replace(/%([0-9a-f]{2})/gi, (_match, hex) => (
        String.fromCharCode(Number.parseInt(hex, 16))
      ));
      return btoa(binary);
    } catch (error) {
      return '';
    }
  }

  const SAFE_SVG_ROOT_ATTRIBUTE_NAMES = new Set([
    'aria-hidden',
    'aria-label',
    'color',
    'enable-background',
    'fill',
    'fill-opacity',
    'fill-rule',
    'focusable',
    'height',
    'id',
    'opacity',
    'preserveaspectratio',
    'role',
    'stroke',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-miterlimit',
    'stroke-opacity',
    'stroke-width',
    'version',
    'viewbox',
    'width',
    'xml:space',
    'xmlns',
    'xmlns:xlink'
  ]);

  function escapeSvgAttributeValue(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function restoreCanonicalSvgRootAttributes(source, node) {
    const openingTagMatch = source.match(/^<svg\b[^>]*>/i);
    if (!openingTagMatch) return source;
    const existingAttributeNames = new Set(
      [...openingTagMatch[0].matchAll(/\s([:\w-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g)]
        .map(match => match[1].toLowerCase())
    );
    const additions = Object.entries(asObject(node && node.attributes))
      .filter(([name, value]) => (
        typeof value === 'string'
        && value
        && SAFE_SVG_ROOT_ATTRIBUTE_NAMES.has(name.toLowerCase())
        && !existingAttributeNames.has(name.toLowerCase())
      ))
      .map(([name, value]) => ` ${name}="${escapeSvgAttributeValue(value)}"`)
      .join('');
    if (!additions) return source;
    return `${openingTagMatch[0].slice(0, -1)}${additions}>${source.slice(openingTagMatch[0].length)}`;
  }

  function getCanonicalInlineSvgData(node) {
    const type = typeof node?.type === 'string' ? node.type.toLowerCase() : '';
    const tagName = typeof node?.tagName === 'string' ? node.tagName.toLowerCase() : '';
    if (type !== 'vector' && tagName !== 'svg') return '';
    const rawSource = typeof node?.html === 'string' ? node.html.trim() : '';
    const source = rawSource ? restoreCanonicalSvgRootAttributes(rawSource, node) : '';
    if (!/^<svg(?:\s|>)/i.test(source) || !/<\/svg>$/i.test(source)) return '';
    if (/<(?:script|iframe|video|audio)\b/i.test(source)
      || /\b(?:href|xlink:href)\s*=\s*["'](?:https?:|file:|\/\/)/i.test(source)
      || /url\(\s*["']?(?:https?:|file:|\/\/)/i.test(source)) {
      return '';
    }
    const encoded = encodePptxBase64(source);
    return encoded ? `data:image/svg+xml;base64,${encoded}` : '';
  }

  function collectCanonicalChartBars(nodes, bars = []) {
    (Array.isArray(nodes) ? nodes : []).forEach((child) => {
      if (hasCanonicalNodeClass(child, 'editor-chart-bar')) bars.push(child);
      collectCanonicalChartBars(child && child.children, bars);
    });
    return bars;
  }

  function parseCanonicalChartBarValue(node, themeTokens = {}) {
    const attributes = ['data-chart-value', 'data-value'];
    for (const attribute of attributes) {
      const rawValue = getNodeAttribute(node, attribute).trim();
      if (!rawValue) continue;
      const value = Number(rawValue);
      if (Number.isFinite(value)) return value;
    }
    const height = nodeStyle(node, themeTokens).height;
    const match = typeof height === 'string' && height.trim().match(/^(-?(?:\d+\.?\d*|\.\d+))(?:%|px)?$/i);
    return match ? Number(match[1]) : null;
  }

  function getCanonicalChartTitle(node) {
    const titleAttribute = getNodeAttribute(node, 'data-chart-title').trim();
    if (titleAttribute) return titleAttribute;
    const titleNode = (Array.isArray(node && node.children) ? node.children : [])
      .find(child => getNodeAttribute(child, 'class').split(/\s+/).includes('editor-chart-title')
        || (Array.isArray(child && child.classes) && child.classes.includes('editor-chart-title')));
    return titleNode ? getNestedNodeText(titleNode) : '';
  }

  function getCanonicalChartData(node, themeTokens = {}) {
    const chartType = getNodeAttribute(node, 'data-chart-type').trim().toLowerCase() || 'bar';
    if (!['bar', 'column'].includes(chartType)) return null;
    let values = parseCanonicalChartNumberList(getNodeAttribute(node, 'data-chart-values'));
    if (values.length === 0) {
      const legacyBars = collectCanonicalChartBars(node && node.children)
        .map(child => parseCanonicalChartBarValue(child, themeTokens));
      if (legacyBars.length > 0 && legacyBars.every(Number.isFinite)) values = legacyBars;
    }
    if (values.length === 0) return null;
    const rawLabels = getNodeAttribute(node, 'data-chart-labels')
      .split(',')
      .map(label => label.trim());
    const labels = values.map((_, index) => rawLabels[index] || String(index + 1));
    return {
      type: 'bar',
      labels,
      values,
      title: getCanonicalChartTitle(node)
    };
  }

  function resolveAssetSource(source, options) {
    if (!source) return '';
    if (/^(data:|https?:\/\/|file:\/\/)/i.test(source)) return source;
    if (/^\//.test(source) && options.assetRootDir) {
      return `${options.assetRootDir.replace(/[\\/]$/, '')}/${source.replace(/^[/\\]+/, '')}`;
    }
    if (/^\//.test(source) || !options.assetBaseDir) return source;
    return `${options.assetBaseDir.replace(/[\\/]$/, '')}/${source.replace(/^[/\\]+/, '')}`;
  }

  function resolveImageSource(node, deck, options) {
    return resolveImageAsset(node, deck, options).source;
  }

  function resolveImageAsset(node, deck, options) {
    const directSource = getNodeAttribute(node, 'src');
    const assetId = typeof node.assetId === 'string' && node.assetId.trim()
      ? node.assetId.trim()
      : getNodeAttribute(node, 'data-asset-id') || getNodeAttribute(node, 'data-asset');
    const asset = assetId
      ? deck.assets.find(item => item.id === assetId)
      : deck.assets.find(item => item.src === directSource);
    const resolvedSource = assetId && asset ? asset.src : directSource || (asset && asset.src) || '';
    return {
      asset: asset || null,
      source: resolveAssetSource(resolvedSource, options)
    };
  }

  function extractCssImageSource(value) {
    if (typeof value !== 'string') return '';
    const match = value.match(/url\(\s*(?:'([^']*)'|"([^"]*)"|([^)]*))\s*\)/i);
    const source = (match && (match[1] || match[2] || match[3]) || '').trim();
    return source && !source.startsWith('#') ? source : '';
  }

  function getUnsupportedPptxBackgroundImageEffects(value) {
    if (typeof value !== 'string') return [];
    const effects = [];
    if (/gradient\(/i.test(value)) effects.push('unsupported background gradients');
    if ((value.match(/url\(/gi) || []).length > 1) {
      effects.push('multiple background image layers are not supported');
    }
    return effects;
  }

  function resolveSlideBackgroundImageSource(background, options) {
    return resolveSlideBackgroundImageAsset(background, null, options).source;
  }

  function resolveSlideBackgroundImageAsset(background, deck, options) {
    const themeTokens = asObject(deck && deck.theme && deck.theme.tokens);
    const rawSource = extractCssImageSource(resolveCssVariables(
      background && background.image,
      themeTokens
    ));
    const source = resolveAssetSource(rawSource, options);
    const assets = deck && Array.isArray(deck.assets) ? deck.assets : [];
    const assetId = typeof background.assetId === 'string' ? background.assetId.trim() : '';
    const asset = assetId
      ? assets.find(item => item.id === assetId)
      : assets.find(item => item.src === rawSource || resolveAssetSource(item.src, options) === source);
    const resolvedSource = assetId && asset ? asset.src : rawSource || (asset && asset.src) || '';
    return {
      asset: asset || null,
      source: resolveAssetSource(resolvedSource, options)
    };
  }

  function resolveNodeBackgroundImageSource(node, options) {
    return resolveNodeBackgroundImageAsset(node, null, options).source;
  }

  function resolveNodeBackgroundImageAsset(node, deck, options) {
    const themeTokens = asObject(deck && deck.theme && deck.theme.tokens);
    const style = nodeStyle(node, themeTokens);
    const rawSource = extractCssImageSource(style['background-image'] || style.background);
    const source = resolveAssetSource(rawSource, options);
    const attributes = asObject(node && node.attributes);
    const assetId = typeof node.backgroundAssetId === 'string' && node.backgroundAssetId.trim()
      ? node.backgroundAssetId.trim()
      : typeof attributes['data-background-asset-id'] === 'string'
      ? attributes['data-background-asset-id']
      : typeof attributes['data-background-asset'] === 'string'
        ? attributes['data-background-asset']
        : '';
    const assets = deck && Array.isArray(deck.assets) ? deck.assets : [];
    const asset = assetId
      ? assets.find(item => item.id === assetId)
      : assets.find(item => item.src === rawSource || resolveAssetSource(item.src, options) === source);
    const resolvedSource = assetId && asset ? asset.src : rawSource || (asset && asset.src) || '';
    return {
      asset: asset || null,
      source: resolveAssetSource(resolvedSource, options)
    };
  }

  function resolveSlideBackgroundImageSizing(background, options, asset, themeTokens = {}) {
    const styles = parseStyle(resolveCssVariables(background && background.style, themeTokens));
    const type = typeof styles['background-size'] === 'string'
      ? styles['background-size'].trim().toLowerCase()
      : '';
    if (type !== 'cover' && type !== 'contain') return null;
    const repeat = (styles['background-repeat'] || '').trim().toLowerCase();
    if (repeat && repeat !== 'no-repeat') return null;
    const position = parsePptxImagePosition(styles['background-position']);
    if (!position) return null;
    return resolvePptxImageFitSizing(type, position, {
      x: 0,
      y: 0,
      w: options.pageWidth,
      h: options.pageHeight
    }, asset);
  }

  function hasSupportedSlideBackgroundStyle(background, imageSource, imageAsset, themeTokens = {}) {
    if (!imageSource) return false;
    const styles = parseStyle(resolveCssVariables(background && background.style, themeTokens));
    const properties = Object.keys(styles);
    if (properties.length === 0) return false;
    return properties.every((property) => {
      if (property === 'background-size') {
        return ['cover', 'contain'].includes(styles[property].trim().toLowerCase());
      }
      if (property === 'background-position') {
        return isCenteredPptxImagePosition(styles[property])
          || (['cover', 'contain'].includes((styles['background-size'] || '').trim().toLowerCase())
            && getPptxImageDimensions(imageAsset)
            && parsePptxImagePosition(styles[property]));
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

  function nodeStyle(node, themeTokens = {}) {
    const style = parseStyle(node.style);
    const attributes = asObject(node.attributes);
    if (typeof attributes.style === 'string') Object.assign(style, parseStyle(attributes.style));
    Object.keys(style).forEach(property => {
      style[property] = resolveCssVariables(style[property], themeTokens);
    });
    return style;
  }

  function nodeTransparency(node, themeTokens = {}) {
    return resolvePptxTransparency(nodeStyle(node, themeTokens).opacity);
  }

  function getPptxImageDimensions(asset) {
    const meta = asObject(asset && asset.meta);
    const width = Number(meta.width);
    const height = Number(meta.height);
    return Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
      ? { width, height }
      : null;
  }

  function parsePptxImagePosition(value) {
    return imagePosition.parseImagePosition(value);
  }

  function resolvePptxImageFitSizing(objectFit, position, bounds, asset) {
    const dimensions = getPptxImageDimensions(asset);
    if (objectFit === 'cover' && dimensions && position) {
      const sourceAspectRatio = dimensions.width / dimensions.height;
      const boxAspectRatio = bounds.w / bounds.h;
      const imageWidth = sourceAspectRatio >= boxAspectRatio
        ? bounds.h * sourceAspectRatio
        : bounds.w;
      const imageHeight = sourceAspectRatio >= boxAspectRatio
        ? bounds.h
        : bounds.w / sourceAspectRatio;
      const cropX = (imageWidth - bounds.w) * position.x;
      const cropY = (imageHeight - bounds.h) * position.y;
      return {
        imageX: bounds.x,
        imageY: bounds.y,
        imageWidth,
        imageHeight,
        sizing: {
          type: 'crop',
          x: cropX,
          y: cropY,
          w: bounds.w,
          h: bounds.h
        }
      };
    }

    if (objectFit === 'contain' && dimensions && position) {
      const sourceAspectRatio = dimensions.width / dimensions.height;
      const boxAspectRatio = bounds.w / bounds.h;
      const imageWidth = sourceAspectRatio >= boxAspectRatio
        ? bounds.w
        : bounds.h * sourceAspectRatio;
      const imageHeight = sourceAspectRatio >= boxAspectRatio
        ? bounds.w / sourceAspectRatio
        : bounds.h;
      return {
        imageX: bounds.x + ((bounds.w - imageWidth) * position.x),
        imageY: bounds.y + ((bounds.h - imageHeight) * position.y),
        imageWidth,
        imageHeight,
        sizing: null
      };
    }

    return {
      sizing: {
        type: objectFit,
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h
      }
    };
  }

  function resolveNodeImageSizing(node, bounds, asset, themeTokens = {}) {
    const styles = nodeStyle(node, themeTokens);
    const objectFit = (styles['object-fit'] || '').trim().toLowerCase();
    if (objectFit !== 'cover' && objectFit !== 'contain') return null;
    return resolvePptxImageFitSizing(
      objectFit,
      parsePptxImagePosition(styles['object-position']),
      bounds,
      asset
    );
  }

  function isCenteredPptxImagePosition(value) {
    return imagePosition.isCenteredImagePosition(value);
  }

  function getUnsupportedPptxImagePlacementProperties(style, options = {}) {
    const properties = [];
    const objectFit = (style['object-fit'] || '').trim().toLowerCase();
    if (options.imageNode && ['cover', 'contain'].includes(objectFit)
      && !isCenteredPptxImagePosition(style['object-position'])
      && (!getPptxImageDimensions(options.imageAsset)
        || !parsePptxImagePosition(style['object-position']))) {
      properties.push('object-position');
    }
    if (options.backgroundImage) {
      const backgroundSize = (style['background-size'] || '').trim().toLowerCase();
      if (backgroundSize && !['cover', 'contain'].includes(backgroundSize)) properties.push('background-size');
      if (!isCenteredPptxImagePosition(style['background-position'])
        && (!['cover', 'contain'].includes(backgroundSize)
          || !getPptxImageDimensions(options.imageAsset)
          || !parsePptxImagePosition(style['background-position']))) {
        properties.push('background-position');
      }
      const backgroundRepeat = (style['background-repeat'] || '').trim().toLowerCase();
      if (backgroundRepeat && backgroundRepeat !== 'no-repeat') properties.push('background-repeat');
    }
    return properties;
  }

  function resolveNodeBackgroundImageSizing(node, bounds, asset, themeTokens = {}) {
    const styles = nodeStyle(node, themeTokens);
    const type = (styles['background-size'] || '').trim().toLowerCase();
    if (type !== 'cover' && type !== 'contain') return null;
    const repeat = (styles['background-repeat'] || '').trim().toLowerCase();
    if (repeat && repeat !== 'no-repeat') return null;
    const position = parsePptxImagePosition(styles['background-position']);
    if (!position) return null;
    return resolvePptxImageFitSizing(type, position, bounds, asset);
  }

  function resolveSlideBackgroundColor(background = {}, themeTokens = {}) {
    const directColor = normalizeHexColor(resolveCssVariables(background.color, themeTokens));
    if (directColor) return directColor;
    const backgroundStyle = resolveCssVariables(
      typeof background.style === 'string' ? background.style : '',
      themeTokens
    );
    const styleColor = normalizeHexColor(backgroundStyle);
    if (styleColor) return styleColor;
    const parsedStyle = parseStyle(backgroundStyle);
    const parsedColor = normalizeHexColor(parsedStyle['background-color'] || parsedStyle.background);
    return parsedColor || resolveCssGradientFallbackColor(backgroundStyle);
  }

  function resolvePptxTextAlignment(value) {
    const alignment = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (alignment === 'start') return 'left';
    if (alignment === 'end') return 'right';
    return ['left', 'center', 'right', 'justify'].includes(alignment) ? alignment : 'left';
  }

  function resolvePptxTextDecoration(value) {
    const decoration = typeof value === 'string' ? value.trim().toLowerCase() : '';
    const tokens = new Set(decoration.split(/\s+/).filter(Boolean));
    return {
      ...(tokens.has('underline') ? { underline: { style: 'sng' } } : {}),
      ...(tokens.has('line-through') ? { strike: true } : {})
    };
  }

  function textOptions(node, bounds, themeTokens = {}) {
    const style = nodeStyle(node, themeTokens);
    const tagName = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : '';
    const cssFontSize = parseCssPx(style['font-size']);
    const defaultFontSize = /^h[1-6]$/.test(tagName)
      ? Math.max(14, 30 - (Number(tagName.slice(1)) - 1) * 3)
      : 14;
    const fontSize = Math.max(6, (cssFontSize === null ? defaultFontSize : cssFontSize) * 0.75);
    const lineHeight = typeof style['line-height'] === 'string'
      ? style['line-height'].trim().toLowerCase()
      : '';
    const lineHeightMatch = lineHeight.match(/^(\d[\d.]*)(px|%)?$/i);
    const lineHeightValue = lineHeightMatch ? Number(lineHeightMatch[1]) : null;
    const lineSpacing = lineHeightMatch && lineHeightMatch[2] === 'px' && lineHeightValue > 0
      ? { lineSpacing: lineHeightValue * 0.75 }
      : lineHeightMatch && lineHeightMatch[2] === '%' && lineHeightValue > 0
        ? { lineSpacingMultiple: lineHeightValue / 100 }
        : lineHeightMatch && !lineHeightMatch[2] && lineHeightValue > 0
          ? { lineSpacingMultiple: lineHeightValue }
          : {};
    const verticalAlignment = ['top', 'middle', 'bottom'].includes(style['vertical-align'])
      ? { valign: style['vertical-align'] }
      : {};
    const textDecoration = resolvePptxTextDecoration(
      [style['text-decoration'], style['text-decoration-line']].filter(Boolean).join(' ')
    );
    const cssLetterSpacing = parseCssPx(style['letter-spacing']);
    const characterSpacing = cssLetterSpacing === null
      ? {}
      : { charSpacing: cssLetterSpacing * 0.75 };
    const cssPadding = parseCssPx(style.padding);
    const margin = cssPadding === null || cssPadding < 0 ? 0 : cssPadding / 96;
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
      align: resolvePptxTextAlignment(style['text-align']),
      margin,
      breakLine: false,
      fit: 'shrink',
      ...lineSpacing,
      ...verticalAlignment,
      ...textDecoration,
      ...characterSpacing
    }, nodeTransparency(node, themeTokens));
  }

  function shapeOptions(node, bounds, themeTokens = {}) {
    const style = nodeStyle(node, themeTokens);
    const fill = resolvePptxFillColor(
      style['background-color'] || style.background || style['background-image']
    ) || { color: 'FFFFFF' };
    const lineColor = normalizeHexColor(style['border-color']) || fill.color;
    const lineWidth = parseCssPx(style['border-width']);
    const borderStyle = typeof style['border-style'] === 'string'
      ? style['border-style'].trim().toLowerCase()
      : '';
    const lineStyle = borderStyle === 'dashed'
      ? { dashType: 'dash' }
      : borderStyle === 'dotted'
        ? { dashType: 'sysDot' }
        : ['none', 'hidden'].includes(borderStyle)
          ? { transparency: 100 }
          : {};
    const transparency = nodeTransparency(node, themeTokens);
    return {
      ...bounds,
      fill: mergePptxTransparency(fill, transparency),
      line: mergePptxTransparency({
        color: lineColor,
        width: lineWidth === null ? 0.5 : Math.max(0, lineWidth * 0.75),
        ...lineStyle
      }, transparency)
    };
  }

  function getShapeType(pptx, name) {
    const shapeTypes = asObject(pptx && pptx.ShapeType);
    return shapeTypes[name] || name;
  }

  function resolvePptxBorderRadius(node, themeTokens = {}) {
    const style = nodeStyle(node, themeTokens);
    const radiusValue = typeof style['border-radius'] === 'string'
      ? style['border-radius'].trim().split(/\s+/)[0]
      : '';
    if (!radiusValue) return null;
    const isPercent = radiusValue.endsWith('%');
    const radius = isPercent
      ? parseCssPx(radiusValue.slice(0, -1))
      : parseCssPx(radiusValue);
    return radius > 0 ? { isPercent, radius } : null;
  }

  function hasUnsupportedPptxBorderRadius(node, themeTokens = {}) {
    const value = nodeStyle(node, themeTokens)['border-radius'];
    if (typeof value !== 'string' || !value.trim()) return false;
    const [horizontalPart, verticalPart] = value.split('/').map(part => part.trim());
    if (verticalPart) return true;
    const tokens = horizontalPart.split(/\s+/).filter(Boolean);
    return tokens.length > 1 && tokens.some(token => token !== tokens[0]);
  }

  function resolvePptxNodeShapeType(node, bounds, pptx, themeTokens = {}) {
    const shapeTypes = asObject(pptx && pptx.ShapeType);
    const rectangle = shapeTypes.rect || 'rect';
    const radius = resolvePptxBorderRadius(node, themeTokens);
    if (!radius) return rectangle;

    const nodeLayout = getNodeCanvasLayout(node);
    const minDimension = [nodeLayout.width, nodeLayout.height].every(Number.isFinite)
      ? Math.min(nodeLayout.width, nodeLayout.height)
      : 0;
    if (radius.isPercent && radius.radius >= 50) {
      return shapeTypes.ellipse || rectangle;
    }
    if (!radius.isPercent && minDimension > 0 && radius.radius >= minDimension / 2) {
      return shapeTypes.ellipse || rectangle;
    }
    return shapeTypes.roundRect || rectangle;
  }

  function createExportDiagnostics() {
    return {
      warnings: [],
      unsupportedNodes: [],
      unsupportedStyles: [],
      overflowNodes: [],
      clippedNodes: [],
      fontSubstitutionRisks: [],
      unresolvedThemeTokens: [],
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
    const themeTokens = asObject(deck.theme && deck.theme.tokens);

    function visit(node, origin = {}, parentClip = null, flowTextAncestor = false) {
      if (!node || node.visibility?.hidden) return;
      const nodeId = node.id || 'unknown';
      const bounds = getNodeCanvasLayout(node, origin);
      const hasBounds = [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
        && bounds.width > 0
        && bounds.height > 0;
      const type = typeof node.type === 'string' ? node.type.toLowerCase() : '';
      const childNodes = type === 'table' || node.tagName === 'table' ? [] : node.children;
      const childOrigin = getNodeChildOrigin(node, origin);
      const hasExportableChildren = hasExportableChildBounds(childNodes, childOrigin);
      const nestedText = getNestedNodeText(node);
      const isUnpositionedFlowTextDescendant = flowTextAncestor
        && isTextContainerNode(node)
        && !!nestedText;
      if (!hasBounds
        && !hasExportableChildren
        && !isUnpositionedFlowTextDescendant
        && !isStructuralInlineBreakNode(node)) {
        diagnostics.warnings.push(`Node ${nodeId} has no exportable bounds`);
      } else if (hasBounds && (
        bounds.x < 0
        || bounds.y < 0
        || bounds.x + bounds.width > sourceSize.width
        || bounds.y + bounds.height > sourceSize.height
      )) {
        diagnostics.overflowNodes.push({
          id: nodeId,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
        diagnostics.warnings.push(`Node ${nodeId} extends beyond slide bounds`);
      }
      if (parentClip && hasBounds && (
        bounds.x < parentClip.x
        || bounds.y < parentClip.y
        || bounds.x + bounds.width > parentClip.x + parentClip.width
        || bounds.y + bounds.height > parentClip.y + parentClip.height
      )) {
        diagnostics.clippedNodes.push({
          id: nodeId,
          clip: { ...parentClip },
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height
        });
        diagnostics.warnings.push(`Node ${nodeId} extends beyond an overflow-clipped ancestor`);
      }

      const imageNode = type === 'image' || node.tagName === 'img';
      const style = nodeStyle(node, themeTokens);
      const unresolvedThemeTokens = Object.values(style)
        .flatMap(collectUnresolvedCssVariables);
      if (unresolvedThemeTokens.length > 0) {
        diagnostics.unresolvedThemeTokens.push({
          id: nodeId,
          tokens: [...new Set(unresolvedThemeTokens)]
        });
        diagnostics.warnings.push(
          `Node ${nodeId} references unresolved theme token(s): ${[...new Set(unresolvedThemeTokens)].join(', ')}`
        );
      }
      const nodeBackgroundValue = style['background-image'] || style.background || '';
      const hasGradientBackground = /gradient\(/i.test(nodeBackgroundValue);
      const gradientFallbackColor = resolveCssGradientFallbackColor(nodeBackgroundValue);
      const nodeBackgroundAsset = resolveNodeBackgroundImageAsset(node, deck, normalizedOptions);
      const nodeBackgroundSource = nodeBackgroundAsset.source;
      const chartData = type === 'chart' ? getCanonicalChartData(node, themeTokens) : null;
      const embedPlaceholderNode = type === 'embed' && isCanonicalEmbedPlaceholder(node);
      const svgData = getCanonicalInlineSvgData(node);
      if (UNSUPPORTED_NODE_TYPES.has(type)
        && !(type === 'chart' && chartData)
        && !embedPlaceholderNode
        && !svgData) {
        diagnostics.unsupportedNodes.push({
          id: nodeId,
          type,
          tagName: node.tagName || '',
          reason: `node type ${type}`
        });
        diagnostics.warnings.push(`Node ${nodeId} is not fully supported: node type ${type}`);
      }
      if (type === 'table' || node.tagName === 'table') {
        if (getCanonicalTableRows(node, themeTokens).length === 0) {
          diagnostics.unsupportedNodes.push({
            id: nodeId,
            type: 'table',
            tagName: node.tagName || '',
            reason: 'table has no exportable rows'
          });
          diagnostics.warnings.push(`Node ${nodeId} is not fully supported: table has no exportable rows`);
        }
        getCanonicalTableFontSubstitutionRisks(node, normalizedOptions.availableFonts, themeTokens)
          .forEach((risk) => {
            diagnostics.fontSubstitutionRisks.push(risk);
            diagnostics.warnings.push(`Node ${risk.id} may substitute font ${risk.fontFamily}`);
          });
        getCanonicalTableBorderStyleRisks(node, themeTokens).forEach((risk) => {
          diagnostics.unsupportedStyles.push({ id: risk.id, properties: ['border-style'] });
          diagnostics.warnings.push(
            `Node ${risk.id} uses unsupported ${risk.scope} border-style: ${risk.borderStyle}; using ${risk.fallbackStyle} fallback`
          );
        });
      }
      const shapeNode = type === 'shape' || node.classes?.includes('editor-shape');
      if (shapeNode) {
        const fallback = getPptxBorderStyleFallback(
          style['border-style'],
          ['solid', 'dashed', 'dotted', 'none', 'hidden']
        );
        if (fallback) {
          diagnostics.unsupportedStyles.push({ id: nodeId, properties: ['border-style'] });
          diagnostics.warnings.push(
            `Node ${nodeId} uses unsupported shape border-style: ${fallback.borderStyle}; using ${fallback.fallbackStyle} fallback`
          );
        }
      }

      if (imageNode) {
        const imageAsset = resolveImageAsset(node, deck, normalizedOptions);
        const objectFit = (style['object-fit'] || '').trim().toLowerCase();
        if (objectFit && !['fill', 'cover', 'contain'].includes(objectFit)) {
          diagnostics.unsupportedStyles.push({ id: nodeId, properties: ['object-fit'] });
          diagnostics.warnings.push(`Node ${nodeId} uses unsupported image fit: ${objectFit}`);
        }
        const unsupportedImagePlacement = getUnsupportedPptxImagePlacementProperties(style, {
          imageNode: true,
          imageAsset: imageAsset.asset
        });
        if (unsupportedImagePlacement.length > 0) {
          diagnostics.unsupportedStyles.push({ id: nodeId, properties: unsupportedImagePlacement });
          diagnostics.warnings.push(`Node ${nodeId} uses unsupported image positioning: ${unsupportedImagePlacement.join(', ')}`);
        }
      }

      if (nodeBackgroundValue && /(?:url\(|gradient\()/i.test(nodeBackgroundValue)) {
        if (!nodeBackgroundSource) {
          diagnostics.unsupportedStyles.push({
            id: nodeId,
            properties: [hasGradientBackground ? 'background' : 'background-image']
          });
          diagnostics.warnings.push(
            hasGradientBackground
              ? gradientFallbackColor
                ? `Node ${nodeId} uses unsupported background gradients; using the first stop color fallback`
                : `Node ${nodeId} uses unsupported background gradients; no solid fallback is available`
              : `Node ${nodeId} background image is not an exportable image URL`
          );
        } else {
          const unsupportedBackgroundEffects = getUnsupportedPptxBackgroundImageEffects(nodeBackgroundValue);
          if (unsupportedBackgroundEffects.length > 0) {
            diagnostics.unsupportedStyles.push({ id: nodeId, properties: ['background-image'] });
            unsupportedBackgroundEffects.forEach(effect => {
              diagnostics.warnings.push(`Node ${nodeId} uses ${effect}`);
            });
          }
          const unsupportedBackgroundPlacement = getUnsupportedPptxImagePlacementProperties(style, {
            backgroundImage: true,
            imageAsset: nodeBackgroundAsset.asset
          });
          if (unsupportedBackgroundPlacement.length > 0) {
            diagnostics.unsupportedStyles.push({ id: nodeId, properties: unsupportedBackgroundPlacement });
            diagnostics.warnings.push(`Node ${nodeId} uses unsupported background image positioning: ${unsupportedBackgroundPlacement.join(', ')}`);
          }
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

      if (hasUnsupportedPptxBorderRadius(node, themeTokens)) {
        diagnostics.unsupportedStyles.push({ id: nodeId, properties: ['border-radius'] });
        diagnostics.warnings.push(`Node ${nodeId} uses unsupported non-uniform border-radius`);
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

      if (isTextContainerNode(node)
        && nestedText
        && !hasExportableChildBounds(childNodes, childOrigin)) {
        return;
      }
      const overflow = style.overflow || style['overflow-x'] || style['overflow-y'] || '';
      const createsClip = /^(?:hidden|clip)$/i.test(overflow.trim()) && hasBounds;
      const nextClip = createsClip
        ? parentClip
          ? {
              x: Math.max(parentClip.x, bounds.x),
              y: Math.max(parentClip.y, bounds.y),
              width: Math.max(0, Math.min(parentClip.x + parentClip.width, bounds.x + bounds.width) - Math.max(parentClip.x, bounds.x)),
              height: Math.max(0, Math.min(parentClip.y + parentClip.height, bounds.y + bounds.height) - Math.max(parentClip.y, bounds.y))
            }
          : { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        : parentClip;
      const nextFlowTextAncestor = flowTextAncestor
        || (hasBounds
          && isTextContainerNode(node)
          && !!nestedText
          && !hasExportableChildren);
      getPptxRenderOrder(childNodes).forEach(child => visit(
        child,
        childOrigin,
        nextClip,
        nextFlowTextAncestor
      ));
    }

    deck.slides.forEach(slide => {
      const background = asObject(slide.layout).background || {};
      const unresolvedThemeTokens = [background.color, background.style, background.image]
        .map(value => resolveCssVariables(value, themeTokens))
        .flatMap(collectUnresolvedCssVariables);
      if (unresolvedThemeTokens.length > 0) {
        const slideBackgroundId = getBackgroundAssetDiagnosticId(slide);
        const tokens = [...new Set(unresolvedThemeTokens)];
        diagnostics.unresolvedThemeTokens.push({ id: slideBackgroundId, tokens });
        diagnostics.warnings.push(
          `Slide ${slide.id || 'unknown'} references unresolved theme token(s): ${tokens.join(', ')}`
        );
      }
      const backgroundImageAsset = resolveSlideBackgroundImageAsset(background, deck, normalizedOptions);
      const backgroundImageSource = backgroundImageAsset.source;
      const supportsBackgroundStyle = hasSupportedSlideBackgroundStyle(
        background,
        backgroundImageSource,
        backgroundImageAsset.asset,
        themeTokens
      );
      const hasGradientBackground = background.style && /gradient\(/i.test(background.style);
      const gradientFallbackColor = resolveSlideBackgroundColor(background, themeTokens);
      if (background.style
        && !hasGradientBackground
        && !resolveSlideBackgroundColor(background, themeTokens)
        && !supportsBackgroundStyle) {
        diagnostics.unsupportedStyles.push({
          id: slide.id || 'unknown',
          properties: ['background']
        });
        diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} uses unsupported CSS background styling`);
      }
      if (background.style && /gradient\(/i.test(background.style)) {
        diagnostics.unsupportedStyles.push({
          id: slide.id || 'unknown',
          properties: ['background']
        });
        diagnostics.warnings.push(
          gradientFallbackColor
            ? `Slide ${slide.id || 'unknown'} uses unsupported CSS background gradients; using the first stop color fallback`
            : `Slide ${slide.id || 'unknown'} uses unsupported CSS background gradients; no solid fallback is available`
        );
      }
      if (background.image && !backgroundImageSource) {
        diagnostics.unsupportedStyles.push({
          id: slide.id || 'unknown',
          properties: ['background-image']
        });
        diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} background image is not an exportable image URL`);
      } else if (backgroundImageSource) {
        const unsupportedBackgroundEffects = getUnsupportedPptxBackgroundImageEffects(background.image || '');
        if (unsupportedBackgroundEffects.length > 0) {
          diagnostics.unsupportedStyles.push({
            id: slide.id || 'unknown',
            properties: ['background-image']
          });
          unsupportedBackgroundEffects.forEach(effect => {
            diagnostics.warnings.push(`Slide ${slide.id || 'unknown'} uses ${effect}`);
          });
        }
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
      slide.nodes.forEach(node => visit(node));
    });

    return { deck, options: normalizedOptions, sourceSize, diagnostics };
  }

  function renderNode(node, context, origin = {}) {
    if (!node || node.visibility?.hidden) return;
    const themeTokens = asObject(context.deck.theme && context.deck.theme.tokens);
    const children = Array.isArray(node.children) ? node.children : [];
    const tagName = typeof node.tagName === 'string' ? node.tagName.toLowerCase() : '';
    const type = typeof node.type === 'string' ? node.type.toLowerCase() : '';
    const bounds = getNodeBounds(node, context, origin);
    const imageNode = type === 'image' || tagName === 'img';
    const shapeNode = type === 'shape' || node.classes?.includes('editor-shape');
    const tableNode = type === 'table' || tagName === 'table';
    const chartNode = type === 'chart';
    const chartData = chartNode ? getCanonicalChartData(node, themeTokens) : null;
    const embedPlaceholderNode = type === 'embed' && isCanonicalEmbedPlaceholder(node);
    const svgData = getCanonicalInlineSvgData(node);
    const childOrigin = getNodeChildOrigin(node, origin);
    const hasExportableChildren = hasExportableChildBounds(children, childOrigin);
    const text = getNestedNodeText(node);
    const style = nodeStyle(node, themeTokens);
    const transparency = nodeTransparency(node, themeTokens);
    const nodeBackgroundFill = mergePptxTransparency(
      resolvePptxFillColor(style['background-color'] || style.background || style['background-image']),
      transparency
    );
    const nodeBackgroundAsset = resolveNodeBackgroundImageAsset(node, context.deck, context.options);
    const nodeBackgroundSource = nodeBackgroundAsset.source;
    const missingNodeBackground = context.diagnostics
      && Array.isArray(context.diagnostics.missingNodeBackgroundAssets)
      && context.diagnostics.missingNodeBackgroundAssets.includes(getNodeBackgroundAssetDiagnosticId(node));

    if (nodeBackgroundFill && nodeBackgroundFill.transparency !== 100 && bounds
      && !shapeNode && !tableNode && !embedPlaceholderNode
      && typeof context.slide.addShape === 'function') {
      context.slide.addShape(resolvePptxNodeShapeType(node, bounds, context.pptx, themeTokens), {
        ...bounds,
        fill: nodeBackgroundFill,
        line: { color: nodeBackgroundFill.color, transparency: 100, width: 0 }
      });
    }

    if (nodeBackgroundSource && bounds && !missingNodeBackground && typeof context.slide.addImage === 'function') {
      const backgroundOptions = nodeBackgroundSource.startsWith('data:')
        ? { data: nodeBackgroundSource, ...bounds }
        : { path: nodeBackgroundSource, ...bounds };
      const sizing = resolveNodeBackgroundImageSizing(
        node,
        bounds,
        nodeBackgroundAsset.asset,
        themeTokens
      );
      if (sizing) {
        if (sizing.sizing) backgroundOptions.sizing = sizing.sizing;
        if (Number.isFinite(sizing.imageX)) backgroundOptions.x = sizing.imageX;
        if (Number.isFinite(sizing.imageY)) backgroundOptions.y = sizing.imageY;
        if (Number.isFinite(sizing.imageWidth) && Number.isFinite(sizing.imageHeight)) {
          backgroundOptions.w = sizing.imageWidth;
          backgroundOptions.h = sizing.imageHeight;
        }
      }
      if (resolvePptxBorderRadius(node, themeTokens)) backgroundOptions.rounding = true;
      context.slide.addImage(mergePptxTransparency(backgroundOptions, transparency));
    }

    if (chartNode && chartData && bounds && typeof context.slide.addChart === 'function') {
      const chartOptions = {
        ...bounds,
        barDir: 'col',
        showLegend: false,
        ...(chartData.title ? { showTitle: true, title: chartData.title } : {})
      };
      context.slide.addChart(chartData.type, [{
        name: chartData.title || 'Series 1',
        labels: chartData.labels,
        values: chartData.values
      }], chartOptions);
    } else if (embedPlaceholderNode && bounds) {
      if (typeof context.slide.addShape === 'function') {
        context.slide.addShape(
          resolvePptxNodeShapeType(node, bounds, context.pptx, themeTokens),
          shapeOptions(node, bounds, themeTokens)
        );
      }
      if (text && typeof context.slide.addText === 'function') {
        context.slide.addText(text, textOptions(node, bounds, themeTokens));
      }
    } else if (svgData && bounds && typeof context.slide.addImage === 'function') {
      context.slide.addImage({ data: svgData, ...bounds });
    } else if (tableNode) {
      const rows = getCanonicalTableRows(node, themeTokens);
      if (rows.length > 0 && bounds && typeof context.slide.addTable === 'function') {
        const tableStyle = nodeStyle(node, themeTokens);
        const tableFontFace = typeof tableStyle['font-family'] === 'string'
          ? tableStyle['font-family'].split(',')[0].trim().replace(/^['"]|['"]$/g, '')
          : '';
        const tableCssFontSize = parseCssPx(tableStyle['font-size']);
        const tableFontSize = tableCssFontSize === null
          ? 11
          : Math.max(6, tableCssFontSize * 0.75);
        const tableColor = normalizeHexColor(tableStyle.color) || '000000';
        const tableFill = resolvePptxFillColor(
          tableStyle['background-color'] || tableStyle.background
        ) || { color: 'FFFFFF' };
        const tableBorderColor = normalizeHexColor(tableStyle['border-color']) || 'D1D5DB';
        const tableCssBorderWidth = parseCssPx(tableStyle['border-width']);
        const tableBorderWidth = tableCssBorderWidth === null
          ? 0.75
          : Math.max(0, tableCssBorderWidth * 0.75);
        const tableBorderStyle = typeof tableStyle['border-style'] === 'string'
          ? tableStyle['border-style'].trim().toLowerCase()
          : '';
        const tableBorderType = {
          solid: 'solid',
          dashed: 'dash',
          dotted: 'dash',
          none: 'none',
          hidden: 'none'
        }[tableBorderStyle] || 'solid';
        const tableColumnWidths = getCanonicalTableColumnWidths(node, bounds.w, themeTokens);
        const tableRowHeights = getCanonicalTableRowHeights(node, bounds.h, themeTokens);
        context.slide.addTable(rows, {
          ...bounds,
          ...(tableColumnWidths ? { colW: tableColumnWidths } : {}),
          ...(tableRowHeights ? { rowH: tableRowHeights } : {}),
          border: { type: tableBorderType, color: tableBorderColor, pt: tableBorderWidth },
          color: tableColor,
          fill: tableFill,
          fontFace: tableFontFace || 'Aptos',
          fontSize: tableFontSize,
          margin: 0.04
        });
      }
    } else if (imageNode) {
      const imageAsset = resolveImageAsset(node, context.deck, context.options);
      const source = imageAsset.source;
      const missingAsset = context.diagnostics
        && Array.isArray(context.diagnostics.missingAssets)
        && context.diagnostics.missingAssets.includes(node.id);
      if (source && bounds && !missingAsset) {
        const imageOptions = source.startsWith('data:')
          ? { data: source, ...bounds }
          : { path: source, ...bounds };
        const sizing = resolveNodeImageSizing(node, bounds, imageAsset.asset, themeTokens);
        if (sizing) {
          if (sizing.sizing) imageOptions.sizing = sizing.sizing;
          if (Number.isFinite(sizing.imageX)) imageOptions.x = sizing.imageX;
          if (Number.isFinite(sizing.imageY)) imageOptions.y = sizing.imageY;
          if (Number.isFinite(sizing.imageWidth) && Number.isFinite(sizing.imageHeight)) {
            imageOptions.w = sizing.imageWidth;
            imageOptions.h = sizing.imageHeight;
          }
        }
        if (resolvePptxBorderRadius(node, themeTokens)) imageOptions.rounding = true;
        context.slide.addImage(mergePptxTransparency(imageOptions, transparency));
      }
    } else if (shapeNode) {
      if (bounds) {
        context.slide.addShape(
          resolvePptxNodeShapeType(node, bounds, context.pptx, themeTokens),
          shapeOptions(node, bounds, themeTokens)
        );
      }
    } else if (!UNSUPPORTED_NODE_TYPES.has(type)
      && text
      && bounds
      && (children.length === 0 || (isTextContainerNode(node) && !hasExportableChildren))) {
      context.slide.addText(text, textOptions(node, bounds, themeTokens));
    }

    getPptxRenderOrder(children).forEach(child => renderNode(child, context, childOrigin));
  }

  function renderSlide(slide, context) {
    const themeTokens = asObject(context.deck.theme && context.deck.theme.tokens);
    const background = asObject(slide.layout).background || {};
    const color = resolveSlideBackgroundColor(background, themeTokens);
    if (color) context.slide.background = { color };
    const backgroundAsset = resolveSlideBackgroundImageAsset(background, context.deck, context.options);
    const backgroundSource = backgroundAsset.source;
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
      const sizing = resolveSlideBackgroundImageSizing(
        background,
        context.options,
        backgroundAsset.asset,
        themeTokens
      );
      if (sizing) {
        if (sizing.sizing) imageOptions.sizing = sizing.sizing;
        if (Number.isFinite(sizing.imageX)) imageOptions.x = sizing.imageX;
        if (Number.isFinite(sizing.imageY)) imageOptions.y = sizing.imageY;
        if (Number.isFinite(sizing.imageWidth) && Number.isFinite(sizing.imageHeight)) {
          imageOptions.w = sizing.imageWidth;
          imageOptions.h = sizing.imageHeight;
        }
      }
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
    if (typeof pptx.addSlide !== 'function') {
      diagnostics.warnings.push('PptxGenJS cannot add slides');
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

    let canRenderAllSlides = true;
    deck.slides.forEach(slide => {
      if (!canRenderAllSlides) return;
      const sectionTitle = typeof slide.section === 'string' ? slide.section.trim() : '';
      const outputSlide = canExportSections && sectionTitle
        ? pptx.addSlide({ sectionTitle })
        : pptx.addSlide();
      if (!outputSlide || (typeof outputSlide !== 'object' && typeof outputSlide !== 'function')) {
        diagnostics.warnings.push(`PptxGenJS could not create slide ${slide.id || 'unknown'}`);
        canRenderAllSlides = false;
        return;
      }
      renderSlide(slide, { ...contextBase, slide: outputSlide });
    });

    if (!canRenderAllSlides) {
      return { deck, pptx: null, slideCount: 0, diagnostics };
    }

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
