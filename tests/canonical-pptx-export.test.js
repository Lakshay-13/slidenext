const test = require('node:test');
const assert = require('node:assert/strict');

const pptxExport = require('../shared/canonical-pptx-export.js');

class FakeSlide {
  constructor() {
    this.calls = [];
  }

  addText(text, options) {
    this.calls.push({ type: 'text', text, options });
  }

  addImage(options) {
    this.calls.push({ type: 'image', options });
  }

  addShape(type, options) {
    this.calls.push({ type: 'shape', shapeType: type, options });
  }

  addTable(rows, options) {
    this.calls.push({ type: 'table', rows, options });
  }

  addNotes(notes) {
    this.calls.push({ type: 'notes', notes });
  }
}

class FakePptx {
  constructor() {
    this.ShapeType = {
      ellipse: 'ELLIPSE',
      rect: 'RECTANGLE',
      roundRect: 'ROUND_RECTANGLE'
    };
    this.layouts = [];
    this.slides = [];
    this.sections = [];
    this.slideOptions = [];
  }

  defineLayout(layout) {
    this.layouts.push(layout);
  }

  addSection(section) {
    this.sections.push(section);
  }

  addSlide(options) {
    this.slideOptions.push(options);
    const slide = new FakeSlide();
    this.slides.push(slide);
    return slide;
  }
}

