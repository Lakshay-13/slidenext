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
    this.slides = [];
  }

  addSlide() {
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
  assert.equal(result.pptx.layout, 'LAYOUT_WIDE');
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
  assert.deepEqual(result.pptx.slides[0].calls[4].rows, [
    ['Name', 'Value'],
    ['Alpha', '42']
  ]);
  assert.equal(result.diagnostics.unsupportedNodes[0].id, 'table-1');
  assert.deepEqual(result.diagnostics.missingAssets, []);
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

test('normalizeHexColor handles short hex and rgb values', () => {
  assert.equal(pptxExport.normalizeHexColor('#abc'), 'AABBCC');
  assert.equal(pptxExport.normalizeHexColor('rgb(1, 2, 3)'), '010203');
  assert.equal(pptxExport.normalizeHexColor('transparent'), '');
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
