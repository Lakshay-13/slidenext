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
  assert.equal(pdfExport.normalizeDimension('0in', '16in'), '16in');
});

test('buildStudioPdfPrintHtml prepends print styles to html fragments', () => {
  const html = pdfExport.buildStudioPdfPrintHtml('<div class="slide">Fragment</div>');

  assert.match(html, /^<style data-slidenext-pdf-print="true">/);
  assert.match(html, /break-after: page/);
  assert.match(html, /<div class="slide">Fragment<\/div>/);
});

test('openStudioPdfPrintWindow rejects a known empty deck before opening a popup', () => {
  let openCalls = 0;
  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><body><div class="slide">A</div></body></html>',
    slideCount: 0,
    openWindow() {
      openCalls += 1;
      return null;
    }
  }), false);
  assert.equal(openCalls, 0);
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

test('validateStudioPdfSlideCount fails closed when the print document has the wrong number of slides', () => {
  assert.equal(
    pdfExport.validateStudioPdfSlideCount({
      querySelectorAll() {
        return [{}, {}];
      }
    }, { slideCount: 2 }),
    null
  );
  assert.match(
    pdfExport.validateStudioPdfSlideCount({
      querySelectorAll() {
        return [{}, {}];
      }
    }, { slideCount: 3 }).message,
    /expected 3, found 2/
  );
  assert.match(
    pdfExport.validateStudioPdfSlideCount({
      querySelectorAll() {
        throw new Error('invalid selector');
      }
    }, { slideCount: 1 }).message,
    /could not be evaluated/
  );
  assert.match(
    pdfExport.validateStudioPdfSlideCount({}, { slideCount: 1 }).message,
    /querySelectorAll is unavailable/
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
  await assert.rejects(waiting, /PDF image resource failed to load/);
  assert.equal(didResolve, false);
});

test('waitForStudioPdfPrintResources rejects when fonts fail to load', async () => {
  const fontError = new Error('font load failed');
  await assert.rejects(
    pdfExport.waitForStudioPdfPrintResources({
      fonts: { ready: Promise.reject(fontError) },
      images: []
    }),
    /font load failed/
  );
});

test('waitForStudioPdfPrintResources rejects already-complete broken images', async () => {
  await assert.rejects(
    pdfExport.waitForStudioPdfPrintResources({
      images: [{
        complete: true,
        currentSrc: 'missing.png',
        naturalWidth: 0,
        addEventListener() {}
      }]
    }),
    /PDF image resource failed to load/
  );
});

test('waitForStudioPdfPrintResources preloads CSS background images', async () => {
  const imageHandlers = {};
  let assignedSource = '';
  const preloadImage = {
    complete: false,
    addEventListener(type, handler) {
      imageHandlers[type] = handler;
    },
    set src(value) {
      assignedSource = value;
    }
  };
  const waiting = pdfExport.waitForStudioPdfPrintResources({
    images: [],
    querySelectorAll() {
      return [{}];
    },
    defaultView: {
      getComputedStyle() {
        return { backgroundImage: 'linear-gradient(red, blue), url("assets/background.png")' };
      }
    },
    createElement(tagName) {
      assert.equal(tagName, 'img');
      return preloadImage;
    }
  });

  await Promise.resolve();
  assert.equal(assignedSource, 'assets/background.png');
  assert.equal(typeof imageHandlers.load, 'function');
  imageHandlers.load();
  await waiting;
});

test('waitForStudioPdfPrintResources rejects when a resource never settles', async () => {
  const image = {
    complete: false,
    addEventListener() {}
  };

  const startedAt = Date.now();
  await assert.rejects(
    pdfExport.waitForStudioPdfPrintResources({ images: [image] }, { timeoutMs: 10 }),
    /PDF image resource load timed out/
  );

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
    opener: 'parent-window',
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
    openWindow(...args) {
      assert.deepEqual(args, ['', '_blank']);
      return printWindow;
    },
    onPrint() {
      printSuccessCalls += 1;
    }
  }), true);
  assert.equal(printWindow.opener, null);
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

test('openStudioPdfPrintWindow falls back to a completed synchronously written document', () => {
  let printCalls = 0;
  let printSuccessCalls = 0;
  const printWindow = {
    document: {
      readyState: 'complete',
      open() {},
      write() {},
      close() {},
      fonts: {
        ready: Promise.resolve()
      }
    },
    addEventListener() {},
    focus() {},
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

  return new Promise((resolve) => {
    setImmediate(() => {
      assert.equal(printCalls, 1);
      assert.equal(printSuccessCalls, 1);
      resolve();
    });
  });
});

test('openStudioPdfPrintWindow falls back when the popup never emits load', async () => {
  let printCalls = 0;
  let printSuccessCalls = 0;
  const printWindow = {
    document: {
      readyState: 'loading',
      open() {},
      write() {},
      close() {},
      fonts: {
        ready: Promise.resolve()
      }
    },
    addEventListener() {},
    focus() {},
    print() {
      printCalls += 1;
    }
  };

  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><head></head><body><div class="slide">A</div></body></html>',
    fallbackLoadTimeoutMs: 5,
    openWindow() {
      return printWindow;
    },
    onPrint() {
      printSuccessCalls += 1;
    }
  }), true);

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(printCalls, 1);
  assert.equal(printSuccessCalls, 1);
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

test('openStudioPdfPrintWindow reports resource failures without printing', () => {
  let printCalls = 0;
  let printErrors = 0;
  let loadHandler = null;
  const imageHandlers = {};
  const printWindow = {
    document: {
      open() {},
      write() {},
      close() {},
      images: [{
        complete: false,
        addEventListener(type, handler) {
          imageHandlers[type] = handler;
        }
      }]
    },
    addEventListener(type, handler) {
      assert.equal(type, 'load');
      loadHandler = handler;
    },
    print() {
      printCalls += 1;
    }
  };

  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><body><img src="missing.png"></body></html>',
    openWindow() {
      return printWindow;
    },
    onError(error) {
      assert.match(error.message, /PDF image resource failed to load/);
      printErrors += 1;
    }
  }), true);

  loadHandler();
  imageHandlers.error();

  return new Promise((resolve) => {
    setImmediate(() => {
      assert.equal(printCalls, 0);
      assert.equal(printErrors, 1);
      resolve();
    });
  });
});

test('openStudioPdfPrintWindow refuses to print when the loaded slide count mismatches', () => {
  let printCalls = 0;
  let printErrors = 0;
  const printWindow = {
    document: {
      open() {},
      write() {},
      close() {},
      querySelectorAll() {
        return [{}, {}];
      }
    },
    addEventListener(type, handler) {
      assert.equal(type, 'load');
      this.loadHandler = handler;
    },
    print() {
      printCalls += 1;
    }
  };

  assert.equal(pdfExport.openStudioPdfPrintWindow({
    html: '<html><body><div class="slide">A</div></body></html>',
    slideCount: 1,
    openWindow() {
      return printWindow;
    },
    onError(error) {
      assert.match(error.message, /PDF slide count mismatch/);
      printErrors += 1;
    }
  }), true);

  printWindow.loadHandler();
  assert.equal(printCalls, 0);
  assert.equal(printErrors, 1);
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
