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
    this.ShapeType = { rect: 'RECTANGLE' };
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
          layout: { x: 0, y: 200, width: 400, height: 150 },
          children: [{
            tagName: 'tr',
            children: [
              { tagName: 'th', text: 'Name' },
              { tagName: 'th', text: 'Value' }
            ]
          }, {
            tagName: 'tr',
            children: [
              { tagName: 'td', text: 'Alpha' },
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
    ['Name', 'Value'],
    ['Alpha', '42']
  ]);
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