test('createCanonicalPptxExport maps canonical slide nodes into PPTX calls', () => {
  const result = pptxExport.createCanonicalPptxExport({
    metadata: {
      title: 'Canonical deck',
      description: 'Export smoke test'
    },
    layout: {
      size: { width: 1000, height: 500, unit: 'px' }
    },
    assets: [{
      id: 'asset-1',
      src: 'data:image/png;base64,AAAA'
    }],
    slides: [{
      id: 'slide-1',
      notes: 'Speaker notes',
      layout: { background: { color: '#abc' } },
      nodes: [
        {
          id: 'heading-1',
          type: 'heading',
          tagName: 'h1',
          text: 'Hello',
          style: 'font-size: 20px; color: rgb(255, 0, 0);',
          layout: { x: 100, y: 50, width: 200, height: 100 }
        },
        {
          id: 'shape-1',
          type: 'shape',
          style: 'background-color: #00ff00; border-color: #0000ff;',
          layout: { x: 400, y: 100, width: 100, height: 50 }
        },
        {
          id: 'image-1',
          type: 'image',
          attributes: { 'data-asset-id': 'asset-1' },
          style: 'object-fit: cover;',
          layout: { x: 600, y: 100, width: 100, height: 50 }
        },
        {
          id: 'table-1',
          type: 'table',
          layout: { x: 0, y: 0, width: 100, height: 50 }
        },
        {
          id: 'table-2',
          type: 'table',
          style: 'font-family: Georgia, serif; font-size: 20px; color: #0f172a; background-color: #f8fafc; border-color: #94a3b8; border-width: 2px; border-style: dashed;',
          layout: { x: 0, y: 200, width: 400, height: 150 },
          children: [{
            tagName: 'tr',
            children: [
              { tagName: 'th', text: 'Name', style: 'background-color: #eef2ff;' },
              { tagName: 'th', text: 'Value', style: 'text-align: right; color: #1d4ed8; font-style: italic; font-family: Georgia, serif; font-size: 20px;' }
            ]
          }, {
            tagName: 'tr',
            children: [
              { tagName: 'td', text: 'Alpha', style: 'text-align: center; vertical-align: middle; font-weight: 700; text-decoration: underline line-through; border-color: #ef4444; border-width: 3px; border-style: dotted;' },
              { tagName: 'td', text: '42' }
            ]
          }]
        },
        {
          id: 'hidden-1',
          type: 'text',
          text: 'Do not export',
          visibility: { hidden: true },
          layout: { x: 0, y: 0, width: 100, height: 50 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.slideCount, 1);
  assert.equal(result.pptx.layout, 'SLIDENEXT_CANVAS');
  assert.deepEqual(result.pptx.layouts, [{
    name: 'SLIDENEXT_CANVAS',
    width: 13.333,
    height: 6.6665
  }]);
  assert.equal(result.pptx.title, 'Canonical deck');
  assert.equal(result.pptx.subject, 'Export smoke test');
  assert.deepEqual(result.pptx.slides[0].background, { color: 'AABBCC' });
  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), [
    'notes', 'text', 'shape', 'image', 'table'
  ]);

  const textCall = result.pptx.slides[0].calls[1];
  assert.equal(textCall.text, 'Hello');
  assert.ok(Math.abs(textCall.options.x - 1.3333) < 0.001);
  assert.ok(Math.abs(textCall.options.w - 2.6666) < 0.001);
  assert.equal(textCall.options.color, 'FF0000');

  const imageCall = result.pptx.slides[0].calls[3];
  assert.equal(imageCall.options.data, 'data:image/png;base64,AAAA');
  assert.deepEqual(imageCall.options.sizing, {
    type: 'cover',
    x: imageCall.options.x,
    y: imageCall.options.y,
    w: imageCall.options.w,
    h: imageCall.options.h
  });
  assert.deepEqual(result.pptx.slides[0].calls[4].rows, [
    [
      { text: 'Name', options: { bold: true, fill: { color: 'EEF2FF' } } },
      { text: 'Value', options: { bold: true, align: 'right', color: '1D4ED8', italic: true, fontFace: 'Georgia', fontSize: 15 } }
    ],
    [{ text: 'Alpha', options: { align: 'center', valign: 'middle', bold: true, underline: { style: 'sng' }, strike: true, border: { type: 'dash', color: 'EF4444', pt: 2.25 } } }, '42']
  ]);
  assert.equal(result.pptx.slides[0].calls[4].options.fontFace, 'Georgia');
  assert.equal(result.pptx.slides[0].calls[4].options.fontSize, 15);
  assert.equal(result.pptx.slides[0].calls[4].options.color, '0F172A');
  assert.deepEqual(result.pptx.slides[0].calls[4].options.fill, { color: 'F8FAFC' });
  assert.deepEqual(result.pptx.slides[0].calls[4].options.border, {
    type: 'dash',
    color: '94A3B8',
    pt: 1.5
  });
  assert.equal(result.diagnostics.unsupportedNodes[0].id, 'table-1');
  assert.deepEqual(result.diagnostics.missingAssets, []);
});

test('resolvePptxExportOptions keeps the default wide layout for canonical 16:9 decks', () => {
  const result = pptxExport.resolvePptxExportOptions({
    layout: { size: { width: 1920, height: 1080, unit: 'px' } },
    slides: []
  });

  assert.equal(result.options.layout, 'LAYOUT_WIDE');
  assert.equal(result.options.pageWidth, 13.333);
  assert.equal(result.options.pageHeight, 7.5);
  assert.equal(result.options.customLayout, null);
});

test('createCanonicalPptxExport fails closed for an empty canonical deck', () => {
  const result = pptxExport.createCanonicalPptxExport({ slides: [] }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx, null);
  assert.equal(result.slideCount, 0);
  assert.deepEqual(result.diagnostics.warnings, ['Canonical deck has no slides']);
});

test('createCanonicalPptxExport preserves canonical slide sections', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [
      { id: 'slide-1', section: 'Opening', nodes: [] },
      { id: 'slide-2', section: 'Opening', nodes: [] },
      { id: 'slide-3', section: 'Closing', nodes: [] }
    ]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.sections, [
    { title: 'Opening' },
    { title: 'Closing' }
  ]);
  assert.deepEqual(result.pptx.slideOptions, [
    { sectionTitle: 'Opening' },
    { sectionTitle: 'Opening' },
    { sectionTitle: 'Closing' }
  ]);
  assert.deepEqual(result.diagnostics.warnings, []);
});

test('createCanonicalPptxExport warns when section support is unavailable', () => {
  class LegacyPptx extends FakePptx {
    constructor() {
      super();
      this.addSection = undefined;
    }
  }

  const result = pptxExport.createCanonicalPptxExport({
    slides: [{ id: 'slide-1', section: 'Opening', nodes: [] }]
  }, { PptxGenJS: LegacyPptx });

  assert.match(result.diagnostics.warnings.join('\n'), /sections are unavailable/);
  assert.deepEqual(result.pptx.slideOptions, [undefined]);
});

test('createCanonicalPptxExport reports missing geometry and image assets without throwing', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [
        { id: 'flow-1', type: 'text', text: 'No bounds' },
        {
          id: 'image-1',
          type: 'image',
          layout: { x: 0, y: 0, width: 100, height: 100 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.slideCount, 1);
  assert.deepEqual(result.diagnostics.missingAssets, ['image-1']);
  assert.match(result.diagnostics.warnings[0], /flow-1/);
  assert.equal(result.pptx.slides[0].calls.length, 0);
});

test('preflightCanonicalPptxExport does not warn for bound children inside flow containers', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'flow-container',
        type: 'container',
        children: [{
          id: 'positioned-child',
          type: 'text',
          text: 'Exported child',
          layout: { x: 10, y: 20, width: 120, height: 30 }
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.warnings, []);
});

test('preflightCanonicalPptxExport reports children clipped by overflow-hidden ancestors', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'clipping-panel',
        type: 'container',
        style: 'overflow: hidden;',
        layout: { x: 100, y: 50, width: 200, height: 100 },
        children: [{
          id: 'clipped-child',
          type: 'text',
          text: 'Clipped content',
          layout: { x: 180, y: 10, width: 80, height: 30 }
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.clippedNodes.map(node => node.id), ['clipped-child']);
  assert.match(report.diagnostics.warnings.join('\n'), /overflow-clipped ancestor/);
});

test('preflightCanonicalPptxExport checks non-empty image paths when an asset resolver is provided', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'images/missing.png' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    assetBaseDir: '/deck',
    assetExists(source) {
      return source !== '/deck/images/missing.png';
    }
  });

  assert.deepEqual(report.diagnostics.missingAssets, ['image-1']);
  assert.match(report.diagnostics.warnings.join('\n'), /missing image asset/);
});

