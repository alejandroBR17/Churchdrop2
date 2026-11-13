import test from 'node:test';
import assert from 'node:assert/strict';
import {publicAppUrl} from '../services/publicAppUrl.ts';

test('QR shares the public app instead of a protected Vercel deployment', () => {
  assert.equal(publicAppUrl('https://univer-midia-example-team.vercel.app/?_vercel_share=private#access=secret'), 'https://churchdrop2.vercel.app/');
  assert.equal(publicAppUrl('https://churchdrop2.vercel.app/'), 'https://churchdrop2.vercel.app/');
});

test('custom domains and local previews omit credentials, query and fragment', () => {
  assert.equal(publicAppUrl('https://user:password@midia.example/app/?token=secret#session'), 'https://midia.example/app/');
  assert.equal(publicAppUrl('http://localhost:5184/?debug=1#access'), 'http://localhost:5184/');
  assert.equal(publicAppUrl('https://vercel.app.example/?private=1'), 'https://vercel.app.example/');
});

test('invalid and non-web links fall back to the public app', () => {
  for (const value of ['not a URL', 'javascript:alert(1)', 'data:text/html,hello', 'file:///tmp/app']) {
    assert.equal(publicAppUrl(value), 'https://churchdrop2.vercel.app/');
  }
});
