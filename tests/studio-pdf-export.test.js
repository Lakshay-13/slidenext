const test = require('node:test');
const assert = require('node:assert/strict');

const pdfExport = require('../shared/studio-pdf-export.js');

test('buildStudioPdfPrintHtml injects fixed-size one-slide-per-page print styles', () => {
  const html = pdfExport.buildStudioPdfPrintHtml(
    '<!doctype html><html><head><title>Deck</title></head><body><div class="slide">A</div></body></html>'
  );

  assert.match(html, /data-slidenext-pdf-print="true"/);
  assert.match(html, /size: 16in 9in/);
  assert.match(html, /break-after: page/);
  assert.match(html, /\.slide:last-child/);
  assert.match(html, /#indicatorDots/);
  assert.match(html, /print-color-adjust: exact/);
  assert.match(html, /\.slides-wrapper/);
  assert.match(html, /position: relative !important/);
  assert.match(html, /break-inside: avoid/);
  assert.match(html, /page-break-inside: avoid/);
  assert.equal((html.match(/data-slidenext-pdf-print="true"/g) || []).length, 1);
});

test('buildStudioPdfPrintHtml preserves legacy html fallback and supports safe dimensions', () => {
  const html = pdfExport.buildStudioPdfPrintHtml(
    '<html><body><section class="frame">A</section></body></html>',
    {
      pageWidth: '210mm',
      pageHeight: '148mm',
      slideSelector: '.frame'
    }
  );

  assert.match(html, /<head><style/);
  assert.match(html, /size: 210mm 148mm/);
  assert.match(html, /\.frame \{/);
  assert.match(html, /<section class="frame">A<\/section>/);
  assert.equal(pdfExport.normalizeDimension('javascript:alert(1)', '16in'), '16in');
});

test('buildStudioPdfPrintHtml prepends print styles to html fragments', () => {
  const html = pdfExport.buildStudioPdfPrintHtml('<div class="slide">Fragment</div>');

  assert.match(html, /^<style data-slidenext-pdf-print="true">/);
  assert.match(html, /break-after: page/);
  assert.match(html, /<div class="slide">Fragment<\/div>/);
});

test('resolveStudioPdfPageDimensions maps valid canonical layout sizes and rejects unsafe values', () => {
  assert.deepEqual(
    pdfExport.resolveStudioPdfPageDimensions({
      layout: { size: { width: 1280, height: 720, unit: 'px' } }
    }),
    { pageWidth: '1280px', pageHeight: '720px' }
  );
  assert.deepEqual(
    pdfExport.resolveStudioPdfPageDimensions({
      layout: { size: { width: 0, height: 720, unit: 'px' } }
    }),
    {}
  );
  assert.deepEqual(
    pdfExport.resolveStudioPdfPageDimensions({
      layout: { size: { width: 1280, height: 720, unit: 'url(javascript:alert(1))' } }
    }),
    {}
  );
});

test('waitForStudioPdfPrintResources waits for fonts and image load or error', async () => {
  let resolveFonts;
  const imageHandlers = {};
  const image = {
    complete: false,
    addEventListener(type, handler) {
      imageHandlers[type] = handler;
    }
  };
  const fontsReady = new Promise(resolve => {
    resolveFonts = resolve;
  });
  let didResolve = false;
  const waiting = pdfExport.waitForStudioPdfPrintResources({
    fonts: { ready: fontsReady },
    images: [image]
  }).then(() => {
    didResolve = true;
  });

  await Promise.resolve();
  assert.equal(didResolve, false);
  resolveFonts();
  imageHandlers.error();
  await waiting;
  assert.equal(didResolve, true);
});

test('waitForStudioPdfPrintResources resolves when a resource never settles', async () => {
  const image = {
    complete: false,
    addEventListener() {}
  };

  const startedAt = Date.now();
  await pdfExport.waitForStudioPdfPrintResources({ images: [image] }, { timeoutMs: 10 });

  assert.ok(Date.now() - startedAt >= 8);
});

test('openStudioPdfPrintWindow writes export html and waits for the print window load event', () => {
  let writtenHtml = '';
  let printCalls = 0;
  let focusCalls = 0;
  let loadHandler = null;
  let printSuccessCalls = 0;
  const events = [];
  const printWindow = {
    document: {
      open() {
        events.push('open');
      },
      write(html) {
        events.push('write');
        writtenHtml = html;
      },
      close() {
        events.push('close');
      },
      fonts: {
        ready: Promise.resolve()
      }
    },
    addEventListener(type, handler) {
      assert.equal(type, 'load');
      events.push('listen');
      loadHandler = handler;
    },
    focus() {
      focusCalls += 1;
    },
    print() {
      printCalls += 1;
    }
  };

  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><head></head><body><div class="slide">A</div></body></html>',
    openWindow() {
      return printWindow;
    },
    onPrint() {
      printSuccessCalls += 1;
    }
  }), true);
  assert.match(writtenHtml, /data-slidenext-pdf-print="true"/);
  assert.deepEqual(events, ['listen', 'open', 'write', 'close']);
  assert.equal(printCalls, 0);
  assert.equal(typeof loadHandler, 'function');

  loadHandler();

  return new Promise((resolve) => {
    setImmediate(() => {
      assert.equal(printCalls, 1);
      assert.equal(focusCalls, 1);
      assert.equal(printSuccessCalls, 1);
      resolve();
    });
  });
});

test('openStudioPdfPrintWindow reports print-dialog failures', () => {
  let printErrors = 0;
  const printWindow = {
    document: {
      open() {},
      write() {},
      close() {}
    },
    addEventListener(type, handler) {
      assert.equal(type, 'load');
      this.loadHandler = handler;
    }
  };

  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><body><div class="slide">A</div></body></html>',
    openWindow() {
      return printWindow;
    },
    onError(error) {
      assert.match(error.message, /Print dialog is unavailable/);
      printErrors += 1;
    }
  }), true);

  printWindow.loadHandler();
  return new Promise((resolve) => {
    setImmediate(() => {
      assert.equal(printErrors, 1);
      resolve();
    });
  });
});

test('openStudioPdfPrintWindow reports a print-window load timeout', async () => {
  let printErrors = 0;
  let closeCalls = 0;
  const printWindow = {
    document: {
      open() {},
      write() {},
      close() {}
    },
    close() {
      closeCalls += 1;
    },
    addEventListener(type) {
      assert.equal(type, 'load');
    }
  };

  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><body><div class="slide">A</div></body></html>',
    loadTimeoutMs: 10,
    openWindow() {
      return printWindow;
    },
    onError(error) {
      assert.match(error.message, /Print window load timed out/);
      printErrors += 1;
    }
  }), true);

  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(printErrors, 1);
  assert.equal(closeCalls, 1);
});

test('openStudioPdfPrintWindow returns false when popup or html input is unavailable', () => {
  assert.equal(pdfExport.openStudioPdfPrintWindow({ html: '' }), false);
  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html></html>',
    openWindow() {
      return null;
    }
  }), false);
});
