const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');

const { app } = require('../server.js');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  if (!server) return;
  server.close();
  await once(server, 'close');
});

test('runtime presentation library exposes fetchable legacy deck URLs', async () => {
  const libraryResponse = await fetch(`${baseUrl}/api/presentations`, {
    cache: 'no-store'
  });
  assert.equal(libraryResponse.status, 200);

  const groups = await libraryResponse.json();
  const presentations = groups.flatMap((group) => (
    Array.isArray(group.presentations) ? group.presentations : []
  ));
  assert.ok(presentations.length > 0);

  for (const presentation of presentations) {
    const deckResponse = await fetch(new URL(presentation.url, `${baseUrl}/`));
    assert.equal(deckResponse.status, 200, `Deck failed to load: ${presentation.url}`);
    assert.match(await deckResponse.text(), /<html[\s>]/i);
  }
});