test('createCanonicalPptxExport skips missing image files after preflight', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { src: '/deck/images/missing.png' },
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    PptxGenJS: FakePptx,
    assetExists: () => false
  });

  assert.deepEqual(result.diagnostics.missingAssets, ['image-1']);
  assert.deepEqual(result.pptx.slides[0].calls, []);
});

test('createCanonicalPptxExport preserves solid legacy slide backgrounds from style text', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      layout: { background: { style: 'background: #123456;' } },
      nodes: []
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].background, { color: '123456' });
});

test('createCanonicalPptxExport renders canonical slide background images before nodes', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      id: 'slide-1',
      layout: {
        background: {
          image: 'url("data:image/png;base64,AAAA")',
          style: 'background-size: cover; background-position: center;'
        }
      },
      nodes: [{
        id: 'text-1',
        type: 'text',
        text: 'Foreground',
        layout: { x: 100, y: 50, width: 200, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['image', 'text']);
  assert.deepEqual(result.pptx.slides[0].calls[0].options, {
    data: 'data:image/png;base64,AAAA',
    x: 0,
    y: 0,
    w: 13.333,
    h: 6.6665,
    sizing: {
      type: 'cover',
      x: 0,
      y: 0,
      w: 13.333,
      h: 6.6665
    }
  });
  assert.deepEqual(result.diagnostics.missingBackgroundAssets, []);
  assert.deepEqual(result.diagnostics.warnings, []);
});

test('preflightCanonicalPptxExport reports missing slide background image assets', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: { background: { image: 'url("images/background.png")' } },
      nodes: []
    }]
  }, {
    assetBaseDir: '/deck',
    assetExists(source) {
      return source !== '/deck/images/background.png';
    }
  });

  assert.deepEqual(report.diagnostics.missingBackgroundAssets, ['slide-1:background']);
  assert.match(report.diagnostics.warnings.join('\n'), /missing background image asset/);
});

test('createCanonicalPptxExport renders node background images before child content', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"); background-size: cover; background-position: center;',
        layout: { x: 100, y: 50, width: 400, height: 200 },
        children: [{
          id: 'panel-text',
          type: 'text',
          text: 'Panel content',
          layout: { x: 20, y: 15, width: 200, height: 40 }
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['image', 'text']);
  assert.deepEqual(result.pptx.slides[0].calls[0].options.sizing, {
    type: 'cover',
    x: 1.3333,
    y: 0.66665,
    w: 5.3332,
    h: 2.6666
  });
  assert.deepEqual(result.diagnostics.missingNodeBackgroundAssets, []);
});

