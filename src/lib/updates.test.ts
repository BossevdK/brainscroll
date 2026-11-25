/// <reference types="node" />
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, toRelease } from './updates.ts';

test('version comparison', () => {
  assert.ok(compareVersions('v1.1', '1.0.0') > 0);
  assert.equal(compareVersions('v1.1', '1.1.0'), 0);
  assert.ok(compareVersions('1.10', '1.9') > 0);
  assert.ok(compareVersions('1.0', '1.0.1') < 0);
});

test('release needs an APK and must not be a draft', () => {
  const asset = { name: 'Brainscroll.apk', browser_download_url: 'https://x/Brainscroll.apk' };
  assert.equal(toRelease({ tag_name: 'v1.1', assets: [] }), null);
  assert.equal(toRelease({ tag_name: 'v1.1', draft: true, assets: [asset] }), null);
  const r = toRelease({ tag_name: 'v1.1', body: 'New games', assets: [asset] });
  assert.equal(r?.version, '1.1');
  assert.equal(r?.apkUrl, asset.browser_download_url);
});
