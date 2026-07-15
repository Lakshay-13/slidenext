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
    'notes', 'text', 'shape', 'image'
  ]);

  const textCall = result.pptx.slides[0].calls[1];
  assert.equal(textCall.text, 'Hello');
  assert.ok(Math.abs(textCall.options.x - 1.3333) < 0.001);
  assert.ok(Math.abs(textCall.options.w - 2.6666) < 0.001);
  assert.equal(textCall.options.color, 'FF0000');

  const imageCall = result.pptx.slides[0].calls[3];
  assert.equal(imageCall.options.data, 'data:image/png;base64,AAAA');
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

test('normalizeHexColor handles short hex and rgb values', () => {
  assert.equal(pptxExport.normalizeHexColor('#abc'), 'AABBCC');
  assert.equal(pptxExport.normalizeHexColor('rgb(1, 2, 3)'), '010203');
  assert.equal(pptxExport.normalizeHexColor('transparent'), '');
});