test('createCanonicalPptxExport renders solid node backgrounds beneath child content with alpha', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-color: rgba(10, 20, 30, 0.5);',
        layout: { x: 100, y: 50, width: 400, height: 200 },
        children: [{
          id: 'panel-text',
          type: 'text',
          text: 'Panel content',
          layout: { x: 20, y: 15, width: 200, height: 40 }
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.type), ['shape', 'text']);
  assert.deepEqual(result.pptx.slides[0].calls[0].options.fill, {
    color: '0A141E',
    transparency: 50
  });
  assert.deepEqual(result.pptx.slides[0].calls[0].options.line, {
    color: '0A141E',
    transparency: 100,
    width: 0
  });
});

test('createCanonicalPptxExport preserves rounded and circular shape geometry', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'rounded-card',
        type: 'shape',
        style: 'background-color: #123456; border-radius: 16px;',
        layout: { x: 0, y: 0, width: 400, height: 200 }
      }, {
        id: 'circle',
        type: 'shape',
        style: 'background-color: #abcdef; border-radius: 50%;',
        layout: { x: 500, y: 0, width: 200, height: 200 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(
    result.pptx.slides[0].calls.map(call => call.shapeType),
    ['ROUND_RECTANGLE', 'ELLIPSE']
  );
});

test('createCanonicalPptxExport preserves rounded image corners', () => {
  const result = pptxExport.createCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'border-radius: 12px; object-fit: cover;',
        layout: { x: 0, y: 0, width: 200, height: 100 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.equal(result.pptx.slides[0].calls[0].type, 'image');
  assert.equal(result.pptx.slides[0].calls[0].options.rounding, true);
});

test('createCanonicalPptxExport preserves node opacity across text, shape, and image output', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'text-1',
        type: 'text',
        text: 'Faded text',
        style: 'opacity: 0.6;',
        layout: { x: 0, y: 0, width: 200, height: 40 }
      }, {
        id: 'shape-1',
        type: 'shape',
        style: 'background-color: rgba(10, 20, 30, 0.5); opacity: 0.5;',
        layout: { x: 0, y: 50, width: 200, height: 40 }
      }, {
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'opacity: 25%;',
        layout: { x: 0, y: 100, width: 200, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const [textCall, shapeCall, imageCall] = result.pptx.slides[0].calls;
  assert.equal(textCall.options.transparency, 40);
  assert.equal(shapeCall.options.fill.transparency, 75);
  assert.equal(shapeCall.options.line.transparency, 50);
  assert.equal(imageCall.options.transparency, 75);
});

test('createCanonicalPptxExport preserves supported CSS text line heights', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'pixel-leading',
        type: 'text',
        text: 'Pixel leading',
        style: 'font-size: 20px; line-height: 30px;',
        layout: { x: 0, y: 0, width: 200, height: 60 }
      }, {
        id: 'unitless-leading',
        type: 'text',
        text: 'Unitless leading',
        style: 'font-size: 20px; line-height: 1.5;',
        layout: { x: 0, y: 80, width: 200, height: 60 }
      }, {
        id: 'percentage-leading',
        type: 'text',
        text: 'Percentage leading',
        style: 'font-size: 20px; line-height: 150%;',
        layout: { x: 0, y: 160, width: 200, height: 60 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const [pixelText, unitlessText, percentageText] = result.pptx.slides[0].calls;
  assert.equal(pixelText.options.lineSpacing, 22.5);
  assert.equal(pixelText.options.lineSpacingMultiple, undefined);
  assert.equal(unitlessText.options.lineSpacingMultiple, 1.5);
  assert.equal(percentageText.options.lineSpacingMultiple, 1.5);
});

test('createCanonicalPptxExport preserves supported CSS text vertical alignment', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'top-text',
        type: 'text',
        text: 'Top',
        style: 'vertical-align: top;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'middle-text',
        type: 'text',
        text: 'Middle',
        style: 'vertical-align: middle;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'bottom-text',
        type: 'text',
        text: 'Bottom',
        style: 'vertical-align: bottom;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }, {
        id: 'default-text',
        type: 'text',
        text: 'Default',
        layout: { x: 0, y: 150, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const calls = result.pptx.slides[0].calls;
  assert.deepEqual(calls.map(call => call.options.valign), ['top', 'middle', 'bottom', undefined]);
});

test('createCanonicalPptxExport normalizes CSS text alignment values', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'start-text',
        type: 'text',
        text: 'Start',
        style: 'text-align: start;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'end-text',
        type: 'text',
        text: 'End',
        style: 'text-align: end;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'justify-text',
        type: 'text',
        text: 'Justify',
        style: 'text-align: justify;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }, {
        id: 'invalid-text',
        type: 'text',
        text: 'Fallback',
        style: 'text-align: match-parent;',
        layout: { x: 0, y: 150, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(
    result.pptx.slides[0].calls.map(call => call.options.align),
    ['left', 'right', 'justify', 'left']
  );
});

test('createCanonicalPptxExport preserves supported CSS text decorations', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'underlined-text',
        type: 'text',
        text: 'Underlined',
        style: 'text-decoration: underline;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'struck-text',
        type: 'text',
        text: 'Struck',
        style: 'text-decoration-line: line-through;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'combined-text',
        type: 'text',
        text: 'Combined',
        style: 'text-decoration: underline line-through;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }, {
        id: 'plain-text',
        type: 'text',
        text: 'Plain',
        style: 'text-decoration: none;',
        layout: { x: 0, y: 150, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const calls = result.pptx.slides[0].calls;
  assert.deepEqual(calls.map(call => call.options.underline), [
    { style: 'sng' }, undefined, { style: 'sng' }, undefined
  ]);
  assert.deepEqual(calls.map(call => call.options.strike), [undefined, true, true, undefined]);
});

test('createCanonicalPptxExport preserves supported CSS letter spacing', () => {
  const result = pptxExport.createCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'spaced-text',
        type: 'text',
        text: 'Spaced',
        style: 'letter-spacing: 2px;',
        layout: { x: 0, y: 0, width: 100, height: 40 }
      }, {
        id: 'zero-spaced-text',
        type: 'text',
        text: 'Zero spacing',
        style: 'letter-spacing: 0;',
        layout: { x: 0, y: 50, width: 100, height: 40 }
      }, {
        id: 'normal-spaced-text',
        type: 'text',
        text: 'Normal spacing',
        style: 'letter-spacing: normal;',
        layout: { x: 0, y: 100, width: 100, height: 40 }
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(
    result.pptx.slides[0].calls.map(call => call.options.charSpacing),
    [1.5, 0, undefined]
  );
});

test('preflightCanonicalPptxExport reports missing node background image assets', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'panel-1',
        type: 'container',
        style: 'background-image: url("images/panel.png");',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  }, {
    assetBaseDir: '/deck',
    assetExists(source) {
      return source !== '/deck/images/panel.png';
    }
  });

  assert.deepEqual(report.diagnostics.missingNodeBackgroundAssets, ['panel-1:background']);
  assert.match(report.diagnostics.warnings.join('\n'), /missing background image asset/);
});

test('createCanonicalPptxExport resolves grouped child positions from parent-local coordinates', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'group-1',
        type: 'group',
        layout: { x: 200, y: 100, width: 300, height: 200 },
        children: [{
          id: 'group-2',
          type: 'group',
          layout: { x: 50, y: 25, width: 150, height: 100 },
          children: [{
            id: 'text-1',
            type: 'text',
            text: 'Nested',
            layout: { x: 10, y: 5, width: 100, height: 40 }
          }]
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  const textCall = result.pptx.slides[0].calls[0];
  assert.equal(textCall.type, 'text');
  assert.ok(Math.abs(textCall.options.x - (260 / 1000 * 13.333)) < 0.001);
  assert.ok(Math.abs(textCall.options.y - (130 / 500 * 6.6665)) < 0.001);
  assert.deepEqual(result.diagnostics.overflowNodes, []);

  const overflowReport = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'group-1',
        type: 'group',
        layout: { x: 900, y: 0, width: 200, height: 100 },
        children: [{
          id: 'text-1',
          type: 'text',
          text: 'Overflow',
          layout: { x: 150, y: 0, width: 100, height: 40 }
        }]
      }]
    }]
  });
  assert.deepEqual(overflowReport.diagnostics.overflowNodes.map(node => ({
    id: node.id,
    x: node.x
  })), [{ id: 'group-1', x: 900 }, { id: 'text-1', x: 1050 }]);
});

test('createCanonicalPptxExport renders siblings in stable z-index order', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [
        {
          id: 'front',
          type: 'shape',
          style: 'background-color: #ff0000;',
          layout: { x: 0, y: 0, width: 100, height: 100, zIndex: 10 }
        },
        {
          id: 'back',
          type: 'shape',
          style: 'background-color: #0000ff;',
          layout: { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
        },
        {
          id: 'tie',
          type: 'shape',
          style: 'background-color: #00ff00;',
          layout: { x: 0, y: 0, width: 100, height: 100, zIndex: 1 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => call.options.fill.color), [
    '0000FF',
    '00FF00',
    'FF0000'
  ]);
});

test('createCanonicalPptxExport preserves aggregate text for flow-only inline children', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 1000, height: 500, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'heading-1',
        type: 'heading',
        tagName: 'h1',
        layout: { x: 100, y: 50, width: 400, height: 80 },
        children: [{
          id: 'heading-span-1',
          type: 'text',
          tagName: 'span',
          text: 'Rich title'
        }]
      }]
    }]
  }, { PptxGenJS: FakePptx });

  assert.deepEqual(result.pptx.slides[0].calls.map(call => ({
    type: call.type,
    text: call.text
  })), [{ type: 'text', text: 'Rich title' }]);
  assert.deepEqual(result.diagnostics.warnings, []);
});

test('normalizeHexColor handles short hex and rgb values', () => {
  assert.equal(pptxExport.normalizeHexColor('#abc'), 'AABBCC');
  assert.equal(pptxExport.normalizeHexColor('rgb(1, 2, 3)'), '010203');
  assert.equal(pptxExport.normalizeHexColor('transparent'), '');
});

test('createCanonicalPptxExport ignores malformed CSS pixel values', () => {
  const result = pptxExport.createCanonicalPptxExport({
    layout: { size: { width: 100, height: 100, unit: 'px' } },
    slides: [{
      nodes: [
        {
          id: 'text-1',
          type: 'text',
          text: 'Fallback text',
          style: 'font-size: .;',
          layout: { x: 0, y: 0, width: 50, height: 20 }
        },
        {
          id: 'shape-1',
          type: 'shape',
          style: 'background-color: #fff; border-width: 1.2.3;',
          layout: { x: 0, y: 30, width: 50, height: 20 }
        }
      ]
    }]
  }, { PptxGenJS: FakePptx });

  const [textCall, shapeCall] = result.pptx.slides[0].calls;
  assert.equal(textCall.options.fontSize, 10.5);
  assert.equal(shapeCall.options.line.width, 0.5);
  assert.ok(Number.isFinite(textCall.options.fontSize));
  assert.ok(Number.isFinite(shapeCall.options.line.width));
});

test('preflightCanonicalPptxExport reports export fidelity risks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    layout: { size: { width: 100, height: 100, unit: 'px' } },
    slides: [{
      nodes: [{
        id: 'risk-1',
        type: 'text',
        text: 'Risk',
        style: 'transform: rotate(2deg); font-family: Custom Sans;',
        layout: { x: 90, y: 90, width: 20, height: 20 }
      }]
    }]
  }, { availableFonts: [] });

  assert.deepEqual(report.diagnostics.overflowNodes.map(node => node.id), ['risk-1']);
  assert.deepEqual(report.diagnostics.unsupportedStyles, [{
    id: 'risk-1',
    properties: ['transform']
  }]);
  assert.deepEqual(report.diagnostics.fontSubstitutionRisks, [{
    id: 'risk-1',
    fontFamily: 'Custom Sans'
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /extends beyond slide bounds/);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported CSS: transform/);
});

test('preflightCanonicalPptxExport reports table cell font substitution risks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'table-font-risk',
        type: 'table',
        layout: { x: 0, y: 0, width: 200, height: 80 },
        children: [{
          tagName: 'tr',
          children: [{
            tagName: 'td',
            text: 'Custom',
            style: 'font-family: Custom Sans;'
          }]
        }]
      }]
    }]
  }, { availableFonts: [] });

  assert.deepEqual(report.diagnostics.fontSubstitutionRisks, [{
    id: 'table-font-risk:cell-1-1',
    fontFamily: 'Custom Sans'
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /table-font-risk:cell-1-1 may substitute font Custom Sans/);
});

test('preflightCanonicalPptxExport reports table border style fallbacks', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'table-border-risk',
        type: 'table',
        style: 'border-style: dotted;',
        layout: { x: 0, y: 0, width: 200, height: 80 },
        children: [{
          tagName: 'tr',
          children: [{
            tagName: 'td',
            text: 'Fallback',
            style: 'border-style: double;'
          }]
        }]
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'table-border-risk', properties: ['border-style'] },
    { id: 'table-border-risk:cell-1-1', properties: ['border-style'] }
  ]);
  assert.match(
    report.diagnostics.warnings.join('\n'),
    /Node table-border-risk uses unsupported table border-style: dotted; using dashed fallback/
  );
  assert.match(
    report.diagnostics.warnings.join('\n'),
    /Node table-border-risk:cell-1-1 uses unsupported table cell border-style: double; using solid fallback/
  );
});

test('preflightCanonicalPptxExport reports unsupported image fit values', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'image-fit-1',
        type: 'image',
        attributes: { src: 'data:image/png;base64,AAAA' },
        style: 'object-fit: none;',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [{
    id: 'image-fit-1',
    properties: ['object-fit']
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported image fit: none/);
});

test('preflightCanonicalPptxExport reports unsupported image positioning', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    assets: [{ id: 'asset-1', src: 'data:image/png;base64,AAAA' }],
    slides: [{
      nodes: [{
        id: 'image-1',
        type: 'image',
        attributes: { 'data-asset-id': 'asset-1' },
        style: 'object-fit: cover; object-position: left top;',
        layout: { x: 0, y: 0, width: 100, height: 100 }
      }, {
        id: 'background-image-1',
        type: 'container',
        style: 'background-image: url("data:image/png;base64,AAAA"); background-size: 100% 100%; background-position: left; background-repeat: repeat;',
        layout: { x: 100, y: 0, width: 100, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'image-1', properties: ['object-position'] },
    { id: 'background-image-1', properties: ['background-size', 'background-position', 'background-repeat'] }
  ]);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported image positioning: object-position/);
  assert.match(report.diagnostics.warnings.join('\n'), /unsupported background image positioning/);
});

test('preflightCanonicalPptxExport reports non-uniform border radii', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      nodes: [{
        id: 'rounded-card',
        type: 'shape',
        style: 'border-radius: 8px 16px 8px 16px;',
        layout: { x: 0, y: 0, width: 200, height: 100 }
      }, {
        id: 'elliptical-card',
        type: 'container',
        style: 'border-radius: 12px / 20px;',
        layout: { x: 220, y: 0, width: 200, height: 100 }
      }, {
        id: 'uniform-card',
        type: 'shape',
        style: 'border-radius: 12px 12px 12px 12px;',
        layout: { x: 440, y: 0, width: 200, height: 100 }
      }]
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [
    { id: 'rounded-card', properties: ['border-radius'] },
    { id: 'elliptical-card', properties: ['border-radius'] }
  ]);
  assert.equal(report.diagnostics.warnings.filter(warning => /non-uniform border-radius/.test(warning)).length, 2);
});

test('preflightCanonicalPptxExport reports unsupported non-solid slide backgrounds', () => {
  const report = pptxExport.preflightCanonicalPptxExport({
    slides: [{
      id: 'slide-1',
      layout: { background: { style: 'background: linear-gradient(red, blue);' } },
      nodes: []
    }]
  });

  assert.deepEqual(report.diagnostics.unsupportedStyles, [{
    id: 'slide-1',
    properties: ['background']
  }]);
  assert.match(report.diagnostics.warnings.join('\n'), /Slide slide-1 uses unsupported CSS background styling/);
});

test('createPptxWarningDetailsHeader preserves a bounded diagnostic summary', () => {
  const encoded = pptxExport.createPptxWarningDetailsHeader([
    'first warning',
    'second warning',
    'third warning',
    'fourth warning'
  ]);

  assert.deepEqual(JSON.parse(decodeURIComponent(encoded)), {
    warnings: ['first warning', 'second warning', 'third warning'],
    truncated: true
  });
});
